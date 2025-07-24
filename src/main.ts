import dotenv from 'dotenv';
import OpenAI from 'openai';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
// import MarkdownIt from 'markdown-it'; // Unused for now

import { PerplexityTool } from './tools/perplexity.js';
import { ExpertAgent } from './agents/expert.js';
import { ContrarianAgent } from './agents/contrarian.js';
import { OrchestratorAgent } from './agents/orchestrator.js';
import { ConvergenceTracker } from './utils/convergence-tracker.js';
import { generatePersonas, PersonaSpec } from './utils/persona-generator.js';

import {
  DelphiPrompt,
  ExpertResponse,
  ContrarianResponse,
  RoundSynthesis,
  DelphiReport,
  AgentConfig,
  EXPERT_ROLES,
  APIConfig
} from './types/index.js';

// Load environment variables
dotenv.config();

export class DelphiAgent {
  private openai: OpenAI;
  private perplexity: PerplexityTool;
  private orchestrator: OrchestratorAgent;
  private convergenceTracker: ConvergenceTracker;
  private experts: ExpertAgent[] = [];
  private contrarians: ContrarianAgent[] = [];
  private config: APIConfig;
  private maxRounds: number = 3;

  constructor(config?: Partial<APIConfig>) {
    // Initialize API configuration
    this.config = {
      openai: {
        apiKey: config?.openai?.apiKey || process.env.OPENAI_API_KEY || '',
        model: config?.openai?.model || process.env.OPENAI_MODEL || 'gpt-4o',
        maxTokens: config?.openai?.maxTokens || 2000,
        temperature: config?.openai?.temperature || 0.7
      },
      perplexity: {
        apiKey: config?.perplexity?.apiKey || process.env.PERPLEXITY_API_KEY || '',
        model: config?.perplexity?.model || process.env.PERPLEXITY_MODEL || 'sonar-reasoning-pro',
        searchContextSize: config?.perplexity?.searchContextSize || 'medium'
      }
    };

    // Validate API keys
    if (!this.config.openai.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }
    if (!this.config.perplexity.apiKey) {
      throw new Error('Perplexity API key is required. Set PERPLEXITY_API_KEY environment variable.');
    }

    // Initialize clients
    this.openai = new OpenAI({ apiKey: this.config.openai.apiKey });
    this.perplexity = new PerplexityTool(this.config.perplexity.apiKey, this.config.perplexity.model);
    
    // Initialize orchestrator and tracker
    this.orchestrator = new OrchestratorAgent(this.openai);
    this.convergenceTracker = new ConvergenceTracker();

    console.log('🧠 DelphiAgent initialized successfully');
  }

  /**
   * Run the complete Delphi process
   */
  async runDelphiProcess(
    prompt: DelphiPrompt,
    expertCount: number = 5,
    customExpertRoles?: string[]
  ): Promise<DelphiReport> {
    console.log(`\n🚀 Starting Delphi process: "${prompt.question}"`);
    console.log(`📊 Configuration: ${expertCount} experts, max ${this.maxRounds} rounds\n`);

    try {
      // Generate detailed expert personas using OpenAI
      const personas: PersonaSpec[] = await generatePersonas(this.openai, prompt.question, expertCount);
      // Initialize expert agents with generated personas
      this.initializeExpertsWithPersonas(personas);
      
      // Initialize contrarian agents (1-2 depending on expert count)
      const contrarianCount = Math.min(2, Math.ceil(expertCount / 3));
      this.initializeContrarians(contrarianCount);

      const roundResults: {
        expertResponses: ExpertResponse[];
        synthesis: RoundSynthesis;
        contrarianResponses: ContrarianResponse[];
      }[] = [];

      // Execute Delphi rounds
      for (let round = 1; round <= this.maxRounds; round++) {
        console.log(`\n📋 === ROUND ${round} ===`);
        
        const roundResult = await this.executeRound(
          round,
          prompt,
          round > 1 ? roundResults[round - 2].synthesis : undefined
        );

        roundResults.push(roundResult);

        // Track convergence
        this.convergenceTracker.addRound(roundResult.synthesis, roundResult.expertResponses);

        // Check for early termination
        if (round >= 2) {
          if (this.convergenceTracker.hasConverged()) {
            console.log(`✅ Convergence reached after round ${round}`);
            break;
          } else if (this.convergenceTracker.hasStableDivergence()) {
            console.log(`🔄 Stable divergence detected after round ${round}`);
            break;
          }
        }

        // Brief pause between rounds
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Generate final report
      const report = await this.generateFinalReport(prompt, roundResults);
      
      // Save report to file
      await this.saveReport(report);

      console.log(`\n🎉 Delphi process completed successfully!`);
      console.log(`📄 Report saved to: ${this.getReportFilename(prompt.question)}`);

      return report;

    } catch (error) {
      console.error('\n❌ Delphi process failed:', error);
      throw new Error(`Delphi process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a single round of the Delphi process
   */
  private async executeRound(
    roundNumber: number,
    prompt: DelphiPrompt,
    previousSynthesis?: RoundSynthesis
  ): Promise<{
    expertResponses: ExpertResponse[];
    synthesis: RoundSynthesis;
    contrarianResponses: ContrarianResponse[];
  }> {
    
    // Phase 1: Expert responses
    console.log(`\n🧠 Phase 1: Gathering expert opinions (${this.experts.length} experts)`);
    
    const expertResponses: ExpertResponse[] = [];
    const synthesisContext = previousSynthesis ? 
      this.orchestrator.formatSynthesisForReview(previousSynthesis) : undefined;

    // Gather expert responses in parallel for efficiency
    const expertPromises = this.experts.map(async (expert, index) => {
      try {
        console.log(`   [${index + 1}/${this.experts.length}] ${expert.getRole()} responding...`);
        return await expert.generateResponse(prompt, synthesisContext, roundNumber);
      } catch (error) {
        console.error(`   ❌ Expert ${expert.getRole()} failed:`, error);
        return null;
      }
    });

    const expertResults = await Promise.all(expertPromises);
    expertResults.forEach(result => {
      if (result) expertResponses.push(result);
    });

    console.log(`   ✅ Collected ${expertResponses.length} expert responses`);

    // Phase 2: Synthesis
    console.log(`\n🔄 Phase 2: Synthesizing responses`);
    
    const synthesis = await this.orchestrator.synthesizeRound(
      roundNumber,
      expertResponses,
      [] // No contrarian responses yet for initial synthesis
    );

    console.log(`   ✅ Synthesis complete: ${synthesis.clusters.length} clusters identified`);

    // Phase 3: Contrarian challenges (from round 1 onwards)
    console.log(`\n🎯 Phase 3: Generating contrarian challenges`);
    
    const contrarianResponses: ContrarianResponse[] = [];
    const dominantClusters = this.orchestrator.identifyDominantClusters(synthesis);

    if (dominantClusters.length > 0) {
      const contrarianPromises = this.contrarians.map(async (contrarian, index) => {
        try {
          console.log(`   [${index + 1}/${this.contrarians.length}] Contrarian ${index + 1} challenging...`);
          return await contrarian.generateResponse(synthesis, dominantClusters);
        } catch (error) {
          console.error(`   ❌ Contrarian ${index + 1} failed:`, error);
          return null;
        }
      });

      const contrarianResults = await Promise.all(contrarianPromises);
      contrarianResults.forEach(result => {
        if (result) contrarianResponses.push(result);
      });

      console.log(`   ✅ Generated ${contrarianResponses.length} contrarian challenges`);
    } else {
      console.log(`   ⚠️  No dominant clusters to challenge`);
    }

    return {
      expertResponses,
      synthesis,
      contrarianResponses
    };
  }

  /**
   * Initialize expert agents with generated personas
   */
  private initializeExpertsWithPersonas(personas: PersonaSpec[]): void {
    console.log(`\n👥 Initializing ${personas.length} expert agents (bespoke personas)`);
    this.experts = [];
    personas.forEach((persona, index) => {
      const config: AgentConfig = {
        role: persona.role,
        expertise_areas: [persona.domain_expertise],
        perspective: persona.perspective,
        bias_instructions: persona.justification + '\n' + persona.description
      };
      const expert = new ExpertAgent(this.openai, this.perplexity, config);
      this.experts.push(expert);
      console.log(`   ✅ Expert ${index + 1}: ${persona.role}`);
    });
  }

  /**
   * Initialize contrarian agents
   */
  private initializeContrarians(count: number): void {
    console.log(`\n🎯 Initializing ${count} contrarian agents`);
    
    this.contrarians = [];
    for (let i = 0; i < count; i++) {
      const contrarian = new ContrarianAgent(this.openai, this.perplexity);
      this.contrarians.push(contrarian);
      console.log(`   ✅ Contrarian ${i + 1} initialized`);
    }
  }

  /**
   * Select diverse expert roles
   */
  private selectDiverseRoles(count: number): string[] {
    const availableRoles = [...EXPERT_ROLES];
    const selectedRoles: string[] = [];

    // Randomly select diverse roles
    while (selectedRoles.length < count && availableRoles.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableRoles.length);
      const role = availableRoles.splice(randomIndex, 1)[0];
      selectedRoles.push(role);
    }

    // If we need more roles than available, duplicate with variations
    while (selectedRoles.length < count) {
      const baseRole = EXPERT_ROLES[selectedRoles.length % EXPERT_ROLES.length];
      selectedRoles.push(`Senior ${baseRole}`);
    }

    return selectedRoles;
  }

  /**
   * Get expertise areas for a role
   */
  private getExpertiseAreas(role: string): string[] {
    const expertiseMap: Record<string, string[]> = {
      'Technology Ethics Specialist': ['AI ethics', 'privacy', 'algorithmic fairness', 'digital rights'],
      'Policy Researcher': ['public policy', 'regulation', 'governance', 'policy analysis'],
      'Industry Analyst': ['market trends', 'business strategy', 'competitive analysis', 'technology adoption'],
      'Academic Researcher': ['peer review', 'research methodology', 'theoretical frameworks', 'empirical analysis'],
      'Legal Expert': ['regulatory compliance', 'legal frameworks', 'risk assessment', 'jurisprudence'],
      'Economic Analyst': ['economic impact', 'cost-benefit analysis', 'market economics', 'financial modeling'],
      'Social Scientist': ['social impact', 'behavioral analysis', 'community effects', 'societal trends'],
      'Environmental Scientist': ['environmental impact', 'sustainability', 'climate effects', 'ecological analysis'],
      'Public Health Expert': ['health policy', 'epidemiology', 'health systems', 'prevention strategies'],
      'Security Analyst': ['cybersecurity', 'risk management', 'threat assessment', 'security frameworks']
    };

    return expertiseMap[role] || ['general analysis', 'critical thinking', 'evidence evaluation'];
  }

  /**
   * Get perspective for a role
   */
  private getPerspective(role: string): string {
    const perspectiveMap: Record<string, string> = {
      'Technology Ethics Specialist': 'Focuses on ethical implications and human values',
      'Policy Researcher': 'Emphasizes governance, regulation, and institutional approaches',
      'Industry Analyst': 'Prioritizes market viability and business implementation',
      'Academic Researcher': 'Values rigorous methodology and theoretical grounding',
      'Legal Expert': 'Considers legal compliance and regulatory frameworks',
      'Economic Analyst': 'Evaluates economic efficiency and financial implications',
      'Social Scientist': 'Examines social dynamics and community impact',
      'Environmental Scientist': 'Prioritizes environmental sustainability and ecological impact',
      'Public Health Expert': 'Focuses on population health and prevention',
      'Security Analyst': 'Emphasizes risk mitigation and security considerations'
    };

    return perspectiveMap[role] || 'Provides balanced analytical perspective';
  }

  /**
   * Get bias instructions for a role
   */
  private getBiasInstructions(role: string): string {
    return `Remember that as a ${role}, you may have inherent biases toward certain solutions or frameworks. Acknowledge these biases while maintaining objectivity.`;
  }

  /**
   * Generate the final Delphi report
   */
  private async generateFinalReport(
    prompt: DelphiPrompt,
    roundResults: Array<{
      expertResponses: ExpertResponse[];
      synthesis: RoundSynthesis;
      contrarianResponses: ContrarianResponse[];
    }>
  ): Promise<DelphiReport> {
    console.log(`\n📝 Generating final report`);

    const finalRound = roundResults[roundResults.length - 1];
    const allExpertResponses = roundResults.flatMap(r => r.expertResponses);
    const allContrarianResponses = roundResults.flatMap(r => r.contrarianResponses);
    const convergenceMetrics = this.convergenceTracker.calculateMetrics();

    // Generate consensus summary using AI
    const consensusSummary = await this.generateConsensusSummary(
      finalRound.synthesis,
      allExpertResponses
    );

    // Identify dissenting views
    const dissentingViews = this.identifyDissentingViews(finalRound.synthesis, allExpertResponses);

    const report: DelphiReport = {
      prompt,
      consensus_summary: consensusSummary,
      expert_positions: finalRound.expertResponses,
      contrarian_observations: allContrarianResponses,
      dissenting_views: dissentingViews,
      convergence_analysis: convergenceMetrics,
      round_history: roundResults.map(r => r.synthesis),
      generated_at: new Date()
    };

    return report;
  }

  /**
   * Generate AI-powered consensus summary
   */
  private async generateConsensusSummary(
    finalSynthesis: RoundSynthesis,
    allResponses: ExpertResponse[]
  ) {
    const prompt = `Based on the following Delphi process results, generate a consensus summary:

FINAL SYNTHESIS:
${JSON.stringify(finalSynthesis, null, 2)}

Generate a JSON response with:
{
  "final_position": "Clear statement of the consensus position",
  "support_level": "X of Y experts support this position",
  "confidence_level": average_confidence_score,
  "key_evidence": [{"title": "...", "url": "...", "relevance": "..."}]
}`;

    const completion = await this.openai.chat.completions.create({
      model: this.config.openai.model,
      messages: [
        { role: 'system', content: 'You are generating a consensus summary for a Delphi process. Be clear and objective.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Failed to generate consensus summary');
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      return JSON.parse(jsonString);
    } catch (error) {
      // Fallback summary
      return {
        final_position: "Multiple expert perspectives were synthesized",
        support_level: `${allResponses.length} experts participated`,
        confidence_level: finalSynthesis.average_confidence,
        key_evidence: []
      };
    }
  }

  /**
   * Identify dissenting views from the main consensus
   */
  private identifyDissentingViews(synthesis: RoundSynthesis, responses: ExpertResponse[]) {
    // Find experts not in the largest cluster
    const largestCluster = synthesis.clusters.reduce((largest, current) => 
      current.expert_ids.length > largest.expert_ids.length ? current : largest
    , synthesis.clusters[0] || { expert_ids: [] });

    const dissentingExperts = responses.filter(response => 
      !largestCluster.expert_ids.includes(response.agent_id)
    );

    return dissentingExperts.map(expert => ({
      position: expert.position,
      expert_ids: [expert.agent_id],
      reasoning: expert.reasoning,
      sources: expert.sources
    }));
  }

  /**
   * Save the report to file
   */
  private async saveReport(report: DelphiReport): Promise<void> {
    // Ensure output directory exists
    if (!existsSync('output')) {
      mkdirSync('output', { recursive: true });
    }

    const filename = this.getReportFilename(report.prompt.question);
    const filepath = join('output', filename);

    // Generate markdown report
    const markdownContent = this.generateMarkdownReport(report);
    
    // Save markdown file
    writeFileSync(filepath, markdownContent, 'utf-8');
    
    // Also save JSON for data analysis
    const jsonFilepath = filepath.replace('.md', '.json');
    writeFileSync(jsonFilepath, JSON.stringify(report, null, 2), 'utf-8');

    console.log(`📄 Report saved to: ${filepath}`);
    console.log(`📊 Data saved to: ${jsonFilepath}`);
  }

  /**
   * Generate filename for the report
   */
  private getReportFilename(question: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const sanitizedQuestion = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
    
    return `delphi-report-${timestamp}-${sanitizedQuestion}.md`;
  }

  /**
   * Generate markdown report content
   */
  private generateMarkdownReport(report: DelphiReport): string {
    
    let content = `# 🧠 DelphiAgent Consensus Report\n\n`;
    content += `**Generated:** ${report.generated_at.toISOString()}\n\n`;
    content += `**Question:** ${report.prompt.question}\n\n`;
    
    if (report.prompt.context) {
      content += `**Context:** ${report.prompt.context}\n\n`;
    }

    // Consensus Summary
    content += `## 📊 Consensus Summary\n\n`;
    content += `**Final Position:** ${report.consensus_summary.final_position}\n\n`;
    content += `**Support Level:** ${report.consensus_summary.support_level}\n\n`;
    content += `**Confidence Level:** ${report.consensus_summary.confidence_level.toFixed(1)}/10\n\n`;

    // Convergence Analysis
    content += `## 📈 Convergence Analysis\n\n`;
    content += `- **Rounds Completed:** ${report.convergence_analysis.rounds_completed}\n`;
    content += `- **Position Stability:** ${(report.convergence_analysis.position_stability * 100).toFixed(1)}%\n`;
    content += `- **Consensus Clarity:** ${(report.convergence_analysis.consensus_clarity * 100).toFixed(1)}%\n`;
    content += `- **Confidence Spread:** ${report.convergence_analysis.confidence_spread.toFixed(2)}\n`;
    content += `- **Citation Overlap:** ${(report.convergence_analysis.citation_overlap * 100).toFixed(1)}%\n`;
    content += `- **Termination Reason:** ${report.convergence_analysis.termination_reason.replace(/_/g, ' ')}\n\n`;

    // Expert Positions
    content += `## 👥 Expert Positions\n\n`;
    report.expert_positions.forEach((expert, index) => {
      content += `### Expert ${index + 1}: ${expert.expertise_area}\n\n`;
      content += `**Position:** ${expert.position}\n\n`;
      content += `**Confidence:** ${expert.confidence}/10\n\n`;
      content += `**Reasoning:** ${expert.reasoning}\n\n`;
      content += `**Sources:**\n`;
      expert.sources.forEach(source => {
        content += `- [${source.title}](${source.url})`;
        if (source.relevance) content += ` - ${source.relevance}`;
        content += `\n`;
      });
      content += `\n`;
    });

    // Contrarian Observations
    if (report.contrarian_observations.length > 0) {
      content += `## 🎯 Contrarian Observations\n\n`;
      report.contrarian_observations.forEach((contrarian, index) => {
        content += `### Contrarian Challenge ${index + 1}\n\n`;
        content += `**Critique:** ${contrarian.critique}\n\n`;
        content += `**Alternative Framework:** ${contrarian.alternative_framework}\n\n`;
        content += `**Blind Spots Identified:**\n`;
        contrarian.blind_spots.forEach(spot => {
          content += `- ${spot}\n`;
        });
        content += `\n`;
        
        if (contrarian.counter_evidence && contrarian.counter_evidence.length > 0) {
          content += `**Counter-Evidence:**\n`;
          contrarian.counter_evidence.forEach(evidence => {
            content += `- [${evidence.title}](${evidence.url}): ${evidence.summary}\n`;
          });
          content += `\n`;
        }
      });
    }

    // Dissenting Views
    if (report.dissenting_views.length > 0) {
      content += `## 🔄 Dissenting Views\n\n`;
      report.dissenting_views.forEach((dissent, index) => {
        content += `### Dissenting Position ${index + 1}\n\n`;
        content += `**Position:** ${dissent.position}\n\n`;
        content += `**Reasoning:** ${dissent.reasoning}\n\n`;
        content += `**Supporting Sources:**\n`;
        dissent.sources.forEach(source => {
          content += `- [${source.title}](${source.url})\n`;
        });
        content += `\n`;
      });
    }

    // Round History
    content += `## 📋 Round History\n\n`;
    report.round_history.forEach((round) => {
      content += `### Round ${round.round_number}\n\n`;
      content += `- **Participation:** ${round.participation_count} experts\n`;
      content += `- **Average Confidence:** ${round.average_confidence.toFixed(1)}/10\n`;
      content += `- **Clusters:** ${round.clusters.length}\n`;
      content += `- **Consensus Areas:** ${round.consensus_areas.length}\n`;
      content += `- **Divergence Areas:** ${round.divergence_areas.length}\n\n`;
    });

    content += `---\n\n`;
    content += `*This report was generated by DelphiAgent - AI-Augmented Delphi Consensus Tool*\n`;

    return content;
  }

  /**
   * Set maximum number of rounds
   */
  setMaxRounds(maxRounds: number): void {
    this.maxRounds = Math.max(1, Math.min(5, maxRounds));
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{ openai: boolean; perplexity: boolean }> {
    console.log('🔍 Running health checks...');
    
    const results = {
      openai: false,
      perplexity: false
    };

    try {
      const openaiTest = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });
      results.openai = !!openaiTest.choices[0]?.message?.content;
    } catch (error) {
      console.error('OpenAI health check failed:', error);
    }

    try {
      results.perplexity = await this.perplexity.healthCheck();
    } catch (error) {
      console.error('Perplexity health check failed:', error);
    }

    console.log('Health check results:', results);
    return results;
  }
}

// Export for use as a library
export default DelphiAgent; 
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { safeChatCompletion } from './utils/openai-helpers.js';
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
    expertCount: number = 5
  ): Promise<DelphiReport> {
    console.log(`\n🚀 Starting Delphi process: "${prompt.question}"`);
    console.log(`📊 Configuration: ${expertCount} experts, max ${this.maxRounds} rounds\n`);

    // Structured log for all agent requests/responses
    const agentLogs: any[] = [];

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
        failedExperts?: { role: string; error: string }[];
      }[] = [];

      // Execute Delphi rounds
      for (let round = 1; round <= this.maxRounds; round++) {
        console.log(`\n📋 === ROUND ${round} ===`);
        
        const roundResult = await this.executeRoundWithValidation(
          round,
          prompt,
          round > 1 ? roundResults[round - 2].synthesis : undefined,
          personas,
          agentLogs
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
      const report = await this.generateFinalReportWithSupport(
        prompt,
        roundResults,
        personas.length
      );
      
      // Save report to file
      await this.saveReport(report);
      // Save agent logs to file
      await this.saveAgentLogs(agentLogs, prompt.question);

      console.log(`\n🎉 Delphi process completed successfully!`);
      console.log(`📄 Report saved to: ${this.getReportFilename(prompt.question)}`);

      return report;

    } catch (error) {
      console.error('\n❌ Delphi process failed:', error);
      throw new Error(`Delphi process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a single round of the Delphi process, logging failed expert validations
   */
  private async executeRoundWithValidation(
    roundNumber: number,
    prompt: DelphiPrompt,
    previousSynthesis: RoundSynthesis | undefined,
    _personas: PersonaSpec[],
    agentLogs: any[]
  ): Promise<{
    expertResponses: ExpertResponse[];
    synthesis: RoundSynthesis;
    contrarianResponses: ContrarianResponse[];
    failedExperts: { role: string; error: string }[];
  }> {
    // Phase 0: Perplexity background research (batch)
    console.log(`\n🔎 Phase 0: Perplexity background research (shared)`);
    let perplexityBackground: { content: string; citations: any[]; searchResults: any[] } = { content: '', citations: [], searchResults: [] };
    try {
      perplexityBackground = await this.perplexity.search({
        query: prompt.question,
        searchContextSize: 'low'
      });
      console.log(`   ✅ Perplexity background research complete (shared with all experts)`);
    } catch (error) {
      console.warn('   ⚠️  Perplexity background research failed:', error);
    }

    // Phase 1: Expert responses
    console.log(`\n🧠 Phase 1: Gathering expert opinions (${this.experts.length} experts)`);
    
    const expertResponses: ExpertResponse[] = [];
    const failedExperts: { role: string; error: string }[] = [];
    const synthesisContext = previousSynthesis ? 
      this.orchestrator.formatSynthesisForReview(previousSynthesis) : undefined;

    // Gather expert responses in parallel for efficiency
    const expertPromises = this.experts.map(async (expert, index) => {
      try {
        console.log(`   [${index + 1}/${this.experts.length}] ${expert.getRole()} responding...`);
        // Restore original Perplexity methods if previously patched
        if ((expert as any)._originalPerplexitySearch) {
          expert['perplexity'].search = (expert as any)._originalPerplexitySearch;
          expert['perplexity'].searchAcademic = (expert as any)._originalPerplexitySearchAcademic;
          expert['perplexity'].searchRecent = (expert as any)._originalPerplexitySearchRecent;
          expert['perplexity'].searchDomains = (expert as any)._originalPerplexitySearchDomains;
        }
        // Pass Perplexity background as part of context
        const expertPrompt = {
          ...prompt,
          context: [
            prompt.context || '',
            `\n---\nPerplexity background research (shared):\n${perplexityBackground.content}\nCitations: ${perplexityBackground.citations.map(c => `${c.title}: ${c.url}`).join(' | ')}`,
            synthesisContext || ''
          ].filter(Boolean).join('\n\n')
        };
        // Adjust expert prompt to encourage use of shared research
        (expert as any).promptTemplate = (expert as any).promptTemplate.replace(
          'Please provide your expert analysis as a',
          'Please use the shared background research and citations provided below. Only request additional web/academic search if absolutely necessary for a unique point. Provide your expert analysis as a'
        );
        // Log request
        const logEntry: any = {
          agent_type: 'expert',
          agent_id: expert.getId(),
          role: expert.getRole(),
          round: roundNumber,
          request: expertPrompt,
        };
        const response = await expert.generateResponse(expertPrompt, undefined, roundNumber);
        logEntry.response = response;
        agentLogs.push(logEntry);
        return response;
      } catch (error: any) {
        console.error(`   ❌ Expert ${expert.getRole()} failed:`, error);
        failedExperts.push({ role: expert.getRole(), error: error?.toString() });
        return null;
      }
    });

    const expertResults = await Promise.all(expertPromises);
    expertResults.forEach(result => {
      if (result) expertResponses.push(result);
    });

    console.log(`   ✅ Collected ${expertResponses.length} expert responses (of ${this.experts.length})`);
    if (failedExperts.length > 0) {
      console.warn(`   ⚠️  ${failedExperts.length} expert(s) failed validation.`);
      failedExperts.forEach(f => console.warn(`      - ${f.role}: ${f.error}`));
    }

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
          // Log request
          const logEntry: any = {
            agent_type: 'contrarian',
            agent_id: contrarian.getId(),
            role: `Contrarian ${index + 1}`,
            round: roundNumber,
            request: {
              synthesis,
              dominantClusters
            }
          };
          const response = await contrarian.generateResponse(synthesis, dominantClusters);
          logEntry.response = response;
          agentLogs.push(logEntry);
          return response;
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
      contrarianResponses,
      failedExperts
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
   * Generate the final Delphi report, clarifying support level
   */
  private async generateFinalReportWithSupport(
    prompt: DelphiPrompt,
    roundResults: Array<{
      expertResponses: ExpertResponse[];
      synthesis: RoundSynthesis;
      contrarianResponses: ContrarianResponse[];
      failedExperts?: { role: string; error: string }[];
    }>,
    totalExperts: number
  ) {
    console.log(`\n📝 Generating final report`);

    const finalRound = roundResults[roundResults.length - 1];
    const allExpertResponses = roundResults.flatMap(r => r.expertResponses);
    const allContrarianResponses = roundResults.flatMap(r => r.contrarianResponses);
    const convergenceMetrics = this.convergenceTracker.calculateMetrics();
    const failedExperts = roundResults.flatMap(r => r.failedExperts || []);

    // Generate consensus summary using AI
    const consensusSummary = await this.generateConsensusSummaryWithSupport(
      finalRound.synthesis,
      allExpertResponses,
      totalExperts
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
      generated_at: new Date(),
      failed_experts: failedExperts
    } as any;

    return report;
  }

  /**
   * Generate AI-powered consensus summary, clarifying support level
   */
  private async generateConsensusSummaryWithSupport(
    finalSynthesis: RoundSynthesis,
    allResponses: ExpertResponse[],
    totalExperts: number
  ) {
    // Defensive: supporters cannot exceed total experts
    const supporters = Math.min(allResponses.length, totalExperts);
    const prompt = `Based on the following Delphi process results, generate a consensus summary:

FINAL SYNTHESIS:
${JSON.stringify(finalSynthesis, null, 2)}

Generate a JSON response with:
{
  "final_position": "Clear statement of the consensus position",
  "support_level": "${supporters} of ${totalExperts} experts support this position (the rest failed validation or did not respond)",
  "confidence_level": average_confidence_score,
  "key_evidence": [{"title": "...", "url": "...", "relevance": "..."}]
}`;

    const completion = await safeChatCompletion(this.openai, {
      model: this.config.openai.model,
      messages: [
        { role: 'system', content: 'You are generating a consensus summary for a Delphi process. Be clear and objective.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const content = completion.choices[0]?.message?.content;
    let text = content;

    // If no content returned (model/param incompatibilities), retry once with a safe baseline model and no temperature
    if (!text) {
      try {
        const retry = await safeChatCompletion(this.openai, {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are generating a consensus summary for a Delphi process. Be clear and objective.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000
        });
        text = retry.choices[0]?.message?.content || '';
      } catch {
        // ignore and fall back to deterministic summary
      }
    }

    // Deterministic fallback to guarantee pipeline completion
    if (!text) {
      return {
        final_position: finalSynthesis.consensus_areas?.[0] || "Multiple expert perspectives were synthesized",
        support_level: `${allResponses.length} of ${totalExperts} experts supported (the rest failed validation or did not respond)`,
        confidence_level: finalSynthesis.average_confidence,
        key_evidence: []
      };
    }

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonString);
    } catch (error) {
      // Fallback summary
      return {
        final_position: "Multiple expert perspectives were synthesized",
        support_level: `${allResponses.length} of ${totalExperts} experts supported (the rest failed validation or did not respond)`,
        confidence_level: finalSynthesis.average_confidence,
        key_evidence: []
      };
    }
  }

  /**
   * Identify dissenting views from the main consensus
   */
  private identifyDissentingViews(synthesis: RoundSynthesis, responses: ExpertResponse[]) {
    // Find the largest cluster
    let largestCluster: { expert_ids: string[] } = { expert_ids: [] };
    if (synthesis.clusters && synthesis.clusters.length > 0) {
      largestCluster = synthesis.clusters.reduce((largest, current) =>
        current.expert_ids.length > largest.expert_ids.length ? current : largest,
        synthesis.clusters[0]
      );
    }
    // Dissenters: not in the largest cluster
    const dissentingExperts = responses.filter(response =>
      !largestCluster.expert_ids.includes(response.agent_id)
    );
    // If all are in the largest cluster, no dissenters
    if (dissentingExperts.length === 0) return [];
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
   * Save agent logs to file for frontend/debugging
   */
  private async saveAgentLogs(agentLogs: any[], question: string): Promise<void> {
    if (!existsSync('output')) {
      mkdirSync('output', { recursive: true });
    }
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const sanitizedQuestion = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
    const logFile = `output/agent-logs-${timestamp}-${sanitizedQuestion}.json`;
    writeFileSync(logFile, JSON.stringify(agentLogs, null, 2), 'utf-8');
    console.log(`📝 Agent logs saved to: ${logFile}`);
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
      const openaiTest = await safeChatCompletion(this.openai, {
        model: this.config.openai.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });
      results.openai = Array.isArray(openaiTest.choices) && openaiTest.choices.length > 0;
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

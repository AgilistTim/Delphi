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
import { CostTracker } from './utils/cost-tracker.js';
import { refineQuestion, formatQuestionAnalysisForExperts } from './utils/question-refiner.js';

import {
  DelphiPrompt,
  ExpertResponse,
  ContrarianResponse,
  RoundSynthesis,
  DelphiReport,
  AgentConfig,
  APIConfig,
  QuestionAnalysis,
  CounterfactualRiskAnalysis,
  OppositionalCase,
  AssumptionExposure,
  ConvergenceMetrics
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
    
    // Initialize cost tracker
    const costTracker = new CostTracker();

    try {
      // Phase 0: Question Refiner - analyze the question before anything else
      console.log(`\n🔍 Phase 0: Analyzing question structure...`);
      let questionAnalysis: QuestionAnalysis | undefined;
      try {
        questionAnalysis = await refineQuestion(
          this.openai, 
          prompt.question, 
          this.config.openai.model,
          costTracker
        );
        console.log(`   ✅ Question analysis complete`);
        console.log(`   📋 Decision type: ${questionAnalysis.decision_type}`);
        console.log(`   ⏱️  Time horizon: ${questionAnalysis.time_horizon}`);
        console.log(`   🎯 Primary objective: ${questionAnalysis.primary_objective}`);
        console.log(`   ⚠️  Ambiguity score: ${(questionAnalysis.ambiguity_score * 100).toFixed(0)}%`);
        if (questionAnalysis.unknowns.length > 0) {
          console.log(`   ❓ Key unknowns: ${questionAnalysis.unknowns.length}`);
        }
      } catch (error) {
        console.warn(`   ⚠️  Question analysis failed, continuing without:`, error);
      }

      // Enhance prompt context with question analysis if available
      const enhancedPrompt: DelphiPrompt = questionAnalysis ? {
        ...prompt,
        context: [
          prompt.context || '',
          formatQuestionAnalysisForExperts(questionAnalysis)
        ].filter(Boolean).join('\n\n')
      } : prompt;

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
          enhancedPrompt,
          round > 1 ? roundResults[round - 2].synthesis : undefined,
          round > 1 ? roundResults[round - 2].contrarianResponses : [],
          personas,
          agentLogs,
          costTracker
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

      // Generate final report (include personas for PDF export)
      const report = await this.generateFinalReportWithSupport(
        prompt,
        roundResults,
        personas,
        questionAnalysis,
        costTracker
      );
      
      // Save report to file
      await this.saveReport(report);
      // Save agent logs to file
      await this.saveAgentLogs(agentLogs, prompt.question);

      // Log cost summary
      const costSummary = costTracker.getSummary();
      console.log(`\n💰 Cost Summary:`);
      console.log(`   Total tokens: ${costSummary.total_tokens.toLocaleString()}`);
      console.log(`   Estimated cost: $${costSummary.estimated_total_cost_usd.toFixed(4)}`);
      console.log(`   OpenAI calls: ${costSummary.openai_calls}`);
      console.log(`   Perplexity calls: ${costSummary.perplexity_calls}`);

      console.log(`\n🎉 Delphi process completed successfully!`);
      console.log(`📄 Report saved to: ${this.getReportFilename(prompt.question)}`);

      return report;

    } catch (error) {
      console.error('\n❌ Delphi process failed:', error);
      throw new Error(`Delphi process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Group personas by expertise category for targeted searches
   */
  private groupPersonasByExpertise(personas: PersonaSpec[]): Map<string, PersonaSpec[]> {
    const groups = new Map<string, PersonaSpec[]>();
    
    for (const persona of personas) {
      const category = this.categorizeExpertise(persona);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(persona);
    }
    
    return groups;
  }

  /**
   * Categorize a persona's expertise into a search category
   */
  private categorizeExpertise(persona: PersonaSpec): string {
    const expertise = (persona.domain_expertise || '').toLowerCase();
    const role = (persona.role || '').toLowerCase();
    const orgType = (persona.organization_type || '').toLowerCase();
    const combined = `${expertise} ${role} ${orgType}`;
    
    if (combined.match(/policy|government|regulation|legal|law|compliance|public/)) {
      return 'policy_regulatory';
    }
    if (combined.match(/academic|research|professor|university|science|phd/)) {
      return 'academic_research';
    }
    if (combined.match(/business|industry|corporate|cto|ceo|executive|startup|enterprise/)) {
      return 'industry_business';
    }
    if (combined.match(/ethics|philosophy|social|humanitarian|ngo|non-profit/)) {
      return 'ethics_social';
    }
    return 'general';
  }

  /**
   * Generate a persona-specific search query based on expertise category
   */
  private generateCategorySearchQuery(category: string, baseQuestion: string): string {
    const prefixes: Record<string, string> = {
      'policy_regulatory': 'government policy regulatory framework legal implications',
      'academic_research': 'academic research scientific studies peer-reviewed',
      'industry_business': 'industry trends business implementation enterprise adoption',
      'ethics_social': 'ethical considerations social impact humanitarian perspective',
      'general': ''
    };
    
    const prefix = prefixes[category] || '';
    return prefix ? `${prefix}: ${baseQuestion}` : baseQuestion;
  }

  /**
   * Execute a single round of the Delphi process, logging failed expert validations
   */
  private async executeRoundWithValidation(
    roundNumber: number,
    prompt: DelphiPrompt,
    previousSynthesis: RoundSynthesis | undefined,
    previousContrarianResponses: ContrarianResponse[],
    personas: PersonaSpec[],
    agentLogs: any[],
    costTracker?: CostTracker
  ): Promise<{
    expertResponses: ExpertResponse[];
    synthesis: RoundSynthesis;
    contrarianResponses: ContrarianResponse[];
    failedExperts: { role: string; error: string }[];
  }> {
    // Phase 0: Perplexity background research (persona-targeted batch)
    console.log(`\n🔎 Phase 0: Perplexity background research (persona-targeted)`);
    
    // Group personas by expertise category
    const expertiseGroups = this.groupPersonasByExpertise(personas);
    const categoryResearch: Map<string, { content: string; citations: any[]; searchResults: any[] }> = new Map();
    
    // Shared baseline research
    let sharedBaseline: { content: string; citations: any[]; searchResults: any[] } = { content: '', citations: [], searchResults: [] };
    try {
      console.log(`   [1/${expertiseGroups.size + 1}] Baseline search...`);
      sharedBaseline = await this.perplexity.search({
        query: prompt.question,
        searchContextSize: 'low'
      });
      if (costTracker) {
        costTracker.addPerplexityCall(sharedBaseline.content.length / 4, this.config.perplexity.model);
      }
      console.log(`   ✅ Baseline research complete`);
    } catch (error) {
      console.warn('   ⚠️  Baseline research failed:', error);
    }
    
    // Sequential persona-targeted searches (with delays to avoid rate limiting)
    let searchIndex = 2;
    for (const [category, _groupPersonas] of expertiseGroups) {
      if (category === 'general') continue; // Skip general category, use baseline
      
      try {
        console.log(`   [${searchIndex}/${expertiseGroups.size + 1}] ${category} search...`);
        
        // Add delay between searches to avoid rate limiting (2 seconds)
        if (searchIndex > 2) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const categoryQuery = this.generateCategorySearchQuery(category, prompt.question);
        const result = await this.perplexity.search({
          query: categoryQuery,
          searchContextSize: 'low'
        });
        if (costTracker) {
          costTracker.addPerplexityCall(result.content.length / 4, this.config.perplexity.model);
        }
        categoryResearch.set(category, result);
        console.log(`   ✅ ${category} research complete`);
      } catch (error) {
        console.warn(`   ⚠️  ${category} research failed:`, error);
        // Fall back to baseline for this category
        categoryResearch.set(category, sharedBaseline);
      }
      searchIndex++;
    }
    
    console.log(`   ✅ All persona-targeted research complete (${categoryResearch.size + 1} searches)`);
    
    // Create a mapping from persona to their tailored research
    const personaResearchMap = new Map<string, { content: string; citations: any[] }>();
    for (const persona of personas) {
      const category = this.categorizeExpertise(persona);
      const categoryData = categoryResearch.get(category) || sharedBaseline;
      
      // Combine baseline + category-specific research
      const combinedContent = [
        `Shared baseline research:\n${sharedBaseline.content}`,
        category !== 'general' && categoryData !== sharedBaseline 
          ? `\n\n${category.replace('_', ' ')} perspective research:\n${categoryData.content}`
          : ''
      ].filter(Boolean).join('');
      
      const combinedCitations = [
        ...sharedBaseline.citations,
        ...(categoryData !== sharedBaseline ? categoryData.citations : [])
      ];
      
      personaResearchMap.set(persona.role, { content: combinedContent, citations: combinedCitations });
    }

    // Phase 1: Expert responses
    console.log(`\n🧠 Phase 1: Gathering expert opinions (${this.experts.length} experts)`);
    
    const expertResponses: ExpertResponse[] = [];
    const failedExperts: { role: string; error: string }[] = [];
    const synthesisContext = previousSynthesis ? 
      this.orchestrator.formatSynthesisForReview(previousSynthesis) : undefined;

    // Format contrarian challenges as required agenda items for experts to address
    const contrarianChallengesContext = previousContrarianResponses.length > 0 
      ? this.formatContrarianChallengesForExperts(previousContrarianResponses)
      : undefined;

    // Gather expert responses in parallel for efficiency
    const expertPromises = this.experts.map(async (expert, index) => {
      try {
        console.log(`   [${index + 1}/${this.experts.length}] ${expert.getRole()} responding...`);
        
        // Get persona-specific research for this expert
        const expertResearch = personaResearchMap.get(expert.getRole()) || { content: sharedBaseline.content, citations: sharedBaseline.citations };
        
        // Pass persona-targeted Perplexity research as part of context
        const expertPrompt = {
          ...prompt,
          context: [
            prompt.context || '',
            `\n---\nPerplexity background research (tailored to your expertise):\n${expertResearch.content}\nCitations: ${expertResearch.citations.map((c: any) => `${c.title}: ${c.url}`).join(' | ')}`,
            synthesisContext || '',
            contrarianChallengesContext || ''
          ].filter(Boolean).join('\n\n')
        };
        // Adjust expert prompt to encourage use of tailored research
        (expert as any).promptTemplate = (expert as any).promptTemplate.replace(
          'Please provide your expert analysis as a',
          'Please use the background research and citations provided below, which have been tailored to your area of expertise. Provide your expert analysis as a'
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
    personas: PersonaSpec[],
    questionAnalysis?: QuestionAnalysis,
    costTracker?: CostTracker
  ) {
    console.log(`\n📝 Generating final report`);

    const totalExperts = personas.length;
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

    // Generate counterfactual risk analysis (runs AFTER consensus classification, BEFORE PDF assembly)
    const counterfactualRisk = await this.generateCounterfactualRiskAnalysis(
      consensusSummary,
      convergenceMetrics
    );

    // Generate oppositional case (runs AFTER counterfactual analysis, BEFORE PDF assembly)
    // This is adversarial advocacy, not risk analysis
    const oppositionalCase = await this.generateOppositionalCase(consensusSummary);

    // Generate assumption exposures (runs AFTER oppositional case, preserves tension without rebuttal)
    // Forces consensus to acknowledge what would have to be wrong for OC to be correct
    const assumptionExposures = await this.generateAssumptionExposures(
      oppositionalCase,
      finalRound.expertResponses
    );

    // Map personas to expert_personas format with agent_id linkage
    const expertPersonas = personas.map((persona, index) => ({
      name: persona.name,
      role: persona.role,
      domain_expertise: persona.domain_expertise,
      perspective: persona.perspective,
      work_background: persona.work_background,
      education_history: persona.education_history,
      justification: persona.justification,
      description: persona.description,
      age: persona.age,
      gender: persona.gender,
      nationality: persona.nationality,
      location: persona.location,
      years_experience: persona.years_experience,
      organization_type: persona.organization_type,
      notable_achievements: persona.notable_achievements,
      potential_biases: persona.potential_biases,
      communication_style: persona.communication_style,
      agent_id: this.experts[index]?.getId()
    }));

    const roundResultsForReport = roundResults.map((r, index) => ({
      round_number: index + 1,
      synthesis: r.synthesis,
      expert_responses: r.expertResponses,
      contrarian_responses: r.contrarianResponses
    }));

    const report: DelphiReport = {
      prompt,
      question_analysis: questionAnalysis,
      consensus_summary: consensusSummary,
      expert_positions: finalRound.expertResponses,
      expert_personas: expertPersonas,
      contrarian_observations: allContrarianResponses,
      dissenting_views: dissentingViews,
      convergence_analysis: convergenceMetrics,
      round_history: roundResults.map(r => r.synthesis),
      round_results: roundResultsForReport,
      cost_summary: costTracker?.getSummary(),
      counterfactual_risk: counterfactualRisk,
      oppositional_case: oppositionalCase,
      assumption_exposures: assumptionExposures,
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
   * Generate counterfactual risk analysis - stress tests the dominant conclusion
   * Runs AFTER consensus classification, BEFORE PDF assembly
   * Completely question-agnostic - frames everything relative to "the dominant conclusion"
   */
  private async generateCounterfactualRiskAnalysis(
    consensusSummary: { final_position: string; confidence_level: number },
    convergenceMetrics: ConvergenceMetrics
  ): Promise<CounterfactualRiskAnalysis> {
    console.log(`\n🔮 Generating counterfactual risk analysis...`);

    const consensusNature = convergenceMetrics.consensus_classification?.nature || 'mixed';
    const consensusType = convergenceMetrics.consensus_type;

    const prompt = `You are a risk analyst stress-testing a dominant conclusion from a multi-expert deliberation process.

CONTEXT:
- Consensus Type: ${consensusType}
- Consensus Nature: ${consensusNature}
- Confidence Level: ${consensusSummary.confidence_level.toFixed(1)}/10
- Dominant Position: "${consensusSummary.final_position}"

YOUR TASK:
Generate a counterfactual risk analysis that stress-tests this dominant conclusion. You must be completely question-agnostic - do NOT reference the specific topic. Frame everything relative to "the dominant conclusion" or "this position."

Generate exactly three items in JSON format:

{
  "plausible_failure": "If the dominant conclusion is wrong, describe ONE specific, realistic way it could fail in the real world. Be concrete about the failure mechanism.",
  "why_missed_early": "Explain why this failure would NOT be detected quickly. What makes it invisible or easy to dismiss initially?",
  "early_warning_signal": "Identify ONE specific, observable indicator that would signal this failure is occurring. This should be something measurable or noticeable."
}

CONSTRAINTS:
- Do NOT reference the specific topic or question
- Do NOT use hedging language ("may", "might", "could possibly", "it depends")
- Be direct and assertive
- Each response should be 1-3 sentences
- Focus on structural/systemic failure modes, not surface-level concerns`;

    try {
      const completion = await safeChatCompletion(this.openai, {
        model: this.config.openai.model,
        messages: [
          { role: 'system', content: 'You are a risk analyst who identifies how confident conclusions can fail. Be direct, specific, and avoid hedging.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? jsonMatch[0] : content;
          const parsed = JSON.parse(jsonString);
          
          console.log(`   ✅ Counterfactual risk analysis generated`);
          return {
            plausible_failure: parsed.plausible_failure || 'Analysis unavailable',
            why_missed_early: parsed.why_missed_early || 'Analysis unavailable',
            early_warning_signal: parsed.early_warning_signal || 'Analysis unavailable'
          };
        } catch {
          console.warn('   ⚠️ Failed to parse counterfactual JSON, using fallback');
        }
      }
    } catch (error) {
      console.error('Counterfactual analysis generation failed:', error);
    }

    // Fallback based on consensus type
    return this.generateFallbackCounterfactual(consensusType);
  }

  /**
   * Generate fallback counterfactual analysis when AI generation fails
   */
  private generateFallbackCounterfactual(
    consensusType: string
  ): CounterfactualRiskAnalysis {
    const fallbacks: Record<string, CounterfactualRiskAnalysis> = {
      strong: {
        plausible_failure: 'Strong consensus often masks underlying assumptions that become invalid when context shifts. The dominant conclusion fails when the implicit conditions it depends on no longer hold.',
        why_missed_early: 'High agreement creates confidence that discourages re-examination. Dissenting signals are dismissed as outliers rather than early warnings.',
        early_warning_signal: 'Watch for edge cases where the conclusion produces unexpected results, or stakeholders who quietly stop following the recommended approach.'
      },
      conditional: {
        plausible_failure: 'The conditions that make this conclusion valid are more fragile than acknowledged. When one key condition fails, the entire framework collapses.',
        why_missed_early: 'Conditional conclusions encourage "it depends" thinking that delays recognition of systematic failure patterns.',
        early_warning_signal: 'Monitor whether the stated conditions are actually being met in practice, not just assumed to be present.'
      },
      divergent: {
        plausible_failure: 'The dominant position among divergent views wins by default rather than merit. Minority positions may contain crucial insights being overlooked.',
        why_missed_early: 'Divergence is treated as unresolved disagreement rather than a signal that the problem is being framed incorrectly.',
        early_warning_signal: 'Track whether minority viewpoints gain traction over time, or whether the dominant view requires increasingly complex justifications.'
      },
      operational: {
        plausible_failure: 'Operational consensus prioritizes what works now over what will work later. The dominant conclusion optimizes for current constraints that will change.',
        why_missed_early: 'Short-term success reinforces the approach, making it harder to see accumulating long-term costs.',
        early_warning_signal: 'Look for growing technical debt, workarounds, or exceptions that indicate the approach is becoming harder to maintain.'
      }
    };

    return fallbacks[consensusType] || fallbacks['strong'];
  }

  /**
   * Generate oppositional case - argues the opposite of the dominant conclusion
   * Runs AFTER counterfactual analysis, BEFORE PDF assembly
   * This is NOT risk analysis - it's adversarial advocacy
   */
  private async generateOppositionalCase(
    consensusSummary: { final_position: string; confidence_level: number }
  ): Promise<OppositionalCase> {
    console.log(`\n⚔️ Generating oppositional case...`);

    const prompt = `You are an oppositional advocate. Your job is to produce the strongest defensible case AGAINST a dominant conclusion.

You do NOT balance. You do NOT reconcile. You do NOT hedge. You do NOT seek truth.

Your role is adversarial advocacy - argue the opposite position as if it were correct, rational, and defensible.

DOMINANT CONCLUSION:
"${consensusSummary.final_position}"

YOUR TASK:
1. State the OPPOSITE position in one clear sentence (logically negate the dominant conclusion)
2. Write ONE coherent argument for why this opposite position is correct
3. Describe ONE real-world scenario where this opposite position would outperform the consensus
4. State ONE uncomfortable implication that the consensus avoids acknowledging

Generate your response in JSON format:

{
  "opposite_position": "The negated position stated clearly in one sentence",
  "argument": "A coherent 2-3 sentence argument for why the opposite conclusion is correct, rational, and defensible",
  "outperformance_scenario": "A specific, concrete scenario where following the opposite position would produce better outcomes than following the consensus",
  "uncomfortable_implication": "One sharp sentence about what the consensus avoids saying"
}

FORBIDDEN:
- Do NOT use: "may", "might", "could possibly", "it depends", "however", "balanced", "on the other hand"
- Do NOT reconcile the positions
- Do NOT add safety disclaimers
- Do NOT mention you are role-playing
- Do NOT use phrases like "as an AI", "I can't", "it's important to note", "both sides"
- Do NOT reference ethics, safety, or uncertainty

Be sharp. Be direct. Argue as if lives, money, or careers depend on the opposite position being correct.`;

    try {
      const completion = await safeChatCompletion(this.openai, {
        model: this.config.openai.model,
        messages: [
          { role: 'system', content: 'You are an oppositional advocate. Your job is to argue the opposite of any conclusion as if it were correct. You never balance, reconcile, or hedge. You are trying to persuade a hostile but intelligent decision-maker.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 600
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const jsonString = jsonMatch ? jsonMatch[0] : content;
          const parsed = JSON.parse(jsonString);
          
          console.log(`   ✅ Oppositional case generated`);
          return {
            opposite_position: parsed.opposite_position || 'Position unavailable',
            argument: parsed.argument || 'Argument unavailable',
            outperformance_scenario: parsed.outperformance_scenario || 'Scenario unavailable',
            uncomfortable_implication: parsed.uncomfortable_implication || 'Implication unavailable'
          };
        } catch {
          console.warn('   ⚠️ Failed to parse oppositional case JSON, using fallback');
        }
      }
    } catch (error) {
      console.error('Oppositional case generation failed:', error);
    }

    // Fallback - generic oppositional framing
    return this.generateFallbackOppositionalCase();
  }

  /**
   * Generate fallback oppositional case when AI generation fails
   */
  private generateFallbackOppositionalCase(): OppositionalCase {
    return {
      opposite_position: `The opposite of the dominant conclusion deserves serious consideration.`,
      argument: `The dominant position succeeds by defining the problem in a way that guarantees its own answer. Reframe the problem and the conclusion inverts. The consensus reflects the biases of those who shaped the question, not the reality of the situation.`,
      outperformance_scenario: `In environments where the implicit assumptions of the consensus break down - rapid change, adversarial conditions, or resource constraints - the opposite approach often proves more robust precisely because it doesn't depend on favorable conditions.`,
      uncomfortable_implication: `The consensus exists because it's comfortable to believe, not because it's correct.`
    };
  }

  /**
   * Generate assumption exposures - what must fail for the oppositional case to win
   * Runs AFTER oppositional case, preserves tension without rebuttal
   * No defense, no dismissal, just assumption exposure
   */
  private async generateAssumptionExposures(
    oppositionalCase: OppositionalCase,
    expertResponses: ExpertResponse[]
  ): Promise<AssumptionExposure[]> {
    console.log(`\n🔍 Generating assumption exposures...`);

    const expertSummaries = expertResponses.map((r, i) => ({
      label: r.expertise_area || `Expert ${i + 1}`,
      position: r.position,
      reasoning: r.reasoning?.substring(0, 300) || ''
    }));

    const prompt = `You are exposing assumptions. Your job is to identify what assumption in each expert's position would FAIL if the oppositional case is correct.

OPPOSITIONAL CASE (the alternative position):
"${oppositionalCase.opposite_position}"

Argument: "${oppositionalCase.argument}"

EXPERT POSITIONS:
${expertSummaries.map((e, i) => `${i + 1}. ${e.label}: "${e.position}"`).join('\n')}

YOUR TASK:
For each expert, state ONE assumption in their position that would fail if the oppositional case is correct.

RULES:
- State the assumption directly. No defense. No rebuttal. No "this is unlikely".
- Do NOT argue why the assumption is valid
- Do NOT dismiss the oppositional case
- Do NOT use: "however", "but", "although", "unlikely", "probably still", "nevertheless"
- Do NOT reconcile the positions
- Each assumption must be a single clear sentence

Generate your response as a JSON array:
[
  {"expert_label": "Expert label from above", "failed_assumption": "The assumption that would fail if the oppositional case is correct"},
  ...
]

Be direct. State what must be true for the consensus to hold - and therefore what breaks if the oppositional case wins.`;

    try {
      const completion = await safeChatCompletion(this.openai, {
        model: this.config.openai.model,
        messages: [
          { 
            role: 'system', 
            content: 'You expose assumptions without defending them. You do not rebut. You do not dismiss. You state what must be true for each position to hold.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          const jsonString = jsonMatch ? jsonMatch[0] : content;
          const parsed = JSON.parse(jsonString);
          
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`   ✅ Generated ${parsed.length} assumption exposures`);
            return parsed.map((item: { expert_label?: string; failed_assumption?: string }) => ({
              expert_label: item.expert_label || 'Unknown Expert',
              failed_assumption: item.failed_assumption || 'Assumption unavailable'
            }));
          }
        } catch {
          console.warn('   ⚠️ Failed to parse assumption exposures JSON, using fallback');
        }
      }
    } catch (error) {
      console.error('Assumption exposure generation failed:', error);
    }

    // Fallback - generic assumption exposure
    return this.generateFallbackAssumptionExposures(expertResponses);
  }

  /**
   * Generate fallback assumption exposures when AI generation fails
   */
  private generateFallbackAssumptionExposures(expertResponses: ExpertResponse[]): AssumptionExposure[] {
    return expertResponses.map((r, i) => ({
      expert_label: r.expertise_area || `Expert ${i + 1}`,
      failed_assumption: `This position assumes the conditions that produced the consensus will persist. If those conditions change, the position inverts.`
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

    // Consensus Classification (if available)
    if (report.convergence_analysis.consensus_classification) {
      const cc = report.convergence_analysis.consensus_classification;
      content += `### Consensus Quality\n\n`;
      content += `- **Nature:** ${cc.nature.charAt(0).toUpperCase() + cc.nature.slice(1)}\n`;
      content += `- **Insight Yield:** ${cc.insight_yield.charAt(0).toUpperCase() + cc.insight_yield.slice(1)}\n`;
      content += `- **Risk:** ${cc.risk_statement}\n\n`;
    }

    // PROMINENT: Counterfactual Risk Analysis (If the Dominant Conclusion Is Wrong)
    if (report.counterfactual_risk) {
      const cfr = report.counterfactual_risk;
      content += `## ⚠️ Counterfactual Risk (If the Dominant Conclusion Is Wrong)\n\n`;
      content += `**Plausible failure:** ${cfr.plausible_failure}\n\n`;
      content += `**Why it's missed early:** ${cfr.why_missed_early}\n\n`;
      content += `**Early warning signal:** ${cfr.early_warning_signal}\n\n`;
    }

    // PROMINENT: Oppositional Case (Deliberate Counterpoint)
    if (report.oppositional_case) {
      const oc = report.oppositional_case;
      content += `## ⚔️ Oppositional Case (Deliberate Counterpoint)\n\n`;
      content += `*The strongest defensible argument against the dominant conclusion:*\n\n`;
      content += `### The Opposite Position\n`;
      content += `> ${oc.opposite_position}\n\n`;
      content += `### Argument\n`;
      content += `${oc.argument}\n\n`;
      content += `### When This Position Outperforms\n`;
      content += `${oc.outperformance_scenario}\n\n`;
      content += `### Uncomfortable Implication\n`;
      content += `> ${oc.uncomfortable_implication}\n\n`;
    }

    // PROMINENT: Assumption Exposures (What Must Fail for the Oppositional Case to Win)
    if (report.assumption_exposures && report.assumption_exposures.length > 0) {
      content += `## 🔍 If the Oppositional Case Is Correct...\n\n`;
      content += `*What assumption in each expert's position would fail:*\n\n`;
      report.assumption_exposures.forEach((ae) => {
        content += `**${ae.expert_label}:** ${ae.failed_assumption}\n\n`;
      });
    }

    // PROMINENT: Questions to Consider (Stress Tests for Human Reader)
    if (report.contrarian_observations.length > 0) {
      const hasStressTests = report.contrarian_observations.some(c => c.reasoning_stress_tests);
      if (hasStressTests) {
        content += `## ⚠️ Questions to Consider\n\n`;
        content += `*Before accepting this consensus, consider these challenges to the reasoning:*\n\n`;
        
        report.contrarian_observations.forEach((contrarian) => {
          if (contrarian.reasoning_stress_tests) {
            const tests = contrarian.reasoning_stress_tests;
            content += `### What nuance is being lost?\n`;
            content += `> ${tests.lossy_simplification}\n\n`;
            content += `### When does this advice reverse?\n`;
            content += `> ${tests.context_flip}\n\n`;
            content += `### Who wins, who loses?\n`;
            content += `> ${tests.incentive_misalignment}\n\n`;
            content += `### How does initial success fail later?\n`;
            content += `> ${tests.second_order_failure}\n\n`;
          }
        });
      }
    }

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

    // Legacy Contrarian Observations (for backward compatibility)
    if (report.contrarian_observations.length > 0) {
      const hasLegacyContent = report.contrarian_observations.some(c => c.critique || c.blind_spots?.length);
      if (hasLegacyContent) {
        content += `## 🎯 Additional Contrarian Observations\n\n`;
        report.contrarian_observations.forEach((contrarian, index) => {
          if (contrarian.critique) {
            content += `### Observation ${index + 1}\n\n`;
            content += `**Critique:** ${contrarian.critique}\n\n`;
          }
          if (contrarian.alternative_framework) {
            content += `**Alternative Framework:** ${contrarian.alternative_framework}\n\n`;
          }
          if (contrarian.blind_spots && contrarian.blind_spots.length > 0) {
            content += `**Blind Spots Identified:**\n`;
            contrarian.blind_spots.forEach(spot => {
              content += `- ${spot}\n`;
            });
            content += `\n`;
          }
          
          if (contrarian.counter_evidence && contrarian.counter_evidence.length > 0) {
            content += `**Counter-Evidence:**\n`;
            contrarian.counter_evidence.forEach(evidence => {
              content += `- [${evidence.title}](${evidence.url}): ${evidence.summary}\n`;
            });
            content += `\n`;
          }
        });
      }
    }

    content += `---\n\n`;
    content += `*This report was generated by DelphiAgent - AI-Augmented Delphi Consensus Tool*\n`;

    return content;
  }

  /**
   * Format contrarian stress tests as required agenda items for experts to address
   * These are epistemic stress tests that attack reasoning quality, not conclusions
   */
  private formatContrarianChallengesForExperts(contrarianResponses: ContrarianResponse[]): string {
    if (contrarianResponses.length === 0) return '';

    let formatted = `\n---\n## REQUIRED: Address These Reasoning Stress Tests\n\n`;
    formatted += `The following stress tests challenge the quality of reasoning in the current consensus. You MUST explicitly address each one:\n`;
    formatted += `- Refute with evidence (cite specific sources)\n`;
    formatted += `- Acknowledge the limitation and narrow your claim\n`;
    formatted += `- Explain why this stress test doesn't apply to your position\n\n`;

    contrarianResponses.forEach((response, index) => {
      // Primary: Use the new reasoning stress tests (verbatim injection)
      if (response.reasoning_stress_tests) {
        const tests = response.reasoning_stress_tests;
        formatted += `### Stress Tests (Set ${index + 1})\n\n`;
        formatted += `**1. What nuance is being lost?**\n`;
        formatted += `> ${tests.lossy_simplification}\n\n`;
        formatted += `**2. When does this advice reverse?**\n`;
        formatted += `> ${tests.context_flip}\n\n`;
        formatted += `**3. Who wins, who loses?**\n`;
        formatted += `> ${tests.incentive_misalignment}\n\n`;
        formatted += `**4. How does initial success fail later?**\n`;
        formatted += `> ${tests.second_order_failure}\n\n`;
      }
      
      // Legacy: Support old format for backward compatibility
      if (response.critique) {
        formatted += `**Legacy Critique:** ${response.critique}\n\n`;
      }
      if (response.alternative_framework) {
        formatted += `**Alternative Framework:** ${response.alternative_framework}\n\n`;
      }
      if (response.blind_spots && response.blind_spots.length > 0) {
        formatted += `**Blind Spots:**\n`;
        response.blind_spots.forEach(spot => {
          formatted += `- ${spot}\n`;
        });
        formatted += '\n';
      }
    });

    formatted += `---\n\nYour response must demonstrate engagement with these stress tests. Ignoring them will be considered a weakness in your analysis.\n`;

    return formatted;
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

import { z } from 'zod';

// Core Delphi Process Types
export interface DelphiPrompt {
  question: string;
  context?: string | undefined;
  constraints?: string[] | undefined;
}

export interface Citation {
  title: string;
  url: string;
  date?: string | undefined;
  relevance?: string | undefined;
}

// Justification basis enum for expert responses
export const JustificationBasisEnum = z.enum([
  'research_dominant',
  'experience_dominant', 
  'balanced',
  'theoretical'
]);

export type JustificationBasis = z.infer<typeof JustificationBasisEnum>;

// Epistemic stance types for structured disagreement
export const EpistemicStanceEnum = z.enum([
  'status_quo_defender',
  'methodology_skeptic',
  'implementation_realist',
  'ethics_maximalist',
  'contrarian_challenger',
  'evidence_synthesizer'
]);

export type EpistemicStance = z.infer<typeof EpistemicStanceEnum>;

// Expert Response Schema with Zod validation
export const ExpertResponseSchema = z.object({
  position: z.string().min(10, "Position must be at least 10 characters"),
  reasoning: z.string().min(50, "Reasoning must be at least 50 characters"),
  research_reasoning: z.string().optional(),
  experience_reasoning: z.string().optional(),
  conditional_factors: z.array(z.string()).optional(),
  falsifiability: z.string().optional(),
  strongest_counter_argument: z.string().optional(),
  justification_basis: JustificationBasisEnum.optional(),
  confidence: z.number().min(1).max(10),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    date: z.string().optional(),
    relevance: z.string().optional()
  })).min(1, "At least one source required"),
  expertise_area: z.string(),
  agent_id: z.string()
});

export type ExpertResponse = z.infer<typeof ExpertResponseSchema>;

// Citation Issues Schema for contrarian validation
export const CitationIssuesSchema = z.object({
  uncited_claims: z.array(z.string()).optional(),
  weak_citations: z.array(z.string()).optional(),
  citation_gaps: z.array(z.string()).optional(),
  echo_chamber_risk: z.string().optional()
});

// Assumption Validation Schema
export const AssumptionValidationSchema = z.object({
  assumption: z.string(),
  validity: z.enum(['valid', 'questionable', 'invalid']),
  reasoning: z.string()
});

// Frame Expansion Schema (6 dimensions for contrarian) - DEPRECATED: use ReasoningStressTests
export const FrameExpansionSchema = z.object({
  steelman_opposite_goal: z.string().min(20, "Steelman of opposite goal required"),
  failure_modes: z.array(z.string()).min(1, "At least one failure mode required"),
  second_order_effects: z.array(z.string()).min(1, "At least one second-order effect required"),
  stakeholder_inversion: z.array(z.string()).min(1, "At least one stakeholder inversion required"),
  boundary_conditions: z.array(z.string()).min(1, "At least one boundary condition required"),
  metric_traps: z.array(z.string()).min(1, "At least one metric trap required")
});

// Reasoning Stress Tests Schema - Four epistemic stress tests (topic-agnostic)
// Each test is a short, provocative statement (≤15 words, no hedging)
export const ReasoningStressTestsSchema = z.object({
  // "What is being smoothed over or averaged away?"
  lossy_simplification: z.string().max(100, "Must be ≤15 words"),
  // "In what plausible context does this advice reverse?"
  context_flip: z.string().max(100, "Must be ≤15 words"),
  // "Who benefits if this advice is followed — and who quietly loses?"
  incentive_misalignment: z.string().max(100, "Must be ≤15 words"),
  // "If this works initially, how does it fail later?"
  second_order_failure: z.string().max(100, "Must be ≤15 words")
});

export type ReasoningStressTests = z.infer<typeof ReasoningStressTestsSchema>;

// Contrarian Response Schema
export const ContrarianResponseSchema = z.object({
  // NEW: Four epistemic stress tests - short, provocative, topic-agnostic
  // These attack reasoning quality, not conclusions
  reasoning_stress_tests: ReasoningStressTestsSchema,
  // Legacy fields (still supported for backward compatibility)
  critique: z.string().min(10, "Critique required").optional(),
  alternative_framework: z.string().min(10, "Alternative framework").optional(),
  blind_spots: z.array(z.string()).optional(),
  counter_evidence: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    summary: z.string()
  })).optional(),
  citation_issues: CitationIssuesSchema.optional(),
  assumption_validation: z.array(AssumptionValidationSchema).optional(),
  frame_expansion: FrameExpansionSchema.optional(),
  agent_id: z.string()
});

export type CitationIssues = z.infer<typeof CitationIssuesSchema>;
export type AssumptionValidation = z.infer<typeof AssumptionValidationSchema>;
export type ContrarianResponse = z.infer<typeof ContrarianResponseSchema>;

// Round Synthesis
export interface RoundSynthesis {
  round_number: number;
  clusters: ExpertCluster[];
  consensus_areas: string[];
  divergence_areas: string[];
  average_confidence: number;
  participation_count: number;
  key_insights: string[];
}

// Full Round Result with verbatim responses (for detailed review)
export interface RoundResult {
  round_number: number;
  synthesis: RoundSynthesis;
  expert_responses: ExpertResponse[];
  contrarian_responses: ContrarianResponse[];
}

export interface ExpertCluster {
  theme: string;
  positions: string[];
  expert_ids: string[];
  confidence_range: [number, number];
  supporting_sources: Citation[];
}

// Agent Configuration
export interface AgentConfig {
  role: string;
  expertise_areas: string[];
  perspective: string;
  bias_instructions?: string;
}

// Four-tier consensus classification (HAH-Delphi model)
export type ConsensusType = 
  | 'strong'        // High agreement + high confidence across experts
  | 'conditional'   // Agreement with important caveats or context-dependencies
  | 'operational'   // Practical agreement despite theoretical differences
  | 'divergent';    // Legitimate, stable disagreement that should be preserved

// Epistemic vs Normative consensus classification
// Normative = agreement on values/preferences (low insight yield)
// Epistemic = agreement on facts/analysis (higher insight yield)
export type ConsensusNature = 'normative' | 'epistemic' | 'mixed';

// Insight yield classification - how much novel thinking emerged
export type InsightYield = 'low' | 'medium' | 'high';

// Consensus quality assessment for the final report
export interface ConsensusClassification {
  nature: ConsensusNature; // Is this normative (values) or epistemic (facts)?
  insight_yield: InsightYield; // How much novel insight emerged?
  insight_yield_reasoning: string; // Why this classification?
  risk_statement: string; // e.g., "False confidence through obvious truths"
}

// Counterfactual Risk Analysis - stress tests the dominant conclusion
// Runs AFTER consensus classification, BEFORE PDF assembly
export interface CounterfactualRiskAnalysis {
  // If the dominant conclusion is wrong, how could it fail in the real world?
  plausible_failure: string;
  // Why this failure would not be detected quickly
  why_missed_early: string;
  // One observable indicator that the failure is occurring
  early_warning_signal: string;
}

// Oppositional Case - argues the opposite of the dominant conclusion
// Runs AFTER counterfactual analysis, BEFORE PDF assembly
// This is NOT risk analysis - it's adversarial advocacy
export interface OppositionalCase {
  // The negated position stated explicitly
  opposite_position: string;
  // One coherent argument for why the opposite conclusion is correct
  argument: string;
  // One real-world scenario where this position would outperform the consensus
  outperformance_scenario: string;
  // One uncomfortable implication the consensus avoids
  uncomfortable_implication: string;
}

// Convergence Metrics
export interface ConvergenceMetrics {
  position_stability: number; // 0-1, how many experts changed positions
  confidence_spread: number; // Standard deviation of confidence scores
  consensus_clarity: number; // 0-1, how clear the consensus is
  citation_overlap: number; // 0-1, how much sources overlap between experts
  disagreement_index: number; // 0-1, cluster entropy / effective number of clusters (higher = more disagreement)
  minority_persistence: number; // 0-1, whether minority clusters remain stable vs coerced
  rounds_completed: number;
  termination_reason: 'consensus_reached' | 'max_rounds' | 'divergence_stable';
  consensus_type: ConsensusType; // Four-tier classification
  consensus_type_reasoning: string; // Explanation for the classification
  // NEW: Consensus quality classification for engaging human readers
  consensus_classification?: ConsensusClassification;
}

// Expert Persona Details (for PDF export)
export interface ExpertPersona {
  name: string;
  role: string;
  domain_expertise: string;
  perspective: string;
  work_background: string;
  education_history: string;
  justification: string;
  description: string;
  epistemic_stance?: EpistemicStance;
  initial_position_template?: string;
  age?: number;
  gender?: string;
  nationality?: string;
  location?: string;
  years_experience?: number;
  organization_type?: string;
  notable_achievements?: string[];
  potential_biases?: string[];
  communication_style?: string;
  agent_id?: string;
}

// Final Report Structure
export interface DelphiReport {
  prompt: DelphiPrompt;
  question_analysis?: QuestionAnalysis;
  consensus_summary: {
    final_position: string;
    support_level: string; // e.g., "4 of 5 experts support"
    confidence_level: number;
    key_evidence: Citation[];
  };
  expert_positions: ExpertResponse[];
  expert_personas?: ExpertPersona[];
  contrarian_observations: ContrarianResponse[];
  dissenting_views: {
    position: string;
    expert_ids: string[];
    reasoning: string;
    sources: Citation[];
  }[];
  convergence_analysis: ConvergenceMetrics;
  round_history: RoundSynthesis[];
  round_results?: RoundResult[];
  cost_summary?: CostSummary;
  counterfactual_risk?: CounterfactualRiskAnalysis;
  oppositional_case?: OppositionalCase;
  generated_at: Date;
}

// Agent Types
export type AgentType = 'expert' | 'contrarian' | 'orchestrator';

// Expert Roles (can be randomized or specified)
export const EXPERT_ROLES = [
  'Technology Ethics Specialist',
  'Policy Researcher', 
  'Industry Analyst',
  'Academic Researcher',
  'Legal Expert',
  'Economic Analyst',
  'Social Scientist',
  'Environmental Scientist',
  'Public Health Expert',
  'Security Analyst'
] as const;

export type ExpertRole = typeof EXPERT_ROLES[number];

// API Configuration
export interface APIConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens?: number;
    temperature?: number;
  };
  perplexity: {
    apiKey: string;
    model: string;
    searchContextSize?: 'low' | 'medium' | 'high';
  };
}

// Search Parameters for Perplexity
export interface SearchParams {
  query: string;
  searchMode?: 'web' | 'academic' | 'sec';
  searchContextSize?: 'low' | 'medium' | 'high';
  domainFilter?: string[];
  dateFilter?: {
    after?: string;
    before?: string;
  };
}

export interface SearchResult {
  title: string;
  url: string;
  date?: string;
  summary: string;
  relevance_score?: number;
}

// Question Analysis from Question Refiner stage
export interface QuestionAnalysis {
  original_question: string;
  decision_type: 'strategy' | 'policy' | 'hiring' | 'product' | 'risk' | 'operations' | 'research' | 'other';
  time_horizon: 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'unknown';
  primary_objective: 'speed' | 'accuracy' | 'innovation' | 'cost' | 'safety' | 'quality' | 'multiple' | 'unclear';
  constraints: string[];
  unknowns: string[];
  inferred_assumptions: string[];
  ambiguity_score: number; // 0-1, higher = more ambiguous/vague
  refined_question?: string; // Optional clarified version
}

// Contrarian Frame Expansion (6 dimensions)
export interface FrameExpansion {
  steelman_opposite_goal: string;
  failure_modes: string[];
  second_order_effects: string[];
  stakeholder_inversion: string[];
  boundary_conditions: string[];
  metric_traps: string[];
}

// Token usage tracking
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd?: number;
}

// Cost tracking per agent/round
export interface AgentUsage {
  agent_type: 'expert' | 'contrarian' | 'orchestrator' | 'refiner' | 'perplexity';
  agent_id?: string;
  round?: number;
  usage: TokenUsage;
  model?: string;
}

// Aggregated cost summary
export interface CostSummary {
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  estimated_total_cost_usd: number;
  breakdown_by_agent_type: Record<string, TokenUsage>;
  breakdown_by_round: Record<number, TokenUsage>;
  perplexity_calls: number;
  openai_calls: number;
}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
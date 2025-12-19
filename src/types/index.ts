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

// Contrarian Response Schema
export const ContrarianResponseSchema = z.object({
  critique: z.string().min(50, "Critique must be at least 50 characters"),
  alternative_framework: z.string().min(30, "Alternative framework required"),
  blind_spots: z.array(z.string()).min(1, "At least one blind spot required"),
  counter_evidence: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    summary: z.string()
  })).optional(),
  citation_issues: CitationIssuesSchema.optional(),
  assumption_validation: z.array(AssumptionValidationSchema).optional(),
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
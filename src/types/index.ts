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

// Expert Response Schema with Zod validation
export const ExpertResponseSchema = z.object({
  position: z.string().min(10, "Position must be at least 10 characters"),
  reasoning: z.string().min(50, "Reasoning must be at least 50 characters"),
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
  agent_id: z.string()
});

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

// Convergence Metrics
export interface ConvergenceMetrics {
  position_stability: number; // 0-1, how many experts changed positions
  confidence_spread: number; // Standard deviation of confidence scores
  consensus_clarity: number; // 0-1, how clear the consensus is
  citation_overlap: number; // 0-1, how much sources overlap between experts
  rounds_completed: number;
  termination_reason: 'consensus_reached' | 'max_rounds' | 'divergence_stable';
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
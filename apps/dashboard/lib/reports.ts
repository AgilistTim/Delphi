import fs from 'fs';
import path from 'path';

export type TerminationReason = 'consensus_reached' | 'max_rounds' | 'divergence_stable' | string;

export interface Citation {
  title: string;
  url: string;
  date?: string;
  relevance?: string;
}

export type JustificationBasis = 'research_dominant' | 'experience_dominant' | 'balanced' | 'theoretical';
export type ConsensusType = 'strong' | 'conditional' | 'operational' | 'divergent';
export type EpistemicStance = 
  | 'status_quo_defender'
  | 'methodology_skeptic'
  | 'implementation_realist'
  | 'ethics_maximalist'
  | 'contrarian_challenger'
  | 'evidence_synthesizer';

export type DecisionType = 'strategy' | 'policy' | 'hiring' | 'product' | 'risk' | 'operations' | 'research' | 'other';
export type TimeHorizon = 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'unknown';
export type PrimaryObjective = 'speed' | 'accuracy' | 'innovation' | 'cost' | 'safety' | 'quality' | 'multiple' | 'unclear';

export interface QuestionAnalysis {
  original_question: string;
  decision_type: DecisionType;
  time_horizon: TimeHorizon;
  primary_objective: PrimaryObjective;
  constraints: string[];
  unknowns: string[];
  inferred_assumptions: string[];
  ambiguity_score: number;
  refined_question?: string;
}

export interface FrameExpansion {
  steelman_opposite_goal: string;
  failure_modes: string[];
  second_order_effects: string[];
  stakeholder_inversion: string[];
  boundary_conditions: string[];
  metric_traps: string[];
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd?: number;
}

export interface CostSummary {
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  estimated_total_cost_usd: number;
  openai_calls: number;
  perplexity_calls: number;
  breakdown_by_agent_type: Record<string, TokenUsage>;
  breakdown_by_round: Record<number, TokenUsage>;
}

export interface ExpertResponse {
  position: string;
  reasoning: string;
  research_reasoning?: string;
  experience_reasoning?: string;
  conditional_factors?: string[];
  falsifiability?: string;
  strongest_counter_argument?: string;
  justification_basis?: JustificationBasis;
  confidence: number;
  sources: Citation[];
  expertise_area?: string;
  agent_id?: string;
}

// Reasoning Stress Tests - Four epistemic stress tests (topic-agnostic)
export interface ReasoningStressTests {
  lossy_simplification: string;
  context_flip: string;
  incentive_misalignment: string;
  second_order_failure: string;
}

// Consensus quality classification
export type ConsensusNature = 'normative' | 'epistemic' | 'mixed';
export type InsightYield = 'low' | 'medium' | 'high';

export interface ConsensusClassification {
  nature: ConsensusNature;
  insight_yield: InsightYield;
  insight_yield_reasoning: string;
  risk_statement: string;
}

// Counterfactual Risk Analysis - stress tests the dominant conclusion
export interface CounterfactualRiskAnalysis {
  plausible_failure: string;
  why_missed_early: string;
  early_warning_signal: string;
}

// Oppositional Case - argues the opposite of the dominant conclusion
// This is adversarial advocacy, not risk analysis
export interface OppositionalCase {
  opposite_position: string;
  argument: string;
  outperformance_scenario: string;
  uncomfortable_implication: string;
}

// Assumption Exposure - what must fail for the oppositional case to win
// Preserves tension without rebuttal
export interface AssumptionExposure {
  expert_label: string;
  failed_assumption: string;
}

// Decision Fork - forces reader to acknowledge what they're choosing to risk
// This is NOT new analysis - it extracts risks already implied by the report
export interface DecisionFork {
  prompt: string;
  concrete_risks: string[];
}

// Regime Split Analysis - maps two explicit futures for world-model choice
// Forces reader to confront which regime they believe they are entering
export interface RegimeDescription {
  scarce_resource: string;
  winning_organization: string;
  failure_mode: string;
}

export interface RegimeSplitAnalysis {
  consensus_regime: RegimeDescription;
  oppositional_regime: RegimeDescription;
  closing_statement: string;
}

export interface ContrarianResponse {
  // NEW: Four epistemic stress tests
  reasoning_stress_tests?: ReasoningStressTests;
  // Legacy fields (still supported)
  critique?: string;
  alternative_framework?: string;
  blind_spots?: string[];
  counter_evidence?: Array<{ title: string; url: string; summary: string }>;
  agent_id?: string;
}

export interface ExpertCluster {
  theme: string;
  positions: string[];
  expert_ids: string[];
  confidence_range: [number, number];
  supporting_sources: Citation[];
}

export interface RoundSynthesis {
  round_number: number;
  clusters: ExpertCluster[];
  consensus_areas: string[];
  divergence_areas: string[];
  average_confidence: number;
  participation_count: number;
  key_insights: string[];
}

export interface RoundResult {
  round_number: number;
  synthesis: RoundSynthesis;
  expert_responses: ExpertResponse[];
  contrarian_responses: ContrarianResponse[];
}

export interface DelphiReport {
  prompt: {
    question: string;
    context?: string;
  };
  question_analysis?: QuestionAnalysis;
  consensus_summary: {
    final_position: string;
    support_level: string;
    confidence_level: number;
    key_evidence: Citation[];
  };
  expert_positions: ExpertResponse[];
  contrarian_observations: ContrarianResponse[];
  dissenting_views: Array<{
    position: string;
    expert_ids: string[];
    reasoning: string;
    sources: Citation[];
  }>;
  convergence_analysis: {
    position_stability: number;
    confidence_spread: number;
    consensus_clarity: number;
    citation_overlap: number;
    disagreement_index?: number;
    minority_persistence?: number;
    rounds_completed: number;
    termination_reason: TerminationReason;
    consensus_type?: ConsensusType;
    consensus_type_reasoning?: string;
    // NEW: Consensus quality classification for engaging human readers
    consensus_classification?: ConsensusClassification;
  };
  round_history: RoundSynthesis[];
  round_results?: RoundResult[];
  cost_summary?: CostSummary;
  counterfactual_risk?: CounterfactualRiskAnalysis;
  oppositional_case?: OppositionalCase;
  assumption_exposures?: AssumptionExposure[];
  decision_fork?: DecisionFork;
  regime_split?: RegimeSplitAnalysis;
  generated_at: string | Date;
  failed_experts?: Array<{ role: string; error: string }>;
}

export interface RunSummary {
  slug: string;           // filename without extension
  file: string;           // filename
  path: string;           // absolute path
  mtimeMs: number;        // last modified time for sorting
  question: string;
  generatedAt: string;
  roundsCompleted: number;
  terminationReason: TerminationReason;
  supportLevel?: string;
  confidenceLevel?: number;
}

function getOutputDir(): string {
  // Next.js API/server components will have cwd at apps/dashboard
  // output/ is at repo root: ../../output from dashboard
  return path.resolve(process.cwd(), '..', '..', 'output');
}

function isReportJson(filename: string): boolean {
  return filename.endsWith('.json') && filename.startsWith('delphi-report-');
}

export function listReportFiles(): string[] {
  const dir = getOutputDir();
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  return files.filter(isReportJson);
}

export function fileToSlug(filename: string): string {
  return filename.replace(/\.json$/, '');
}

export function slugToFile(slug: string): string {
  return `${slug}.json`;
}

export function getReportPath(filename: string): string {
  return path.join(getOutputDir(), filename);
}

export function readReport(slug: string): DelphiReport | null {
  try {
    const file = slugToFile(slug);
    const fullPath = getReportPath(file);
    if (!fs.existsSync(fullPath)) return null;
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const json = JSON.parse(raw);
    return json as DelphiReport;
  } catch {
    return null;
  }
}

export function listReports(): RunSummary[] {
  const dir = getOutputDir();
  if (!fs.existsSync(dir)) return [];

  const files = listReportFiles();
  const summaries: RunSummary[] = [];

  for (const file of files) {
    try {
      const abs = getReportPath(file);
      const stat = fs.statSync(abs);
      const raw = fs.readFileSync(abs, 'utf-8');
      const report = JSON.parse(raw) as DelphiReport;

      const summary: RunSummary = {
        slug: fileToSlug(file),
        file,
        path: abs,
        mtimeMs: stat.mtimeMs,
        question: report?.prompt?.question || 'Unknown Question',
        generatedAt: (report?.generated_at
          ? new Date(report.generated_at as any).toISOString()
          : new Date(stat.mtimeMs).toISOString()),
        roundsCompleted: report?.convergence_analysis?.rounds_completed ?? 0,
        terminationReason: report?.convergence_analysis?.termination_reason ?? 'max_rounds',
        supportLevel: report?.consensus_summary?.support_level,
        confidenceLevel: report?.consensus_summary?.confidence_level
      };

      summaries.push(summary);
    } catch {
      // skip malformed file
      continue;
    }
  }

  // Sort by modified time desc (most recent first)
  summaries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return summaries;
}

/**
 * Get absolute artifact paths for a given run slug.
 * Slug corresponds to the base filename (without extension), e.g. "delphi-report-2025-01-01-...".
 */
export function getArtifactPaths(slug: string): { json: string; md: string; exists: { json: boolean; md: boolean } } {
  const dir = getOutputDir();
  const json = path.join(dir, `${slug}.json`);
  const md = path.join(dir, `${slug}.md`);
  return {
    json,
    md,
    exists: {
      json: fs.existsSync(json),
      md: fs.existsSync(md)
    }
  };
}

/**
 * Read the Markdown artifact for a run if available.
 */
export function readMarkdown(slug: string): string | null {
  try {
    const { md, exists } = getArtifactPaths(slug);
    if (!exists.md) return null;
    return fs.readFileSync(md, 'utf-8');
  } catch {
    return null;
  }
}

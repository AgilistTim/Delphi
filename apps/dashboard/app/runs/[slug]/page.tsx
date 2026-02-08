"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import ExpertDiscussion from "../../../components/ExpertDiscussion";
import RoundEvolution from "../../../components/RoundEvolution";

interface Source {
  title: string;
  url: string;
  relevance?: string;
  summary?: string;
}

interface ExpertPosition {
  position: string;
  reasoning: string;
  confidence: number;
  sources: Source[];
  expertise_area?: string;
  agent_id?: string;
}

interface ReasoningStressTests {
  lossy_simplification: string;
  context_flip: string;
  incentive_misalignment: string;
  second_order_failure: string;
}

interface ConsensusClassification {
  nature: 'normative' | 'epistemic' | 'mixed';
  insight_yield: 'low' | 'medium' | 'high';
  insight_yield_reasoning: string;
  risk_statement: string;
}

interface CounterfactualRiskAnalysis {
  plausible_failure: string;
  why_missed_early: string;
  early_warning_signal: string;
}

interface OppositionalCase {
  opposite_position: string;
  argument: string;
  outperformance_scenario: string;
  uncomfortable_implication: string;
}

interface AssumptionExposure {
  expert_label: string;
  failed_assumption: string;
}

interface DecisionFork {
  prompt: string;
  concrete_risks: string[];
}

interface RegimeDescription {
  scarce_resource: string;
  winning_organization: string;
  failure_mode: string;
}

interface RegimeSplitAnalysis {
  consensus_regime: RegimeDescription;
  oppositional_regime: RegimeDescription;
  closing_statement: string;
}

interface RegimeSignals {
  consensus_signals: string[];
  oppositional_signals: string[];
  intro_statement: string;
}

interface ContrarianObservation {
  reasoning_stress_tests?: ReasoningStressTests;
  critique?: string;
  alternative_framework?: string;
  blind_spots?: string[];
  counter_evidence?: Source[];
}

interface RoundData {
  round_number: number;
  consensus_areas: string[];
  divergence_areas: string[];
  average_confidence: number;
  participation_count: number;
  key_insights: string[];
  clusters?: Array<{
    theme: string;
    positions: string[];
    expert_ids: string[];
    confidence_range: [number, number];
    supporting_sources?: Source[];
  }>;
}

interface ExpertPersona {
  name: string;
  role: string;
  agent_id?: string;
}

interface RoundResult {
  round_number: number;
  synthesis: RoundData;
  expert_responses: ExpertPosition[];
  contrarian_responses: ContrarianObservation[];
}

interface QuestionAnalysis {
  original_question: string;
  decision_type: string;
  time_horizon: string;
  primary_objective: string;
  constraints: string[];
  unknowns: string[];
  inferred_assumptions: string[];
  ambiguity_score: number;
  refined_question?: string;
}

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd?: number;
}

interface CostSummary {
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  estimated_total_cost_usd: number;
  openai_calls: number;
  perplexity_calls: number;
  breakdown_by_agent_type: Record<string, TokenUsage>;
  breakdown_by_round: Record<number, TokenUsage>;
}

interface DecisionCanvas {
  consensus_action: string;
  oppositional_action: string;
  reversibility_assessment: string;
  optionality_analysis: string;
  time_pressure: string;
  monitoring_plan: string[] | string;
}

interface SubQuestion {
  question: string;
  rationale: string;
  dependency?: string;
  dependencies?: string[];
}

interface QuestionDecomposition {
  is_complex: boolean;
  sub_questions: SubQuestion[];
  interaction_notes?: string;
  original_question?: string;
}

interface StructuredUncertainty {
  overall_confidence?: number;
  expert_role?: string;
  confidence_by_claim: Array<{ claim: string; confidence: number }>;
  conditional_confidence: Array<{ condition: string; confidence_if_true?: number; confidence_if_false?: number; adjusted_confidence?: number }>;
  key_assumptions: string[];
}

interface EvidenceQuality {
  source_type: string;
  recency_score: number;
  domain_authority: number;
  overall_score: number;
}

interface ScoredCitation extends Source {
  evidence_quality?: EvidenceQuality;
}

interface EvidenceContrarianResult {
  counter_position?: string;
  evidence?: ScoredCitation[];
  strength_assessment?: string;
  counter_evidence?: Array<{ title: string; url: string; summary: string }>;
  summary?: string;
}

interface PriorAnalysisReference {
  slug: string;
  question: string;
  consensus_position: string;
  relevance_score: number;
  generated_at?: string;
  relevance_rationale?: string;
}

interface CrossExamination {
  examiner_id?: string;
  examiner_role?: string;
  respondent_id?: string;
  respondent_role?: string;
  challenger_role?: string;
  responder_role?: string;
  challenge: string;
  response: string;
  round_number?: number;
  round?: number;
  topic?: string;
}

interface DelphiReport {
  prompt?: {
    question?: string;
    context?: string;
  };
  question_analysis?: QuestionAnalysis;
  question_decomposition?: QuestionDecomposition;
  generated_at?: string;
  consensus_summary?: {
    final_position?: string;
    support_level?: string;
    confidence_level?: number;
    key_evidence?: Source[];
  };
  convergence_analysis?: {
    rounds_completed?: number;
    position_stability?: number;
    consensus_clarity?: number;
    confidence_spread?: number;
    citation_overlap?: number;
    disagreement_index?: number;
    minority_persistence?: number;
    termination_reason?: string;
    consensus_type?: 'strong' | 'conditional' | 'operational' | 'divergent';
    consensus_type_reasoning?: string;
    consensus_classification?: ConsensusClassification;
  };
  expert_positions?: ExpertPosition[];
  expert_personas?: ExpertPersona[];
  contrarian_observations?: ContrarianObservation[];
  round_history?: RoundData[];
  round_results?: RoundResult[];
  cost_summary?: CostSummary;
  counterfactual_risk?: CounterfactualRiskAnalysis;
  oppositional_case?: OppositionalCase;
  assumption_exposures?: AssumptionExposure[];
  decision_fork?: DecisionFork;
  decision_canvas?: DecisionCanvas;
  regime_split?: RegimeSplitAnalysis;
  regime_signals?: RegimeSignals;
  cross_examinations?: CrossExamination[];
  evidence_contrarian?: EvidenceContrarianResult;
  structured_uncertainties?: StructuredUncertainty[];
  prior_analyses?: PriorAnalysisReference[];
}

interface RunPageProps {
  params: { slug: string };
}

const METRIC_TOOLTIPS: Record<string, string> = {
  "Position Stability": "How consistently experts maintain their positions across rounds. High values (>80%) mean experts aren\u2019t changing their minds; low values indicate active position shifts.",
  "Consensus Clarity": "How clearly a dominant position has emerged. High values (>70%) mean most experts align on a single view. Low values mean opinions are scattered.",
  "Citation Overlap": "How much experts cite the same sources. High overlap (>50%) suggests shared evidence base. Low overlap means experts draw from different evidence pools.",
  "Confidence Spread": "Standard deviation of expert confidence scores. Lower is better \u2014 means experts are similarly confident. High spread (>2.0) indicates some experts are much more certain than others.",
  "Disagreement Index": "Measures cluster diversity using entropy. Higher values (>0.5) mean more distinct opinion groups. Low values mean experts have consolidated into fewer clusters.",
  "Minority Persistence": "Whether minority opinion clusters remain stable vs. being absorbed by the majority. High values mean dissenting views are holding firm."
};

function CollapsibleSection({ title, icon, children, defaultOpen = true, variant = "default" }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: "default" | "danger" | "warning" | "info" | "success" | "purple";
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const variantStyles: Record<string, string> = {
    default: "border-slate-200",
    danger: "border-red-200 bg-gradient-to-r from-red-50 to-orange-50",
    warning: "border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50",
    info: "border-sky-300 bg-gradient-to-r from-sky-50 to-blue-50",
    success: "border-green-300 bg-gradient-to-r from-green-50 to-emerald-50",
    purple: "border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50",
  };
  const titleColors: Record<string, string> = {
    default: "text-slate-900", danger: "text-red-800", warning: "text-amber-900",
    info: "text-sky-900", success: "text-green-900", purple: "text-purple-900",
  };
  return (
    <Card className={`mt-6 ${variantStyles[variant]}`}>
      <CardHeader className="cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
        <CardTitle className={`${titleColors[variant]} flex items-center gap-2`}>
          {icon}
          <span className="flex-1">{title}</span>
          <svg className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </CardTitle>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function SectionNav({ sections }: { sections: Array<{ id: string; label: string; available: boolean }> }) {
  const available = sections.filter(s => s.available);
  if (available.length < 3) return null;
  return (
    <Card className="mb-2">
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-500 mr-1 self-center">Jump to:</span>
          {available.map(s => (
            <a key={s.id} href={`#${s.id}`} className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-full text-slate-600 transition-colors">{s.label}</a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ConvergenceTrendChart({ roundResults, metric, label, color = "#3b82f6" }: {
  roundResults: RoundResult[]; metric: string; label: string; color?: string;
}) {
  const data = roundResults.map(rr => {
    const experts = rr.expert_responses || [];
    if (metric === "average_confidence") {
      if (experts.length === 0) return 0;
      return experts.reduce((sum, e) => sum + e.confidence, 0) / experts.length;
    }
    if (metric === "confidence_spread") {
      if (experts.length === 0) return 0;
      const mean = experts.reduce((sum, e) => sum + e.confidence, 0) / experts.length;
      const variance = experts.reduce((sum, e) => sum + Math.pow(e.confidence - mean, 2), 0) / experts.length;
      return Math.sqrt(variance);
    }
    return 0;
  });
  if (data.length < 2) return null;
  const width = 320, height = 80, padding = 20;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-slate-600">{label}</div>
      <svg width={width} height={height} className="bg-white rounded border border-slate-100">
        <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} strokeLinejoin="round" />
        {data.map((value, index) => {
          const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((value - min) / range) * (height - 2 * padding);
          return (<g key={index}><circle cx={x} cy={y} r="4" fill="white" stroke={color} strokeWidth="2" /><text x={x} y={y - 8} fontSize="10" fill="#475569" textAnchor="middle">{value.toFixed(1)}</text></g>);
        })}
        {data.map((_, index) => {
          const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
          return (<text key={`l-${index}`} x={x} y={height - 4} fontSize="9" fill="#94a3b8" textAnchor="middle">R{index + 1}</text>);
        })}
      </svg>
    </div>
  );
}

function ExpertConfidenceMatrix({ roundResults, expertPersonas }: { roundResults: RoundResult[]; expertPersonas?: ExpertPersona[] }) {
  if (!roundResults || roundResults.length === 0) return null;
  const getLabel = (agentId: string, idx: number) => {
    if (expertPersonas) { const p = expertPersonas.find(p => p.agent_id === agentId); if (p) return p.name.split(" ")[0]; }
    return `E${idx + 1}`;
  };
  const allExperts = roundResults[0]?.expert_responses?.map((e, i) => ({
    id: e.agent_id || `expert-${i}`, label: getLabel(e.agent_id || "", i), area: e.expertise_area || ""
  })) || [];
  if (allExperts.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-700">Expert Confidence by Round</div>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead><tr>
            <th className="text-left py-2 px-2 text-slate-500 font-medium">Expert</th>
            {roundResults.map(rr => (<th key={rr.round_number} className="text-center py-2 px-3 text-slate-500 font-medium">R{rr.round_number}</th>))}
            <th className="text-center py-2 px-2 text-slate-500 font-medium">Trend</th>
          </tr></thead>
          <tbody>
            {allExperts.map((expert, eIdx) => {
              const confs = roundResults.map(rr => { const r = rr.expert_responses?.find(e => e.agent_id === expert.id) || rr.expert_responses?.[eIdx]; return r?.confidence ?? 0; });
              const trend = confs.length >= 2 ? confs[confs.length - 1] - confs[0] : 0;
              return (
                <tr key={expert.id} className="border-t border-slate-100">
                  <td className="py-2 px-2 font-medium text-slate-700" title={expert.area}>{expert.label}</td>
                  {confs.map((c, rIdx) => {
                    const bg = c >= 7 ? "bg-green-100 text-green-800" : c >= 4 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
                    return (<td key={rIdx} className="text-center py-2 px-3"><span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${bg}`}>{c.toFixed(1)}</span></td>);
                  })}
                  <td className="text-center py-2 px-2">
                    {trend > 0 ? <span className="text-green-600 font-semibold">+{trend.toFixed(1)}</span> : trend < 0 ? <span className="text-red-600 font-semibold">{trend.toFixed(1)}</span> : <span className="text-slate-400">0.0</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EvidenceQualityChart({ sources }: { sources: ScoredCitation[] }) {
  const scored = sources.filter(s => s.evidence_quality);
  if (scored.length === 0) return null;
  const typeCounts: Record<string, { count: number; totalScore: number }> = {};
  scored.forEach(s => {
    const t = s.evidence_quality?.source_type || "unknown";
    if (!typeCounts[t]) typeCounts[t] = { count: 0, totalScore: 0 };
    typeCounts[t].count++;
    typeCounts[t].totalScore += s.evidence_quality?.overall_score || 0;
  });
  const typeColors: Record<string, string> = { academic: "#22c55e", government: "#3b82f6", news: "#f59e0b", industry: "#8b5cf6", blog: "#ef4444", unknown: "#94a3b8" };
  const avgScore = scored.reduce((sum, s) => sum + (s.evidence_quality?.overall_score || 0), 0) / scored.length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">Evidence Quality Distribution</div>
        <Badge className={avgScore >= 0.6 ? "bg-green-100 text-green-700" : avgScore >= 0.4 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>Avg: {(avgScore * 100).toFixed(0)}%</Badge>
      </div>
      <div className="flex gap-1 h-8 rounded overflow-hidden">
        {Object.entries(typeCounts).map(([type, data]) => (
          <div key={type} className="flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: typeColors[type] || "#94a3b8", width: `${(data.count / scored.length) * 100}%`, minWidth: "40px" }} title={`${type}: ${data.count} sources`}>{data.count}</div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(typeCounts).map(([type]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: typeColors[type] || "#94a3b8" }} />
            <span className="text-slate-600 capitalize">{type} ({typeCounts[type].count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RunPage({ params }: RunPageProps) {
  const [report, setReport] = useState<DelphiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(new URL(`/api/artifacts/${encodeURIComponent(params.slug)}/json`, window.location.origin).toString());
        if (!res.ok) throw new Error("Report not found");
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader><CardTitle className="text-red-700">Run not found</CardTitle></CardHeader>
            <CardContent>
              <p className="text-red-600">Could not find a report for slug &quot;{params.slug}&quot;.</p>
              <a href="/" className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium">Back to Dashboard</a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const genAt = typeof report.generated_at === "string" ? report.generated_at : new Date(report.generated_at as unknown as number).toISOString();
  const terminationReason = report.convergence_analysis?.termination_reason?.toString().replace(/_/g, " ") || "unknown";
  const terminationColor = terminationReason.includes("consensus") ? "bg-green-100 text-green-700 border-green-200" : terminationReason.includes("divergence") ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-700 border-slate-200";

  const allEvidenceSources: ScoredCitation[] = [];
  report.expert_positions?.forEach(ep => { ep.sources?.forEach(s => allEvidenceSources.push(s as ScoredCitation)); });
  if (report.evidence_contrarian?.evidence) { report.evidence_contrarian.evidence.forEach(s => allEvidenceSources.push(s)); }

  const summaryNavSections = [
    { id: "exec-summary", label: "Executive Summary", available: true },
    { id: "convergence", label: "Convergence", available: !!report.convergence_analysis },
    { id: "decision-canvas", label: "Decision Canvas", available: !!report.decision_canvas },
    { id: "counterfactual", label: "Counterfactual Risk", available: !!report.counterfactual_risk },
    { id: "oppositional", label: "Oppositional Case", available: !!report.oppositional_case },
    { id: "assumptions", label: "Assumptions", available: (report.assumption_exposures?.length ?? 0) > 0 },
    { id: "decision-fork", label: "Decision Fork", available: !!report.decision_fork },
    { id: "regime-split", label: "Competing Regimes", available: !!report.regime_split },
    { id: "regime-signals", label: "12-Month Signals", available: !!report.regime_signals },
    { id: "structured-uncertainty", label: "Uncertainty", available: (report.structured_uncertainties?.length ?? 0) > 0 },
    { id: "evidence-contrarian", label: "Counter-Evidence", available: !!report.evidence_contrarian },
    { id: "cross-examination", label: "Cross-Examination", available: (report.cross_examinations?.length ?? 0) > 0 },
    { id: "question-decomposition", label: "Sub-Questions", available: !!report.question_decomposition?.is_complex },
    { id: "stress-tests", label: "Stress Tests", available: report.contrarian_observations?.some(c => c.reasoning_stress_tests) ?? false },
    { id: "key-evidence", label: "Key Evidence", available: (report.consensus_summary?.key_evidence?.length ?? 0) > 0 },
    { id: "question-analysis", label: "Question Analysis", available: !!report.question_analysis },
    { id: "cost-summary", label: "Cost", available: !!report.cost_summary },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <a href="/" className="text-slate-500 hover:text-slate-700 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </a>
            <h1 className="text-2xl font-bold text-slate-900">Delphi Analysis</h1>
            <Badge className={terminationColor}>{terminationReason}</Badge>
          </div>
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-indigo-100 text-sm font-medium mb-2">Question</div>
              <h2 className="text-xl font-semibold mb-3">{report.prompt?.question || "No question"}</h2>
              {report.prompt?.context && <p className="text-indigo-100 text-sm leading-relaxed">{report.prompt.context}</p>}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20 text-sm text-indigo-100">
                <span>Generated: {new Date(genAt).toLocaleString()}</span>
                <span>|</span>
                <span>{report.convergence_analysis?.rounds_completed || 0} rounds</span>
                <span>|</span>
                <span>{report.expert_positions?.length || 0} experts</span>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2 mt-4 flex-wrap">
            <a href={`/api/artifacts/${encodeURIComponent(params.slug)}/pdf`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Download PDF
            </a>
            <a href={`/runs/${encodeURIComponent(params.slug)}/markdown`} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">View Markdown</a>
            <a href={`/api/artifacts/${encodeURIComponent(params.slug)}/md`} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">Download .md</a>
            <a href={`/api/artifacts/${encodeURIComponent(params.slug)}/json`} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm">Download .json</a>
          </div>
        </div>

        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-sm p-1">
            <TabsTrigger value="summary" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Summary</TabsTrigger>
            <TabsTrigger value="discussion" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Expert Discussion</TabsTrigger>
            <TabsTrigger value="rounds" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Round Evolution</TabsTrigger>
            <TabsTrigger value="evidence" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Evidence</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <SectionNav sections={summaryNavSections} />

            <div id="exec-summary">
              <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="text-indigo-900 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Executive Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-900 text-lg leading-relaxed mb-4">{report.consensus_summary?.final_position || "No consensus reached"}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-white rounded-lg border border-indigo-100">
                      <div className="text-xs text-indigo-600 font-medium">Support Level</div>
                      <div className="font-bold text-slate-900 text-lg">{report.consensus_summary?.support_level || "N/A"}</div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-indigo-100">
                      <div className="text-xs text-indigo-600 font-medium">Confidence</div>
                      <div className="font-bold text-slate-900 text-lg">{typeof report.consensus_summary?.confidence_level === "number" ? `${report.consensus_summary.confidence_level.toFixed(1)}/10` : "N/A"}</div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-indigo-100">
                      <div className="text-xs text-indigo-600 font-medium">Consensus Type</div>
                      <div className="font-bold text-slate-900 text-lg capitalize">{report.convergence_analysis?.consensus_type || "N/A"}</div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-indigo-100">
                      <div className="text-xs text-indigo-600 font-medium">Rounds</div>
                      <div className="font-bold text-slate-900 text-lg">{report.convergence_analysis?.rounds_completed || 0}</div>
                    </div>
                  </div>
                  {report.convergence_analysis?.consensus_classification && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-100 flex items-center gap-4 text-sm flex-wrap">
                      <div><span className="text-xs text-slate-500">Nature:</span><span className="ml-1 font-semibold capitalize">{report.convergence_analysis.consensus_classification.nature}</span></div>
                      <div><span className="text-xs text-slate-500">Insight Yield:</span>
                        <Badge className={report.convergence_analysis.consensus_classification.insight_yield === 'high' ? 'ml-1 bg-green-100 text-green-700 border-green-200' : report.convergence_analysis.consensus_classification.insight_yield === 'medium' ? 'ml-1 bg-amber-100 text-amber-700 border-amber-200' : 'ml-1 bg-red-100 text-red-700 border-red-200'}>{report.convergence_analysis.consensus_classification.insight_yield}</Badge>
                      </div>
                      {report.convergence_analysis.consensus_classification.risk_statement && <div className="text-red-600 text-xs flex-1">{report.convergence_analysis.consensus_classification.risk_statement}</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div id="convergence">
              <CollapsibleSection title="Convergence Metrics" defaultOpen={true} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <MetricRow label="Position Stability" value={report.convergence_analysis?.position_stability} isPercentage />
                    <MetricRow label="Consensus Clarity" value={report.convergence_analysis?.consensus_clarity} isPercentage />
                    <MetricRow label="Citation Overlap" value={report.convergence_analysis?.citation_overlap} isPercentage />
                    <MetricRow label="Confidence Spread" value={report.convergence_analysis?.confidence_spread} isPercentage={false} />
                    <MetricRow label="Disagreement Index" value={report.convergence_analysis?.disagreement_index} isPercentage />
                    <MetricRow label="Minority Persistence" value={report.convergence_analysis?.minority_persistence} isPercentage />
                  </div>
                  <div className="space-y-4">
                    {report.round_results && report.round_results.length >= 2 && (<>
                      <ConvergenceTrendChart roundResults={report.round_results} metric="average_confidence" label="Avg Confidence Trend" color="#8b5cf6" />
                      <ConvergenceTrendChart roundResults={report.round_results} metric="confidence_spread" label="Confidence Spread Trend" color="#f59e0b" />
                    </>)}
                    {report.round_results && report.round_results.length >= 1 && <ExpertConfidenceMatrix roundResults={report.round_results} expertPersonas={report.expert_personas} />}
                  </div>
                </div>
              </CollapsibleSection>
            </div>

            {report.decision_canvas && (
              <div id="decision-canvas">
                <CollapsibleSection title="Decision Canvas" variant="purple" defaultOpen={true} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-green-200">
                      <div className="text-sm font-semibold text-green-800 mb-2">If You Follow the Consensus</div>
                      <p className="text-slate-700 text-sm">{report.decision_canvas.consensus_action}</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-red-200">
                      <div className="text-sm font-semibold text-red-800 mb-2">If You Follow the Opposition</div>
                      <p className="text-slate-700 text-sm">{report.decision_canvas.oppositional_action}</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div className="p-4 bg-white rounded-lg border border-purple-100">
                      <div className="text-xs font-semibold text-purple-700 mb-2">Reversibility</div>
                      <p className="text-slate-700 text-sm">{report.decision_canvas.reversibility_assessment}</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-purple-100">
                      <div className="text-xs font-semibold text-purple-700 mb-2">Optionality</div>
                      <p className="text-slate-700 text-sm">{report.decision_canvas.optionality_analysis}</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-purple-100">
                      <div className="text-xs font-semibold text-purple-700 mb-2">Time Pressure</div>
                      <p className="text-slate-700 text-sm">{report.decision_canvas.time_pressure}</p>
                    </div>
                  </div>
                  {report.decision_canvas.monitoring_plan && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-purple-100">
                      <div className="text-xs font-semibold text-purple-700 mb-2">Monitoring Plan</div>
                      {Array.isArray(report.decision_canvas.monitoring_plan) ? (
                        <ul className="text-sm text-slate-700 space-y-1">
                          {report.decision_canvas.monitoring_plan.map((item: string, idx: number) => (<li key={idx} className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">&#8226;</span>{item}</li>))}
                        </ul>
                      ) : <p className="text-slate-700 text-sm">{report.decision_canvas.monitoring_plan}</p>}
                    </div>
                  )}
                </CollapsibleSection>
              </div>
            )}

            {report.counterfactual_risk && (
              <div id="counterfactual">
                <CollapsibleSection title="Counterfactual Risk (If the Dominant Conclusion Is Wrong)" variant="danger" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border border-red-100"><div className="text-sm font-semibold text-red-800 mb-2">Plausible failure:</div><p className="text-slate-700">{report.counterfactual_risk.plausible_failure}</p></div>
                    <div className="p-4 bg-white rounded-lg border border-red-100"><div className="text-sm font-semibold text-red-800 mb-2">Why it&apos;s missed early:</div><p className="text-slate-700">{report.counterfactual_risk.why_missed_early}</p></div>
                    <div className="p-4 bg-white rounded-lg border border-red-100"><div className="text-sm font-semibold text-red-800 mb-2">Early warning signal:</div><p className="text-slate-700">{report.counterfactual_risk.early_warning_signal}</p></div>
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {report.oppositional_case && (
              <div id="oppositional">
                <CollapsibleSection title="Oppositional Case (Deliberate Counterpoint)" variant="warning" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}>
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border border-amber-100"><div className="text-sm font-semibold text-amber-800 mb-2">The Opposite Position:</div><p className="text-slate-700 font-medium">{report.oppositional_case.opposite_position}</p></div>
                    <div className="p-4 bg-white rounded-lg border border-amber-100"><div className="text-sm font-semibold text-amber-800 mb-2">Argument:</div><p className="text-slate-700">{report.oppositional_case.argument}</p></div>
                    <div className="p-4 bg-white rounded-lg border border-amber-100"><div className="text-sm font-semibold text-amber-800 mb-2">When This Position Outperforms:</div><p className="text-slate-700">{report.oppositional_case.outperformance_scenario}</p></div>
                    <div className="p-4 bg-white rounded-lg border border-amber-100"><div className="text-sm font-semibold text-amber-800 mb-2">Uncomfortable Implication:</div><p className="text-slate-700 italic">{report.oppositional_case.uncomfortable_implication}</p></div>
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {report.assumption_exposures && report.assumption_exposures.length > 0 && (
              <div id="assumptions">
                <CollapsibleSection title="If the Oppositional Case Is Correct..." defaultOpen={false}>
                  <p className="text-sm text-slate-600 mb-3">What assumption in each expert&apos;s position would fail:</p>
                  <div className="space-y-3">
                    {report.assumption_exposures.map((ae, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200">
                        <div className="text-sm font-semibold text-slate-700 mb-2">{ae.expert_label}:</div>
                        <p className="text-slate-600">{ae.failed_assumption}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {report.decision_fork && (
              <div id="decision-fork">
                <CollapsibleSection title="Decision Fork (Explicit Acknowledgement Required)" variant="warning">
                  <p className="text-amber-900 font-semibold mb-4">{report.decision_fork.prompt}</p>
                  <div className="space-y-3">
                    {report.decision_fork.concrete_risks.map((risk, idx) => (<div key={idx} className="p-3 bg-white rounded-lg border border-amber-200"><p className="text-amber-800">{idx + 1}. {risk}</p></div>))}
                  </div>
                  <p className="text-sm text-amber-700 italic mt-4">This report will not answer this. You must answer it yourself.</p>
                </CollapsibleSection>
              </div>
            )}

            {report.regime_split && (
              <div id="regime-split">
                <CollapsibleSection title="Competing Regimes" variant="info">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-sky-200">
                      <div className="text-sm font-bold text-sky-900 mb-2">Regime A - Consensus World</div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700"><span className="font-semibold">What becomes scarce:</span> {report.regime_split.consensus_regime.scarce_resource}</p>
                        <p className="text-sm text-slate-700"><span className="font-semibold">What kind of organization wins:</span> {report.regime_split.consensus_regime.winning_organization}</p>
                        <p className="text-sm text-slate-700"><span className="font-semibold">What failure looks like:</span> {report.regime_split.consensus_regime.failure_mode}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-sky-200">
                      <div className="text-sm font-bold text-sky-900 mb-2">Regime B - Oppositional World</div>
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700"><span className="font-semibold">What becomes scarce:</span> {report.regime_split.oppositional_regime.scarce_resource}</p>
                        <p className="text-sm text-slate-700"><span className="font-semibold">What kind of organization wins:</span> {report.regime_split.oppositional_regime.winning_organization}</p>
                        <p className="text-sm text-slate-700"><span className="font-semibold">What failure looks like:</span> {report.regime_split.oppositional_regime.failure_mode}</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-sky-900 font-semibold mt-4">{report.regime_split.closing_statement}</p>
                </CollapsibleSection>
              </div>
            )}

            {report.regime_signals && (
              <div id="regime-signals">
                <CollapsibleSection title="12-Month Reality Check" variant="success">
                  <p className="text-sm text-green-700 mb-4">{report.regime_signals.intro_statement}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg border border-green-200">
                      <div className="text-sm font-bold text-green-900 mb-3">Signals Regime A is unfolding</div>
                      <div className="space-y-2">{report.regime_signals.consensus_signals.map((s, i) => (<p key={i} className="text-sm text-slate-700">{i + 1}. {s}</p>))}</div>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-green-200">
                      <div className="text-sm font-bold text-green-900 mb-3">Signals Regime B is unfolding</div>
                      <div className="space-y-2">{report.regime_signals.oppositional_signals.map((s, i) => (<p key={i} className="text-sm text-slate-700">{i + 1}. {s}</p>))}</div>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {report.structured_uncertainties && report.structured_uncertainties.length > 0 && (
              <div id="structured-uncertainty">
                <CollapsibleSection title="Structured Uncertainty" defaultOpen={false}>
                  <p className="text-sm text-slate-500 mb-4">Per-expert confidence decomposition showing what they&apos;re confident about and where assumptions matter</p>
                  <div className="space-y-6">
                    {report.structured_uncertainties.map((su, idx) => {
                      const expertName = report.expert_personas?.[idx]?.name || su.expert_role || `Expert ${idx + 1}`;
                      return (
                        <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-semibold text-slate-800">{expertName}</div>
                            {su.overall_confidence !== undefined && <Badge className="bg-indigo-100 text-indigo-700">Overall: {su.overall_confidence}/10</Badge>}
                          </div>
                          {su.confidence_by_claim && su.confidence_by_claim.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-slate-500 mb-2">Confidence by Claim</div>
                              <div className="space-y-2">
                                {su.confidence_by_claim.map((c, cIdx) => (
                                  <div key={cIdx} className="flex items-center gap-3">
                                    <div className="flex-1 text-sm text-slate-700">{c.claim}</div>
                                    <span className={`text-sm font-semibold ${c.confidence >= 7 ? "text-green-700" : c.confidence >= 4 ? "text-amber-700" : "text-red-700"}`}>{c.confidence}/10</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {su.conditional_confidence && su.conditional_confidence.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-slate-500 mb-2">Conditional Confidence</div>
                              <div className="space-y-2">
                                {su.conditional_confidence.map((cc, ccIdx) => (
                                  <div key={ccIdx} className="p-2 bg-slate-50 rounded text-sm">
                                    <div className="text-slate-700 mb-1">{cc.condition}</div>
                                    <div className="flex gap-4 text-xs">
                                      {cc.confidence_if_true !== undefined && <span className="text-green-600">If true: {cc.confidence_if_true}/10</span>}
                                      {cc.confidence_if_false !== undefined && <span className="text-red-600">If false: {cc.confidence_if_false}/10</span>}
                                      {cc.adjusted_confidence !== undefined && <span className="text-amber-600">Adjusted: {cc.adjusted_confidence}/10</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {su.key_assumptions && su.key_assumptions.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-slate-500 mb-2">Key Assumptions</div>
                              <ul className="text-sm text-slate-600 space-y-1">
                                {su.key_assumptions.map((a, aIdx) => (<li key={aIdx} className="flex items-start gap-2"><span className="text-slate-400">&#8226;</span>{a}</li>))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {report.evidence_contrarian && (
              <div id="evidence-contrarian">
                <CollapsibleSection title="Evidence Contrarian (Counter-Evidence Search)" variant="danger" defaultOpen={false}>
                  {report.evidence_contrarian.counter_position && (
                    <div className="p-4 bg-white rounded-lg border border-red-100 mb-4"><div className="text-sm font-semibold text-red-800 mb-2">Counter-Position:</div><p className="text-slate-700">{report.evidence_contrarian.counter_position}</p></div>
                  )}
                  {report.evidence_contrarian.strength_assessment && (
                    <div className="mb-4"><span className="text-sm text-slate-500">Strength: </span>
                      <Badge className={report.evidence_contrarian.strength_assessment === "strong" ? "bg-red-100 text-red-700" : report.evidence_contrarian.strength_assessment === "moderate" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>{report.evidence_contrarian.strength_assessment}</Badge>
                    </div>
                  )}
                  {report.evidence_contrarian.summary && <p className="text-sm text-slate-600 mb-4">{report.evidence_contrarian.summary}</p>}
                  {report.evidence_contrarian.evidence && report.evidence_contrarian.evidence.length > 0 && (
                    <div className="space-y-2">
                      {report.evidence_contrarian.evidence.map((ev, idx) => (
                        <a key={idx} href={ev.url} target="_blank" rel="noreferrer" className="block p-3 bg-white rounded-lg border border-red-100 hover:border-red-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-red-700 text-sm">{ev.title || `Source ${idx + 1}`}</div>
                            {ev.evidence_quality && <Badge className="bg-slate-100 text-slate-600 text-xs">{ev.evidence_quality.source_type} - {(ev.evidence_quality.overall_score * 100).toFixed(0)}%</Badge>}
                          </div>
                          {ev.relevance && <div className="text-xs text-slate-500 mt-1">{ev.relevance}</div>}
                        </a>
                      ))}
                    </div>
                  )}
                  {report.evidence_contrarian.counter_evidence && report.evidence_contrarian.counter_evidence.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {report.evidence_contrarian.counter_evidence.map((ev, idx) => (
                        <a key={idx} href={ev.url} target="_blank" rel="noreferrer" className="block p-3 bg-white rounded-lg border border-red-100 hover:border-red-300 transition-colors">
                          <div className="font-medium text-red-700 text-sm">{ev.title || `Source ${idx + 1}`}</div>
                          {ev.summary && <div className="text-xs text-slate-500 mt-1">{ev.summary}</div>}
                        </a>
                      ))}
                    </div>
                  )}
                </CollapsibleSection>
              </div>
            )}

            {report.cross_examinations && report.cross_examinations.length > 0 && (
              <div id="cross-examination">
                <CollapsibleSection title="Cross-Examination Exchanges" defaultOpen={false}>
                  <div className="space-y-4">
                    {report.cross_examinations.map((cx, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200">
                        {cx.topic && <div className="text-xs text-indigo-600 font-medium mb-2">Topic: {cx.topic}</div>}
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-1"><Badge className="bg-red-100 text-red-700 text-xs">Challenge</Badge><span className="text-xs text-slate-500">{cx.examiner_role || cx.challenger_role}</span></div>
                          <p className="text-sm text-slate-700">{cx.challenge}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1"><Badge className="bg-green-100 text-green-700 text-xs">Response</Badge><span className="text-xs text-slate-500">{cx.respondent_role || cx.responder_role}</span></div>
                          <p className="text-sm text-slate-700">{cx.response}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {report.question_decomposition?.is_complex && (
              <div id="question-decomposition">
                <CollapsibleSection title="Question Decomposition" defaultOpen={false}>
                  <p className="text-sm text-slate-500 mb-4">This question was identified as complex and decomposed into sub-questions</p>
                  <div className="space-y-3">
                    {report.question_decomposition.sub_questions.map((sq, idx) => (
                      <div key={idx} className="p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-800 text-sm">{sq.question}</div>
                            <div className="text-xs text-slate-500 mt-1">{sq.rationale}</div>
                            {(sq.dependency || (sq.dependencies && sq.dependencies.length > 0)) && <div className="text-xs text-indigo-600 mt-1">Dependencies: {sq.dependency || sq.dependencies?.join(", ")}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {report.question_decomposition.interaction_notes && <div className="mt-3 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">{report.question_decomposition.interaction_notes}</div>}
                </CollapsibleSection>
              </div>
            )}

            {report.prior_analyses && report.prior_analyses.length > 0 && (
              <CollapsibleSection title="Related Prior Analyses" defaultOpen={false}>
                <div className="space-y-3">
                  {report.prior_analyses.map((pa, idx) => (
                    <a key={idx} href={`/runs/${encodeURIComponent(pa.slug)}`} className="block p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-indigo-700 text-sm">{pa.question}</div>
                        <Badge className="bg-indigo-100 text-indigo-700 text-xs">Relevance: {(pa.relevance_score * 100).toFixed(0)}%</Badge>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{pa.consensus_position}</p>
                    </a>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {report.contrarian_observations && report.contrarian_observations.some(c => c.reasoning_stress_tests) && (
              <div id="stress-tests">
                <CollapsibleSection title="Questions to Consider" variant="danger" defaultOpen={false}>
                  <p className="text-sm text-red-600 mb-4">Before accepting this consensus, consider these challenges:</p>
                  {report.contrarian_observations.map((contrarian, idx) => {
                    if (!contrarian.reasoning_stress_tests) return null;
                    const tests = contrarian.reasoning_stress_tests;
                    return (
                      <div key={idx} className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-red-100"><div className="text-sm font-semibold text-red-800 mb-2">What nuance is being lost?</div><p className="text-slate-700">{tests.lossy_simplification}</p></div>
                        <div className="p-4 bg-white rounded-lg border border-red-100"><div className="text-sm font-semibold text-red-800 mb-2">When does this advice reverse?</div><p className="text-slate-700">{tests.context_flip}</p></div>
                        <div className="p-4 bg-white rounded-lg border border-red-100"><div className="text-sm font-semibold text-red-800 mb-2">Who wins, who loses?</div><p className="text-slate-700">{tests.incentive_misalignment}</p></div>
                        <div className="p-4 bg-white rounded-lg border border-red-100"><div className="text-sm font-semibold text-red-800 mb-2">How does initial success fail later?</div><p className="text-slate-700">{tests.second_order_failure}</p></div>
                      </div>
                    );
                  })}
                </CollapsibleSection>
              </div>
            )}

            {report.consensus_summary?.key_evidence && report.consensus_summary.key_evidence.length > 0 && (
              <div id="key-evidence">
                <CollapsibleSection title="Key Evidence" defaultOpen={false}>
                  <div className="grid md:grid-cols-2 gap-3">
                    {report.consensus_summary.key_evidence.map((src, idx) => (
                      <a key={idx} href={src.url} target="_blank" rel="noreferrer" className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group">
                        <div className="font-medium text-blue-600 group-hover:text-blue-800 truncate">{src.title || src.url}</div>
                        {src.relevance && <div className="text-sm text-slate-500 mt-1 line-clamp-2">{src.relevance}</div>}
                      </a>
                    ))}
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {report.question_analysis && (
              <div id="question-analysis">
                <CollapsibleSection title="Question Analysis" defaultOpen={false}>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg"><div className="text-sm text-slate-500">Decision Type</div><div className="font-semibold text-slate-900 capitalize">{report.question_analysis.decision_type.replace(/_/g, ' ')}</div></div>
                    <div className="p-3 bg-slate-50 rounded-lg"><div className="text-sm text-slate-500">Time Horizon</div><div className="font-semibold text-slate-900 capitalize">{report.question_analysis.time_horizon.replace(/_/g, ' ')}</div></div>
                    <div className="p-3 bg-slate-50 rounded-lg"><div className="text-sm text-slate-500">Primary Objective</div><div className="font-semibold text-slate-900 capitalize">{report.question_analysis.primary_objective.replace(/_/g, ' ')}</div></div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mt-4">
                    <div className="text-sm text-amber-700 font-medium mb-1">Ambiguity Score</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${report.question_analysis.ambiguity_score * 100}%` }} /></div>
                      <span className="text-sm font-semibold text-amber-700">{(report.question_analysis.ambiguity_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  {report.question_analysis.constraints.length > 0 && (
                    <div className="mt-4"><div className="text-sm text-slate-500 mb-2">Constraints</div><div className="flex flex-wrap gap-2">{report.question_analysis.constraints.map((c, idx) => (<Badge key={idx} variant="outline" className="bg-slate-50">{c}</Badge>))}</div></div>
                  )}
                  {report.question_analysis.unknowns.length > 0 && (
                    <div className="mt-4"><div className="text-sm text-slate-500 mb-2">Key Unknowns</div><div className="flex flex-wrap gap-2">{report.question_analysis.unknowns.map((u, idx) => (<Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-200">{u}</Badge>))}</div></div>
                  )}
                  {report.question_analysis.inferred_assumptions.length > 0 && (
                    <div className="mt-4"><div className="text-sm text-slate-500 mb-2">Inferred Assumptions</div><ul className="text-sm text-slate-700 space-y-1">{report.question_analysis.inferred_assumptions.map((a, idx) => (<li key={idx} className="flex items-start gap-2"><span className="text-slate-400">&#8226;</span>{a}</li>))}</ul></div>
                  )}
                </CollapsibleSection>
              </div>
            )}

            {report.cost_summary && (
              <div id="cost-summary">
                <CollapsibleSection title="Cost Summary" defaultOpen={false}>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200"><div className="text-sm text-green-700">Estimated Cost</div><div className="text-xl font-bold text-green-800">${report.cost_summary.estimated_total_cost_usd.toFixed(4)}</div></div>
                    <div className="p-3 bg-slate-50 rounded-lg"><div className="text-sm text-slate-500">Total Tokens</div><div className="font-semibold text-slate-900">{report.cost_summary.total_tokens.toLocaleString()}</div></div>
                    <div className="p-3 bg-slate-50 rounded-lg"><div className="text-sm text-slate-500">OpenAI Calls</div><div className="font-semibold text-slate-900">{report.cost_summary.openai_calls}</div></div>
                    <div className="p-3 bg-slate-50 rounded-lg"><div className="text-sm text-slate-500">Perplexity Calls</div><div className="font-semibold text-slate-900">{report.cost_summary.perplexity_calls}</div></div>
                  </div>
                  {report.cost_summary.breakdown_by_agent_type && Object.keys(report.cost_summary.breakdown_by_agent_type).length > 0 && (
                    <div className="mt-4"><div className="text-sm text-slate-500 mb-2">Cost by Agent Type</div><div className="space-y-2">
                      {Object.entries(report.cost_summary.breakdown_by_agent_type).map(([agent, data]) => (
                        <div key={agent} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm font-medium text-slate-700 capitalize">{agent.replace(/_/g, ' ')}</span>
                          <div className="text-sm text-slate-600"><span className="font-semibold">${(data.estimated_cost_usd || 0).toFixed(4)}</span><span className="text-slate-400 ml-2">({data.total_tokens.toLocaleString()} tokens)</span></div>
                        </div>
                      ))}
                    </div></div>
                  )}
                </CollapsibleSection>
              </div>
            )}
          </TabsContent>

          <TabsContent value="discussion">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>Expert Discussion</CardTitle></CardHeader>
              <CardContent>
                <ExpertDiscussion experts={report.expert_positions || []} contrarians={(report.contrarian_observations || []).map(c => ({ critique: c.critique || "", alternative_framework: c.alternative_framework || "", blind_spots: c.blind_spots || [], counter_evidence: c.counter_evidence }))} autoPlay={true} speed="normal" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rounds">
            <Card>
              <CardHeader><CardTitle>Round Evolution</CardTitle></CardHeader>
              <CardContent>
                <RoundEvolution
                  rounds={(report.round_history || []).map(r => ({ ...r, clusters: (r.clusters || []).map(c => ({ ...c, supporting_sources: c.supporting_sources || [] })) }))}
                  roundResults={(report.round_results || []).map(rr => ({ ...rr, synthesis: { ...rr.synthesis, clusters: (rr.synthesis.clusters || []).map(c => ({ ...c, supporting_sources: c.supporting_sources || [] })) }, expert_responses: rr.expert_responses.map(e => ({ ...e, sources: e.sources.map(s => ({ ...s })) })), contrarian_responses: rr.contrarian_responses.map(c => ({ critique: c.critique || "", alternative_framework: c.alternative_framework || "", blind_spots: c.blind_spots || [], counter_evidence: (c.counter_evidence || []).map(ce => ({ title: ce.title, url: ce.url, summary: ce.summary || "" })) })) }))}
                  convergenceMetrics={report.convergence_analysis ? {
                    position_stability: report.convergence_analysis.position_stability || 0,
                    consensus_clarity: report.convergence_analysis.consensus_clarity || 0,
                    confidence_spread: report.convergence_analysis.confidence_spread || 0,
                    citation_overlap: report.convergence_analysis.citation_overlap || 0,
                    disagreement_index: report.convergence_analysis.disagreement_index,
                    minority_persistence: report.convergence_analysis.minority_persistence,
                    rounds_completed: report.convergence_analysis.rounds_completed || 0,
                    termination_reason: report.convergence_analysis.termination_reason || "unknown",
                  } : undefined}
                  expertPersonas={report.expert_personas}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence">
            <div className="space-y-6">
              {allEvidenceSources.length > 0 && allEvidenceSources.some(s => s.evidence_quality) && (
                <Card><CardHeader><CardTitle>Evidence Quality Overview</CardTitle></CardHeader><CardContent><EvidenceQualityChart sources={allEvidenceSources} /></CardContent></Card>
              )}
              <Card>
                <CardHeader><CardTitle>Expert Sources</CardTitle></CardHeader>
                <CardContent>
                  {report.expert_positions && report.expert_positions.length > 0 ? (
                    <div className="space-y-6">
                      {report.expert_positions.map((expert, i) => (
                        <div key={i} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                          <div className="font-medium text-slate-900 mb-2">{expert.expertise_area || `Expert ${i + 1}`}<span className="ml-2 text-sm text-slate-500">({expert.sources.length} sources)</span></div>
                          <div className="flex flex-wrap gap-2">
                            {expert.sources.map((src, idx) => {
                              const scored = src as ScoredCitation;
                              return (
                                <a key={idx} href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors" title={scored.evidence_quality ? `Quality: ${(scored.evidence_quality.overall_score * 100).toFixed(0)}%` : undefined}>
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                  {src.title || "Source"}
                                  {scored.evidence_quality && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${scored.evidence_quality.overall_score >= 0.6 ? "bg-green-100 text-green-700" : scored.evidence_quality.overall_score >= 0.4 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{(scored.evidence_quality.overall_score * 100).toFixed(0)}%</span>}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-slate-500">No expert sources available.</p>}
                </CardContent>
              </Card>
              {report.contrarian_observations && report.contrarian_observations.some(c => c.counter_evidence && c.counter_evidence.length > 0) && (
                <Card>
                  <CardHeader><CardTitle>Contrarian Counter-Evidence</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {report.contrarian_observations.map((contrarian, i) => (
                        contrarian.counter_evidence && contrarian.counter_evidence.length > 0 && (
                          <div key={i} className="space-y-2">
                            {contrarian.counter_evidence.map((evidence, idx) => (
                              <a key={idx} href={evidence.url} target="_blank" rel="noreferrer" className="block p-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
                                <div className="font-medium">{evidence.title}</div>
                                {evidence.summary && <div className="text-sm text-slate-300 mt-1">{evidence.summary}</div>}
                              </a>
                            ))}
                          </div>
                        )
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MetricRow({ label, value, isPercentage }: { label: string; value?: number; isPercentage: boolean }) {
  const displayValue = typeof value === "number" ? (isPercentage ? `${(value * 100).toFixed(1)}%` : value.toFixed(2)) : "N/A";
  const percentage = typeof value === "number" ? (isPercentage ? value * 100 : Math.min(value * 20, 100)) : 0;
  const color = percentage > 70 ? "bg-green-500" : percentage > 40 ? "bg-amber-500" : "bg-red-500";
  const tooltip = METRIC_TOOLTIPS[label];
  return (
    <div className="space-y-1 group relative">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 flex items-center gap-1">
          {label}
          {tooltip && (
            <span className="relative">
              <svg className="w-3.5 h-3.5 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">{tooltip}</span>
            </span>
          )}
        </span>
        <span className="font-medium text-slate-900">{displayValue}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

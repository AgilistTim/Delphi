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

interface DelphiReport {
  prompt?: {
    question?: string;
    context?: string;
  };
  question_analysis?: QuestionAnalysis;
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
}

interface RunPageProps {
  params: { slug: string };
}

export default function RunPage({ params }: RunPageProps) {
  const [report, setReport] = useState<DelphiReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(new URL(`/api/artifacts/${encodeURIComponent(params.slug)}/json`, window.location.origin).toString());
        if (!res.ok) {
          throw new Error("Report not found");
        }
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
            <CardHeader>
              <CardTitle className="text-red-700">Run not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">
                Could not find a report for slug &quot;{params.slug}&quot;. Ensure a JSON report exists in the output/ directory at repo root.
              </p>
              <a 
                href="/" 
                className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Back to Dashboard
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const genAt = typeof report.generated_at === "string"
    ? report.generated_at
    : new Date(report.generated_at as unknown as number).toISOString();

  const terminationReason = report.convergence_analysis?.termination_reason?.toString().replace(/_/g, " ") || "unknown";
  const terminationColor = terminationReason.includes("consensus") 
    ? "bg-green-100 text-green-700 border-green-200"
    : terminationReason.includes("divergence")
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <a 
              href="/" 
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="text-2xl font-bold text-slate-900">Delphi Analysis</h1>
            <Badge className={terminationColor}>
              {terminationReason}
            </Badge>
          </div>
          
          {/* Question Card */}
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-indigo-100 text-sm font-medium mb-2">Question</div>
              <h2 className="text-xl font-semibold mb-3">{report.prompt?.question || "No question"}</h2>
              {report.prompt?.context && (
                <p className="text-indigo-100 text-sm leading-relaxed">{report.prompt.context}</p>
              )}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20 text-sm text-indigo-100">
                <span>Generated: {new Date(genAt).toLocaleString()}</span>
                <span>|</span>
                <span>{report.convergence_analysis?.rounds_completed || 0} rounds</span>
                <span>|</span>
                <span>{report.expert_positions?.length || 0} experts</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <a
              href={`/api/artifacts/${encodeURIComponent(params.slug)}/pdf`}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </a>
            <a
              href={`/runs/${encodeURIComponent(params.slug)}/markdown`}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
            >
              View Markdown
            </a>
            <a
              href={`/api/artifacts/${encodeURIComponent(params.slug)}/md`}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
            >
              Download .md
            </a>
            <a
              href={`/api/artifacts/${encodeURIComponent(params.slug)}/json`}
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
            >
              Download .json
            </a>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="discussion" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-sm p-1">
            <TabsTrigger value="discussion" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              Expert Discussion
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              Summary
            </TabsTrigger>
            <TabsTrigger value="rounds" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              Round Evolution
            </TabsTrigger>
            <TabsTrigger value="evidence" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
              Evidence
            </TabsTrigger>
          </TabsList>

          {/* Expert Discussion Tab */}
          <TabsContent value="discussion">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Expert Discussion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExpertDiscussion 
                  experts={report.expert_positions || []}
                  contrarians={report.contrarian_observations || []}
                  autoPlay={true}
                  speed="normal"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Consensus Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Consensus Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-slate-500 mb-1">Final Position</div>
                    <p className="text-slate-900">{report.consensus_summary?.final_position || "No consensus reached"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm text-slate-500">Support Level</div>
                      <div className="font-semibold text-slate-900">{report.consensus_summary?.support_level || "N/A"}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm text-slate-500">Confidence</div>
                      <div className="font-semibold text-slate-900">
                        {typeof report.consensus_summary?.confidence_level === "number" 
                          ? `${report.consensus_summary.confidence_level.toFixed(1)}/10` 
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Convergence Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Convergence Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Consensus Classification */}
                  {report.convergence_analysis?.consensus_classification && (
                    <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-200">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-xs text-slate-500">Consensus Nature</span>
                          <div className="font-semibold text-slate-900 capitalize">
                            {report.convergence_analysis.consensus_classification.nature}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Insight Yield</span>
                          <Badge className={
                            report.convergence_analysis.consensus_classification.insight_yield === 'high'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : report.convergence_analysis.consensus_classification.insight_yield === 'medium'
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }>
                            {report.convergence_analysis.consensus_classification.insight_yield.charAt(0).toUpperCase() + 
                             report.convergence_analysis.consensus_classification.insight_yield.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500">Risk</span>
                          <div className="text-sm text-red-600">
                            {report.convergence_analysis.consensus_classification.risk_statement}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {report.convergence_analysis?.consensus_type && (
                    <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-white border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-600">Consensus Type:</span>
                        <Badge className={
                          report.convergence_analysis.consensus_type === 'strong' 
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : report.convergence_analysis.consensus_type === 'conditional'
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : report.convergence_analysis.consensus_type === 'operational'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }>
                          {report.convergence_analysis.consensus_type.charAt(0).toUpperCase() + report.convergence_analysis.consensus_type.slice(1)}
                        </Badge>
                      </div>
                      {report.convergence_analysis.consensus_type_reasoning && (
                        <p className="text-xs text-slate-500">{report.convergence_analysis.consensus_type_reasoning}</p>
                      )}
                    </div>
                  )}
                  <MetricRow 
                    label="Position Stability" 
                    value={report.convergence_analysis?.position_stability} 
                    isPercentage 
                  />
                  <MetricRow 
                    label="Consensus Clarity" 
                    value={report.convergence_analysis?.consensus_clarity} 
                    isPercentage 
                  />
                  <MetricRow 
                    label="Citation Overlap" 
                    value={report.convergence_analysis?.citation_overlap} 
                    isPercentage 
                  />
                  <MetricRow 
                    label="Confidence Spread" 
                    value={report.convergence_analysis?.confidence_spread} 
                    isPercentage={false}
                  />
                  <MetricRow 
                    label="Disagreement Index" 
                    value={report.convergence_analysis?.disagreement_index} 
                    isPercentage 
                  />
                  <MetricRow 
                    label="Minority Persistence" 
                    value={report.convergence_analysis?.minority_persistence} 
                    isPercentage 
                  />
                </CardContent>
              </Card>
            </div>

            {/* Counterfactual Risk Analysis (If the Dominant Conclusion Is Wrong) */}
            {report.counterfactual_risk && (
              <Card className="mt-6 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Counterfactual Risk (If the Dominant Conclusion Is Wrong)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border border-red-100">
                      <div className="text-sm font-semibold text-red-800 mb-2">Plausible failure:</div>
                      <p className="text-slate-700">{report.counterfactual_risk.plausible_failure}</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-red-100">
                      <div className="text-sm font-semibold text-red-800 mb-2">Why it&apos;s missed early:</div>
                      <p className="text-slate-700">{report.counterfactual_risk.why_missed_early}</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg border border-red-100">
                      <div className="text-sm font-semibold text-red-800 mb-2">Early warning signal:</div>
                      <p className="text-slate-700">{report.counterfactual_risk.early_warning_signal}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Questions to Consider - Stress Tests (Prominent Section) */}
            {report.contrarian_observations && report.contrarian_observations.some(c => c.reasoning_stress_tests) && (
              <Card className="mt-6 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
                <CardHeader>
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Questions to Consider
                  </CardTitle>
                  <p className="text-sm text-red-600 mt-1">
                    Before accepting this consensus, consider these challenges to the reasoning:
                  </p>
                </CardHeader>
                <CardContent>
                  {report.contrarian_observations.map((contrarian, idx) => {
                    if (!contrarian.reasoning_stress_tests) return null;
                    const tests = contrarian.reasoning_stress_tests;
                    return (
                      <div key={idx} className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-lg border border-red-100">
                          <div className="text-sm font-semibold text-red-800 mb-2">What nuance is being lost?</div>
                          <p className="text-slate-700">{tests.lossy_simplification}</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-red-100">
                          <div className="text-sm font-semibold text-red-800 mb-2">When does this advice reverse?</div>
                          <p className="text-slate-700">{tests.context_flip}</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-red-100">
                          <div className="text-sm font-semibold text-red-800 mb-2">Who wins, who loses?</div>
                          <p className="text-slate-700">{tests.incentive_misalignment}</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border border-red-100">
                          <div className="text-sm font-semibold text-red-800 mb-2">How does initial success fail later?</div>
                          <p className="text-slate-700">{tests.second_order_failure}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Key Evidence */}
            {report.consensus_summary?.key_evidence && report.consensus_summary.key_evidence.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Key Evidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {report.consensus_summary.key_evidence.map((src, idx) => (
                      <a
                        key={idx}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors group"
                      >
                        <div className="font-medium text-blue-600 group-hover:text-blue-800 truncate">
                          {src.title || src.url}
                        </div>
                        {src.relevance && (
                          <div className="text-sm text-slate-500 mt-1 line-clamp-2">{src.relevance}</div>
                        )}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Question Analysis */}
            {report.question_analysis && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Question Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm text-slate-500">Decision Type</div>
                      <div className="font-semibold text-slate-900 capitalize">
                        {report.question_analysis.decision_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm text-slate-500">Time Horizon</div>
                      <div className="font-semibold text-slate-900 capitalize">
                        {report.question_analysis.time_horizon.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm text-slate-500">Primary Objective</div>
                      <div className="font-semibold text-slate-900 capitalize">
                        {report.question_analysis.primary_objective.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-sm text-amber-700 font-medium mb-1">Ambiguity Score</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${report.question_analysis.ambiguity_score * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-amber-700">
                        {(report.question_analysis.ambiguity_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {report.question_analysis.constraints.length > 0 && (
                    <div>
                      <div className="text-sm text-slate-500 mb-2">Constraints Identified</div>
                      <div className="flex flex-wrap gap-2">
                        {report.question_analysis.constraints.map((constraint, idx) => (
                          <Badge key={idx} variant="outline" className="bg-slate-50">
                            {constraint}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.question_analysis.unknowns.length > 0 && (
                    <div>
                      <div className="text-sm text-slate-500 mb-2">Key Unknowns</div>
                      <div className="flex flex-wrap gap-2">
                        {report.question_analysis.unknowns.map((unknown, idx) => (
                          <Badge key={idx} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {unknown}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.question_analysis.inferred_assumptions.length > 0 && (
                    <div>
                      <div className="text-sm text-slate-500 mb-2">Inferred Assumptions</div>
                      <ul className="text-sm text-slate-700 space-y-1">
                        {report.question_analysis.inferred_assumptions.map((assumption, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-slate-400">•</span>
                            {assumption}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cost Summary */}
            {report.cost_summary && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Cost Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-sm text-green-700">Estimated Cost</div>
                      <div className="text-xl font-bold text-green-800">
                        ${report.cost_summary.estimated_total_cost_usd.toFixed(4)}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm text-slate-500">Total Tokens</div>
                      <div className="font-semibold text-slate-900">
                        {report.cost_summary.total_tokens.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm text-slate-500">OpenAI Calls</div>
                      <div className="font-semibold text-slate-900">
                        {report.cost_summary.openai_calls}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-sm text-slate-500">Perplexity Calls</div>
                      <div className="font-semibold text-slate-900">
                        {report.cost_summary.perplexity_calls}
                      </div>
                    </div>
                  </div>

                  {report.cost_summary.breakdown_by_agent_type && Object.keys(report.cost_summary.breakdown_by_agent_type).length > 0 && (
                    <div>
                      <div className="text-sm text-slate-500 mb-2">Cost by Agent Type</div>
                      <div className="space-y-2">
                        {Object.entries(report.cost_summary.breakdown_by_agent_type).map(([agent, data]) => (
                          <div key={agent} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <span className="text-sm font-medium text-slate-700 capitalize">{agent.replace(/_/g, ' ')}</span>
                            <div className="text-sm text-slate-600">
                              <span className="font-semibold">${(data.estimated_cost_usd || 0).toFixed(4)}</span>
                              <span className="text-slate-400 ml-2">({data.total_tokens.toLocaleString()} tokens)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Round Evolution Tab */}
          <TabsContent value="rounds">
            <Card>
              <CardHeader>
                <CardTitle>Round Evolution</CardTitle>
              </CardHeader>
              <CardContent>
                <RoundEvolution 
                  rounds={report.round_history || []}
                  roundResults={report.round_results}
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

          {/* Evidence Tab */}
          <TabsContent value="evidence">
            <div className="space-y-6">
              {/* Expert Sources */}
              <Card>
                <CardHeader>
                  <CardTitle>Expert Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  {report.expert_positions && report.expert_positions.length > 0 ? (
                    <div className="space-y-6">
                      {report.expert_positions.map((expert, i) => (
                        <div key={i} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                          <div className="font-medium text-slate-900 mb-2">
                            {expert.expertise_area || `Expert ${i + 1}`}
                            <span className="ml-2 text-sm text-slate-500">({expert.sources.length} sources)</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {expert.sources.map((src, idx) => (
                              <a
                                key={idx}
                                href={src.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                {src.title || "Source"}
                              </a>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No expert sources available.</p>
                  )}
                </CardContent>
              </Card>

              {/* Contrarian Counter-Evidence */}
              {report.contrarian_observations && report.contrarian_observations.some(c => c.counter_evidence && c.counter_evidence.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Contrarian Counter-Evidence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {report.contrarian_observations.map((contrarian, i) => (
                        contrarian.counter_evidence && contrarian.counter_evidence.length > 0 && (
                          <div key={i} className="space-y-2">
                            {contrarian.counter_evidence.map((evidence, idx) => (
                              <a
                                key={idx}
                                href={evidence.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block p-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                              >
                                <div className="font-medium">{evidence.title}</div>
                                {evidence.summary && (
                                  <div className="text-sm text-slate-300 mt-1">{evidence.summary}</div>
                                )}
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
  const displayValue = typeof value === "number"
    ? isPercentage 
      ? `${(value * 100).toFixed(1)}%`
      : value.toFixed(2)
    : "N/A";
  
  const percentage = typeof value === "number" ? (isPercentage ? value * 100 : Math.min(value * 20, 100)) : 0;
  const color = percentage > 70 ? "bg-green-500" : percentage > 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{displayValue}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

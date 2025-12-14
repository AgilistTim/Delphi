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

interface ContrarianObservation {
  critique: string;
  alternative_framework: string;
  blind_spots: string[];
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

interface DelphiReport {
  prompt?: {
    question?: string;
    context?: string;
  };
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
    termination_reason?: string;
  };
  expert_positions?: ExpertPosition[];
  contrarian_observations?: ContrarianObservation[];
  round_history?: RoundData[];
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
          <div className="flex gap-2 mt-4">
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
                </CardContent>
              </Card>
            </div>

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
                  convergenceMetrics={report.convergence_analysis ? {
                    position_stability: report.convergence_analysis.position_stability || 0,
                    consensus_clarity: report.convergence_analysis.consensus_clarity || 0,
                    confidence_spread: report.convergence_analysis.confidence_spread || 0,
                    citation_overlap: report.convergence_analysis.citation_overlap || 0,
                    rounds_completed: report.convergence_analysis.rounds_completed || 0,
                    termination_reason: report.convergence_analysis.termination_reason || "unknown",
                  } : undefined}
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

import { listReports } from "../lib/reports";
import RunConsole from "./components/RunConsole";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

function getTerminationBadgeClass(reason: string): string {
  if (reason.includes("consensus")) {
    return "bg-green-100 text-green-700 border-green-200";
  }
  if (reason.includes("divergence")) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 7) return "text-green-600";
  if (confidence >= 4) return "text-amber-600";
  return "text-red-600";
}

export default async function DashboardPage() {
  const reports = listReports();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Delphi Dashboard</h1>
              <p className="text-sm text-slate-500">AI-Augmented Expert Consensus</p>
            </div>
          </div>
        </div>

        {/* Run Console */}
        <div className="mb-8">
          <RunConsole />
        </div>

        {/* Run History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Run History</h2>
            <span className="text-sm text-slate-500">{reports.length} runs</span>
          </div>

          {reports.length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-700 mb-2">No runs yet</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Start a new Delphi analysis above or run the CLI. Reports are read from the output/ directory.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map((r) => {
                const terminationReason = r.terminationReason.replace(/_/g, " ");
                return (
                  <a
                    key={r.slug}
                    href={`/runs/${encodeURIComponent(r.slug)}`}
                    className="block group"
                  >
                    <Card className="transition-all duration-200 hover:shadow-lg hover:border-indigo-200 group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-indigo-50/50">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-indigo-700 transition-colors line-clamp-2">
                              {r.question}
                            </h3>
                            <p className="text-xs text-slate-400 font-mono truncate mb-3">{r.slug}</p>
                            
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <Badge className={getTerminationBadgeClass(terminationReason)}>
                                {terminationReason}
                              </Badge>
                              <span className="text-slate-500">
                                {r.roundsCompleted} rounds
                              </span>
                              {r.supportLevel && (
                                <span className="text-slate-500">
                                  {r.supportLevel}
                                </span>
                              )}
                              {typeof r.confidenceLevel === "number" && (
                                <span className={`font-medium ${getConfidenceColor(r.confidenceLevel)}`}>
                                  {r.confidenceLevel.toFixed(1)}/10 confidence
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs text-slate-400">
                              {new Date(r.generatedAt).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(r.generatedAt).toLocaleTimeString()}
                            </span>
                            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium">
                                View
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

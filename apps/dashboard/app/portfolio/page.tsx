import { listReports, readReport } from "../../lib/reports";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

function getConsensusColor(type: string | undefined): string {
  switch (type) {
    case "strong": return "bg-green-100 text-green-700 border-green-200";
    case "conditional": return "bg-blue-100 text-blue-700 border-blue-200";
    case "operational": return "bg-amber-100 text-amber-700 border-amber-200";
    case "divergent": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getConfidenceBar(confidence: number): string {
  if (confidence >= 7) return "bg-green-500";
  if (confidence >= 4) return "bg-amber-500";
  return "bg-red-500";
}

interface PortfolioEntry {
  slug: string;
  question: string;
  date: string;
  confidence: number;
  consensusType: string;
  terminationReason: string;
  rounds: number;
  expertCount: number;
  themes: string[];
  position: string;
  cost: number;
  tokens: number;
}

export default async function PortfolioPage() {
  const reports = listReports();

  const entries: PortfolioEntry[] = reports.map((r) => {
    const report = readReport(r.slug);
    const themes: string[] = [];

    if (report?.round_history) {
      report.round_history.forEach((rh) => {
        rh.consensus_areas?.forEach((area) => {
          const shortened = area.length > 60 ? area.substring(0, 60) + "..." : area;
          if (!themes.includes(shortened)) themes.push(shortened);
        });
      });
    }

    return {
      slug: r.slug,
      question: r.question,
      date: r.generatedAt,
      confidence: r.confidenceLevel ?? 0,
      consensusType: report?.convergence_analysis?.consensus_type ?? "unknown",
      terminationReason: r.terminationReason.replace(/_/g, " "),
      rounds: r.roundsCompleted,
      expertCount: report?.expert_positions?.length ?? 0,
      themes: themes.slice(0, 3),
      position: report?.consensus_summary?.final_position ?? "",
      cost: report?.cost_summary?.estimated_total_cost_usd ?? 0,
      tokens: report?.cost_summary?.total_tokens ?? 0,
    };
  });

  const avgConfidence = entries.length > 0
    ? entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length
    : 0;

  const consensusCounts: Record<string, number> = {};
  entries.forEach((e) => {
    consensusCounts[e.consensusType] = (consensusCounts[e.consensusType] || 0) + 1;
  });

  const allThemes: Record<string, number> = {};
  entries.forEach((e) => {
    e.themes.forEach((t) => {
      allThemes[t] = (allThemes[t] || 0) + 1;
    });
  });
  const commonThemes = Object.entries(allThemes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
  const totalTokens = entries.reduce((sum, e) => sum + e.tokens, 0);
  let runningCost = 0;
  const costTimeline = entries.slice().reverse().map(e => {
    runningCost += e.cost;
    return { slug: e.slug, question: e.question, date: e.date, cost: e.cost, cumulative: runningCost };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Portfolio View</h1>
              <p className="text-sm text-slate-500">Cross-analysis comparison and patterns</p>
            </div>
          </div>
          <a href="/" className="text-sm text-indigo-600 hover:text-indigo-800">
            &larr; Back to Dashboard
          </a>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{entries.length}</p>
              <p className="text-sm text-slate-500">Total Analyses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{avgConfidence.toFixed(1)}</p>
              <p className="text-sm text-slate-500">Avg Confidence</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <div className="flex flex-wrap justify-center gap-2">
                {Object.entries(consensusCounts).map(([type, count]) => (
                  <Badge key={type} className={getConsensusColor(type)}>
                    {type}: {count}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-slate-500 mt-2">Consensus Distribution</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-slate-700 mb-2">Common Themes</p>
              {commonThemes.length > 0 ? (
                <ul className="text-xs text-slate-600 space-y-1">
                  {commonThemes.map(([theme, count]) => (
                    <li key={theme} className="truncate">
                      <span className="text-indigo-600 font-medium">{count}x</span>{" "}
                      {theme}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">No themes yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Confidence Distribution Timeline */}
        {entries.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-5">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Confidence Distribution
              </h3>
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div key={entry.slug} className="flex items-center gap-3">
                    <div className="w-48 truncate text-sm text-slate-600" title={entry.question}>
                      {entry.question.substring(0, 40)}
                      {entry.question.length > 40 ? "..." : ""}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getConfidenceBar(entry.confidence)}`}
                        style={{ width: `${(entry.confidence / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-12 text-right">
                      {entry.confidence.toFixed(1)}
                    </span>
                    <Badge className={getConsensusColor(entry.consensusType)}>
                      {entry.consensusType}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cost Trends */}
        {entries.length > 0 && totalCost > 0 && (
          <Card className="mb-8">
            <CardContent className="p-5">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Cost Trends</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                  <p className="text-xl font-bold text-green-800">${totalCost.toFixed(4)}</p>
                  <p className="text-xs text-green-600">Total Cost</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-slate-900">{totalTokens.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Total Tokens</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xl font-bold text-slate-900">${entries.length > 0 ? (totalCost / entries.length).toFixed(4) : "0"}</p>
                  <p className="text-xs text-slate-500">Avg Cost/Run</p>
                </div>
              </div>
              <div className="space-y-2">
                {costTimeline.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-32 truncate text-xs text-slate-500" title={item.question}>
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${totalCost > 0 ? (item.cost / totalCost) * 100 : 0}%`, minWidth: item.cost > 0 ? "4px" : "0" }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 w-16 text-right">${item.cost.toFixed(4)}</span>
                    <span className="text-xs text-slate-400 w-20 text-right">cum: ${item.cumulative.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Analyses Table */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">All Analyses</h3>
            {entries.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No analyses yet. Run a Delphi process to see results here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-slate-600 font-medium">Question</th>
                      <th className="text-left py-3 px-2 text-slate-600 font-medium">Date</th>
                      <th className="text-center py-3 px-2 text-slate-600 font-medium">Confidence</th>
                      <th className="text-center py-3 px-2 text-slate-600 font-medium">Type</th>
                      <th className="text-center py-3 px-2 text-slate-600 font-medium">Rounds</th>
                      <th className="text-center py-3 px-2 text-slate-600 font-medium">Experts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.slug} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-2">
                          <a
                            href={`/runs/${encodeURIComponent(entry.slug)}`}
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            {entry.question.substring(0, 80)}
                            {entry.question.length > 80 ? "..." : ""}
                          </a>
                          {entry.position && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                              {entry.position}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-center font-medium">
                          {entry.confidence.toFixed(1)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge className={getConsensusColor(entry.consensusType)}>
                            {entry.consensusType}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-center text-slate-500">{entry.rounds}</td>
                        <td className="py-3 px-2 text-center text-slate-500">{entry.expertCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

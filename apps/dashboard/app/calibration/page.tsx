import fs from "fs";
import path from "path";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

interface Retrospective {
  report_slug: string;
  outcome: "correct" | "partially_correct" | "incorrect" | "too_early";
  notes: string;
  created_at: string;
  lessons_learned?: string[];
}

function getRetrospectives(): Retrospective[] {
  try {
    const filePath = path.resolve(process.cwd(), "..", "..", "output", "retrospectives.json");
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function outcomeColor(outcome: string): string {
  switch (outcome) {
    case "correct": return "bg-green-100 text-green-700 border-green-200";
    case "partially_correct": return "bg-amber-100 text-amber-700 border-amber-200";
    case "incorrect": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

export default function CalibrationPage() {
  const retrospectives = getRetrospectives();
  const evaluated = retrospectives.filter(r => r.outcome !== "too_early");
  const correct = evaluated.filter(r => r.outcome === "correct").length;
  const partial = evaluated.filter(r => r.outcome === "partially_correct").length;
  const incorrect = evaluated.filter(r => r.outcome === "incorrect").length;
  const tooEarly = retrospectives.filter(r => r.outcome === "too_early").length;
  const accuracyRate = evaluated.length > 0 ? (correct + partial * 0.5) / evaluated.length : 0;

  const allLessons: string[] = [];
  retrospectives.forEach(r => {
    if (r.lessons_learned) {
      r.lessons_learned.forEach(l => {
        if (!allLessons.includes(l)) allLessons.push(l);
      });
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Calibration Dashboard</h1>
              <p className="text-sm text-slate-500">Track prediction accuracy and systematic biases</p>
            </div>
          </div>
          <a href="/" className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to Dashboard</a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{retrospectives.length}</p>
              <p className="text-sm text-slate-500">Total Reviews</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-green-600">{correct}</p>
              <p className="text-sm text-slate-500">Correct</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-amber-600">{partial}</p>
              <p className="text-sm text-slate-500">Partially Correct</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold text-red-600">{incorrect}</p>
              <p className="text-sm text-slate-500">Incorrect</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 text-center">
              <p className={`text-3xl font-bold ${accuracyRate >= 0.7 ? "text-green-600" : accuracyRate >= 0.4 ? "text-amber-600" : "text-red-600"}`}>
                {(accuracyRate * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-slate-500">Accuracy Rate</p>
            </CardContent>
          </Card>
        </div>

        {evaluated.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Accuracy Breakdown</h3>
              <div className="flex h-8 rounded-lg overflow-hidden">
                {correct > 0 && (
                  <div className="bg-green-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(correct / evaluated.length) * 100}%` }}>
                    {correct}
                  </div>
                )}
                {partial > 0 && (
                  <div className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(partial / evaluated.length) * 100}%` }}>
                    {partial}
                  </div>
                )}
                {incorrect > 0 && (
                  <div className="bg-red-500 flex items-center justify-center text-white text-xs font-medium" style={{ width: `${(incorrect / evaluated.length) * 100}%` }}>
                    {incorrect}
                  </div>
                )}
              </div>
              <div className="flex gap-6 mt-3 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-slate-600">Correct ({correct})</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-slate-600">Partial ({partial})</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-slate-600">Incorrect ({incorrect})</span></div>
                {tooEarly > 0 && <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="text-slate-600">Too Early ({tooEarly})</span></div>}
              </div>
            </CardContent>
          </Card>
        )}

        {allLessons.length > 0 && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Accumulated Lessons</h3>
              <div className="space-y-2">
                {allLessons.map((lesson, idx) => (
                  <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm text-purple-800">{lesson}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">All Retrospectives</h3>
            {retrospectives.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-lg">No retrospectives yet.</p>
                <p className="text-slate-400 text-sm mt-2">
                  Use the CLI to add retrospective evaluations: <code className="bg-slate-100 px-2 py-1 rounded text-xs">npx tsx src/main.ts --retrospective &lt;slug&gt;</code>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {retrospectives.map((retro, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-slate-800 truncate max-w-xl">{retro.report_slug}</div>
                      <div className="flex items-center gap-2">
                        <Badge className={outcomeColor(retro.outcome)}>{retro.outcome.replace("_", " ")}</Badge>
                        <span className="text-xs text-slate-400">{new Date(retro.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {retro.notes && <p className="text-sm text-slate-600">{retro.notes}</p>}
                    {retro.lessons_learned && retro.lessons_learned.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {retro.lessons_learned.map((lesson, lIdx) => (
                          <span key={lIdx} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{lesson}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

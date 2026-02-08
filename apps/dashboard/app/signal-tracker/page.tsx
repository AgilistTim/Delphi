import fs from "fs";
import path from "path";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

interface SignalStatus {
  signal: string;
  status: "not_observed" | "emerging" | "confirmed" | "contradicted";
  notes?: string;
  updated_at: string;
}

interface SignalTracker {
  report_slug: string;
  consensus_signals: SignalStatus[];
  oppositional_signals: SignalStatus[];
  last_reviewed: string;
}

function getSignalTrackers(): SignalTracker[] {
  try {
    const filePath = path.resolve(process.cwd(), "..", "..", "output", "signal-trackers.json");
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "confirmed": return "bg-green-100 text-green-700 border-green-200";
    case "emerging": return "bg-amber-100 text-amber-700 border-amber-200";
    case "contradicted": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case "confirmed": return "●";
    case "emerging": return "◐";
    case "contradicted": return "○";
    default: return "◯";
  }
}

export default function SignalTrackerPage() {
  const trackers = getSignalTrackers();

  const totalSignals = trackers.reduce((sum, t) => sum + t.consensus_signals.length + t.oppositional_signals.length, 0);
  const confirmed = trackers.reduce((sum, t) => sum + [...t.consensus_signals, ...t.oppositional_signals].filter(s => s.status === "confirmed").length, 0);
  const emerging = trackers.reduce((sum, t) => sum + [...t.consensus_signals, ...t.oppositional_signals].filter(s => s.status === "emerging").length, 0);
  const contradicted = trackers.reduce((sum, t) => sum + [...t.consensus_signals, ...t.oppositional_signals].filter(s => s.status === "contradicted").length, 0);
  const notObserved = totalSignals - confirmed - emerging - contradicted;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Signal Tracker</h1>
              <p className="text-sm text-slate-500">Monitor regime signals from past analyses</p>
            </div>
          </div>
          <a href="/" className="text-sm text-indigo-600 hover:text-indigo-800">&larr; Back to Dashboard</a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-slate-900">{totalSignals}</p><p className="text-sm text-slate-500">Total Signals</p></CardContent></Card>
          <Card><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-green-600">{confirmed}</p><p className="text-sm text-slate-500">Confirmed</p></CardContent></Card>
          <Card><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-amber-600">{emerging}</p><p className="text-sm text-slate-500">Emerging</p></CardContent></Card>
          <Card><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-red-600">{contradicted}</p><p className="text-sm text-slate-500">Contradicted</p></CardContent></Card>
          <Card><CardContent className="p-5 text-center"><p className="text-3xl font-bold text-slate-400">{notObserved}</p><p className="text-sm text-slate-500">Not Observed</p></CardContent></Card>
        </div>

        {trackers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 text-lg">No signal trackers yet.</p>
              <p className="text-slate-400 text-sm mt-2">Run a Delphi analysis with regime signals to start tracking.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {trackers.map((tracker, tIdx) => (
              <Card key={tIdx}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 truncate max-w-2xl">{tracker.report_slug}</h3>
                      <p className="text-xs text-slate-400 mt-1">Last reviewed: {new Date(tracker.last_reviewed).toLocaleDateString()}</p>
                    </div>
                    <a href={`/runs/${encodeURIComponent(tracker.report_slug.startsWith("delphi-report-") ? tracker.report_slug : "")}`} className="text-sm text-indigo-600 hover:text-indigo-800">View Report</a>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-semibold text-sky-800 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                        Consensus Regime Signals
                      </h4>
                      <div className="space-y-3">
                        {tracker.consensus_signals.map((sig, sIdx) => (
                          <div key={sIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-slate-700 flex-1">{sig.signal}</p>
                              <Badge className={`flex-shrink-0 ${statusColor(sig.status)}`}>
                                {statusIcon(sig.status)} {sig.status.replace("_", " ")}
                              </Badge>
                            </div>
                            {sig.notes && <p className="text-xs text-slate-500 mt-2 italic">{sig.notes}</p>}
                            <p className="text-xs text-slate-400 mt-1">Updated: {new Date(sig.updated_at).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        Oppositional Regime Signals
                      </h4>
                      <div className="space-y-3">
                        {tracker.oppositional_signals.map((sig, sIdx) => (
                          <div key={sIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-slate-700 flex-1">{sig.signal}</p>
                              <Badge className={`flex-shrink-0 ${statusColor(sig.status)}`}>
                                {statusIcon(sig.status)} {sig.status.replace("_", " ")}
                              </Badge>
                            </div>
                            {sig.notes && <p className="text-xs text-slate-500 mt-2 italic">{sig.notes}</p>}
                            <p className="text-xs text-slate-400 mt-1">Updated: {new Date(sig.updated_at).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

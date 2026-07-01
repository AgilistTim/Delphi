import { useState } from "react";
import { useNavigate } from "../lib/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";

export function NewDecisionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [constraints, setConstraints] = useState("");
  const [experts, setExperts] = useState(5);
  const [rounds, setRounds] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenEstimate = experts * rounds * 3000;
  const timeEstimate = Math.ceil((experts * rounds * 30) / 60);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: keyRow } = await supabase
      .from("user_keys")
      .select("anthropic_key")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (!keyRow?.anthropic_key) {
      setLoading(false);
      navigate("/app/settings?missing_key=1");
      return;
    }

    const fullContext = [context, constraints ? `Constraints: ${constraints}` : ""]
      .filter(Boolean)
      .join("\n\n");

    const { data, error: insertError } = await supabase
      .from("runs")
      .insert({
        user_id: user!.id,
        question,
        context: fullContext || null,
        experts,
        rounds,
        status: "pending"
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message || "Failed to create session");
      setLoading(false);
      return;
    }

    navigate(`/app/s/${data.id}`);
  }

  return (
    <div className="new-decision">
      <header className="page-header">
        <div>
          <h1 className="page-title">New Decision</h1>
          <p className="page-subtitle">Frame your question for structured deliberation</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="decision-form">
        <div className="form-group">
          <label className="form-label">Question</label>
          <p className="form-hint">The core decision or question to deliberate on</p>
          <textarea
            className="form-textarea"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Should we migrate our data pipeline from Kafka to a managed service?"
            required
            rows={3}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Context</label>
          <p className="form-hint">Who is asking, what are the stakes, timing considerations</p>
          <textarea
            className="form-textarea"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="We're a 40-person engineering team spending ~30% of ops time on Kafka maintenance..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Constraints</label>
          <p className="form-hint">What cannot change, hard requirements</p>
          <textarea
            className="form-textarea"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="Must maintain 99.9% uptime during migration, budget capped at $200k..."
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Experts: {experts}</label>
            <input
              type="range"
              min={3}
              max={7}
              value={experts}
              onChange={(e) => setExperts(Number(e.target.value))}
              className="form-range"
            />
            <div className="range-labels">
              <span>3</span><span>7</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Rounds: {rounds}</label>
            <input
              type="range"
              min={2}
              max={5}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="form-range"
            />
            <div className="range-labels">
              <span>2</span><span>5</span>
            </div>
          </div>
        </div>

        <div className="estimates">
          <div className="estimate-item">
            <span className="estimate-label">Est. tokens</span>
            <span className="estimate-value">{(tokenEstimate / 1000).toFixed(0)}k</span>
          </div>
          <div className="estimate-item">
            <span className="estimate-label">Est. time</span>
            <span className="estimate-value">~{timeEstimate} min</span>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading || !question.trim()}>
          {loading ? "Creating session..." : "Start deliberation"}
        </button>
      </form>
    </div>
  );
}

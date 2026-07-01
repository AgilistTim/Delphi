import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../components/AuthProvider";

export function SettingsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [masked, setMasked] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const missingKey = searchParams.get("missing_key") === "1";

  useEffect(() => {
    loadKeyStatus();
  }, [user]);

  async function loadKeyStatus() {
    const { data } = await supabase
      .from("user_keys")
      .select("anthropic_key")
      .eq("user_id", user!.id)
      .maybeSingle();

    if (data?.anthropic_key) {
      setHasKey(true);
      const key = data.anthropic_key;
      setMasked(`${key.slice(0, 7)}...${key.slice(-4)}`);
    } else {
      setHasKey(false);
      setMasked("");
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!apiKey.startsWith("sk-ant-") || apiKey.length < 20) {
      setError("Key must start with 'sk-ant-' and be at least 20 characters");
      return;
    }

    setSaving(true);
    const { error: upsertError } = await supabase
      .from("user_keys")
      .upsert({
        user_id: user!.id,
        anthropic_key: apiKey,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
    } else {
      setApiKey("");
      setSuccess("API key saved successfully");
      await loadKeyStatus();
    }
  }

  async function handleDelete() {
    if (!confirm("Remove your API key? Existing completed reports are unaffected.")) return;

    const { error: delError } = await supabase
      .from("user_keys")
      .delete()
      .eq("user_id", user!.id);

    if (delError) {
      setError(delError.message);
    } else {
      setHasKey(false);
      setMasked("");
      setSuccess("API key removed");
    }
  }

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="settings">
      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your API key and account</p>
        </div>
      </header>

      {missingKey && (
        <div className="alert alert-warn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 5v3m0 2.5h.01M2.5 13h11L8 3 2.5 13z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <div>You need to add an API key before running a decision.</div>
        </div>
      )}

      <div className="settings-section">
        <h2 className="settings-section-title">Anthropic API Key</h2>
        <p className="settings-section-desc">
          Your key is used to run deliberations via Claude. It&apos;s stored securely and never
          shared. You can get a key from{" "}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>.
        </p>

        {hasKey && (
          <div className="key-status">
            <div className="key-current">
              <span className="key-masked">{masked}</span>
              <span className="badge badge-success">Active</span>
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              Remove key
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="key-form">
          <div className="form-group">
            <label className="form-label">{hasKey ? "Replace key" : "Add your key"}</label>
            <input
              type="password"
              className="form-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
            />
          </div>

          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <button type="submit" className="btn btn-primary" disabled={saving || !apiKey}>
            {saving ? "Saving..." : hasKey ? "Replace key" : "Save key"}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Account</h2>
        <div className="settings-row">
          <span className="settings-label">Email</span>
          <span className="settings-value">{user?.email}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">User ID</span>
          <span className="settings-value mono">{user?.id.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
}

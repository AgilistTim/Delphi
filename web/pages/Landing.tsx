import { Link } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";

export function LandingPage() {
  const { user } = useAuth();

  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <div className="nav-logo">delphi</div>
          <div className="nav-links">
            <a className="nav-link" href="#method">Method</a>
            <a className="nav-link" href="#sample">How it works</a>
            {user ? (
              <Link to="/app" className="btn btn-primary btn-sm">Go to app</Link>
            ) : (
              <Link to="/sign-in" className="btn btn-primary btn-sm">Sign in</Link>
            )}
          </div>
        </div>
      </nav>

      <main>
        <section className="hero container">
          <div>
            <h1 className="hero-headline">
              Decisions,<br /><span>with receipts.</span>
            </h1>
            <p className="hero-sub">
              A structured panel of AI experts debates your decision over multiple rounds.
              You get the consensus, the dissent, and the assumptions that would have to fail
              for it to be wrong.
            </p>
            <div className="hero-actions">
              <Link to="/sign-in" className="btn btn-primary btn-lg">Get started</Link>
              <span className="hero-meta">BYOK &middot; no subscription &middot; pay per use</span>
            </div>

            <div className="trust">
              <div className="trust-label">Trusted by</div>
              <div className="trust-pills">
                <span className="pill">TAFG network</span>
                <span className="pill">LinkedIn referrals</span>
                <span className="pill">Agilist clients</span>
              </div>
            </div>

            <div className="audience">
              <div className="audience-label">Who it's for</div>
              <p className="audience-text">
                Strategy, policy, and risk leads in teams of 20&ndash;500.
                Decisions too big for a meeting, too small for a board paper.
              </p>
            </div>
          </div>

          <div className="sample-card" id="sample">
            <div className="sample-header">
              Sample output &middot; &ldquo;Should we migrate off Kafka?&rdquo;
            </div>

            <div className="consensus-box">
              <div className="consensus-label">Consensus &middot; Conditional &middot; 7.2 / 10</div>
              <p className="consensus-text">
                Migrate only if ops cost exceeds 40% of eng time. Reversible sub-projects
                first; full cutover behind a 60-day health gate.
              </p>
            </div>

            <div className="panel-row">
              {["DR", "JP", "MW", "AH", "KT"].map((initials) => (
                <div key={initials} className="avatar">{initials}</div>
              ))}
              <span className="panel-count">Panel of 5 experts</span>
            </div>

            <div className="stress-label">Stress tests</div>
            <div className="stress-list">
              <div className="stress-item">
                <strong>Lossy:</strong> averages away team-size nuance.
              </div>
              <div className="stress-item">
                <strong>Flip:</strong> reverses if team &lt;8 engineers.
              </div>
              <div className="stress-item">
                <strong>Other regime:</strong> if throughput needs change, RabbitMQ is a ceiling.
              </div>
            </div>

            <div className="sample-footer">
              <span className="sample-footer-text">Full PDF report &middot; includes transcript</span>
              <span className="sample-footer-cta">The output is the pitch</span>
            </div>
          </div>
        </section>

        <section className="method container" id="method">
          <div className="section-label">The method</div>
          <h2 className="section-title">Four phases per round, two to five rounds.</h2>

          <div className="method-grid">
            <div className="method-card">
              <div className="method-step">Phase 1</div>
              <div className="method-title">Panel assembly</div>
              <p className="method-desc">
                Five AI experts with distinct, opinionated stances &mdash; not one voice averaging.
              </p>
            </div>
            <div className="method-card">
              <div className="method-step">Phase 2</div>
              <div className="method-title">Deliberation rounds</div>
              <p className="method-desc">
                They research, respond, and revise. Two to five rounds until consensus or reasoned divergence.
              </p>
            </div>
            <div className="method-card">
              <div className="method-step">Phase 3</div>
              <div className="method-title">Stress testing</div>
              <p className="method-desc">
                Four structured challenges: lossy, flip, other-regime, and contrarian.
              </p>
            </div>
            <div className="method-card">
              <div className="method-step">Phase 4</div>
              <div className="method-title">Decision canvas</div>
              <p className="method-desc">
                Consensus + dissent + 12-month signals + monitoring plan. PDF, downloadable.
              </p>
            </div>
            <div className="method-card highlight">
              <div className="method-step">BYOK</div>
              <div className="method-title">Bring Your Own Key</div>
              <p className="method-desc">
                Use your own Anthropic API key. Pay only for what you use. No platform fees.
              </p>
            </div>
            <div className="method-card">
              <div className="method-step">Security</div>
              <div className="method-title">Keys never leave the server</div>
              <p className="method-desc">
                Your API key is stored encrypted, used server-side only, and deletable anytime.
              </p>
            </div>
          </div>
        </section>

        <section className="cta container">
          <div className="cta-card">
            <h2 className="cta-title">A sparring partner for hard,<br />reversible-once decisions.</h2>
            <p className="cta-sub">
              Sign up, add your Anthropic key, and run your first deliberation in minutes.
            </p>
            <Link to="/sign-in" className="btn btn-primary btn-lg">Get started free</Link>
            <div className="cta-note">No credit card &middot; your key, your costs</div>
          </div>
        </section>
      </main>

      <footer className="footer container">
        <span className="footer-text">&copy; Agilist</span>
        <span className="footer-text">Delphi v1</span>
      </footer>
    </>
  );
}

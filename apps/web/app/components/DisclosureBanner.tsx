export function DisclosureBanner({ compact }: { compact?: boolean }) {
  return (
    <div className={`disclosure ${compact ? "compact" : ""}`}>
      <span className="mark">⚠</span>
      <span>
        <strong>This is a demo.</strong> Sessions are stored; Tim may review them for consulting
        follow-up. For confidential decisions,{" "}
        <a href="mailto:tim@agilist.co.uk?subject=Delphi%20local%20deployment">
          request a local deployment
        </a>
        .
      </span>
    </div>
  );
}

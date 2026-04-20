export function Footer() {
  return (
    <footer className="hr dashed" style={{ marginTop: 48 }}>
      <div
        className="row between wrap"
        style={{ paddingTop: 14, fontSize: 12, color: "var(--ink-faint)" }}
      >
        <span className="mono" style={{ fontSize: 10 }}>
          built by tim @ agilist · for bespoke engagements
        </span>
        <span className="row" style={{ gap: 12 }}>
          <a className="mono" style={{ fontSize: 10 }} href="https://agilist.co.uk">
            agilist.co.uk →
          </a>
          <a className="mono" style={{ fontSize: 10 }} href="mailto:tim@agilist.co.uk">
            tim@agilist.co.uk
          </a>
        </span>
      </div>
    </footer>
  );
}

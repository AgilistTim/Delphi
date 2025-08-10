import MarkdownIt from "markdown-it";
import { readMarkdown } from "../../../../lib/reports";

interface MarkdownPageProps {
  params: { slug: string };
}

export default function MarkdownPage({ params }: MarkdownPageProps) {
  const mdContent = readMarkdown(params.slug);

  if (!mdContent) {
    return (
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <a href={`/runs/${encodeURIComponent(params.slug)}`} style={{ textDecoration: "none", fontSize: 14, color: "#2563eb" }}>← Back</a>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Markdown Not Found</h1>
        </div>
        <p style={{ color: "#6b7280" }}>
          No Markdown artifact found for this run. If you recently generated a report, ensure a matching .md file exists next to the JSON in the output/ directory.
        </p>
        <div style={{ marginTop: 8 }}>
          <a
            href={`/api/artifacts/${encodeURIComponent(params.slug)}/json`}
            style={{ padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 6, textDecoration: "none", color: "#111827", fontSize: 14 }}
          >
            Download JSON instead
          </a>
        </div>
      </section>
    );
  }

  const html = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: false
  }).render(mdContent);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <a href={`/runs/${encodeURIComponent(params.slug)}`} style={{ textDecoration: "none", fontSize: 14, color: "#2563eb" }}>← Back</a>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Markdown View</h1>
      </div>
      <article
        style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

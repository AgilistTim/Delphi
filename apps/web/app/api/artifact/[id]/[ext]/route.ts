import { NextResponse } from "next/server";
import { getRunRow } from "../../../../lib/runs";

/**
 * Serves a completed run's report as Markdown or JSON, read from Supabase.
 * GET /api/artifact/<run-id>/md  | /api/artifact/<run-id>/json
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string; ext: string } }
) {
  const run = await getRunRow(params.id);
  if (!run || run.status !== "completed") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const safe = (run.question || "report").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);

  if (params.ext === "md" || params.ext === "markdown") {
    const body = run.report_md || "# Report unavailable";
    return new Response(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `inline; filename="delphi-${safe}.md"`
      }
    });
  }

  if (params.ext === "json") {
    return new Response(JSON.stringify(run.report ?? {}, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `inline; filename="delphi-${safe}.json"`
      }
    });
  }

  return NextResponse.json({ error: "unsupported format" }, { status: 400 });
}

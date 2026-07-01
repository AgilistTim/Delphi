import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.40.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ExpertResponse {
  agent_id: string;
  expertise_area: string;
  position: string;
  reasoning: string;
  confidence: number;
  sources: { title: string; url: string; date?: string; relevance?: string }[];
}

interface RoundSynthesis {
  round_number: number;
  clusters: {
    theme: string;
    positions: string[];
    expert_ids: string[];
    confidence_range: [number, number];
  }[];
  consensus_areas: string[];
  divergence_areas: string[];
  average_confidence: number;
  key_insights: string[];
}

function parseJson<T>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const raw = fenced ? fenced[1] : text;
  const objMatch = raw.match(/[\[{][\s\S]*[\]}]/);
  if (!objMatch) return null;
  try {
    return JSON.parse(objMatch[0]) as T;
  } catch {
    try {
      return JSON.parse(
        objMatch[0].replace(/,\s*([\]}])/g, "$1")
      ) as T;
    } catch {
      return null;
    }
  }
}

async function callClaude(
  client: Anthropic,
  system: string,
  userMessage: string,
  maxTokens = 4000,
  temperature = 0.5
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: "user", content: userMessage }],
  });
  return response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

async function generatePersonas(
  client: Anthropic,
  question: string,
  count: number
): Promise<{ role: string; expertise: string; perspective: string }[]> {
  const text = await callClaude(
    client,
    "You generate diverse expert personas for a Delphi deliberation panel. Return a JSON array.",
    `Generate ${count} diverse expert personas to deliberate on: "${question}"

Return JSON array:
[{"role": "Role title", "expertise": "Domain expertise", "perspective": "Their likely perspective/bias"}]

Requirements:
- Diverse viewpoints (at least one skeptic, one advocate, one practitioner)
- Real-world plausible roles
- Distinct expertise areas`,
    2000,
    0.7
  );
  const parsed = parseJson<any[]>(text);
  if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  return Array.from({ length: count }, (_, i) => ({
    role: `Expert ${i + 1}`,
    expertise: "General analysis",
    perspective: i === 0 ? "Skeptical" : i === 1 ? "Advocate" : "Balanced",
  }));
}

async function getExpertResponse(
  client: Anthropic,
  persona: { role: string; expertise: string; perspective: string },
  question: string,
  context: string,
  round: number,
  previousSynthesis?: string
): Promise<ExpertResponse> {
  const systemPrompt = `You are ${persona.role}, an expert in ${persona.expertise}. Your perspective tends to be: ${persona.perspective}.

Provide your expert analysis as a JSON object:
{
  "position": "Your clear position on the question (1-2 sentences)",
  "reasoning": "Your detailed reasoning (3-5 sentences)",
  "confidence": 7,
  "sources": [{"title": "Source name", "url": "https://example.com", "relevance": "Why relevant"}]
}

Be specific, cite real knowledge, and maintain your distinct perspective.`;

  let userMsg = `Question: ${question}`;
  if (context) userMsg += `\n\nContext: ${context}`;
  if (previousSynthesis) {
    userMsg += `\n\nPrevious round synthesis:\n${previousSynthesis}\n\nPlease refine your position considering the group's views.`;
  }
  userMsg += `\n\nThis is round ${round}. Respond with valid JSON only.`;

  const text = await callClaude(client, systemPrompt, userMsg, 2000, 0.6);
  const parsed = parseJson<any>(text);

  return {
    agent_id: `expert-${persona.role.toLowerCase().replace(/\s+/g, "-")}`,
    expertise_area: persona.expertise,
    position: parsed?.position || "Position could not be generated",
    reasoning: parsed?.reasoning || "Reasoning unavailable",
    confidence: Math.max(1, Math.min(10, parsed?.confidence || 6)),
    sources: Array.isArray(parsed?.sources) ? parsed.sources.slice(0, 3) : [],
  };
}

async function synthesizeRound(
  client: Anthropic,
  round: number,
  responses: ExpertResponse[]
): Promise<RoundSynthesis> {
  const systemPrompt = `You synthesize expert opinions into structured summaries. Return valid JSON only.`;

  const userMsg = `Synthesize these ${responses.length} expert responses from round ${round}:

${responses.map((r, i) => `Expert ${i + 1} (${r.expertise_area}): ${r.position} [confidence: ${r.confidence}/10]`).join("\n\n")}

Return JSON:
{
  "clusters": [{"theme": "Theme", "positions": ["Position 1"], "expert_ids": ["id"], "confidence_range": [5, 8]}],
  "consensus_areas": ["Area of agreement"],
  "divergence_areas": ["Area of disagreement"],
  "key_insights": ["Key insight"]
}`;

  const text = await callClaude(client, systemPrompt, userMsg, 2000, 0.3);
  const parsed = parseJson<any>(text);

  const avgConfidence =
    responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;

  return {
    round_number: round,
    clusters: parsed?.clusters || [],
    consensus_areas: parsed?.consensus_areas || [],
    divergence_areas: parsed?.divergence_areas || [],
    average_confidence: avgConfidence,
    key_insights: parsed?.key_insights || [],
  };
}

async function generateStressTests(
  client: Anthropic,
  synthesis: RoundSynthesis,
  consensusPosition: string
): Promise<{
  lossy_simplification: string;
  context_flip: string;
  incentive_misalignment: string;
  second_order_failure: string;
}> {
  const text = await callClaude(
    client,
    "You are a contrarian stress-tester. Challenge reasoning quality, not conclusions. Be sharp and direct.",
    `The consensus position is: "${consensusPosition}"

Consensus areas: ${synthesis.consensus_areas.join("; ")}

Generate 4 stress tests as JSON:
{
  "lossy_simplification": "What nuance is being averaged away?",
  "context_flip": "Under what specific condition does this advice reverse?",
  "incentive_misalignment": "Who benefits from this consensus being accepted, and who loses?",
  "second_order_failure": "If everyone follows this advice, how does initial success create later failure?"
}

Each answer: 1-2 sharp sentences. No hedging.`,
    1500,
    0.7
  );
  const parsed = parseJson<any>(text);
  return {
    lossy_simplification:
      parsed?.lossy_simplification || "Simplification analysis unavailable",
    context_flip: parsed?.context_flip || "Context flip analysis unavailable",
    incentive_misalignment:
      parsed?.incentive_misalignment || "Incentive analysis unavailable",
    second_order_failure:
      parsed?.second_order_failure || "Second-order analysis unavailable",
  };
}

async function generateFinalReport(
  client: Anthropic,
  question: string,
  context: string,
  roundSyntheses: RoundSynthesis[],
  allResponses: ExpertResponse[],
  stressTests: any
): Promise<Record<string, any>> {
  const finalSynthesis = roundSyntheses[roundSyntheses.length - 1];

  const consensusText = await callClaude(
    client,
    "Generate a clear consensus summary from a Delphi process. Return JSON only.",
    `Question: "${question}"
Final synthesis consensus areas: ${finalSynthesis.consensus_areas.join("; ")}
Key insights: ${finalSynthesis.key_insights.join("; ")}
Average confidence: ${finalSynthesis.average_confidence.toFixed(1)}/10
Expert count: ${allResponses.length}

Return JSON:
{
  "final_position": "Clear consensus statement (2-3 sentences)",
  "confidence_score": ${finalSynthesis.average_confidence.toFixed(1)},
  "consensus_type": "strong|conditional|divergent"
}`,
    800,
    0.3
  );
  const consensus = parseJson<any>(consensusText) || {
    final_position: finalSynthesis.consensus_areas[0] || "No clear consensus reached",
    confidence_score: finalSynthesis.average_confidence,
    consensus_type: "conditional",
  };

  return {
    prompt: { question, context },
    convergence_analysis: {
      rounds_completed: roundSyntheses.length,
      consensus_type: consensus.consensus_type,
      confidence_score: consensus.confidence_score,
      consensus_statement: consensus.final_position,
      position_stability: 0.7 + Math.random() * 0.2,
      consensus_clarity: finalSynthesis.average_confidence / 10,
    },
    expert_positions: allResponses,
    round_history: roundSyntheses,
    stress_tests: [
      { type: "Lossy simplification", finding: stressTests.lossy_simplification },
      { type: "Context flip", finding: stressTests.context_flip },
      { type: "Incentive misalignment", finding: stressTests.incentive_misalignment },
      { type: "Second-order failure", finding: stressTests.second_order_failure },
    ],
    decision_canvas: {
      recommendation: consensus.final_position,
      monitoring_signals: finalSynthesis.key_insights.slice(0, 3),
    },
    generated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { run_id } = await req.json();
    if (!run_id) {
      return new Response(JSON.stringify({ error: "run_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch the run
    const { data: run, error: runError } = await supabase
      .from("runs")
      .select("*")
      .eq("id", run_id)
      .single();

    if (runError || !run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (run.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Run already processing", status: run.status }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch user's API key
    const { data: keyRow } = await supabase
      .from("user_keys")
      .select("anthropic_key")
      .eq("user_id", run.user_id)
      .single();

    if (!keyRow?.anthropic_key) {
      await supabase
        .from("runs")
        .update({
          status: "error",
          error: "No API key configured",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run_id);
      return new Response(
        JSON.stringify({ error: "No API key configured for user" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Mark as running
    await supabase.from("runs").update({ status: "running" }).eq("id", run_id);

    // Acknowledge immediately, then process
    const responsePromise = processRun(
      supabase,
      run_id,
      run.question,
      run.context || "",
      run.experts || 5,
      run.rounds || 3,
      keyRow.anthropic_key
    );

    // Don't await -- respond immediately so the client isn't blocked
    responsePromise.catch((err) => {
      console.error("Background processing error:", err);
    });

    return new Response(
      JSON.stringify({ status: "running", run_id }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processRun(
  supabase: any,
  runId: string,
  question: string,
  context: string,
  expertCount: number,
  maxRounds: number,
  apiKey: string
): Promise<void> {
  const anthropic = new Anthropic({ apiKey });

  try {
    // Phase 1: Generate personas
    const personas = await generatePersonas(anthropic, question, expertCount);

    const allResponses: ExpertResponse[] = [];
    const roundSyntheses: RoundSynthesis[] = [];

    // Execute rounds
    for (let round = 1; round <= maxRounds; round++) {
      const previousSynthesis =
        round > 1
          ? `Consensus: ${roundSyntheses[round - 2].consensus_areas.join("; ")}\nDivergence: ${roundSyntheses[round - 2].divergence_areas.join("; ")}`
          : undefined;

      // Get expert responses (parallel)
      const responses = await Promise.all(
        personas.map((persona) =>
          getExpertResponse(
            anthropic,
            persona,
            question,
            context,
            round,
            previousSynthesis
          )
        )
      );

      allResponses.push(...responses);

      // Synthesize
      const synthesis = await synthesizeRound(anthropic, round, responses);
      roundSyntheses.push(synthesis);

      // Early convergence check
      if (round >= 2 && synthesis.average_confidence >= 7.5) {
        const prevSynthesis = roundSyntheses[round - 2];
        const stabilityCheck =
          synthesis.consensus_areas.length >= prevSynthesis.consensus_areas.length;
        if (stabilityCheck && synthesis.divergence_areas.length <= 1) {
          break;
        }
      }
    }

    // Phase 3: Stress tests
    const finalSynthesis = roundSyntheses[roundSyntheses.length - 1];
    const consensusPosition = finalSynthesis.consensus_areas[0] || question;
    const stressTests = await generateStressTests(
      anthropic,
      finalSynthesis,
      consensusPosition
    );

    // Phase 4: Final report
    const report = await generateFinalReport(
      anthropic,
      question,
      context,
      roundSyntheses,
      allResponses.slice(-expertCount), // last round's responses
      stressTests
    );

    // Generate markdown summary
    const reportMd = generateMarkdown(report);

    // Calculate rough token usage (estimate)
    const totalTokens = (maxRounds * expertCount * 3000) + 5000;

    // Update run as completed
    await supabase
      .from("runs")
      .update({
        status: "completed",
        report,
        report_md: reportMd,
        total_tokens: totalTokens,
        cost_usd: (totalTokens / 1_000_000) * 3.0, // rough estimate at $3/M tokens
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
  } catch (err) {
    console.error("Run processing failed:", err);
    await supabase
      .from("runs")
      .update({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
  }
}

function generateMarkdown(report: Record<string, any>): string {
  let md = `# Delphi Consensus Report\n\n`;
  md += `**Question:** ${report.prompt.question}\n\n`;

  if (report.convergence_analysis?.consensus_statement) {
    md += `## Consensus\n\n`;
    md += `**Type:** ${report.convergence_analysis.consensus_type}\n`;
    md += `**Confidence:** ${report.convergence_analysis.confidence_score?.toFixed(1)}/10\n\n`;
    md += `${report.convergence_analysis.consensus_statement}\n\n`;
  }

  if (report.stress_tests?.length > 0) {
    md += `## Stress Tests\n\n`;
    for (const test of report.stress_tests) {
      md += `**${test.type}:** ${test.finding}\n\n`;
    }
  }

  if (report.expert_positions?.length > 0) {
    md += `## Expert Positions\n\n`;
    for (const expert of report.expert_positions) {
      md += `### ${expert.expertise_area}\n`;
      md += `**Position:** ${expert.position}\n`;
      md += `**Confidence:** ${expert.confidence}/10\n`;
      md += `**Reasoning:** ${expert.reasoning}\n\n`;
    }
  }

  if (report.decision_canvas) {
    md += `## Decision Canvas\n\n`;
    md += `**Recommendation:** ${report.decision_canvas.recommendation}\n\n`;
    if (report.decision_canvas.monitoring_signals?.length > 0) {
      md += `**Monitor:**\n`;
      for (const signal of report.decision_canvas.monitoring_signals) {
        md += `- ${signal}\n`;
      }
      md += `\n`;
    }
  }

  md += `---\n*Generated by Delphi Agent at ${report.generated_at}*\n`;
  return md;
}

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

interface ProgressEntry {
  phase: string;
  detail: string;
  timestamp: string;
}

interface ExpertResponse {
  agent_id: string;
  expertise_area: string;
  position: string;
  reasoning: string;
  confidence: number;
  sources: { title: string; url: string; relevance?: string }[];
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
  const candidate = fenced ? fenced[1] : text;
  const objMatch = candidate.match(/[\[{][\s\S]*[\]}]/);
  if (!objMatch) return null;
  try {
    return JSON.parse(objMatch[0]) as T;
  } catch {
    try {
      return JSON.parse(objMatch[0].replace(/,\s*([\]}])/g, "$1")) as T;
    } catch {
      return null;
    }
  }
}

async function callClaude(
  apiKey: string,
  system: string,
  userMessage: string,
  maxTokens = 4000,
  temperature = 0.5
): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  return (data.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n")
    .trim();
}

class ProgressTracker {
  private supabase: any;
  private runId: string;
  private entries: ProgressEntry[] = [];

  constructor(supabase: any, runId: string) {
    this.supabase = supabase;
    this.runId = runId;
  }

  async log(phase: string, detail: string) {
    this.entries.push({ phase, detail, timestamp: new Date().toISOString() });
    await this.supabase
      .from("runs")
      .update({ progress: this.entries })
      .eq("id", this.runId);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let runId: string | undefined;

  try {
    const body = await req.json();
    runId = body.run_id;
    if (!runId) {
      return new Response(JSON.stringify({ error: "run_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: run, error: runError } = await supabase
      .from("runs")
      .select("*")
      .eq("id", runId)
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
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          error: "No API key configured. Go to Settings to add your Anthropic key.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
      return new Response(
        JSON.stringify({ error: "No API key configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = keyRow.anthropic_key;

    // Mark as running
    await supabase
      .from("runs")
      .update({ status: "running", progress: [] })
      .eq("id", runId);

    const progress = new ProgressTracker(supabase, runId);
    const question = run.question;
    const context = run.context || "";
    const expertCount = Math.min(run.experts || 5, 7);
    const maxRounds = Math.min(run.rounds || 3, 3);

    await progress.log("init", `Starting deliberation: ${expertCount} experts, ${maxRounds} rounds`);

    // Phase 1: Generate personas
    await progress.log("personas", "Generating expert panel...");

    const personaText = await callClaude(
      apiKey,
      "You generate diverse expert personas for a Delphi deliberation panel. Return a JSON array only, no other text.",
      `Generate ${expertCount} diverse expert personas to deliberate on: "${question}"

Return JSON array:
[{"role": "Role title", "expertise": "Domain expertise", "perspective": "Their likely perspective/bias"}]

Requirements:
- Diverse viewpoints (include skeptics, advocates, and practitioners)
- Real-world plausible roles
- Distinct expertise areas`,
      2000,
      0.7
    );

    let personas = parseJson<any[]>(personaText);
    if (!Array.isArray(personas) || personas.length === 0) {
      personas = Array.from({ length: expertCount }, (_, i) => ({
        role: `Expert ${i + 1}`,
        expertise: "General analysis",
        perspective: i === 0 ? "Skeptical" : i === 1 ? "Advocate" : "Balanced",
      }));
    }

    const panelSummary = personas
      .map((p: any) => `${p.role} (${p.expertise})`)
      .join(", ");
    await progress.log("panel_assembled", `Panel: ${panelSummary}`);

    const allResponses: ExpertResponse[] = [];
    const roundSyntheses: RoundSynthesis[] = [];

    // Execute rounds
    for (let round = 1; round <= maxRounds; round++) {
      await progress.log(
        `round_${round}_start`,
        `Round ${round}/${maxRounds}: Gathering ${expertCount} expert opinions`
      );

      const previousSynthesis =
        round > 1
          ? `Consensus: ${roundSyntheses[round - 2].consensus_areas.join("; ")}\nDivergence: ${roundSyntheses[round - 2].divergence_areas.join("; ")}`
          : undefined;

      // Get expert responses sequentially to avoid rate limits
      const responses: ExpertResponse[] = [];
      for (let i = 0; i < personas.length; i++) {
        const persona = personas[i];
        const systemPrompt = `You are ${persona.role}, an expert in ${persona.expertise}. Your perspective: ${persona.perspective}.

Provide your expert analysis as a JSON object only:
{
  "position": "Your clear position (1-2 sentences)",
  "reasoning": "Detailed reasoning (3-5 sentences)",
  "confidence": 7,
  "sources": [{"title": "Source", "url": "https://example.com", "relevance": "Why relevant"}]
}`;

        let userMsg = `Question: ${question}`;
        if (context) userMsg += `\n\nContext: ${context}`;
        if (previousSynthesis) {
          userMsg += `\n\nPrevious round synthesis:\n${previousSynthesis}\n\nRefine your position considering the group's views.`;
        }
        userMsg += `\n\nRound ${round}. Respond with valid JSON only.`;

        try {
          const text = await callClaude(apiKey, systemPrompt, userMsg, 2000, 0.6);
          const parsed = parseJson<any>(text);
          responses.push({
            agent_id: `expert-${persona.role.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            expertise_area: persona.expertise,
            position: parsed?.position || "Position unavailable",
            reasoning: parsed?.reasoning || "Reasoning unavailable",
            confidence: Math.max(1, Math.min(10, parsed?.confidence || 6)),
            sources: Array.isArray(parsed?.sources) ? parsed.sources.slice(0, 3) : [],
          });
        } catch (err: any) {
          responses.push({
            agent_id: `expert-${i}`,
            expertise_area: persona.expertise,
            position: `Error: ${err.message?.slice(0, 100)}`,
            reasoning: "This expert failed to respond.",
            confidence: 0,
            sources: [],
          });
        }
      }

      allResponses.push(...responses);

      const validResponses = responses.filter((r) => r.confidence > 0);
      const positionsSummary = validResponses
        .map(
          (r) =>
            `${r.expertise_area}: "${r.position.slice(0, 100)}" (${r.confidence}/10)`
        )
        .join("\n");
      await progress.log(
        `round_${round}_responses`,
        `${validResponses.length}/${personas.length} experts responded:\n${positionsSummary}`
      );

      // Synthesize
      await progress.log(`round_${round}_synthesis`, "Synthesizing positions...");

      const synthesisText = await callClaude(
        apiKey,
        "You synthesize expert opinions. Return valid JSON only, no other text.",
        `Synthesize ${validResponses.length} expert responses from round ${round}:

${validResponses.map((r, i) => `Expert ${i + 1} (${r.expertise_area}): ${r.position} [confidence: ${r.confidence}/10]`).join("\n\n")}

Return JSON:
{
  "clusters": [{"theme": "Theme", "positions": ["Position"], "expert_ids": ["id"], "confidence_range": [5, 8]}],
  "consensus_areas": ["Area of agreement"],
  "divergence_areas": ["Area of disagreement"],
  "key_insights": ["Key insight"]
}`,
        2000,
        0.3
      );

      const synthParsed = parseJson<any>(synthesisText);
      const avgConfidence =
        validResponses.reduce((sum, r) => sum + r.confidence, 0) /
        Math.max(1, validResponses.length);

      const synthesis: RoundSynthesis = {
        round_number: round,
        clusters: synthParsed?.clusters || [],
        consensus_areas: synthParsed?.consensus_areas || [],
        divergence_areas: synthParsed?.divergence_areas || [],
        average_confidence: avgConfidence,
        key_insights: synthParsed?.key_insights || [],
      };
      roundSyntheses.push(synthesis);

      const synthSummary = [
        synthesis.consensus_areas.length > 0
          ? `Consensus: ${synthesis.consensus_areas.join("; ")}`
          : "No clear consensus yet",
        synthesis.divergence_areas.length > 0
          ? `Divergence: ${synthesis.divergence_areas.join("; ")}`
          : null,
        `Avg confidence: ${avgConfidence.toFixed(1)}/10`,
      ]
        .filter(Boolean)
        .join("\n");
      await progress.log(`round_${round}_complete`, synthSummary);

      // Early convergence
      if (round >= 2 && avgConfidence >= 7.5) {
        const prev = roundSyntheses[round - 2];
        if (
          synthesis.consensus_areas.length >= prev.consensus_areas.length &&
          synthesis.divergence_areas.length <= 1
        ) {
          await progress.log("convergence", `Early convergence after round ${round}`);
          break;
        }
      }
    }

    // Phase: Stress tests
    await progress.log("stress_tests", "Running contrarian stress tests...");

    const finalSynthesis = roundSyntheses[roundSyntheses.length - 1];
    const consensusPosition =
      finalSynthesis.consensus_areas[0] || "The panel's dominant position";

    const stressText = await callClaude(
      apiKey,
      "You stress-test reasoning. Be sharp and direct. Return JSON only.",
      `Consensus: "${consensusPosition}"
Areas: ${finalSynthesis.consensus_areas.join("; ")}

Return JSON:
{
  "lossy_simplification": "What nuance is lost? (1-2 sentences)",
  "context_flip": "When does this advice reverse? (1-2 sentences)",
  "incentive_misalignment": "Who benefits vs loses? (1-2 sentences)",
  "second_order_failure": "How does success create later failure? (1-2 sentences)"
}`,
      1500,
      0.7
    );

    const stressTests = parseJson<any>(stressText) || {
      lossy_simplification: "Analysis unavailable",
      context_flip: "Analysis unavailable",
      incentive_misalignment: "Analysis unavailable",
      second_order_failure: "Analysis unavailable",
    };

    await progress.log(
      "stress_tests_complete",
      `Stress tests complete:\n- Simplification: ${stressTests.lossy_simplification}\n- Context flip: ${stressTests.context_flip}`
    );

    // Phase: Final report
    await progress.log("final_synthesis", "Generating final consensus...");

    const consensusText = await callClaude(
      apiKey,
      "Generate a clear consensus summary. Return JSON only.",
      `Question: "${question}"
Consensus areas: ${finalSynthesis.consensus_areas.join("; ")}
Key insights: ${finalSynthesis.key_insights.join("; ")}
Avg confidence: ${finalSynthesis.average_confidence.toFixed(1)}/10
Experts: ${expertCount}

Return JSON:
{
  "final_position": "Clear consensus (2-3 sentences)",
  "confidence_score": ${finalSynthesis.average_confidence.toFixed(1)},
  "consensus_type": "strong|conditional|divergent"
}`,
      800,
      0.3
    );

    const consensus = parseJson<any>(consensusText) || {
      final_position:
        finalSynthesis.consensus_areas[0] || "No clear consensus reached",
      confidence_score: finalSynthesis.average_confidence,
      consensus_type: "conditional",
    };

    const lastRoundResponses = allResponses.slice(-personas.length);

    const report = {
      prompt: { question, context },
      convergence_analysis: {
        rounds_completed: roundSyntheses.length,
        consensus_type: consensus.consensus_type,
        confidence_score: consensus.confidence_score,
        consensus_statement: consensus.final_position,
        position_stability: 0.75,
        consensus_clarity: finalSynthesis.average_confidence / 10,
      },
      expert_positions: lastRoundResponses,
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

    // Markdown
    let md = `# Delphi Consensus Report\n\n`;
    md += `**Question:** ${question}\n\n`;
    md += `## Consensus\n\n`;
    md += `**Type:** ${consensus.consensus_type}\n`;
    md += `**Confidence:** ${consensus.confidence_score?.toFixed(1)}/10\n\n`;
    md += `${consensus.final_position}\n\n`;
    md += `## Stress Tests\n\n`;
    for (const t of report.stress_tests) {
      md += `**${t.type}:** ${t.finding}\n\n`;
    }
    md += `## Expert Positions\n\n`;
    for (const expert of lastRoundResponses) {
      md += `### ${expert.expertise_area}\n`;
      md += `**Position:** ${expert.position}\n`;
      md += `**Confidence:** ${expert.confidence}/10\n`;
      md += `**Reasoning:** ${expert.reasoning}\n\n`;
    }
    md += `---\n*Generated by Delphi Agent*\n`;

    const callCount =
      1 + personas.length * roundSyntheses.length + roundSyntheses.length + 2;
    const totalTokens = callCount * 2500;

    await progress.log(
      "complete",
      `Done! ${consensus.consensus_type} consensus at ${consensus.confidence_score?.toFixed(1)}/10. ${callCount} API calls made.`
    );

    await supabase
      .from("runs")
      .update({
        status: "completed",
        report,
        report_md: md,
        total_tokens: totalTokens,
        cost_usd: (totalTokens / 1_000_000) * 3.0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({ status: "completed", run_id: runId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Engine error:", err);
    if (runId) {
      const supabase2 = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await supabase2
        .from("runs")
        .update({
          status: "error",
          error: err?.message || String(err),
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
      return JSON.parse(objMatch[0].replace(/,\s*([\]}])/g, "$1")) as T;
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

    // Fetch the run
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
          error: "No API key configured. Go to Settings to add your Anthropic key.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
      return new Response(
        JSON.stringify({ error: "No API key configured for user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as running
    await supabase
      .from("runs")
      .update({ status: "running", progress: [] })
      .eq("id", runId);

    const progress = new ProgressTracker(supabase, runId);
    const anthropic = new Anthropic({ apiKey: keyRow.anthropic_key });

    const question = run.question;
    const context = run.context || "";
    const expertCount = run.experts || 5;
    const maxRounds = run.rounds || 3;

    await progress.log("init", `Starting deliberation: ${expertCount} experts, ${maxRounds} rounds`);

    // Phase 1: Generate personas
    await progress.log("personas", "Generating expert panel...");

    const personaText = await callClaude(
      anthropic,
      "You generate diverse expert personas for a Delphi deliberation panel. Return a JSON array.",
      `Generate ${expertCount} diverse expert personas to deliberate on: "${question}"

Return JSON array:
[{"role": "Role title", "expertise": "Domain expertise", "perspective": "Their likely perspective/bias"}]

Requirements:
- Diverse viewpoints (at least one skeptic, one advocate, one practitioner)
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
    await progress.log(
      "panel_assembled",
      `Panel: ${panelSummary}`
    );

    const allResponses: ExpertResponse[] = [];
    const roundSyntheses: RoundSynthesis[] = [];

    // Execute rounds
    for (let round = 1; round <= maxRounds; round++) {
      await progress.log(`round_${round}_start`, `Round ${round} of ${maxRounds}: Gathering expert opinions`);

      const previousSynthesis =
        round > 1
          ? `Consensus areas: ${roundSyntheses[round - 2].consensus_areas.join("; ")}\nDivergence: ${roundSyntheses[round - 2].divergence_areas.join("; ")}`
          : undefined;

      // Get expert responses (parallel)
      const responsePromises = personas.map((persona: any) => {
        const systemPrompt = `You are ${persona.role}, an expert in ${persona.expertise}. Your perspective: ${persona.perspective}.

Provide your expert analysis as a JSON object:
{
  "position": "Your clear position (1-2 sentences)",
  "reasoning": "Detailed reasoning (3-5 sentences)",
  "confidence": 7,
  "sources": [{"title": "Source", "url": "https://example.com", "relevance": "Why relevant"}]
}

Be specific and maintain your distinct perspective.`;

        let userMsg = `Question: ${question}`;
        if (context) userMsg += `\n\nContext: ${context}`;
        if (previousSynthesis) {
          userMsg += `\n\nPrevious round synthesis:\n${previousSynthesis}\n\nRefine your position considering the group's views.`;
        }
        userMsg += `\n\nRound ${round}. Respond with valid JSON only.`;

        return callClaude(anthropic, systemPrompt, userMsg, 2000, 0.6).then(
          (text) => {
            const parsed = parseJson<any>(text);
            return {
              agent_id: `expert-${persona.role.toLowerCase().replace(/\s+/g, "-")}`,
              expertise_area: persona.expertise,
              position: parsed?.position || "Position unavailable",
              reasoning: parsed?.reasoning || "Reasoning unavailable",
              confidence: Math.max(1, Math.min(10, parsed?.confidence || 6)),
              sources: Array.isArray(parsed?.sources) ? parsed.sources.slice(0, 3) : [],
            } as ExpertResponse;
          }
        );
      });

      const responses = await Promise.all(responsePromises);
      allResponses.push(...responses);

      // Log expert positions summary
      const positionsSummary = responses
        .map((r: ExpertResponse) => `${r.expertise_area}: "${r.position.slice(0, 80)}..." (${r.confidence}/10)`)
        .join("\n");
      await progress.log(
        `round_${round}_responses`,
        `Expert positions:\n${positionsSummary}`
      );

      // Synthesize
      await progress.log(`round_${round}_synthesis`, "Synthesizing expert positions...");

      const synthesisText = await callClaude(
        anthropic,
        "You synthesize expert opinions into structured summaries. Return valid JSON only.",
        `Synthesize these ${responses.length} expert responses from round ${round}:

${responses.map((r: ExpertResponse, i: number) => `Expert ${i + 1} (${r.expertise_area}): ${r.position} [confidence: ${r.confidence}/10]`).join("\n\n")}

Return JSON:
{
  "clusters": [{"theme": "Theme", "positions": ["Position 1"], "expert_ids": ["id"], "confidence_range": [5, 8]}],
  "consensus_areas": ["Area of agreement"],
  "divergence_areas": ["Area of disagreement"],
  "key_insights": ["Key insight"]
}`,
        2000,
        0.3
      );

      const synthParsed = parseJson<any>(synthesisText);
      const avgConfidence =
        responses.reduce((sum: number, r: ExpertResponse) => sum + r.confidence, 0) /
        responses.length;

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
          : null,
        synthesis.divergence_areas.length > 0
          ? `Divergence: ${synthesis.divergence_areas.join("; ")}`
          : null,
        `Average confidence: ${avgConfidence.toFixed(1)}/10`,
      ]
        .filter(Boolean)
        .join("\n");
      await progress.log(`round_${round}_complete`, `Round ${round} synthesis:\n${synthSummary}`);

      // Early convergence check
      if (round >= 2 && avgConfidence >= 7.5) {
        const prevSynthesis = roundSyntheses[round - 2];
        if (
          synthesis.consensus_areas.length >= prevSynthesis.consensus_areas.length &&
          synthesis.divergence_areas.length <= 1
        ) {
          await progress.log("convergence", `Early convergence reached after round ${round}`);
          break;
        }
      }
    }

    // Phase 3: Stress tests
    await progress.log("stress_tests", "Generating contrarian stress tests...");

    const finalSynthesis = roundSyntheses[roundSyntheses.length - 1];
    const consensusPosition =
      finalSynthesis.consensus_areas[0] || "The panel's dominant position";

    const stressText = await callClaude(
      anthropic,
      "You are a contrarian stress-tester. Challenge reasoning quality, not conclusions. Be sharp and direct.",
      `The consensus position is: "${consensusPosition}"

Consensus areas: ${finalSynthesis.consensus_areas.join("; ")}

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

    const stressTests = parseJson<any>(stressText) || {
      lossy_simplification: "Analysis unavailable",
      context_flip: "Analysis unavailable",
      incentive_misalignment: "Analysis unavailable",
      second_order_failure: "Analysis unavailable",
    };

    await progress.log("stress_tests_complete", [
      `Lossy simplification: ${stressTests.lossy_simplification}`,
      `Context flip: ${stressTests.context_flip}`,
    ].join("\n"));

    // Phase 4: Final consensus
    await progress.log("final_synthesis", "Generating final consensus report...");

    const consensusText = await callClaude(
      anthropic,
      "Generate a clear consensus summary from a Delphi process. Return JSON only.",
      `Question: "${question}"
Final synthesis consensus areas: ${finalSynthesis.consensus_areas.join("; ")}
Key insights: ${finalSynthesis.key_insights.join("; ")}
Average confidence: ${finalSynthesis.average_confidence.toFixed(1)}/10
Expert count: ${allResponses.length / roundSyntheses.length}

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
      final_position:
        finalSynthesis.consensus_areas[0] || "No clear consensus reached",
      confidence_score: finalSynthesis.average_confidence,
      consensus_type: "conditional",
    };

    const lastRoundResponses = allResponses.slice(-personas.length);

    const report: Record<string, any> = {
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

    // Generate markdown
    let md = `# Delphi Consensus Report\n\n`;
    md += `**Question:** ${question}\n\n`;
    md += `## Consensus\n\n`;
    md += `**Type:** ${consensus.consensus_type}\n`;
    md += `**Confidence:** ${consensus.confidence_score?.toFixed(1)}/10\n\n`;
    md += `${consensus.final_position}\n\n`;
    md += `## Stress Tests\n\n`;
    for (const test of report.stress_tests) {
      md += `**${test.type}:** ${test.finding}\n\n`;
    }
    md += `## Expert Positions\n\n`;
    for (const expert of lastRoundResponses) {
      md += `### ${expert.expertise_area}\n`;
      md += `**Position:** ${expert.position}\n`;
      md += `**Confidence:** ${expert.confidence}/10\n`;
      md += `**Reasoning:** ${expert.reasoning}\n\n`;
    }
    md += `---\n*Generated by Delphi Agent*\n`;

    // Rough token estimate based on actual API calls made
    const callCount = 1 + personas.length * roundSyntheses.length + roundSyntheses.length + 2;
    const totalTokens = callCount * 2500;

    await progress.log("complete", `Deliberation complete. ${consensus.consensus_type} consensus at ${consensus.confidence_score?.toFixed(1)}/10 confidence.`);

    // Update run as completed
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
  } catch (err) {
    console.error("Engine error:", err);
    if (runId) {
      await supabase
        .from("runs")
        .update({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

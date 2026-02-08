# DelphiAgent

AI-augmented Delphi consensus tool that orchestrates structured, multi-round expert deliberation using specialised AI agents, adversarial stress-testing, citation-backed research, and statistical convergence tracking.

---

## What is DelphiAgent?

DelphiAgent implements the [Delphi method](https://en.wikipedia.org/wiki/Delphi_method) with AI-generated expert panels. Rather than polling a single model for an answer, it spawns a diverse panel of domain experts who research independently, debate iteratively, and have their conclusions stress-tested by adversarial contrarian agents. The result is a structured report that surfaces not just what the experts agree on, but where they disagree, why, and what would have to be true for the consensus to be wrong.

Every run produces:

- A **consensus position** grounded in cited evidence
- **Convergence metrics** showing how opinion evolved across rounds
- **Four epistemic stress tests** challenging the reasoning itself
- A **post-consensus analysis pipeline** (counterfactual risk, oppositional case, assumption exposures, decision fork, regime split, 12-month reality check)
- A **Decision Canvas** with actionable guidance, reversibility assessment, and monitoring plan
- **Structured uncertainty** decomposition per expert (confidence by claim, conditional confidence, key assumptions)
- **Evidence quality scoring** with source classification and domain authority ratings
- Machine-readable JSON, human-readable Markdown, and downloadable PDF outputs

It is designed for policy analysis, risk assessment, strategic planning, research synthesis, and any domain where structured multi-perspective deliberation is valuable.

---

## Features

### Core Deliberation
- **Multi-Round Delphi Process** -- 2-5 iterative rounds of expert consultation, synthesis, and revision with automatic convergence detection
- **Dynamic Expert Personas** -- AI-generated, question-specific personas with distinct backgrounds, expertise areas, and epistemic stances (status_quo_defender, methodology_skeptic, implementation_realist, ethics_maximalist, contrarian_challenger, evidence_synthesizer)
- **Adversarial Stress-Testing** -- Contrarian agents apply four invariant epistemic stress tests to every synthesis: lossy simplification, context flip, incentive misalignment, and second-order failure
- **Cross-Examination** -- Direct expert-to-expert challenges between the sharpest disagreement pairs, producing genuine dialectic rather than parallel monologues mediated by a summary
- **Human-in-the-Loop Guided Mode** -- Optional `--guided` flag pauses after each round, letting the user inject new context, redirect focus, ask clarifying questions, or force additional rounds

### Research and Evidence
- **Citation-Backed Research** -- Perplexity API integration provides persona-targeted web and academic search with full citation chains
- **Scoped Search** -- Perplexity searches are automatically scoped by question characteristics (decision type, time horizon) to prioritise relevant source types and date ranges
- **Evidence Quality Scoring** -- Citations classified by source type (academic, news, government, industry blog), recency, and domain authority with per-citation quality scores
- **Evidence Contrarian** -- Dedicated counter-evidence search that finds empirical evidence contradicting the consensus position, complementing the reasoning stress tests with data challenges

### Analysis and Decision Support
- **Question Decomposition** -- Complex questions are automatically broken into 2-4 sub-questions with rationale, ensuring all dimensions are addressed
- **Prior Analysis Reference** -- Scans previous analyses for semantic relevance and surfaces related findings to experts as context
- **Structured Uncertainty** -- Per-expert confidence decomposition including confidence by claim, conditional confidence, key assumptions, and probability estimates
- **Decision Canvas** -- Synthesises the full analysis into actionable guidance: recommended action under each regime, reversibility assessment, optionality analysis, time-to-decide pressure, and a monitoring plan

### Convergence and Metrics
- **Convergence Tracking** -- Statistical monitoring of position stability, consensus clarity, citation overlap, confidence spread, disagreement index, and minority persistence
- **Embedding-Based Position Stability** -- Uses OpenAI embeddings for semantic similarity instead of word overlap, making convergence detection significantly more accurate
- **Four-Tier Consensus Classification** -- Outcomes classified as strong, conditional, operational, or divergent based on quantitative metrics
- **Consensus Quality Assessment** -- Distinguishes normative (values) from epistemic (facts) consensus, rates insight yield (low/medium/high), and generates risk statements

### Post-Consensus Pipeline
- **Counterfactual Risk Analysis** -- Identifies plausible failure scenarios the consensus misses
- **Oppositional Case** -- Argues the logical opposite of consensus as if it were correct
- **Assumption Exposures** -- Identifies which expert assumptions fail if the oppositional case is correct
- **Decision Fork** -- Presents concrete risks of following the consensus
- **Regime Split** -- Maps two explicit futures (consensus vs oppositional) with scarce resources, winning organisations, and failure modes
- **Regime Signals** -- Concrete, observable 12-month indicators showing which future is emerging

### Learning and Calibration
- **Signal Tracker** -- Monitors regime signals from past analyses; dashboard lets users mark signals as confirmed, emerging, contradicted, or not observed
- **Retrospective Calibration** -- Users mark past analyses as correct/incorrect/partially correct, building a calibration dataset that identifies systematic biases over time
- **Cost Tracking** -- Token usage and estimated costs broken down by agent type, round, and model with portfolio-level cost trends

### Interfaces
- **CLI** -- Full-featured command line for automation and scripting
- **REST API** -- Express-based API (`--api` flag) with endpoints for starting analyses, polling status, SSE streaming, and health checks
- **Web Dashboard** -- Next.js interactive UI with report viewer, portfolio view, signal tracker, and calibration dashboard
- **Rich Output** -- JSON (machine-readable), Markdown (human-readable), PDF (downloadable), and agent logs (debugging)

---

## Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key
- Perplexity API key

### Installation
```bash
git clone https://github.com/AgilistTim/Delphi.git
cd Delphi
npm install

cp .env.example .env
# Edit .env with your API keys
```

### Environment Variables
| Variable | Required | Default |
|---|---|---|
| `OPENAI_API_KEY` | Yes | -- |
| `PERPLEXITY_API_KEY` | Yes | -- |
| `OPENAI_MODEL` | No | `gpt-4o` |
| `PERPLEXITY_MODEL` | No | `sonar-reasoning-pro` |
| `DELPHI_API_PORT` | No | `3002` |

### Run Your First Analysis
```bash
# Interactive mode (recommended)
npm run dev -- -i

# Direct execution
npm run dev -- -q "Should AI development be regulated?"

# Guided mode (pause between rounds for human input)
npm run dev -- -q "Should AI development be regulated?" --guided
```

---

## CLI Usage

### All CLI Options
| Option | Description |
|---|---|
| `-q`, `--question` | The question to analyse (required unless interactive) |
| `-c`, `--context` | Additional context for the question |
| `-e`, `--experts` | Number of expert agents (default: 5, max: 10) |
| `-r`, `--rounds` | Maximum rounds (default: 3, max: 5) |
| `-i`, `--interactive` | Run in interactive mode (prompts for all options) |
| `-g`, `--guided` | Enable guided mode (pause between rounds for human input) |
| `--api` | Start the REST API server instead of running an analysis |
| `-h`, `--help` | Show help message |
| `--health-check` | Check API connectivity |

When using npm scripts, always use `--` before flags: `npm run dev -- -i`

### NPM Scripts
| Command | Description |
|---|---|
| `npm run dev` | Run the CLI via tsx (development) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled CLI (after build) |
| `npm run example` | Run example usage scripts (see `examples/`) |
| `npm run test` | Run the test suite with Vitest |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |
| `npm run health` | Check OpenAI and Perplexity API connectivity |

---

## REST API

Start the API server with:
```bash
npm run dev -- --api
```

The server starts on port 3002 (configurable via `DELPHI_API_PORT`).

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/analyze` | Start a new analysis. Body: `{ question, context?, experts?, rounds?, webhook_url? }`. Returns `{ run_id, status }` |
| `GET` | `/api/v1/runs/:id` | Get run status and results. Returns full report when complete |
| `GET` | `/api/v1/runs/:id/stream` | SSE stream of live progress logs |
| `GET` | `/api/v1/runs` | List all runs with status and timestamps |
| `GET` | `/api/v1/health` | Health check for OpenAI and Perplexity connectivity |

### Example
```bash
# Start an analysis
curl -X POST http://localhost:3002/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"question": "Should AI development be regulated?", "experts": 5}'

# Poll for results
curl http://localhost:3002/api/v1/runs/{run_id}

# Stream live progress
curl http://localhost:3002/api/v1/runs/{run_id}/stream
```

Webhook support: include `webhook_url` in the POST body to receive a notification when the analysis completes.

---

## Web Dashboard

The Next.js dashboard provides an interactive UI for running analyses, streaming live output, and exploring results.

### Dashboard Pages

- **Dashboard** (`/`) -- Run console to start new analyses with live SSE streaming; browse run history with status, confidence, and timestamps
- **Report Viewer** (`/runs/{slug}`) -- Full analysis exploration with tabbed navigation (Summary, Experts, Evidence, Rounds, Post-Consensus)
- **Portfolio** (`/portfolio`) -- Cross-run comparison with consensus types, confidence distributions, common themes, and cost trends across all analyses
- **Signal Tracker** (`/signal-tracker`) -- Monitor regime signals from past analyses; view signal status (confirmed, emerging, contradicted, not observed) with summary statistics
- **Calibration** (`/calibration`) -- Track prediction accuracy over time; view accuracy breakdown, accumulated lessons learned, and retrospective history

### Report Viewer Features
- **Executive Summary** -- One-paragraph answer with confidence level and key caveats at the top of the report
- **Jump Navigation** -- Table of contents with anchor links to all sections
- **Collapsible Sections** -- Expand/collapse for Decision Canvas, Structured Uncertainty, Evidence Contrarian, Cross-Examination, Question Decomposition, and Prior Analyses
- **Metric Tooltips** -- Hover info icons on convergence metrics to see what each metric measures and what good/bad values look like
- **Convergence Trend Charts** -- Line charts showing how position stability, consensus clarity, and confidence spread evolve across rounds
- **Expert Confidence Matrix** -- Heatmap showing expert-to-expert alignment and individual confidence shifts between rounds
- **Evidence Quality Charts** -- Bar chart of source type breakdown (academic, news, blog) with average quality scores
- **Animated Expert Discussion** -- Experts present positions with avatars, speech bubbles, and confidence meters
- **Round Evolution Timeline** -- Visualise how clusters, consensus areas, and confidence shift across rounds
- **Export Options** -- Download PDF, Markdown, or JSON from the report viewer

### Run Locally
```bash
# From repo root -- both installs are required
npm install              # Root dependencies (required for CLI spawning)
cd apps/dashboard
npm install              # Dashboard dependencies
npm run dev              # Starts on http://localhost:3001
```

### Production Build
```bash
npm install              # From repo root
cd apps/dashboard
npm install
npm run build
npm start                # http://localhost:3001
```

### Notes
- The dashboard spawns the CLI as a child process from the repo root, so root `npm install` is required
- API keys must be configured in the root `.env` file (not in `apps/dashboard/.env`)
- Historical runs are read from the `output/` directory at the repo root
- Signal tracker data is stored in `output/signal-trackers.json`
- Retrospective data is stored in `output/retrospectives.json`
- Clear `.next` cache (`rm -rf apps/dashboard/.next`) if you encounter stale UI after updates

---

## How the Delphi Process Works

Each run follows a structured multi-phase process:

### Phase 0 -- Setup (runs once)
1. **Question Refinement**: The raw question is analysed to extract decision type (strategy, policy, risk, etc.), time horizon, primary objective, constraints, unknowns, inferred assumptions, and an ambiguity score
2. **Question Decomposition**: Complex questions are broken into 2-4 sub-questions with rationale. Simple, focused questions skip this step
3. **Prior Analysis Search**: The `output/` directory is scanned for semantically related previous analyses. Related findings are surfaced to experts as context
4. **Persona Generation**: A diverse panel of expert personas is generated, each with a name, role, domain expertise, perspective, work background, education history, and an assigned epistemic stance. The system enforces diversity by requiring at least one `contrarian_challenger` and one `methodology_skeptic` per panel

### Rounds 1-N -- Iterative Deliberation (repeats until convergence or max rounds)

Each round executes five phases:

**Phase 1 -- Research**: Persona-targeted Perplexity searches grouped by expertise category (policy, academic, industry, ethics, general). Searches are scoped by question characteristics -- time horizon determines date range, decision type determines domain filters. Each expert receives a shared baseline plus category-specific research with full citations.

**Phase 2 -- Expert Responses**: Each expert generates a structured response including:
- Position statement and detailed reasoning (research-based and experience-based)
- Conditional factors and boundary conditions
- Falsifiability criteria (what would change their mind)
- Strongest counter-argument against their own position
- Confidence score (1-10) and justification basis (research_dominant, experience_dominant, balanced, theoretical)
- Cited sources from the Perplexity research

**Phase 2b -- Cross-Examination**: The orchestrator identifies the sharpest disagreement pair across clusters and both experts directly respond to each other's positions, producing genuine dialectic rather than debate mediated through summarisation.

**Phase 3 -- Synthesis**: The orchestrator agent analyses all expert responses to identify position clusters, consensus areas, divergence areas, and key insights. Average confidence and cluster composition are calculated.

**Phase 4 -- Contrarian Challenge**: Contrarian agents receive the synthesis and generate four epistemic stress tests:
- **Lossy Simplification** -- What nuance is being averaged away?
- **Context Flip** -- In what plausible context does this advice reverse?
- **Incentive Misalignment** -- Who benefits and who quietly loses?
- **Second-Order Failure** -- If this works initially, how does it fail later?

Each stress test must be 15 words or fewer, with no hedging language.

**Guided Mode Pause** (optional): If `--guided` is enabled, the process pauses after each round. The user can provide guidance for the next round, ask for deeper exploration, or skip remaining rounds.

**Convergence Check**: After each round, the `ConvergenceTracker` evaluates whether to continue:
- **Consensus reached**: High position stability (>80%), high consensus clarity (>75%), low confidence spread (<2.0)
- **Stable divergence**: Very high position stability (>90%) but low consensus clarity (<40%) -- legitimate disagreement that should be preserved
- **Max rounds**: Neither condition met; continue if rounds remain

Position stability is measured using embedding-based semantic similarity (OpenAI embeddings API) with word-overlap as fallback.

### Post-Consensus Analysis (runs once after convergence)

After deliberation completes, a series of analyses run:

1. **Counterfactual Risk Analysis** -- "What is a plausible way the dominant conclusion fails?" Identifies a failure scenario, explains why it would be missed early, and provides an early warning signal.

2. **Oppositional Case** -- Argues the logical opposite of the consensus as if it were correct. Generates the negated position, a coherent argument, a scenario where the opposite outperforms, and an uncomfortable implication the consensus avoids.

3. **Assumption Exposures** -- For each expert, identifies the specific assumption in their position that would fail if the oppositional case is correct. No defence, no rebuttal -- just exposure.

4. **Decision Fork** -- Extracts concrete risks from the oppositional case and counterfactual analysis, presenting them as a direct question: "If the oppositional case is correct, what are you choosing to risk by following the consensus?"

5. **Regime Split Analysis** -- Maps two explicit futures (consensus regime vs oppositional regime). For each regime, describes the scarce resource, the type of organisation that wins, and what failure looks like.

6. **12-Month Reality Check (Regime Signals)** -- Identifies 2-3 concrete, observable signals for each regime that would indicate which future is emerging within the next 12 months. Transforms abstract analysis into monitorable decisions.

7. **Decision Canvas** -- Synthesises the full analysis into actionable guidance: recommended action under each regime, reversibility assessment, optionality analysis, time-to-decide pressure, and a monitoring plan with specific triggers.

8. **Structured Uncertainty** -- Decomposes each expert's confidence into confidence by claim, conditional confidence (how confidence changes if assumptions fail), and explicit probability estimates for key outcomes.

9. **Evidence Contrarian** -- Runs a dedicated Perplexity search for evidence contradicting the consensus, using the oppositional case as the search query. Complements reasoning stress tests with empirical challenges.

10. **Evidence Quality Scoring** -- Classifies all citations by source type, recency, and domain authority. Calculates per-citation quality scores and highlights evidence strength distribution.

11. **Signal Tracker Initialisation** -- Saves regime signals to `output/signal-trackers.json` for future monitoring through the dashboard.

---

## Convergence Metrics and Consensus Classification

### Convergence Metrics
The `ConvergenceTracker` calculates these metrics after each round:

| Metric | Range | Description |
|---|---|---|
| **Position Stability** | 0-1 | How stable expert positions are between rounds (embedding-based semantic similarity with word-overlap fallback) |
| **Consensus Clarity** | 0-1 | Weighted score of consensus-vs-divergence ratio, cluster dominance, and average confidence |
| **Confidence Spread** | 0+ | Standard deviation of cluster confidence scores (lower = more agreement) |
| **Citation Overlap** | 0-1 | Proportion of expert pairs sharing at least one source URL |
| **Disagreement Index** | 0-1 | Normalised entropy across expert clusters (higher = more diverse viewpoints) |
| **Minority Persistence** | 0-1 | Whether minority clusters persist across rounds or get absorbed |

### Four-Tier Consensus Classification
Based on quantitative metrics, each outcome is classified:

| Type | Criteria | Meaning |
|---|---|---|
| **Strong** | Clarity >80%, stability >80%, spread <1.5 | High agreement with high confidence across experts |
| **Conditional** | Clarity >60% with context-dependent caveats | Agreement under specific conditions with important boundary factors |
| **Operational** | Stability >70%, clarity >50%, <=2 clusters | Practical agreement despite theoretical differences |
| **Divergent** | None of the above | Legitimate, stable disagreement that should be preserved |

### Consensus Quality Assessment
An additional classification layer evaluates:

- **Consensus Nature** -- Is agreement normative (values/preferences) or epistemic (facts/analysis)? Determined by keyword analysis of synthesis text.
- **Insight Yield** -- How much novel insight emerged? Rated low (obvious conclusions), medium (useful synthesis), or high (significant deliberation with context-dependent conclusions).
- **Risk Statement** -- A human-readable warning about potential issues (e.g., "Premature convergence risk -- high agreement may indicate groupthink").

---

## Architecture

```
Delphi/
|-- src/                                    # Core Delphi engine
|   |-- main.ts                            # DelphiAgent orchestrator class
|   |-- cli.ts                             # Command-line interface (--guided, --api)
|   |-- api.ts                             # REST API server (Express)
|   |-- types/
|   |   +-- index.ts                       # Complete type system (Zod schemas)
|   |-- agents/
|   |   |-- expert.ts                      # ExpertAgent -- domain expert simulation
|   |   |-- contrarian.ts                  # ContrarianAgent -- epistemic stress-tester
|   |   +-- orchestrator.ts                # OrchestratorAgent -- synthesis and clustering
|   |-- prompts/
|   |   |-- expert_prompt.md               # Expert system prompt template
|   |   +-- contrarian_prompt.md           # Contrarian system prompt template
|   |-- utils/
|   |   |-- persona-generator.ts           # Generate diverse expert personas
|   |   |-- question-refiner.ts            # Analyse and structure input questions
|   |   |-- question-decomposer.ts         # Break complex questions into sub-questions
|   |   |-- convergence-tracker.ts         # Monitor opinion evolution and termination
|   |   |-- embedding-similarity.ts        # Embedding-based semantic position stability
|   |   |-- cost-tracker.ts                # Track token usage and estimate costs
|   |   |-- citation-sanitize.ts           # Normalise citation formats
|   |   |-- openai-helpers.ts              # Robust OpenAI API wrapper with retries
|   |   |-- cross-examination.ts           # Expert-to-expert direct challenges
|   |   |-- decision-canvas.ts             # Actionable guidance synthesis
|   |   |-- structured-uncertainty.ts      # Per-expert confidence decomposition
|   |   |-- evidence-quality.ts            # Source classification and quality scoring
|   |   |-- evidence-contrarian.ts         # Counter-evidence search
|   |   |-- search-scoper.ts               # Question-aware Perplexity search scoping
|   |   |-- prior-analysis.ts              # Find and reference related past analyses
|   |   +-- retrospective.ts              # Signal tracker and calibration data
|   |-- tools/
|   |   +-- perplexity.ts                  # Perplexity search integration
|   +-- tests/
|       +-- basic.test.ts                  # Unit tests (Vitest)
|-- apps/dashboard/                        # Next.js web dashboard
|   |-- app/
|   |   |-- page.tsx                       # Home -- run console + history
|   |   |-- layout.tsx                     # Root layout with navigation
|   |   |-- portfolio/
|   |   |   +-- page.tsx                   # Portfolio -- cross-run comparison + cost trends
|   |   |-- signal-tracker/
|   |   |   +-- page.tsx                   # Signal Tracker -- regime signal monitoring
|   |   |-- calibration/
|   |   |   +-- page.tsx                   # Calibration -- prediction accuracy tracking
|   |   |-- api/
|   |   |   |-- run/
|   |   |   |   |-- route.ts              # POST/GET/DELETE run management (SSE)
|   |   |   |   +-- store.ts              # In-memory run record storage
|   |   |   +-- artifacts/
|   |   |       +-- [slug]/               # JSON/MD/PDF artifact endpoints
|   |   |-- runs/
|   |   |   +-- [slug]/
|   |   |       |-- page.tsx              # Report viewer (tabs, metrics, cards)
|   |   |       +-- markdown/             # Rendered markdown view
|   |   +-- components/
|   |       |-- RunConsole.tsx             # Analysis config + live output
|   |       +-- pdf/
|   |           +-- DelphiReportPDF.tsx    # PDF generation (@react-pdf/renderer)
|   |-- components/
|   |   |-- ExpertDiscussion.tsx           # Animated expert discussion playback
|   |   |-- RoundEvolution.tsx             # Round-by-round evolution timeline
|   |   +-- ui/                            # Shared UI components (Radix, shadcn)
|   +-- lib/
|       |-- reports.ts                     # File system report access + types
|       +-- utils.ts                       # Tailwind utilities
|-- examples/
|   +-- basic-usage.ts                    # Programmatic usage examples
|-- output/                                # Generated reports and agent logs
|   |-- signal-trackers.json              # Regime signal monitoring data
|   +-- retrospectives.json              # Calibration and retrospective data
|-- .env.example                           # API key template
+-- package.json                           # Root dependencies and scripts
```

### Key Design Decisions

- **Monorepo**: Core engine and dashboard are co-located but independently installable. The dashboard spawns the CLI as a child process rather than importing engine code directly, avoiding Next.js bundling issues.
- **Zod Validation**: All agent outputs are validated against Zod schemas (`src/types/index.ts`) with fallback handling for malformed responses.
- **Parallel Execution**: Expert and contrarian agents run in parallel within each round for faster execution.
- **Robust API Handling**: `safeChatCompletion` in `openai-helpers.ts` automatically handles model fallbacks, parameter transformation (max_tokens vs max_completion_tokens, temperature removal), and Responses API detection.
- **Graceful Degradation**: Every post-consensus analysis and enhancement has a fallback generator that produces reasonable defaults if AI generation fails.
- **SSE Streaming**: The dashboard uses Server-Sent Events to stream live CLI output to the browser in real time.
- **Embedding Similarity**: Position stability uses OpenAI embeddings for semantic comparison rather than word overlap, with automatic fallback to word overlap if the embedding API is unavailable.
- **Scoped Research**: Perplexity searches are automatically filtered by date range and domain based on question characteristics (time horizon, decision type).

---

## Programmatic Usage

```typescript
import DelphiAgent from '../src/main.js';

const delphi = new DelphiAgent();

const report = await delphi.runDelphiProcess(
  { question: 'Should AI development be regulated?', context: 'Focus on EU policy' },
  5  // number of experts
);

// Access results
console.log(report.consensus_summary.final_position);
console.log(report.convergence_analysis.consensus_type);       // 'strong' | 'conditional' | 'operational' | 'divergent'
console.log(report.oppositional_case?.opposite_position);
console.log(report.regime_signals?.consensus_signals);
console.log(report.decision_canvas?.consensus_action);
console.log(report.structured_uncertainties);
console.log(report.evidence_contrarian?.counter_evidence);

// Guided mode
delphi.setGuidedMode(true, async (roundNumber, synthesis) => {
  console.log(`Round ${roundNumber} complete. Clusters: ${synthesis.clusters.length}`);
  return 'Focus more on regulatory implications';  // or null to continue without guidance
});
```

See [`examples/basic-usage.ts`](examples/basic-usage.ts) for complete examples including health checks, convergence analysis, and round evolution inspection.

---

## Output

Each run generates three files in the `output/` directory:

| File | Format | Contents |
|---|---|---|
| `delphi-report-{slug}.json` | JSON | Complete structured report (all data, machine-readable) |
| `delphi-report-{slug}.md` | Markdown | Human-readable report with all sections |
| `agent-logs-{slug}.json` | JSON | All agent requests and responses (debugging, frontend integration) |

Additionally, two shared files accumulate data across runs:

| File | Format | Contents |
|---|---|---|
| `signal-trackers.json` | JSON | Regime signals from all analyses for longitudinal monitoring |
| `retrospectives.json` | JSON | Calibration data from user retrospective assessments |

The JSON report contains the full `DelphiReport` structure including prompt, question analysis, question decomposition, prior analysis references, expert positions, contrarian observations, cross-examinations, round history, convergence analysis, cost summary, all post-consensus analyses, decision canvas, structured uncertainties, evidence contrarian results, and evidence quality scores.

---

## Testing

```bash
npm test
```

Uses [Vitest](https://vitest.dev/) with tests covering:
- Perplexity integration setup
- Convergence tracker initialisation and round tracking
- Zod schema validation for expert and contrarian responses
- Configuration and error handling

---

## Configuration and Extensibility

- **Prompt Customisation**: Edit `src/prompts/expert_prompt.md` and `src/prompts/contrarian_prompt.md` to modify agent behaviour and output structure
- **Persona Generation**: The persona generator in `src/utils/persona-generator.ts` creates question-specific experts with enforced diversity constraints
- **Add New Agents**: Extend `src/agents/` following the ExpertAgent/ContrarianAgent pattern
- **Model Selection**: Override `OPENAI_MODEL` and `PERPLEXITY_MODEL` in `.env` to use different models
- **API Port**: Override `DELPHI_API_PORT` in `.env` to change the REST API port (default: 3002)
- **Frontend Integration**: Use JSON reports and agent logs to build custom UIs

---

## Glossary

| Term | Definition |
|---|---|
| **Delphi Process** | Structured multi-round expert deliberation method for reaching informed consensus |
| **Expert Agent** | AI agent simulating a domain expert with specific expertise, background, and epistemic stance |
| **Contrarian Agent** | AI agent that stress-tests consensus through four invariant epistemic challenges |
| **Orchestrator Agent** | AI agent that synthesises expert responses into clusters and identifies consensus/divergence |
| **Epistemic Stance** | An expert's approach to disagreement: status_quo_defender, methodology_skeptic, implementation_realist, ethics_maximalist, contrarian_challenger, or evidence_synthesizer |
| **Reasoning Stress Tests** | Four challenges applied to every synthesis: lossy simplification, context flip, incentive misalignment, second-order failure |
| **Cross-Examination** | Direct expert-to-expert challenge between the sharpest disagreement pair in a round |
| **Guided Mode** | Optional human-in-the-loop mode that pauses between rounds for user input and redirection |
| **Question Decomposition** | Automatic breakdown of complex questions into focused sub-questions with rationale |
| **Evidence Quality Score** | Per-citation rating based on source type, recency, and domain authority (0-1 scale) |
| **Evidence Contrarian** | Dedicated counter-evidence search for empirical data contradicting the consensus |
| **Decision Canvas** | Actionable synthesis: recommended actions per regime, reversibility, optionality, time pressure, monitoring plan |
| **Structured Uncertainty** | Per-expert confidence decomposition: confidence by claim, conditional confidence, key assumptions |
| **Prior Analysis Reference** | Semantically related previous analyses surfaced as context for current experts |
| **Signal Tracker** | Longitudinal monitoring system for regime signals across analyses |
| **Retrospective Calibration** | Feedback loop where users mark past analyses as correct/incorrect to track accuracy over time |
| **Convergence** | The process of expert positions stabilising across rounds, measured by position stability, consensus clarity, and confidence spread |
| **Consensus Type** | Four-tier classification: strong (high agreement), conditional (context-dependent), operational (practical agreement), divergent (preserved disagreement) |
| **Consensus Nature** | Whether agreement is normative (values-based) or epistemic (evidence-based) |
| **Insight Yield** | Assessment of how much novel insight emerged from deliberation (low, medium, high) |
| **Counterfactual Risk** | Post-consensus analysis asking "What is a plausible way this conclusion fails?" |
| **Oppositional Case** | Adversarial advocacy arguing the logical opposite of the consensus position |
| **Assumption Exposure** | Identification of which expert assumption fails if the oppositional case is correct |
| **Decision Fork** | Explicit presentation of concrete risks the reader accepts by following the consensus |
| **Regime Split** | Two mapped futures (consensus vs oppositional) describing scarce resources, winning organisations, and failure modes |
| **Regime Signals** | Concrete, observable 12-month indicators showing which future is emerging |
| **Justification Basis** | Whether an expert position is research_dominant, experience_dominant, balanced, or theoretical |
| **Position Stability** | Metric (0-1) measuring how much expert positions changed between rounds using embedding-based semantic similarity |
| **Citation Overlap** | Metric (0-1) measuring how many experts cite the same sources |
| **Disagreement Index** | Normalised entropy (0-1) across expert clusters; higher means more diverse viewpoints |
| **Minority Persistence** | Metric (0-1) tracking whether minority positions survive or get absorbed across rounds |
| **Scoped Search** | Automatic filtering of Perplexity searches by date range and domain based on question characteristics |

---

## License

MIT License -- see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## API References

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Perplexity API Documentation](https://docs.perplexity.ai)

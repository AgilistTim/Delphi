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
- Machine-readable JSON, human-readable Markdown, and downloadable PDF outputs

It is designed for policy analysis, risk assessment, strategic planning, research synthesis, and any domain where structured multi-perspective deliberation is valuable.

---

## Features

- **Multi-Round Delphi Process** -- 2-5 iterative rounds of expert consultation, synthesis, and revision with automatic convergence detection
- **Dynamic Expert Personas** -- AI-generated, question-specific personas with distinct backgrounds, expertise areas, and epistemic stances (status_quo_defender, methodology_skeptic, implementation_realist, ethics_maximalist, contrarian_challenger, evidence_synthesizer)
- **Adversarial Stress-Testing** -- Contrarian agents apply four invariant epistemic stress tests to every synthesis: lossy simplification, context flip, incentive misalignment, and second-order failure
- **Citation-Backed Research** -- Perplexity API integration provides persona-targeted web and academic search with full citation chains
- **Convergence Tracking** -- Statistical monitoring of position stability, consensus clarity, citation overlap, confidence spread, disagreement index, and minority persistence
- **Four-Tier Consensus Classification** -- Outcomes classified as strong, conditional, operational, or divergent based on quantitative metrics
- **Consensus Quality Assessment** -- Distinguishes normative (values) from epistemic (facts) consensus, rates insight yield (low/medium/high), and generates risk statements
- **Post-Consensus Analysis Pipeline** -- Six sequential analyses that stress-test the conclusion after consensus stabilises
- **Question Refinement** -- Automatic extraction of decision type, time horizon, constraints, unknowns, and inferred assumptions before experts begin
- **Cost Tracking** -- Token usage and estimated costs broken down by agent type, round, and model
- **Dual Interface** -- CLI for automation and scripting; Next.js web dashboard for interactive exploration
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

### Run Your First Analysis
```bash
# Interactive mode (recommended)
npm run dev -- -i

# Direct execution
npm run dev -- -q "Should AI development be regulated?"
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

## Web Dashboard

The Next.js dashboard provides an interactive UI for running analyses, streaming live output, and exploring results.

### Dashboard Features
- **Run Console** -- Configure question, context, expert count, and max rounds; start analysis and watch live streaming output via SSE
- **Animated Expert Discussion** -- Experts present positions with avatars, speech bubbles, and confidence meters
- **Round Evolution Timeline** -- Visualise how clusters, consensus areas, and confidence shift across rounds
- **Evidence Browser** -- Browse all citations and sources used by experts
- **Post-Consensus Visualisation** -- Counterfactual risk (red warning), oppositional case (amber counterpoint), assumption exposures, decision fork, regime split, and regime signals rendered as structured cards
- **Run History** -- Browse all previous analyses with termination status, confidence levels, and timestamps
- **Export Options** -- Download PDF, Markdown, or JSON from the report viewer
- **Auto-Redirect** -- Automatically navigates to the completed report when analysis finishes

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
- Clear `.next` cache (`rm -rf apps/dashboard/.next`) if you encounter stale UI after updates

---

## How the Delphi Process Works

Each run follows a structured multi-phase process:

### Phase 0 -- Setup (runs once)
1. **Question Refinement**: The raw question is analysed to extract decision type (strategy, policy, risk, etc.), time horizon, primary objective, constraints, unknowns, inferred assumptions, and an ambiguity score
2. **Persona Generation**: A diverse panel of expert personas is generated, each with a name, role, domain expertise, perspective, work background, education history, and an assigned epistemic stance. The system enforces diversity by requiring at least one `contrarian_challenger` and one `methodology_skeptic` per panel

### Rounds 1-N -- Iterative Deliberation (repeats until convergence or max rounds)

Each round executes four phases:

**Phase 1 -- Research**: Persona-targeted Perplexity searches grouped by expertise category (policy, academic, industry, ethics, general). Each expert receives a shared baseline plus category-specific research with full citations.

**Phase 2 -- Expert Responses**: Each expert generates a structured response including:
- Position statement and detailed reasoning (research-based and experience-based)
- Conditional factors and boundary conditions
- Falsifiability criteria (what would change their mind)
- Strongest counter-argument against their own position
- Confidence score (1-10) and justification basis (research_dominant, experience_dominant, balanced, theoretical)
- Cited sources from the Perplexity research

**Phase 3 -- Synthesis**: The orchestrator agent analyses all expert responses to identify position clusters, consensus areas, divergence areas, and key insights. Average confidence and cluster composition are calculated.

**Phase 4 -- Contrarian Challenge**: Contrarian agents receive the synthesis and generate four epistemic stress tests:
- **Lossy Simplification** -- What nuance is being averaged away?
- **Context Flip** -- In what plausible context does this advice reverse?
- **Incentive Misalignment** -- Who benefits and who quietly loses?
- **Second-Order Failure** -- If this works initially, how does it fail later?

Each stress test must be 15 words or fewer, with no hedging language.

**Convergence Check**: After each round, the `ConvergenceTracker` evaluates whether to continue:
- **Consensus reached**: High position stability (>80%), high consensus clarity (>75%), low confidence spread (<2.0)
- **Stable divergence**: Very high position stability (>90%) but low consensus clarity (<40%) -- legitimate disagreement that should be preserved
- **Max rounds**: Neither condition met; continue if rounds remain

### Post-Consensus Analysis (runs once after convergence)

After deliberation completes, six analyses run sequentially:

1. **Counterfactual Risk Analysis** -- "What is a plausible way the dominant conclusion fails?" Identifies a failure scenario, explains why it would be missed early, and provides an early warning signal.

2. **Oppositional Case** -- Argues the logical opposite of the consensus as if it were correct. Generates the negated position, a coherent argument, a scenario where the opposite outperforms, and an uncomfortable implication the consensus avoids.

3. **Assumption Exposures** -- For each expert, identifies the specific assumption in their position that would fail if the oppositional case is correct. No defence, no rebuttal -- just exposure.

4. **Decision Fork** -- Extracts concrete risks from the oppositional case and counterfactual analysis, presenting them as a direct question: "If the oppositional case is correct, what are you choosing to risk by following the consensus?"

5. **Regime Split Analysis** -- Maps two explicit futures (consensus regime vs oppositional regime). For each regime, describes the scarce resource, the type of organisation that wins, and what failure looks like.

6. **12-Month Reality Check (Regime Signals)** -- Identifies 2-3 concrete, observable signals for each regime that would indicate which future is emerging within the next 12 months. Transforms abstract analysis into monitorable decisions.

---

## Convergence Metrics and Consensus Classification

### Convergence Metrics
The `ConvergenceTracker` calculates these metrics after each round:

| Metric | Range | Description |
|---|---|---|
| **Position Stability** | 0-1 | How stable expert positions are between rounds (word overlap analysis) |
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
|-- src/                              # Core Delphi engine
|   |-- main.ts                       # DelphiAgent orchestrator class
|   |-- cli.ts                        # Command-line interface
|   |-- types/
|   |   +-- index.ts                  # Complete type system (Zod schemas)
|   |-- agents/
|   |   |-- expert.ts                 # ExpertAgent -- domain expert simulation
|   |   |-- contrarian.ts             # ContrarianAgent -- epistemic stress-tester
|   |   +-- orchestrator.ts           # OrchestratorAgent -- synthesis and clustering
|   |-- prompts/
|   |   |-- expert_prompt.md          # Expert system prompt template
|   |   +-- contrarian_prompt.md      # Contrarian system prompt template
|   |-- utils/
|   |   |-- persona-generator.ts      # Generate diverse expert personas
|   |   |-- question-refiner.ts       # Analyse and structure input questions
|   |   |-- convergence-tracker.ts    # Monitor opinion evolution and termination
|   |   |-- cost-tracker.ts           # Track token usage and estimate costs
|   |   |-- citation-sanitize.ts      # Normalise citation formats
|   |   +-- openai-helpers.ts         # Robust OpenAI API wrapper with retries
|   |-- tools/
|   |   +-- perplexity.ts             # Perplexity search integration
|   +-- tests/
|       +-- basic.test.ts             # Unit tests (Vitest)
|-- apps/dashboard/                   # Next.js web dashboard
|   |-- app/
|   |   |-- page.tsx                  # Home -- run console + history
|   |   |-- layout.tsx                # Root layout
|   |   |-- api/
|   |   |   |-- run/
|   |   |   |   |-- route.ts          # POST/GET/DELETE run management (SSE)
|   |   |   |   +-- store.ts          # In-memory run record storage
|   |   |   +-- artifacts/
|   |   |       +-- [slug]/           # JSON/MD/PDF artifact endpoints
|   |   |-- runs/
|   |   |   +-- [slug]/
|   |   |       |-- page.tsx          # Report viewer (tabs, metrics, cards)
|   |   |       +-- markdown/         # Rendered markdown view
|   |   +-- components/
|   |       |-- RunConsole.tsx         # Analysis config + live output
|   |       +-- pdf/
|   |           +-- DelphiReportPDF.tsx # PDF generation (@react-pdf/renderer)
|   |-- components/
|   |   |-- ExpertDiscussion.tsx       # Animated expert discussion playback
|   |   |-- RoundEvolution.tsx         # Round-by-round evolution timeline
|   |   +-- ui/                        # Shared UI components (Radix, shadcn)
|   +-- lib/
|       |-- reports.ts                 # File system report access + types
|       +-- utils.ts                   # Tailwind utilities
|-- examples/
|   +-- basic-usage.ts                # Programmatic usage examples
|-- output/                            # Generated reports and agent logs
|-- .env.example                       # API key template
+-- package.json                       # Root dependencies and scripts
```

### Key Design Decisions

- **Monorepo**: Core engine and dashboard are co-located but independently installable. The dashboard spawns the CLI as a child process rather than importing engine code directly, avoiding Next.js bundling issues.
- **Zod Validation**: All agent outputs are validated against Zod schemas (`src/types/index.ts`) with fallback handling for malformed responses.
- **Parallel Execution**: Expert and contrarian agents run in parallel within each round for faster execution.
- **Robust API Handling**: `safeChatCompletion` in `openai-helpers.ts` automatically handles model fallbacks, parameter transformation (max_tokens vs max_completion_tokens, temperature removal), and Responses API detection.
- **Graceful Degradation**: Every post-consensus analysis has a fallback generator that produces reasonable defaults if AI generation fails.
- **SSE Streaming**: The dashboard uses Server-Sent Events to stream live CLI output to the browser in real time.

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

The JSON report contains the full `DelphiReport` structure including prompt, question analysis, expert positions, contrarian observations, round history, convergence analysis, cost summary, and all post-consensus analyses.

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
| **Position Stability** | Metric (0-1) measuring how much expert positions changed between rounds |
| **Citation Overlap** | Metric (0-1) measuring how many experts cite the same sources |
| **Disagreement Index** | Normalised entropy (0-1) across expert clusters; higher means more diverse viewpoints |
| **Minority Persistence** | Metric (0-1) tracking whether minority positions survive or get absorbed across rounds |

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

# 🧠 DelphiAgent

AI-Augmented Delphi Consensus Tool for transparent, multi-round expert consensus using structured AI agents, real-time web search, and anonymized iteration.

---

## 🚀 What is DelphiAgent?

DelphiAgent simulates a rigorous Delphi process using:
- **Diverse AI expert personas** (generated per question)
- **Contrarian agents** to challenge consensus
- **Real-time web search** (Perplexity API) for citation-backed reasoning
- **Iterative, multi-round synthesis** and convergence tracking
- **Transparent reporting** with citations, dissent, and confidence

It is ideal for:
- Policy analysis, risk assessment, and complex decision support
- Research, workshops, and scenario planning
- Any domain where structured, multi-perspective consensus is valuable

---

## ✨ Features

- **Multi-Round Delphi Process**: 2–5 rounds of expert consultation and revision
- **Dynamic Expert Personas**: AI-generated, question-specific, with backgrounds and biases
- **Contrarian Agents**: Always challenge consensus, surface blind spots
- **Web Search Integration**: Perplexity API for up-to-date, citation-backed evidence
- **Convergence & Dissent Tracking**: Statistical analysis of opinion evolution
- **Rich Output**: Markdown and JSON reports, agent logs for frontend integration

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key
- Perplexity API key

### Installation
```bash
# Clone and setup
git clone <your-repo>
cd Delphi
npm install

# Configure environment
cp .env.example .env  # (create this if missing)
# Edit .env with your API keys
```

### Environment Variables
- `OPENAI_API_KEY` (required)
- `PERPLEXITY_API_KEY` (required)
- `OPENAI_MODEL` (default: gpt-4o)
- `PERPLEXITY_MODEL` (default: sonar-reasoning-pro)

---

## 🖥️ CLI Usage

### Basic Usage
```bash
npm run dev -- -q "Should AI development be regulated?"
```

### Interactive Mode (recommended for new users)
```bash
npm run dev -- -i
```
You will be prompted for the question, context, number of experts, and rounds.

### All CLI Options
| Option/Flag                | Description                                      |
|----------------------------|--------------------------------------------------|
| `-q`, `--question`         | The question to analyze (required unless interactive) |
| `-c`, `--context`          | Additional context for the question              |
| `-e`, `--experts`          | Number of expert agents (default: 5, max: 10)    |
| `-r`, `--rounds`           | Maximum rounds (default: 3, max: 5)              |
| `-i`, `--interactive`      | Run in interactive mode                         |
| `-h`, `--help`             | Show help message                               |
| `--health-check`           | Check API connectivity                          |

**Note:** When using npm scripts, always use `--` before flags, e.g. `npm run dev -- -i`.

### Other Commands
| Command                | Description                                                      |
|------------------------|------------------------------------------------------------------|
| `npm run build`        | Compile the TypeScript project                                   |
| `npm start`            | Run the compiled CLI (after build)                               |
| `npm run example`      | Run example usage scripts (see `examples/`)                      |
| `npm run test`         | Run the test suite with Vitest                                   |
| `npm run lint`         | Lint the codebase with ESLint                                    |
| `npm run format`       | Format code with Prettier                                        |
| `npm run health`       | Run a health check for OpenAI and Perplexity API connectivity    |

---

## 🏗️ Architecture

```
src/
├── agents/          # Expert, Contrarian, Orchestrator agents
├── prompts/         # System prompts for each agent type
├── tools/           # Perplexity API integration
├── utils/           # Persona generation, convergence tracking, helpers
├── output/          # Generated reports and agent logs
├── main.ts          # Delphi process orchestration
├── cli.ts           # Command-line interface
```

---

## 📊 Output & Logging
- **Markdown and JSON reports**: Saved in `output/` after each run
- **Agent logs**: All agent requests and responses are logged to `output/agent-logs-*.json` for frontend integration and debugging

---

## 🧑‍💻 Programmatic Usage
See [`examples/basic-usage.ts`](examples/basic-usage.ts) for how to use DelphiAgent in your own scripts:
```typescript
import DelphiAgent from '../src/main.js';
const delphi = new DelphiAgent();
const report = await delphi.runDelphiProcess({ question: '...', context: '...' }, 5);
```

---

## 🧪 Testing
```bash
npm test
```
- Uses [Vitest](https://vitest.dev/) for unit and integration tests
- Test coverage includes Perplexity integration, convergence tracking, schema validation, and error handling

---

## 🔧 Configuration & Extensibility
- **Persona Generation**: AI personas are generated per question for realism and diversity
- **Prompt Customization**: Edit `src/prompts/expert_prompt.md` and `src/prompts/contrarian_prompt.md`
- **Add New Agents**: Extend `src/agents/` for new agent types or logic
- **Frontend Integration**: Use agent logs and JSON reports for building a web UI

---

## 📝 License
MIT License - see LICENSE file for details.

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## 🔗 API References
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Perplexity API Documentation](https://docs.perplexity.ai) 
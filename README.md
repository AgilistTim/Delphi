# 🧠 DelphiAgent

AI-Augmented Delphi Consensus Tool that simulates rigorous, multi-round expert consensus using structured AI agents, real-time web search, and anonymized iteration.

## 🚦 Available Commands

| Command                | Description                                                      |
|------------------------|------------------------------------------------------------------|
| `npm run dev`          | Start DelphiAgent in CLI mode (ask a question, run a session)     |
| `npm run build`        | Compile the TypeScript project                                   |
| `npm start`            | Run the compiled CLI (after build)                               |
| `npm run example`      | Run example usage scripts (see `examples/`)                      |
| `npm run test`         | Run the test suite with Vitest                                   |
| `npm run lint`         | Lint the codebase with ESLint                                    |
| `npm run format`       | Format code with Prettier                                        |
| `npm run health`       | Run a health check for OpenAI and Perplexity API connectivity    |

### CLI Options

You can customize your Delphi session with the following flags:

| Option/Flag                | Description                                      |
|----------------------------|--------------------------------------------------|
| `-q`, `--question`         | The question to analyze (required unless interactive) |
| `-c`, `--context`          | Additional context for the question              |
| `-e`, `--experts`          | Number of expert agents (default: 5, max: 10)    |
| `-r`, `--rounds`           | Maximum rounds (default: 3, max: 5)              |
| `-i`, `--interactive`      | Run in interactive mode                         |
| `-h`, `--help`             | Show help message                               |
| `--health-check`           | Check API connectivity                          |

**Examples:**

```bash
npm run dev "Should AI development be regulated?"
npm run dev --question "Climate change policy priorities" --experts 7 --rounds 3
npm run dev --interactive
npm run health
```

---

## 🎯 Overview

DelphiAgent replaces human experts with diverse AI personas, uses contrarian agents for challenge, and integrates search tools to ground reasoning in real, verifiable data. It produces transparent consensus (or valuable dissent) on complex questions through iterative refinement.

## ✨ Features

- **Multi-Round Delphi Process**: 2-3 structured rounds of expert consultation
- **Diverse Expert Agents**: Role-specific AI agents with domain expertise
- **Real-time Search Integration**: Perplexity API for citation-backed claims
- **Contrarian Challenge**: Dedicated agents to stress-test emerging consensus
- **Convergence Tracking**: Statistical analysis of opinion evolution
- **Transparent Reporting**: Markdown output with citations and confidence scores

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- OpenAI API key
- Perplexity API key

### Installation

```bash
# Clone and setup
git clone <your-repo>
cd delphi-agent
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Usage

```bash
# Development mode
npm run dev

# Build and run
npm run build
npm start
```

## 🏗️ Architecture

```
src/
├── agents/          # Expert, Contrarian, Orchestrator agents
├── prompts/         # System prompts for each agent type
├── tools/           # Perplexity API integration
├── utils/           # Convergence tracking, helpers
├── output/          # Generated reports
└── main.ts          # Entry point and Delphi flow
```

## 📊 Example Output

The system generates detailed Markdown reports showing:

- **Consensus Summary**: Final expert positions and agreement levels
- **Expert Positions**: Individual responses with confidence scores and citations
- **Contrarian Observations**: Challenges to dominant thinking
- **Convergence Tracking**: Statistical analysis of opinion evolution

## 🔧 Configuration

Key environment variables:

- `OPENAI_API_KEY`: Your OpenAI API key
- `PERPLEXITY_API_KEY`: Your Perplexity API key  
- `OPENAI_MODEL`: GPT model to use (default: gpt-4o)
- `PERPLEXITY_MODEL`: Perplexity model (default: sonar-reasoning-pro)

## 🧪 Testing

```bash
npm test
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 🔗 API References

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Perplexity API Documentation](https://docs.perplexity.ai) 
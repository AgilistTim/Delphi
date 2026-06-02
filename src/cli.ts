#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import DelphiAgent from './main.js';
import { DelphiPrompt } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CLIArgs {
  question?: string;
  context?: string;
  experts?: number;
  rounds?: number;
  help?: boolean;
  healthCheck?: boolean;
  interactive?: boolean;
  guided?: boolean;
  api?: boolean;
}

function parseArgs(): CLIArgs {
  // Find the script index (cli.ts or cli.js)
  const scriptIndex = process.argv.findIndex(arg => arg.endsWith('cli.ts') || arg.endsWith('cli.js'));
  const args = process.argv.slice(scriptIndex + 1);
  const parsed: CLIArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--question':
      case '-q':
        parsed.question = args[++i];
        break;
      case '--context':
      case '-c':
        parsed.context = args[++i];
        break;
      case '--experts':
      case '-e':
        parsed.experts = parseInt(args[++i], 10);
        break;
      case '--rounds':
      case '-r':
        parsed.rounds = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      case '--health-check':
        parsed.healthCheck = true;
        break;
      case '--interactive':
      case '-i':
        parsed.interactive = true;
        break;
      case '--guided':
      case '-g':
        parsed.guided = true;
        break;
      case '--api':
        parsed.api = true;
        break;
      default:
        if (!parsed.question && !arg.startsWith('-')) {
          parsed.question = arg;
        }
        break;
    }
  }

  return parsed;
}

function showHelp(): void {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
  
  console.log(`
🧠 DelphiAgent v${packageJson.version}
AI-Augmented Delphi Consensus Tool

USAGE:
  npm run dev [OPTIONS] [QUESTION]
  
EXAMPLES:
  npm run dev "Should AI development be regulated?"
  npm run dev --question "Climate change policy priorities" --experts 7 --rounds 3
  npm run dev --interactive
  npm run dev --health-check

OPTIONS:
  -q, --question <text>     The question to analyze (required unless interactive)
  -c, --context <text>      Additional context for the question
  -e, --experts <number>    Number of expert agents (default: 5, max: 10)
  -r, --rounds <number>     Maximum rounds (default: 3, max: 5)
  -i, --interactive         Run in interactive mode
  -g, --guided             Enable guided mode (pause between rounds for human input)
  --api                    Start the REST API server
  -h, --help               Show this help message
  --health-check           Check API connectivity

ENVIRONMENT VARIABLES:
  OPENAI_API_KEY           Your OpenAI API key (required)
  PERPLEXITY_API_KEY       Your Perplexity API key (required)
  OPENAI_MODEL             OpenAI model to use (default: gpt-4o)
  PERPLEXITY_MODEL         Perplexity model to use (default: sonar-reasoning-pro)
  LOG_LEVEL                Logging level (default: info)

CONFIGURATION:
  Create a .env file with your API keys:
  OPENAI_API_KEY=your_key_here
  PERPLEXITY_API_KEY=your_key_here

OUTPUT:
  Reports are saved to the 'output/' directory in both Markdown and JSON formats.
  
For more information, visit: https://github.com/your-username/delphi-agent
`);
}

async function promptUser(question: string): Promise<string> {
  process.stdout.write(question);
  
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function runInteractive(): Promise<void> {
  console.log('\n🧠 DelphiAgent Interactive Mode\n');
  console.log('Enter your question and configuration, or type "exit" to quit.\n');

  // Enable input from stdin
  process.stdin.setEncoding('utf-8');

  const question = await promptUser('Question: ');
  if (question.toLowerCase() === 'exit') {
    process.exit(0);
  }

  const context = await promptUser('Context (optional): ');
  const expertsInput = await promptUser('Number of experts (5): ');
  const roundsInput = await promptUser('Maximum rounds (3): ');

  const experts = expertsInput ? parseInt(expertsInput, 10) : 5;
  const rounds = roundsInput ? parseInt(roundsInput, 10) : 3;

  console.log('\n🚀 Starting Delphi process...\n');

  const prompt: DelphiPrompt = {
    question,
    context: context || undefined
  };

  await runDelphiProcess(prompt, experts, rounds);
}

async function runDelphiProcess(
  prompt: DelphiPrompt, 
  expertCount: number = 5, 
  maxRounds: number = 3,
  guided: boolean = false
): Promise<void> {
  try {
    const delphi = new DelphiAgent();
    
    // Set configuration
    if (maxRounds !== 3) {
      delphi.setMaxRounds(maxRounds);
    }

    // Enable guided mode (#2) - pause between rounds for human input
    if (guided) {
      delphi.setGuidedMode(true, async (roundNumber, synthesis) => {
        console.log(`\n--- Guided Mode: Round ${roundNumber} complete ---`);
        console.log(`Clusters: ${synthesis.clusters.length}`);
        console.log(`Consensus areas: ${synthesis.consensus_areas.length}`);
        console.log(`Divergence areas: ${synthesis.divergence_areas.length}`);
        console.log(`\nOptions:`);
        console.log(`  [Enter]  Continue to next round`);
        console.log(`  [text]   Provide guidance for experts`);
        console.log(`  [skip]   Skip remaining rounds\n`);
        const input = await promptUser('Your input: ');
        if (!input || input.toLowerCase() === 'skip') return null;
        return input;
      });
    }

    // Validate expert count
    const experts = Math.max(3, Math.min(10, expertCount));
    if (experts !== expertCount) {
      console.log(`⚠️  Expert count adjusted to ${experts} (valid range: 3-10)`);
    }

    // Run the Delphi process
    const report = await delphi.runDelphiProcess(prompt, experts);
    
    console.log('\n📊 Process Summary:');
    console.log(`- Question: ${report.prompt.question}`);
    console.log(`- Experts: ${report.expert_positions.length}`);
    console.log(`- Rounds: ${report.convergence_analysis.rounds_completed}`);
    console.log(`- Consensus Clarity: ${(report.convergence_analysis.consensus_clarity * 100).toFixed(1)}%`);
    console.log(`- Termination: ${report.convergence_analysis.termination_reason.replace(/_/g, ' ')}`);
    
    console.log('\n✅ DelphiAgent process completed successfully!');

  } catch (error) {
    console.error('\n❌ Error running DelphiAgent:', error);
    process.exit(1);
  }
}

async function runHealthCheck(): Promise<void> {
  console.log('\n🔍 Running DelphiAgent health check...\n');
  
  try {
    const delphi = new DelphiAgent();
    const results = await delphi.healthCheck();
    
    console.log('Health Check Results:');
    console.log(`- Anthropic API: ${results.anthropic ? '✅ Connected' : '❌ Failed'}`);
    console.log(`- Web Search (Anthropic): ${results.webSearch ? '✅ Connected' : '❌ Failed'}`);
    console.log(`- OpenAI Embeddings: ${results.openai ? '✅ Connected' : '❌ Failed'}`);

    if (results.anthropic && results.webSearch && results.openai) {
      console.log('\n🎉 All systems operational!');
      process.exit(0);
    } else {
      console.log(
        '\n⚠️  Some services are not available. Check your API keys and network connection.'
      );
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Health check failed:', error);
    process.exit(1);
  }
}

// Main CLI execution
async function main(): Promise<void> {
  const args = parseArgs();

  // Handle help
  if (args.help) {
    showHelp();
    return;
  }

  // Handle health check
  if (args.healthCheck) {
    await runHealthCheck();
    return;
  }

  // Handle API server mode
  if (args.api) {
    const { createDelphiAPI } = await import('./api.js');
    const port = parseInt(process.env.PORT || process.env.DELPHI_API_PORT || '3002', 10);
    const app = createDelphiAPI(port);
    app.listen(port, '0.0.0.0', () => {
      console.log(`Delphi REST API listening on http://0.0.0.0:${port}`);
    });
    return;
  }

  // Handle interactive mode
  if (args.interactive) {
    await runInteractive();
    return;
  }

  // Validate required question
  if (!args.question) {
    console.error('❌ Error: Question is required. Use --help for usage information.');
    process.exit(1);
  }

  // Validate API keys
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable is required.');
    console.error('   Set it in your .env file or export it in your shell.');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required (embeddings).');
    console.error('   Set it in your .env file or export it in your shell.');
    process.exit(1);
  }

  // Create prompt
  const prompt: DelphiPrompt = {
    question: args.question,
    context: args.context
  };

  // Run Delphi process
  await runDelphiProcess(
    prompt,
    args.experts || 5,
    args.rounds || 3,
    args.guided || false
  );
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Process interrupted. Goodbye!');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ Unhandled rejection:', reason);
  process.exit(1);
});

// Execute main function
main().catch((error) => {
  console.error('\n❌ CLI error:', error);
  process.exit(1);
});

export { main, runDelphiProcess, runHealthCheck };    
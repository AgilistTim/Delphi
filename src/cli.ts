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
}

function parseArgs(): CLIArgs {
  // Find the script index (cli.ts or cli.js)
  const scriptIndex = process.argv.findIndex(arg => arg.endsWith('cli.ts') || arg.endsWith('cli.js'));
  const args = process.argv.slice(scriptIndex + 1);
  console.log('[DEBUG] process.argv:', process.argv);
  console.log('[DEBUG] scriptIndex:', scriptIndex);
  console.log('[DEBUG] args to parse:', args);
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
  maxRounds: number = 3
): Promise<void> {
  try {
    const delphi = new DelphiAgent();
    
    // Set configuration
    if (maxRounds !== 3) {
      delphi.setMaxRounds(maxRounds);
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
    console.log(`- OpenAI API: ${results.openai ? '✅ Connected' : '❌ Failed'}`);
    console.log(`- Perplexity API: ${results.perplexity ? '✅ Connected' : '❌ Failed'}`);
    
    if (results.openai && results.perplexity) {
      console.log('\n🎉 All systems operational!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some services are not available. Check your API keys and network connection.');
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
  console.log('[DEBUG] parsed CLI args:', args);

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
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is required.');
    console.error('   Set it in your .env file or export it in your shell.');
    process.exit(1);
  }

  if (!process.env.PERPLEXITY_API_KEY) {
    console.error('❌ Error: PERPLEXITY_API_KEY environment variable is required.');
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
    args.rounds || 3
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
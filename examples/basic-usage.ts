import DelphiAgent from '../src/main.js';
import { DelphiPrompt } from '../src/types/index.js';

/**
 * Basic example of using DelphiAgent programmatically
 */
async function basicExample() {
  console.log('🧠 DelphiAgent Basic Usage Example\n');

  try {
    // Initialize DelphiAgent
    const delphi = new DelphiAgent();

    // Run health check first
    console.log('Running health check...');
    const health = await delphi.healthCheck();
    if (!health.openai || !health.perplexity) {
      throw new Error('Health check failed - check your API keys');
    }
    console.log('✅ All services are operational\n');

    // Define the question
    const prompt: DelphiPrompt = {
      question: "What are the most important considerations for implementing AI governance in large organizations?",
      context: "Consider both technical and organizational perspectives, including ethics, compliance, and practical implementation challenges.",
      constraints: [
        "Focus on actionable recommendations",
        "Consider different organizational sizes",
        "Include both short-term and long-term considerations"
      ]
    };

    // Configure the process
    const expertCount = 5;
    const customExpertRoles = [
      'Technology Ethics Specialist',
      'Legal Expert',
      'Industry Analyst',
      'Policy Researcher',
      'Academic Researcher'
    ];

    // Set maximum rounds
    delphi.setMaxRounds(3);

    console.log('🚀 Starting Delphi process...\n');

    // Run the Delphi process
    const report = await delphi.runDelphiProcess(
      prompt,
      expertCount,
      customExpertRoles
    );

    // Display summary results
    console.log('\n📊 Process Summary:');
    console.log('==================');
    console.log(`Question: ${report.prompt.question}`);
    console.log(`Experts: ${report.expert_positions.length}`);
    console.log(`Rounds Completed: ${report.convergence_analysis.rounds_completed}`);
    console.log(`Consensus Clarity: ${(report.convergence_analysis.consensus_clarity * 100).toFixed(1)}%`);
    console.log(`Position Stability: ${(report.convergence_analysis.position_stability * 100).toFixed(1)}%`);
    console.log(`Termination Reason: ${report.convergence_analysis.termination_reason.replace(/_/g, ' ')}`);

    console.log('\n📋 Final Expert Positions:');
    console.log('===========================');
    report.expert_positions.forEach((expert, index) => {
      console.log(`\n${index + 1}. ${expert.expertise_area}`);
      console.log(`   Position: ${expert.position}`);
      console.log(`   Confidence: ${expert.confidence}/10`);
      console.log(`   Sources: ${expert.sources.length} citations`);
    });

    if (report.contrarian_observations.length > 0) {
      console.log('\n🎯 Contrarian Challenges:');
      console.log('==========================');
      report.contrarian_observations.forEach((contrarian, index) => {
        console.log(`\n${index + 1}. Challenge:`);
        console.log(`   Critique: ${contrarian.critique.substring(0, 150)}...`);
        console.log(`   Blind Spots: ${contrarian.blind_spots.length} identified`);
      });
    }

    console.log(`\n✅ Complete report saved to output/ directory`);
    console.log(`📄 Markdown: Check the generated .md file for full details`);
    console.log(`📊 JSON: Check the generated .json file for structured data`);

  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

/**
 * Advanced example with custom configuration
 */
async function advancedExample() {
  console.log('🧠 DelphiAgent Advanced Usage Example\n');

  try {
    // Initialize with custom configuration
    const delphi = new DelphiAgent({
      openai: {
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'gpt-4o',
        temperature: 0.8, // Higher creativity
        maxTokens: 3000
      },
      perplexity: {
        apiKey: process.env.PERPLEXITY_API_KEY!,
        model: 'sonar-reasoning-pro',
        searchContextSize: 'high' // More comprehensive search
      }
    });

    // Complex policy question
    const prompt: DelphiPrompt = {
      question: "How should governments balance AI innovation with consumer protection in autonomous vehicle regulation?",
      context: "Consider the trade-offs between rapid technological advancement, public safety, economic competitiveness, and regulatory frameworks across different jurisdictions.",
      constraints: [
        "Address both current technology and near-future developments",
        "Consider international coordination challenges",
        "Balance innovation incentives with safety requirements",
        "Account for different economic and regulatory contexts"
      ]
    };

    // Use more experts for complex question
    const expertCount = 7;
    delphi.setMaxRounds(3);

    console.log('🚀 Starting advanced Delphi process...\n');

    const report = await delphi.runDelphiProcess(prompt, expertCount);

    // Analyze convergence patterns
    console.log('\n📈 Convergence Analysis:');
    console.log('========================');
    
    const metrics = report.convergence_analysis;
    
    if (metrics.consensus_clarity > 0.8) {
      console.log('🎯 Strong consensus achieved');
    } else if (metrics.consensus_clarity > 0.5) {
      console.log('🤝 Moderate consensus with some divergence');
    } else {
      console.log('🔄 Significant divergence - multiple valid perspectives');
    }

    console.log(`\nStability: ${(metrics.position_stability * 100).toFixed(1)}% of experts maintained consistent positions`);
    console.log(`Citation overlap: ${(metrics.citation_overlap * 100).toFixed(1)}% of sources were shared between experts`);

    // Show round evolution
    console.log('\n🔄 Round Evolution:');
    console.log('===================');
    report.round_history.forEach((round, index) => {
      console.log(`Round ${round.round_number}:`);
      console.log(`  - ${round.participation_count} experts`);
      console.log(`  - ${round.consensus_areas.length} consensus areas`);
      console.log(`  - ${round.divergence_areas.length} divergence areas`);
      console.log(`  - Average confidence: ${round.average_confidence.toFixed(1)}/10`);
      if (index < report.round_history.length - 1) console.log('');
    });

    console.log('\n✅ Advanced analysis complete!');

  } catch (error) {
    console.error('\n❌ Advanced example failed:', error);
    process.exit(1);
  }
}

// Run examples based on command line argument
async function main() {
  const example = process.argv[2] || 'basic';

  switch (example) {
    case 'basic':
      await basicExample();
      break;
    case 'advanced':
      await advancedExample();
      break;
    default:
      console.log('Usage: npm run example [basic|advanced]');
      console.log('');
      console.log('Examples:');
      console.log('  npm run example basic    - Run basic usage example');
      console.log('  npm run example advanced - Run advanced configuration example');
      break;
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { basicExample, advancedExample }; 
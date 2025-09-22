#!/usr/bin/env node

/**
 * Test runner script specifically for notification E2E tests
 * 
 * Usage:
 *   node scripts/test-notifications.js [options]
 * 
 * Options:
 *   --headed    Run tests in headed mode (show browser)
 *   --debug     Run tests in debug mode
 *   --ui        Run tests in UI mode
 *   --report    Show test report after completion
 */

const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  headed: args.includes('--headed'),
  debug: args.includes('--debug'),
  ui: args.includes('--ui'),
  report: args.includes('--report')
};

// Build playwright command
let command = 'npx';
let commandArgs = ['playwright', 'test', 'e2e-notifications.spec.ts'];

if (options.ui) {
  commandArgs.push('--ui');
} else if (options.debug) {
  commandArgs.push('--debug');
} else if (options.headed) {
  commandArgs.push('--headed');
}

// Add reporter for CI/detailed output
if (!options.ui && !options.debug) {
  commandArgs.push('--reporter=list');
}

console.log('🔔 Running Notification System E2E Tests...\n');

if (options.headed) {
  console.log('📱 Running in headed mode (browser will be visible)');
}
if (options.debug) {
  console.log('🐛 Running in debug mode (tests will pause for inspection)');
}
if (options.ui) {
  console.log('🖥️  Running in UI mode (interactive test runner)');
}

console.log(`\n🚀 Command: ${command} ${commandArgs.join(' ')}\n`);

// Run the tests
const testProcess = spawn(command, commandArgs, {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
  shell: true
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ All notification tests passed!');
    
    if (options.report) {
      console.log('\n📊 Opening test report...');
      const reportProcess = spawn('npx', ['playwright', 'show-report'], {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        shell: true
      });
    }
  } else {
    console.log(`\n❌ Tests failed with exit code ${code}`);
    
    if (!options.ui && !options.debug) {
      console.log('\n💡 Debugging tips:');
      console.log('  - Run with --headed to see browser interactions');
      console.log('  - Run with --debug to pause and inspect');
      console.log('  - Run with --ui for interactive test runner');
      console.log('  - Check test-results/ directory for screenshots and videos');
    }
  }
  
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error);
  process.exit(1);
});


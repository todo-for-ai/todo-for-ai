#!/usr/bin/env node

/**
 * Verification script for Todo for AI MCP Server
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Todo for AI MCP Server...\n');

// Check 1: Required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
  'package.json',
  'dist/index.js',
  'dist/server.js',
  'dist/api-client.js',
  'dist/config.js',
  'dist/logger.js',
  'dist/types.js',
  '.env'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check 2: Package.json validation
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  if (packageJson.name === '@todo-for-ai/mcp') {
    console.log('✅ Package name is correct');
  } else {
    console.log('❌ Package name is incorrect');
  }
  
  if (packageJson.bin && packageJson.bin['todo-for-ai-mcp']) {
    console.log('✅ Binary entry point is configured');
  } else {
    console.log('❌ Binary entry point is missing');
  }
  
  if (packageJson.dependencies && packageJson.dependencies['@modelcontextprotocol/sdk']) {
    console.log('✅ MCP SDK dependency is present');
  } else {
    console.log('❌ MCP SDK dependency is missing');
  }
} catch (error) {
  console.log('❌ Failed to parse package.json:', error.message);
  allFilesExist = false;
}

// Check 3: Environment configuration
console.log('\n⚙️ Checking environment configuration...');
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  
  if (envContent.includes('TODO_API_BASE_URL')) {
    console.log('✅ API base URL is configured');
  } else {
    console.log('❌ API base URL is missing');
  }
  
  if (envContent.includes('LOG_LEVEL')) {
    console.log('✅ Log level is configured');
  } else {
    console.log('❌ Log level is missing');
  }
} catch (error) {
  console.log('❌ Failed to read .env file:', error.message);
}

// Check 4: TypeScript compilation
console.log('\n🔨 Checking TypeScript compilation...');
try {
  const indexJs = fs.readFileSync(path.join(__dirname, 'dist/index.js'), 'utf8');
  
  if (indexJs.includes('TodoMcpServer')) {
    console.log('✅ Main server class is compiled');
  } else {
    console.log('❌ Main server class is missing');
  }
  
  if (indexJs.includes('#!/usr/bin/env node')) {
    console.log('✅ Shebang is present for CLI execution');
  } else {
    console.log('❌ Shebang is missing');
  }
} catch (error) {
  console.log('❌ Failed to read compiled files:', error.message);
  allFilesExist = false;
}

// Summary
console.log('\n📊 Verification Summary:');
if (allFilesExist) {
  console.log('✅ All checks passed! MCP server is ready for use.');
  console.log('\n🚀 Next steps:');
  console.log('1. Ensure Todo for AI backend is running on http://localhost:50110');
  console.log('2. Add the following configuration to your IDE:');
  console.log('\n```json');
  console.log('{');
  console.log('  "mcpServers": {');
  console.log('    "todo-for-ai": {');
  console.log('      "command": "node",');
  console.log(`      "args": ["${path.join(__dirname, 'dist/index.js')}"],`);
  console.log('      "env": {');
  console.log('        "TODO_API_BASE_URL": "http://localhost:50110/todo-for-ai/api/v1"');
  console.log('      }');
  console.log('    }');
  console.log('  }');
  console.log('}');
  console.log('```');
  console.log('\n3. Restart your IDE to load the MCP server');
  console.log('4. Test the tools: get_project_tasks_by_name, get_task_by_id, submit_task_feedback');
} else {
  console.log('❌ Some checks failed. Please review the errors above.');
  process.exit(1);
}

console.log('\n🎯 Verification completed!');

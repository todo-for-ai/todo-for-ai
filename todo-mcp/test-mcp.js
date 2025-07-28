#!/usr/bin/env node

/**
 * Simple test script to verify MCP server functionality
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  TODO_API_BASE_URL: 'http://localhost:50110',
  LOG_LEVEL: 'debug'
};

console.log('🧪 Testing Todo for AI MCP Server...\n');

// Test 1: Check if the server can start
console.log('📋 Test 1: Server startup test');
const mcpServer = spawn('node', [path.join(__dirname, 'dist/index.js')], {
  env: { ...process.env, ...TEST_CONFIG },
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverOutput = '';
let serverError = '';

mcpServer.stdout.on('data', (data) => {
  serverOutput += data.toString();
  console.log('📤 Server output:', data.toString().trim());
});

mcpServer.stderr.on('data', (data) => {
  serverError += data.toString();
  console.log('❌ Server error:', data.toString().trim());
});

// Test 2: Send a list_tools request
setTimeout(() => {
  console.log('\n📋 Test 2: Sending list_tools request...');
  
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  mcpServer.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 2000);

// Test 3: Send a call_tool request
setTimeout(() => {
  console.log('\n📋 Test 3: Sending call_tool request...');
  
  const callToolRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'get_project_tasks_by_name',
      arguments: {
        project_name: 'Test Project'
      }
    }
  };
  
  mcpServer.stdin.write(JSON.stringify(callToolRequest) + '\n');
}, 4000);

// Cleanup after 10 seconds
setTimeout(() => {
  console.log('\n🧹 Cleaning up test...');
  mcpServer.kill('SIGTERM');
  
  setTimeout(() => {
    console.log('\n📊 Test Results Summary:');
    console.log('- Server output length:', serverOutput.length);
    console.log('- Server error length:', serverError.length);
    
    if (serverOutput.includes('Todo for AI MCP Server is running')) {
      console.log('✅ Server startup: PASSED');
    } else {
      console.log('❌ Server startup: FAILED');
    }
    
    if (serverOutput.includes('tools') || serverOutput.includes('get_project_tasks_by_name')) {
      console.log('✅ Tools listing: PASSED');
    } else {
      console.log('❌ Tools listing: FAILED');
    }
    
    console.log('\n🎯 Test completed!');
    process.exit(0);
  }, 1000);
}, 10000);

mcpServer.on('close', (code) => {
  console.log(`\n🔚 MCP server process exited with code ${code}`);
});

mcpServer.on('error', (error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});

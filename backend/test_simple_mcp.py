#!/usr/bin/env python3
"""
Test script for Simple MCP Server
"""

import asyncio
import json
import subprocess
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_mcp_server():
    """Test the MCP server functionality"""
    
    # Start the MCP server process
    process = await asyncio.create_subprocess_exec(
        sys.executable, "simple_mcp_server.py",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    try:
        # Test 1: Initialize
        logger.info("Testing initialize...")
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        process.stdin.write((json.dumps(init_request) + "\n").encode())
        await process.stdin.drain()
        
        response_line = await process.stdout.readline()
        response = json.loads(response_line.decode().strip())
        logger.info(f"Initialize response: {response}")
        
        # Test 2: List tools
        logger.info("Testing list tools...")
        list_tools_request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        }
        
        process.stdin.write((json.dumps(list_tools_request) + "\n").encode())
        await process.stdin.drain()
        
        response_line = await process.stdout.readline()
        response = json.loads(response_line.decode().strip())
        logger.info(f"Tools available: {len(response['result']['tools'])}")
        
        # Test 3: List projects
        logger.info("Testing list projects...")
        list_projects_request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "list_projects",
                "arguments": {}
            }
        }
        
        process.stdin.write((json.dumps(list_projects_request) + "\n").encode())
        await process.stdin.drain()
        
        response_line = await process.stdout.readline()
        response = json.loads(response_line.decode().strip())
        logger.info(f"List projects response: {response['result']['content'][0]['text'][:100]}...")
        
        # Test 4: Create project
        logger.info("Testing create project...")
        create_project_request = {
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "create_project",
                "arguments": {
                    "name": "MCP Test Project",
                    "description": "A test project created via MCP",
                    "color": "#ff6b6b"
                }
            }
        }
        
        process.stdin.write((json.dumps(create_project_request) + "\n").encode())
        await process.stdin.drain()
        
        response_line = await process.stdout.readline()
        response = json.loads(response_line.decode().strip())
        project_data = json.loads(response['result']['content'][0]['text'])
        project_id = project_data['id']
        logger.info(f"Created project with ID: {project_id}")
        
        # Test 5: Create task
        logger.info("Testing create task...")
        create_task_request = {
            "jsonrpc": "2.0",
            "id": 5,
            "method": "tools/call",
            "params": {
                "name": "create_task",
                "arguments": {
                    "project_id": project_id,
                    "title": "MCP Test Task",
                    "description": "A test task created via MCP",
                    "content": "# Test Task\n\nThis is a test task created through MCP.",
                    "status": "todo",
                    "priority": "medium",
                    "assignee": "mcp-tester"
                }
            }
        }
        
        process.stdin.write((json.dumps(create_task_request) + "\n").encode())
        await process.stdin.drain()
        
        response_line = await process.stdout.readline()
        response = json.loads(response_line.decode().strip())
        task_data = json.loads(response['result']['content'][0]['text'])
        task_id = task_data['id']
        logger.info(f"Created task with ID: {task_id}")
        
        # Test 6: List tasks
        logger.info("Testing list tasks...")
        list_tasks_request = {
            "jsonrpc": "2.0",
            "id": 6,
            "method": "tools/call",
            "params": {
                "name": "list_tasks",
                "arguments": {
                    "project_id": project_id,
                    "limit": 5
                }
            }
        }
        
        process.stdin.write((json.dumps(list_tasks_request) + "\n").encode())
        await process.stdin.drain()
        
        response_line = await process.stdout.readline()
        response = json.loads(response_line.decode().strip())
        tasks_data = json.loads(response['result']['content'][0]['text'])
        logger.info(f"Found {tasks_data['total']} tasks")
        
        # Test 7: Update task
        logger.info("Testing update task...")
        update_task_request = {
            "jsonrpc": "2.0",
            "id": 7,
            "method": "tools/call",
            "params": {
                "name": "update_task",
                "arguments": {
                    "task_id": task_id,
                    "status": "in_progress",
                    "priority": "high"
                }
            }
        }
        
        process.stdin.write((json.dumps(update_task_request) + "\n").encode())
        await process.stdin.drain()
        
        response_line = await process.stdout.readline()
        response = json.loads(response_line.decode().strip())
        logger.info(f"Updated task: {response['result']['content'][0]['text']}")
        
        # Test 8: Get context rules
        logger.info("Testing get context rules...")
        context_rules_request = {
            "jsonrpc": "2.0",
            "id": 8,
            "method": "tools/call",
            "params": {
                "name": "get_context_rules",
                "arguments": {
                    "project_id": project_id
                }
            }
        }
        
        process.stdin.write((json.dumps(context_rules_request) + "\n").encode())
        await process.stdin.drain()
        
        response_line = await process.stdout.readline()
        response = json.loads(response_line.decode().strip())
        context_data = json.loads(response['result']['content'][0]['text'])
        logger.info(f"Context rules: {context_data['total_rules']} rules found")
        
        logger.info("All tests completed successfully!")
        
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        
    finally:
        # Terminate the server process
        process.terminate()
        await process.wait()

if __name__ == "__main__":
    asyncio.run(test_mcp_server())

#!/usr/bin/env python3
"""
Test client for Todo for AI MCP Server
"""

import asyncio
import json
import logging
import subprocess
import sys
from typing import Any, Dict

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MCPTestClient:
    """Test client for MCP server"""
    
    def __init__(self):
        self.session = None
    
    async def connect(self):
        """Connect to the MCP server"""
        try:
            # Start the MCP server as a subprocess
            server_params = StdioServerParameters(
                command="python",
                args=["start_mcp_server.py"],
                env=None
            )
            
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    self.session = session
                    
                    # Initialize the session
                    await session.initialize()
                    
                    logger.info("Connected to MCP server successfully")
                    
                    # Run tests
                    await self.run_tests()
                    
        except Exception as e:
            logger.error(f"Failed to connect to MCP server: {str(e)}")
            raise
    
    async def run_tests(self):
        """Run a series of tests"""
        logger.info("Starting MCP server tests...")
        
        try:
            # Test 1: List tools
            await self.test_list_tools()
            
            # Test 2: List projects
            await self.test_list_projects()
            
            # Test 3: Create a project
            project_id = await self.test_create_project()
            
            # Test 4: Get project details
            if project_id:
                await self.test_get_project(project_id)
            
            # Test 5: Create a task
            task_id = await self.test_create_task(project_id)
            
            # Test 6: List tasks
            await self.test_list_tasks()
            
            # Test 7: Get task details
            if task_id:
                await self.test_get_task(task_id)
            
            # Test 8: Update task
            if task_id:
                await self.test_update_task(task_id)
            
            # Test 9: Get context rules
            await self.test_get_context_rules()
            
            # Test 10: Delete task
            if task_id:
                await self.test_delete_task(task_id)
            
            logger.info("All tests completed successfully!")
            
        except Exception as e:
            logger.error(f"Test failed: {str(e)}")
            raise
    
    async def test_list_tools(self):
        """Test listing available tools"""
        logger.info("Testing list_tools...")
        
        result = await self.session.list_tools()
        logger.info(f"Available tools: {len(result.tools)}")
        
        for tool in result.tools:
            logger.info(f"  - {tool.name}: {tool.description}")
    
    async def test_list_projects(self):
        """Test listing projects"""
        logger.info("Testing list_projects...")
        
        result = await self.session.call_tool("list_projects", {})
        logger.info(f"List projects result: {result.content[0].text}")
    
    async def test_create_project(self) -> int:
        """Test creating a project"""
        logger.info("Testing create_project...")
        
        project_data = {
            "name": "MCP Test Project",
            "description": "A test project created via MCP",
            "color": "#ff6b6b"
        }
        
        result = await self.session.call_tool("create_project", project_data)
        response = json.loads(result.content[0].text)
        
        logger.info(f"Created project: {response}")
        return response.get('id')
    
    async def test_get_project(self, project_id: int):
        """Test getting project details"""
        logger.info(f"Testing get_project for ID {project_id}...")
        
        result = await self.session.call_tool("get_project", {"project_id": project_id})
        response = json.loads(result.content[0].text)
        
        logger.info(f"Project details: {response['name']} - {response['description']}")
    
    async def test_create_task(self, project_id: int) -> int:
        """Test creating a task"""
        logger.info("Testing create_task...")
        
        task_data = {
            "project_id": project_id,
            "title": "MCP Test Task",
            "description": "A test task created via MCP",
            "content": "# Test Task\n\nThis is a test task created through the MCP interface.\n\n## Details\n- Created via MCP client\n- Testing task creation functionality",
            "status": "todo",
            "priority": "medium",
            "assignee": "mcp-tester",
            "estimated_hours": 2,
            "tags": ["test", "mcp", "automation"]
        }
        
        result = await self.session.call_tool("create_task", task_data)
        response = json.loads(result.content[0].text)
        
        logger.info(f"Created task: {response}")
        return response.get('id')
    
    async def test_list_tasks(self):
        """Test listing tasks"""
        logger.info("Testing list_tasks...")
        
        result = await self.session.call_tool("list_tasks", {"limit": 5})
        response = json.loads(result.content[0].text)
        
        logger.info(f"Found {response['total']} tasks")
        for task in response['tasks'][:3]:  # Show first 3 tasks
            logger.info(f"  - {task['title']} ({task['status']}) - {task['priority']}")
    
    async def test_get_task(self, task_id: int):
        """Test getting task details"""
        logger.info(f"Testing get_task for ID {task_id}...")
        
        result = await self.session.call_tool("get_task", {"task_id": task_id})
        response = json.loads(result.content[0].text)
        
        logger.info(f"Task details: {response['title']} - {response['status']}")
    
    async def test_update_task(self, task_id: int):
        """Test updating a task"""
        logger.info(f"Testing update_task for ID {task_id}...")
        
        update_data = {
            "task_id": task_id,
            "status": "in_progress",
            "completion_rate": 25
        }
        
        result = await self.session.call_tool("update_task", update_data)
        response = json.loads(result.content[0].text)
        
        logger.info(f"Updated task: {response}")
    
    async def test_get_context_rules(self):
        """Test getting context rules"""
        logger.info("Testing get_context_rules...")
        
        result = await self.session.call_tool("get_context_rules", {})
        response = json.loads(result.content[0].text)
        
        logger.info(f"Context rules: {response['total_rules']} rules found")
        logger.info(f"Global rules: {response['global_rules_count']}")
        logger.info(f"Project rules: {response['project_rules_count']}")
    
    async def test_delete_task(self, task_id: int):
        """Test deleting a task"""
        logger.info(f"Testing delete_task for ID {task_id}...")
        
        result = await self.session.call_tool("delete_task", {"task_id": task_id})
        response = json.loads(result.content[0].text)
        
        logger.info(f"Deleted task: {response}")

async def main():
    """Main entry point"""
    client = MCPTestClient()
    await client.connect()

if __name__ == "__main__":
    asyncio.run(main())

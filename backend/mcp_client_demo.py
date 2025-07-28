#!/usr/bin/env python3
"""
MCP Client Demo for Todo for AI

This demonstrates how an AI assistant can interact with the Todo for AI system
through the MCP (Model Context Protocol) interface.
"""

import asyncio
import json
import subprocess
import sys
import logging
from typing import Dict, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TodoMCPClient:
    """MCP Client for Todo for AI system"""
    
    def __init__(self):
        self.process = None
        self.request_id = 0
    
    async def start_server(self):
        """Start the MCP server process"""
        self.process = await asyncio.create_subprocess_exec(
            sys.executable, "simple_mcp_server.py",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Initialize the connection
        await self._send_request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "todo-ai-demo",
                "version": "1.0.0"
            }
        })
        
        logger.info("MCP Server started and initialized")
    
    async def stop_server(self):
        """Stop the MCP server process"""
        if self.process:
            self.process.terminate()
            await self.process.wait()
            logger.info("MCP Server stopped")
    
    async def _send_request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send a JSON-RPC request to the server"""
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params
        }
        
        # Send request
        request_line = json.dumps(request) + "\n"
        self.process.stdin.write(request_line.encode())
        await self.process.stdin.drain()
        
        # Read response - keep reading until we get a valid JSON
        response_data = ""
        while True:
            line = await self.process.stdout.readline()
            if not line:
                break
            line_str = line.decode().strip()
            if line_str.startswith('{"jsonrpc"'):
                response_data = line_str
                break

        if not response_data:
            raise Exception("No valid JSON response received")

        response = json.loads(response_data)
        
        if "error" in response:
            raise Exception(f"MCP Error: {response['error']}")
        
        return response["result"]
    
    async def list_tools(self) -> Dict[str, Any]:
        """List available tools"""
        return await self._send_request("tools/list", {})
    
    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> str:
        """Call a specific tool"""
        result = await self._send_request("tools/call", {
            "name": name,
            "arguments": arguments
        })
        return result["content"][0]["text"]
    
    # High-level methods for AI interaction
    
    async def get_project_overview(self) -> Dict[str, Any]:
        """Get an overview of all projects"""
        response = await self.call_tool("list_projects", {})
        return json.loads(response)
    
    async def create_project(self, name: str, description: str = "", color: str = "#1890ff") -> Dict[str, Any]:
        """Create a new project"""
        response = await self.call_tool("create_project", {
            "name": name,
            "description": description,
            "color": color
        })
        return json.loads(response)
    
    async def get_tasks_for_project(self, project_id: int, status: Optional[str] = None) -> Dict[str, Any]:
        """Get tasks for a specific project"""
        args = {"project_id": project_id, "limit": 100}
        if status:
            args["status"] = status
        
        response = await self.call_tool("list_tasks", args)
        return json.loads(response)
    
    async def create_task(self, project_id: int, title: str, description: str = "", 
                         content: str = "", status: str = "todo", priority: str = "medium",
                         assignee: Optional[str] = None) -> Dict[str, Any]:
        """Create a new task"""
        args = {
            "project_id": project_id,
            "title": title,
            "description": description,
            "content": content,
            "status": status,
            "priority": priority
        }
        if assignee:
            args["assignee"] = assignee
        
        response = await self.call_tool("create_task", args)
        return json.loads(response)
    
    async def update_task_status(self, task_id: int, status: str) -> Dict[str, Any]:
        """Update task status"""
        response = await self.call_tool("update_task", {
            "task_id": task_id,
            "status": status
        })
        return json.loads(response)

    async def delete_task(self, task_id: int) -> Dict[str, Any]:
        """Delete a task"""
        response = await self.call_tool("delete_task", {
            "task_id": task_id
        })
        return json.loads(response)
    
    async def get_context_rules(self, project_id: Optional[int] = None) -> Dict[str, Any]:
        """Get context rules for AI execution"""
        args = {}
        if project_id:
            args["project_id"] = project_id
        
        response = await self.call_tool("get_context_rules", args)
        return json.loads(response)

async def demo_ai_workflow():
    """Demonstrate a typical AI workflow"""
    client = TodoMCPClient()
    
    try:
        await client.start_server()
        
        print("🤖 AI Assistant Demo: Todo for AI Integration")
        print("=" * 50)
        
        # Step 1: Get available tools
        print("\n1. 🔧 Discovering available tools...")
        tools = await client.list_tools()
        print(f"   Found {len(tools['tools'])} tools:")
        for tool in tools['tools']:
            print(f"   - {tool['name']}: {tool['description']}")
        
        # Step 2: Get project overview
        print("\n2. 📋 Getting project overview...")
        projects = await client.get_project_overview()
        print(f"   Found {projects['total']} existing projects")
        for project in projects['projects'][:3]:  # Show first 3
            print(f"   - {project['name']}: {project['task_count']} tasks")
        
        # Step 3: Create a new project
        print("\n3. 🆕 Creating a new project...")
        new_project = await client.create_project(
            name="AI Demo Project",
            description="A project created by AI assistant for demonstration",
            color="#9c27b0"
        )
        project_id = new_project['id']
        print(f"   ✅ Created project '{new_project['name']}' with ID {project_id}")
        
        # Step 4: Create tasks for the project
        print("\n4. 📝 Creating tasks...")
        tasks_to_create = [
            {
                "title": "Setup project environment",
                "description": "Initialize development environment and dependencies",
                "content": "# Setup Project Environment\n\n## Tasks\n- [ ] Install dependencies\n- [ ] Configure environment variables\n- [ ] Setup database\n\n## Notes\nThis is a critical first step for the project.",
                "priority": "high",
                "assignee": "AI Assistant"
            },
            {
                "title": "Design system architecture",
                "description": "Create high-level system design and architecture",
                "content": "# System Architecture Design\n\n## Components\n1. Frontend (React)\n2. Backend (Flask)\n3. Database (MySQL)\n4. MCP Integration\n\n## Considerations\n- Scalability\n- Security\n- Performance",
                "priority": "medium",
                "assignee": "AI Assistant"
            },
            {
                "title": "Implement core features",
                "description": "Develop the main functionality of the system",
                "priority": "medium"
            }
        ]
        
        created_tasks = []
        for task_data in tasks_to_create:
            task = await client.create_task(project_id, **task_data)
            created_tasks.append(task)
            print(f"   ✅ Created task '{task['title']}' with ID {task['id']}")
        
        # Step 5: Update task status
        print("\n5. 🔄 Updating task status...")
        first_task = created_tasks[0]
        await client.update_task_status(first_task['id'], "in_progress")
        print(f"   ✅ Updated task '{first_task['title']}' to 'in_progress'")
        
        # Step 6: Get tasks for the project
        print("\n6. 📊 Getting project tasks...")
        project_tasks = await client.get_tasks_for_project(project_id)
        print(f"   Found {project_tasks['total']} tasks in the project:")
        for task in project_tasks['tasks']:
            print(f"   - {task['title']} ({task['status']}) - {task['priority']} priority")
        
        # Step 7: Get context rules
        print("\n7. 📜 Getting context rules...")
        context_rules = await client.get_context_rules(project_id)
        print(f"   Found {context_rules['total_rules']} context rules")
        print(f"   - Global rules: {context_rules['global_rules_count']}")
        print(f"   - Project rules: {context_rules['project_rules_count']}")
        
        if context_rules['merged_content']:
            print(f"   - Merged content length: {len(context_rules['merged_content'])} characters")

        # Step 8: Delete a task (optional - delete the last created task)
        if created_tasks:
            print("\n8. 🗑️  Deleting a task...")
            last_task = created_tasks[-1]  # Delete the last created task
            deleted_task = await client.delete_task(last_task['id'])
            print(f"   ✅ Deleted task '{deleted_task['title']}' with ID {deleted_task['id']}")

        print("\n🎉 Demo completed successfully!")
        print("\nThis demonstrates how an AI assistant can:")
        print("- Discover available tools and capabilities")
        print("- Query existing projects and tasks")
        print("- Create new projects and tasks")
        print("- Update task status and properties")
        print("- Delete tasks when needed")
        print("- Access context rules for informed decision making")
        
    except Exception as e:
        logger.error(f"Demo failed: {str(e)}")
        raise
    
    finally:
        await client.stop_server()

async def interactive_demo():
    """Interactive demo mode"""
    client = TodoMCPClient()
    
    try:
        await client.start_server()
        print("🤖 Interactive MCP Client Demo")
        print("Type 'help' for available commands, 'quit' to exit")
        
        while True:
            try:
                command = input("\n> ").strip().lower()
                
                if command == 'quit':
                    break
                elif command == 'help':
                    print("\nAvailable commands:")
                    print("- projects: List all projects")
                    print("- tasks [project_id]: List tasks (optionally for a specific project)")
                    print("- create_project: Create a new project")
                    print("- create_task: Create a new task")
                    print("- context [project_id]: Get context rules")
                    print("- tools: List available tools")
                    print("- quit: Exit the demo")
                
                elif command == 'projects':
                    projects = await client.get_project_overview()
                    print(f"\nFound {projects['total']} projects:")
                    for project in projects['projects']:
                        print(f"  {project['id']}: {project['name']} ({project['task_count']} tasks)")
                
                elif command.startswith('tasks'):
                    parts = command.split()
                    project_id = int(parts[1]) if len(parts) > 1 else None
                    
                    if project_id:
                        tasks = await client.get_tasks_for_project(project_id)
                    else:
                        tasks = json.loads(await client.call_tool("list_tasks", {"limit": 20}))
                    
                    print(f"\nFound {tasks['total']} tasks:")
                    for task in tasks['tasks']:
                        print(f"  {task['id']}: {task['title']} ({task['status']}) - {task['priority']}")
                
                elif command == 'tools':
                    tools = await client.list_tools()
                    print(f"\nAvailable tools ({len(tools['tools'])}):")
                    for tool in tools['tools']:
                        print(f"  - {tool['name']}: {tool['description']}")
                
                elif command.startswith('context'):
                    parts = command.split()
                    project_id = int(parts[1]) if len(parts) > 1 else None
                    
                    context = await client.get_context_rules(project_id)
                    print(f"\nContext rules: {context['total_rules']} total")
                    print(f"Global: {context['global_rules_count']}, Project: {context['project_rules_count']}")
                    
                    if context['merged_content']:
                        print(f"Merged content preview:")
                        print(context['merged_content'][:200] + "..." if len(context['merged_content']) > 200 else context['merged_content'])
                
                else:
                    print("Unknown command. Type 'help' for available commands.")
                    
            except Exception as e:
                print(f"Error: {str(e)}")
    
    finally:
        await client.stop_server()

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "interactive":
        asyncio.run(interactive_demo())
    else:
        asyncio.run(demo_ai_workflow())

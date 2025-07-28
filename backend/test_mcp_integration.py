#!/usr/bin/env python3
"""
MCP Integration Test Suite

This script runs comprehensive tests for the MCP (Model Context Protocol) integration
in Todo for AI system.
"""

import asyncio
import json
import logging
import sys
import time
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the MCP client
from mcp_client_demo import TodoMCPClient

class MCPTestSuite:
    """Comprehensive test suite for MCP integration"""
    
    def __init__(self):
        self.client = TodoMCPClient()
        self.test_results = []
        self.created_resources = {
            'projects': [],
            'tasks': []
        }
    
    def log_test_result(self, test_name: str, passed: bool, message: str = "", duration: float = 0):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        result = {
            'test': test_name,
            'passed': passed,
            'message': message,
            'duration': duration
        }
        self.test_results.append(result)
        
        duration_str = f" ({duration:.3f}s)" if duration > 0 else ""
        print(f"{status} {test_name}{duration_str}")
        if message:
            print(f"    {message}")
    
    async def setup(self):
        """Setup test environment"""
        try:
            await self.client.start_server()
            logger.info("MCP test environment setup complete")
            return True
        except Exception as e:
            logger.error(f"Failed to setup test environment: {e}")
            return False
    
    async def teardown(self):
        """Cleanup test environment"""
        try:
            # Clean up created resources
            for task_id in self.created_resources['tasks']:
                try:
                    await self.client.delete_task(task_id)
                except:
                    pass  # Ignore cleanup errors
            
            await self.client.stop_server()
            logger.info("Test environment cleanup complete")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    async def test_server_connection(self):
        """TC001: Test MCP server connection"""
        start_time = time.time()
        try:
            tools = await self.client.list_tools()
            assert 'tools' in tools
            assert len(tools['tools']) > 0
            
            duration = time.time() - start_time
            self.log_test_result("TC001_server_connection", True, 
                               f"Found {len(tools['tools'])} tools", duration)
            return True
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("TC001_server_connection", False, str(e), duration)
            return False
    
    async def test_list_projects(self):
        """TC003: Test project listing"""
        start_time = time.time()
        try:
            projects = await self.client.get_project_overview()
            assert 'projects' in projects
            assert 'total' in projects
            assert isinstance(projects['projects'], list)
            assert isinstance(projects['total'], int)
            
            duration = time.time() - start_time
            self.log_test_result("TC003_list_projects", True, 
                               f"Found {projects['total']} projects", duration)
            return True
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("TC003_list_projects", False, str(e), duration)
            return False
    
    async def test_create_project(self):
        """TC004: Test project creation"""
        start_time = time.time()
        try:
            project = await self.client.create_project(
                name="MCP Test Project",
                description="A project created during MCP testing",
                color="#ff6b6b"
            )
            
            assert 'id' in project
            assert project['name'] == "MCP Test Project"
            assert project['description'] == "A project created during MCP testing"
            assert project['color'] == "#ff6b6b"
            
            # Store for cleanup
            self.created_resources['projects'].append(project['id'])
            
            duration = time.time() - start_time
            self.log_test_result("TC004_create_project", True, 
                               f"Created project ID {project['id']}", duration)
            return project['id']
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("TC004_create_project", False, str(e), duration)
            return None
    
    async def test_list_tasks(self, project_id: Optional[int] = None):
        """TC005: Test task listing"""
        start_time = time.time()
        try:
            if project_id:
                tasks = await self.client.get_tasks_for_project(project_id)
                test_name = "TC005_list_tasks_by_project"
            else:
                tasks = json.loads(await self.client.call_tool("list_tasks", {"limit": 10}))
                test_name = "TC005_list_tasks_basic"
            
            assert 'tasks' in tasks
            assert 'total' in tasks
            assert isinstance(tasks['tasks'], list)
            
            duration = time.time() - start_time
            self.log_test_result(test_name, True, 
                               f"Found {tasks['total']} tasks", duration)
            return True
        except Exception as e:
            duration = time.time() - start_time
            test_name = "TC005_list_tasks_by_project" if project_id else "TC005_list_tasks_basic"
            self.log_test_result(test_name, False, str(e), duration)
            return False
    
    async def test_create_task(self, project_id: int):
        """TC006: Test task creation"""
        start_time = time.time()
        try:
            task = await self.client.create_task(
                project_id=project_id,
                title="MCP Test Task",
                description="A task created during MCP testing",
                content="# MCP Test Task\n\nThis task was created during automated testing.",
                status="todo",
                priority="medium",
                assignee="Test Suite"
            )
            
            assert 'id' in task
            assert task['title'] == "MCP Test Task"
            assert task['status'] == "todo"
            assert task['priority'] == "medium"
            
            # Store for cleanup
            self.created_resources['tasks'].append(task['id'])
            
            duration = time.time() - start_time
            self.log_test_result("TC006_create_task", True, 
                               f"Created task ID {task['id']}", duration)
            return task['id']
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("TC006_create_task", False, str(e), duration)
            return None
    
    async def test_update_task(self, task_id: int):
        """TC007: Test task update"""
        start_time = time.time()
        try:
            result = await self.client.update_task_status(task_id, "in_progress")
            assert 'id' in result
            assert result['id'] == task_id
            
            duration = time.time() - start_time
            self.log_test_result("TC007_update_task", True, 
                               f"Updated task {task_id} to in_progress", duration)
            return True
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("TC007_update_task", False, str(e), duration)
            return False
    
    async def test_delete_task(self, task_id: int):
        """TC008: Test task deletion"""
        start_time = time.time()
        try:
            result = await self.client.delete_task(task_id)
            assert 'id' in result
            assert result['id'] == task_id
            
            # Remove from cleanup list since it's already deleted
            if task_id in self.created_resources['tasks']:
                self.created_resources['tasks'].remove(task_id)
            
            duration = time.time() - start_time
            self.log_test_result("TC008_delete_task", True, 
                               f"Deleted task {task_id}", duration)
            return True
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("TC008_delete_task", False, str(e), duration)
            return False
    
    async def test_get_context_rules(self, project_id: Optional[int] = None):
        """TC009: Test context rules retrieval"""
        start_time = time.time()
        try:
            context = await self.client.get_context_rules(project_id)
            assert 'merged_content' in context
            assert 'total_rules' in context
            assert 'global_rules_count' in context
            assert 'project_rules_count' in context
            
            test_name = "TC009_context_rules_project" if project_id else "TC009_context_rules_global"
            duration = time.time() - start_time
            self.log_test_result(test_name, True, 
                               f"Retrieved {context['total_rules']} rules", duration)
            return True
        except Exception as e:
            test_name = "TC009_context_rules_project" if project_id else "TC009_context_rules_global"
            duration = time.time() - start_time
            self.log_test_result(test_name, False, str(e), duration)
            return False
    
    async def test_error_handling(self):
        """TC010: Test error handling"""
        start_time = time.time()
        try:
            # Test invalid task ID
            try:
                await self.client.call_tool("update_task", {
                    "task_id": 99999,
                    "status": "done"
                })
                # Should not reach here
                self.log_test_result("TC010_error_handling", False, 
                                   "Expected error for invalid task ID")
                return False
            except Exception:
                # Expected error
                pass
            
            # Test missing required parameter
            try:
                await self.client.call_tool("create_task", {
                    "title": "Test Task"  # Missing project_id
                })
                # Should not reach here
                self.log_test_result("TC010_error_handling", False, 
                                   "Expected error for missing project_id")
                return False
            except Exception:
                # Expected error
                pass
            
            duration = time.time() - start_time
            self.log_test_result("TC010_error_handling", True, 
                               "Error handling works correctly", duration)
            return True
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("TC010_error_handling", False, str(e), duration)
            return False
    
    async def test_performance(self):
        """TC011: Test basic performance"""
        start_time = time.time()
        try:
            # Run sequential requests to avoid concurrency issues with single client
            results = []
            for i in range(5):
                result = await self.client.call_tool("list_projects", {})
                results.append(result)

            duration = time.time() - start_time

            # Should complete within reasonable time
            if duration > 10.0:
                self.log_test_result("TC011_performance", False,
                                   f"Too slow: {duration:.2f}s for 5 requests")
                return False

            self.log_test_result("TC011_performance", True,
                               f"5 sequential requests in {duration:.2f}s", duration)
            return True
        except Exception as e:
            duration = time.time() - start_time
            self.log_test_result("TC011_performance", False, str(e), duration)
            return False
    
    async def run_all_tests(self):
        """Run the complete test suite"""
        print("🧪 MCP Integration Test Suite")
        print("=" * 60)
        
        # Setup
        if not await self.setup():
            print("❌ Failed to setup test environment")
            return False
        
        try:
            # Basic connectivity tests
            if not await self.test_server_connection():
                print("❌ Server connection failed, aborting tests")
                return False
            
            # Project management tests
            await self.test_list_projects()
            project_id = await self.test_create_project()
            
            # Task management tests
            await self.test_list_tasks()
            if project_id:
                await self.test_list_tasks(project_id)
                task_id = await self.test_create_task(project_id)
                
                if task_id:
                    await self.test_update_task(task_id)
                    await self.test_delete_task(task_id)
            
            # Context rules tests
            await self.test_get_context_rules()
            if project_id:
                await self.test_get_context_rules(project_id)
            
            # Error handling tests
            await self.test_error_handling()
            
            # Performance tests
            await self.test_performance()
            
        finally:
            await self.teardown()
        
        # Print summary
        self.print_summary()
        
        # Return overall success
        return all(result['passed'] for result in self.test_results)
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['passed'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['passed']:
                    print(f"  - {result['test']}: {result['message']}")
        
        total_duration = sum(result['duration'] for result in self.test_results)
        print(f"\nTotal Duration: {total_duration:.2f}s")
        
        if failed_tests == 0:
            print("\n🎉 All tests passed!")
        else:
            print(f"\n⚠️  {failed_tests} test(s) failed")

async def main():
    """Main test runner"""
    test_suite = MCPTestSuite()
    success = await test_suite.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())

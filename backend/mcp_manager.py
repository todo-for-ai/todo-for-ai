#!/usr/bin/env python3
"""
MCP Server Manager for Todo for AI

This script provides management functionality for the MCP server including:
- Starting and stopping the server
- Health checks and status monitoring
- Process management
- Configuration management
"""

import asyncio
import json
import logging
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MCPServerManager:
    """Manager for MCP Server lifecycle"""
    
    def __init__(self):
        self.backend_dir = Path(__file__).parent
        self.project_root = self.backend_dir.parent
        self.pid_file = self.project_root / '.mcp_server.pid'
        self.log_file = self.project_root / 'logs' / 'mcp_server.log'
        # MCP 服务现在通过 npm 包提供，不再使用 Python 实现
        self.server_script = None
        
        # Ensure logs directory exists
        self.log_file.parent.mkdir(exist_ok=True)
    
    def is_running(self) -> bool:
        """Check if MCP server is running"""
        if not self.pid_file.exists():
            return False
        
        try:
            with open(self.pid_file, 'r') as f:
                pid = int(f.read().strip())
            
            # Check if process exists
            os.kill(pid, 0)
            return True
        except (OSError, ValueError, ProcessLookupError):
            # Process doesn't exist, clean up pid file
            if self.pid_file.exists():
                self.pid_file.unlink()
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """Get detailed server status"""
        status = {
            'running': self.is_running(),
            'pid': None,
            'uptime': None,
            'log_file': str(self.log_file),
            'pid_file': str(self.pid_file)
        }
        
        if status['running']:
            try:
                with open(self.pid_file, 'r') as f:
                    status['pid'] = int(f.read().strip())
                
                # Get process start time for uptime calculation
                import psutil
                process = psutil.Process(status['pid'])
                start_time = process.create_time()
                status['uptime'] = time.time() - start_time
                status['memory_usage'] = process.memory_info().rss / 1024 / 1024  # MB
                status['cpu_percent'] = process.cpu_percent()
                
            except Exception as e:
                logger.warning(f"Could not get detailed status: {e}")
        
        return status
    
    def start(self, background: bool = True) -> bool:
        """Start the MCP server - now deprecated, use npm package instead"""
        logger.warning("MCP server Python implementation has been removed.")
        logger.info("Please use the npm package 'todo-for-ai-mcp' instead.")
        logger.info("Install with: npm install -g todo-for-ai-mcp")
        logger.info("Configure your IDE to use the npm package.")
        return False
    
    def stop(self, force: bool = False) -> bool:
        """Stop the MCP server"""
        if not self.is_running():
            logger.info("MCP server is not running")
            return True
        
        try:
            with open(self.pid_file, 'r') as f:
                pid = int(f.read().strip())
            
            logger.info(f"Stopping MCP server (PID: {pid})...")
            
            if force:
                os.kill(pid, signal.SIGKILL)
            else:
                os.kill(pid, signal.SIGTERM)
            
            # Wait for process to stop
            for _ in range(10):
                if not self.is_running():
                    break
                time.sleep(1)
            
            if self.is_running():
                if not force:
                    logger.warning("Server didn't stop gracefully, forcing...")
                    return self.stop(force=True)
                else:
                    logger.error("Failed to stop server even with force")
                    return False
            
            # Clean up PID file
            if self.pid_file.exists():
                self.pid_file.unlink()
            
            logger.info("MCP server stopped successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop MCP server: {e}")
            return False
    
    def restart(self) -> bool:
        """Restart the MCP server"""
        logger.info("Restarting MCP server...")
        
        if self.is_running():
            if not self.stop():
                return False
        
        return self.start()
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on the server"""
        health = {
            'status': 'unknown',
            'responsive': False,
            'error': None
        }
        
        if not self.is_running():
            health['status'] = 'stopped'
            return health
        
        try:
            # Try to send a simple request to the server
            # This is a basic check - in a real implementation you might
            # want to send an actual MCP request
            health['status'] = 'running'
            health['responsive'] = True
            
        except Exception as e:
            health['status'] = 'error'
            health['error'] = str(e)
        
        return health
    
    def get_logs(self, lines: int = 50) -> str:
        """Get recent log entries"""
        if not self.log_file.exists():
            return "No log file found"
        
        try:
            with open(self.log_file, 'r') as f:
                log_lines = f.readlines()
            
            # Return last N lines
            return ''.join(log_lines[-lines:])
            
        except Exception as e:
            return f"Error reading logs: {e}"

def main():
    """Main CLI interface"""
    import argparse
    
    parser = argparse.ArgumentParser(description='MCP Server Manager')
    parser.add_argument('command', choices=['start', 'stop', 'restart', 'status', 'health', 'logs'],
                       help='Command to execute')
    parser.add_argument('--force', action='store_true', help='Force stop the server')
    parser.add_argument('--foreground', action='store_true', help='Run in foreground (for start command)')
    parser.add_argument('--lines', type=int, default=50, help='Number of log lines to show')
    
    args = parser.parse_args()
    
    manager = MCPServerManager()
    
    if args.command == 'start':
        success = manager.start(background=not args.foreground)
        sys.exit(0 if success else 1)
    
    elif args.command == 'stop':
        success = manager.stop(force=args.force)
        sys.exit(0 if success else 1)
    
    elif args.command == 'restart':
        success = manager.restart()
        sys.exit(0 if success else 1)
    
    elif args.command == 'status':
        status = manager.get_status()
        print(json.dumps(status, indent=2))
        
        if status['running']:
            print(f"\n✅ MCP Server is running (PID: {status['pid']})")
            if 'uptime' in status:
                uptime_hours = status['uptime'] / 3600
                print(f"   Uptime: {uptime_hours:.1f} hours")
            if 'memory_usage' in status:
                print(f"   Memory: {status['memory_usage']:.1f} MB")
        else:
            print("\n❌ MCP Server is not running")
    
    elif args.command == 'health':
        health = manager.health_check()
        print(json.dumps(health, indent=2))
        
        if health['responsive']:
            print("\n✅ MCP Server is healthy")
        else:
            print(f"\n❌ MCP Server health check failed: {health.get('error', 'Unknown error')}")
    
    elif args.command == 'logs':
        logs = manager.get_logs(args.lines)
        print(logs)

if __name__ == "__main__":
    main()

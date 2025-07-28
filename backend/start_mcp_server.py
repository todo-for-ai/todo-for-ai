#!/usr/bin/env python3
"""
Startup script for Todo for AI MCP Server
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set up environment
os.environ.setdefault('FLASK_ENV', 'development')
os.environ.setdefault('DATABASE_URL', 'mysql://todo_user:todo_password@localhost/todo_for_ai')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler('mcp_server.log')
    ]
)

logger = logging.getLogger(__name__)

def main():
    """Main entry point"""
    try:
        logger.info("Starting Todo for AI MCP Server...")
        
        # Import and run the MCP server
        from mcp_server import main as mcp_main
        import asyncio
        
        asyncio.run(mcp_main())
        
    except KeyboardInterrupt:
        logger.info("MCP Server stopped by user")
    except Exception as e:
        logger.error(f"Failed to start MCP Server: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

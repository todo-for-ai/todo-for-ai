# Todo for AI - Frequently Asked Questions

## General Questions

### What is Todo for AI?

Todo for AI is a task management system specifically designed to work seamlessly with AI assistants. Unlike traditional task management tools, it provides native integration with AI agents through the Model Context Protocol (MCP), enabling natural language task management and intelligent automation.

### How is Todo for AI different from other task management tools?

**Key Differences:**
- **AI-First Design**: Built from the ground up for AI assistant integration
- **MCP Protocol**: Native support for Model Context Protocol
- **Natural Language Interface**: Create and manage tasks using conversational commands
- **Intelligent Automation**: AI agents can autonomously manage tasks based on context
- **Smart Insights**: AI-powered analytics and recommendations

### Who should use Todo for AI?

Todo for AI is perfect for:
- AI-first teams building the future of work
- Developers integrating AI assistants into workflows
- Product managers coordinating between AI agents and human teams
- Researchers managing complex AI-driven projects
- Anyone looking to supercharge productivity with AI assistance

## Installation & Setup

### What are the system requirements?

**Minimum Requirements:**
- **Docker**: Docker 20.10+ and Docker Compose 2.0+
- **Node.js**: Version 18.0+ (for MCP server)
- **Database**: MySQL 8.0+ or compatible
- **Browser**: Modern browser with JavaScript enabled

**Recommended:**
- 4GB RAM minimum, 8GB recommended
- 2 CPU cores minimum, 4 cores recommended
- 10GB free disk space

### How do I install Todo for AI?

We offer multiple installation methods:

1. **Docker (Recommended)**: One-command deployment
2. **MCP Package Only**: For AI assistant integration only
3. **Development Setup**: For contributors and customization
4. **Source Installation**: For advanced users

See our [Installation Guide](README.md#installation--quick-start) for detailed instructions.

### Can I use Todo for AI without Docker?

Yes! You can install from source or use just the MCP package. However, Docker provides the easiest setup experience with all components pre-configured.

## AI Integration

### Which AI assistants are supported?

Todo for AI works with any AI assistant that supports the Model Context Protocol (MCP), including:
- **Claude** (Anthropic)
- **GPT models** (OpenAI)
- **Custom AI agents** built with MCP support

### How do I connect my AI assistant?

1. **Install MCP Package**: `npm install -g @todo-for-ai/mcp`
2. **Configure AI Assistant**: Add MCP server to your AI configuration
3. **Test Connection**: Verify AI can access your projects and tasks

See our [User Guide](docs/USER_GUIDE.md#ai-assistant-integration) for detailed setup instructions.

### What can AI assistants do with Todo for AI?

AI assistants can:
- Create and manage projects
- Add, update, and complete tasks
- Generate task breakdowns and subtasks
- Provide project insights and recommendations
- Submit feedback and progress reports
- Query project status and analytics

### Is my data safe when using AI assistants?

Yes! Todo for AI implements enterprise-grade security:
- **Encrypted Communication**: All API calls use HTTPS/TLS
- **Access Control**: Fine-grained permissions for AI agents
- **Audit Logging**: Complete audit trail of AI actions
- **Data Privacy**: Your data stays on your infrastructure

## Features & Usage

### Can I use Todo for AI without AI assistants?

Absolutely! Todo for AI works as a standalone task management system. The AI integration is optional and can be added later.

### Does Todo for AI support team collaboration?

Yes! Features include:
- Multi-user projects with role-based permissions
- Task assignment and tracking
- Real-time updates and notifications
- Comment and discussion threads
- Integration with communication tools

### Can I import data from other task management tools?

We're working on import tools for popular platforms. Currently, you can:
- Use our API to programmatically import data
- Export data from your current tool and use our bulk import features
- Contact support for assistance with large migrations

### Is there a mobile app?

Currently, Todo for AI is web-based and works great on mobile browsers. A dedicated mobile app is on our roadmap.

## Technical Questions

### What databases are supported?

- **MySQL 8.0+** (recommended)
- **MariaDB 10.5+**
- **PostgreSQL 12+** (experimental)

### Can I customize the interface?

Yes! Todo for AI supports:
- **Themes**: Light, dark, and custom themes
- **Layout Options**: Customize dashboard and project views
- **Custom Fields**: Add project and task fields specific to your workflow
- **API Integration**: Build custom interfaces using our API

### How do I backup my data?

**Database Backup:**
```bash
# MySQL backup
mysqldump -u username -p todo_for_ai > backup.sql

# Docker backup
docker exec mysql-container mysqldump -u root -p todo_for_ai > backup.sql
```

**Full System Backup:**
- Database dump
- Uploaded files and attachments
- Configuration files
- Custom themes and settings

### Can I run Todo for AI on my own servers?

Yes! Todo for AI is designed for self-hosting:
- **On-Premises**: Full control over your data and infrastructure
- **Cloud Deployment**: Works on AWS, GCP, Azure, and other cloud providers
- **Hybrid Setup**: Combine cloud and on-premises components

## Troubleshooting

### The application won't start

**Common Solutions:**
1. **Check Docker**: Ensure Docker is running and has sufficient resources
2. **Port Conflicts**: Verify ports 50110 and 50111 are available
3. **Environment Variables**: Confirm all required environment variables are set
4. **Database Connection**: Test database connectivity

### AI assistant can't connect

**Troubleshooting Steps:**
1. **MCP Server Status**: Check if MCP server is running
2. **API Credentials**: Verify API URL and authentication token
3. **Network Access**: Ensure AI assistant can reach the API
4. **Configuration**: Review MCP configuration file

### Tasks aren't syncing

**Possible Causes:**
1. **Network Issues**: Check internet connectivity
2. **Browser Cache**: Clear browser cache and cookies
3. **User Permissions**: Verify user has appropriate access rights
4. **Server Load**: Check if server is experiencing high load

### Performance is slow

**Optimization Tips:**
1. **Resource Allocation**: Increase Docker container memory/CPU limits
2. **Database Optimization**: Ensure database has adequate resources
3. **Browser Performance**: Close unnecessary tabs and extensions
4. **Network Latency**: Check network connection quality

## Pricing & Licensing

### Is Todo for AI free?

Todo for AI is open-source software released under the MIT License. You can:
- Use it for personal and commercial projects
- Modify and customize the code
- Deploy on your own infrastructure
- Contribute to the project

### Are there paid plans?

We offer:
- **Community Edition**: Free, open-source version
- **Enterprise Support**: Paid support and consulting services
- **Hosted Solution**: Managed hosting service (coming soon)

### Can I get commercial support?

Yes! We offer:
- **Priority Support**: Faster response times for critical issues
- **Custom Development**: Tailored features for your organization
- **Training & Consulting**: Help your team get the most out of Todo for AI
- **Migration Services**: Assistance moving from other platforms

## Contributing & Community

### How can I contribute to Todo for AI?

We welcome contributions! You can:
- **Report Bugs**: Submit issues on GitHub
- **Suggest Features**: Share ideas for improvements
- **Submit Code**: Create pull requests with fixes or features
- **Improve Documentation**: Help make our docs better
- **Share Knowledge**: Help other users in our community

### Where can I get help?

**Support Channels:**
- **Documentation**: Comprehensive guides and API docs
- **GitHub Issues**: Bug reports and feature requests
- **Community Forum**: Connect with other users
- **Discord/Slack**: Real-time community chat
- **Email Support**: Direct support for urgent issues

### How do I stay updated?

- **GitHub**: Watch our repository for updates
- **Newsletter**: Subscribe to our development newsletter
- **Blog**: Follow our blog for feature announcements
- **Social Media**: Follow us on Twitter and LinkedIn

---

**Still have questions?** Feel free to reach out to our community or support team!

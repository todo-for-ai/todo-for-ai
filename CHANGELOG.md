# Changelog

All notable changes to Todo for AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced README with project badges and detailed feature descriptions
- Comprehensive API documentation
- User guide with best practices and tutorials
- FAQ documentation covering common questions
- Contributing guidelines for open source contributors
- Multiple installation methods (Docker, npm, source)
- Quick start examples for different use cases

### Changed
- Improved project description with clear value propositions
- Enhanced installation instructions with multiple options
- Better organized documentation structure

### Fixed
- Documentation formatting and consistency issues

## [2.1.5] - 2024-01-15

### Added
- **MCP Server v2.1.5**: Enhanced Model Context Protocol server with improved HTTP transport
- **Streamable HTTP Support**: Better performance for AI assistant communication
- **Task Feedback System**: AI assistants can now submit detailed feedback on task completion
- **Enhanced API Endpoints**: New endpoints for MCP-specific operations
- **Docker Optimization**: Improved Docker configuration for better performance

### Changed
- **API Response Format**: Standardized API responses across all endpoints
- **Authentication Flow**: Improved JWT token handling and refresh mechanism
- **Database Schema**: Optimized database structure for better performance
- **Error Handling**: Enhanced error messages and status codes

### Fixed
- **Memory Leaks**: Fixed memory leaks in long-running MCP connections
- **CORS Issues**: Resolved cross-origin request problems
- **Task Synchronization**: Fixed issues with real-time task updates
- **Authentication Bugs**: Resolved GitHub OAuth callback issues

### Security
- **Enhanced Validation**: Improved input validation and sanitization
- **Rate Limiting**: Added rate limiting to prevent API abuse
- **Security Headers**: Added security headers for better protection

## [2.1.0] - 2024-01-01

### Added
- **Multi-Project Support**: Users can now manage multiple projects simultaneously
- **Advanced Task Filtering**: Filter tasks by status, priority, assignee, and tags
- **Email Notifications**: Configurable email alerts for task updates and deadlines
- **GitHub Integration**: OAuth authentication and repository linking
- **Task Templates**: Reusable task templates for common workflows
- **Bulk Operations**: Bulk edit, delete, and update tasks

### Changed
- **UI Redesign**: Modern, responsive interface with improved user experience
- **Performance Improvements**: Faster page loads and smoother interactions
- **Mobile Optimization**: Better mobile and tablet experience
- **API Versioning**: Introduced API versioning for better backward compatibility

### Fixed
- **Data Persistence**: Fixed issues with data not saving properly
- **Browser Compatibility**: Resolved compatibility issues with older browsers
- **Timezone Handling**: Fixed timezone-related bugs in due dates

## [2.0.0] - 2023-12-01

### Added
- **Model Context Protocol (MCP) Support**: Native integration with AI assistants
- **AI Task Management**: AI assistants can create, update, and manage tasks
- **Natural Language Interface**: Conversational task management through AI
- **Real-time Collaboration**: Live updates across all connected clients
- **Advanced Analytics**: Project insights and progress tracking
- **Custom Fields**: Configurable task and project fields

### Changed
- **Architecture Overhaul**: Microservices architecture with separate API, frontend, and MCP components
- **Database Migration**: Upgraded to more robust database schema
- **Authentication System**: New JWT-based authentication with OAuth support
- **API Redesign**: RESTful API with comprehensive endpoint coverage

### Removed
- **Legacy UI**: Removed old interface in favor of modern React-based frontend
- **Deprecated Endpoints**: Removed outdated API endpoints

### Breaking Changes
- **API Changes**: Several API endpoints have been modified or removed
- **Database Schema**: Database migration required for existing installations
- **Configuration Format**: New configuration format for environment variables

## [1.5.0] - 2023-10-15

### Added
- **Task Dependencies**: Link tasks with dependencies and prerequisites
- **Time Tracking**: Built-in time tracking for tasks and projects
- **File Attachments**: Upload and attach files to tasks
- **Comment System**: Discussion threads on tasks and projects
- **Search Functionality**: Full-text search across projects and tasks

### Changed
- **Performance Optimization**: Improved database queries and caching
- **UI Polish**: Enhanced visual design and user interactions
- **Mobile Support**: Better responsive design for mobile devices

### Fixed
- **Data Export**: Fixed issues with CSV and JSON export functionality
- **Notification Delivery**: Resolved email notification delivery problems
- **User Permissions**: Fixed permission checking for shared projects

## [1.0.0] - 2023-08-01

### Added
- **Initial Release**: First stable version of Todo for AI
- **Core Task Management**: Create, update, delete, and organize tasks
- **Project Organization**: Group tasks into projects with descriptions
- **User Authentication**: Secure user registration and login
- **Basic API**: RESTful API for programmatic access
- **Web Interface**: Clean, intuitive web-based user interface
- **Docker Support**: Containerized deployment with Docker

### Features
- **Task Status Tracking**: Todo, In Progress, Review, Done, Cancelled
- **Priority Levels**: Low, Medium, High, Urgent priority settings
- **Due Dates**: Set and track task deadlines
- **Task Assignment**: Assign tasks to team members
- **Basic Notifications**: Email notifications for important updates

---

## Release Notes

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality in a backward compatible manner
- **PATCH**: Backward compatible bug fixes

### Release Schedule

- **Major Releases**: Every 6-12 months
- **Minor Releases**: Every 2-3 months
- **Patch Releases**: As needed for critical fixes

### Support Policy

- **Current Version**: Full support with new features and bug fixes
- **Previous Major Version**: Security updates and critical bug fixes for 12 months
- **Older Versions**: Community support only

### Migration Guides

For breaking changes, we provide detailed migration guides:
- [v1.x to v2.x Migration Guide](docs/migrations/v1-to-v2.md)
- [v2.0 to v2.1 Migration Guide](docs/migrations/v2.0-to-v2.1.md)

### Getting Updates

- **GitHub Releases**: Watch our repository for release notifications
- **Newsletter**: Subscribe to our development newsletter
- **RSS Feed**: Follow our changelog RSS feed
- **Docker Hub**: Automated builds for each release

---

**Stay Updated**: Watch our [GitHub repository](https://github.com/todo-for-ai/todo-for-ai) to get notified about new releases!

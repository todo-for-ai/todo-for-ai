# Contributing to Todo for AI

Thank you for your interest in contributing to Todo for AI! We welcome contributions from the community and are excited to work with you to make this project even better.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Contributing Guidelines](#contributing-guidelines)
5. [Pull Request Process](#pull-request-process)
6. [Issue Guidelines](#issue-guidelines)
7. [Development Workflow](#development-workflow)
8. [Testing](#testing)
9. [Documentation](#documentation)
10. [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@todo4ai.org](mailto:conduct@todo4ai.org).

### Our Standards

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Inclusive**: Welcome newcomers and help them get started
- **Be Collaborative**: Work together to solve problems and improve the project
- **Be Professional**: Maintain a professional tone in all communications
- **Be Patient**: Remember that everyone has different experience levels

## Getting Started

### Prerequisites

Before contributing, make sure you have:

- **Git**: Version control system
- **Docker**: For running the development environment
- **Node.js**: Version 18.0+ for MCP development
- **Python**: Version 3.9+ for backend development
- **A GitHub Account**: For submitting contributions

### First Contribution

1. **Fork the Repository**: Click the "Fork" button on GitHub
2. **Clone Your Fork**: `git clone https://github.com/your-username/todo-for-ai.git`
3. **Set Up Development Environment**: Follow the development setup guide
4. **Find an Issue**: Look for issues labeled "good first issue" or "help wanted"
5. **Make Your Changes**: Implement your fix or feature
6. **Submit a Pull Request**: Follow our PR guidelines

## Development Setup

### 1. Clone the Repository

```bash
git clone --recursive https://github.com/todo-for-ai/todo-for-ai.git
cd todo-for-ai
```

### 2. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Set up database, API keys, etc.
```

### 3. Start Development Environment

```bash
# Using Docker Compose (recommended)
docker-compose -f docker-compose.dev.yml up -d

# Or start components individually
cd todo-for-ai-api-server && python app.py &
cd todo-for-ai-webpage && npm run dev &
cd todo-for-ai-mcp && npm run dev &
```

### 4. Verify Setup

```bash
# Test API
curl http://localhost:50110/health

# Test Frontend
open http://localhost:50111/todo-for-ai/pages/projects

# Test MCP
npm run test:mcp
```

## Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- **Bug Fixes**: Fix issues and improve stability
- **New Features**: Add functionality that benefits users
- **Documentation**: Improve guides, API docs, and examples
- **Performance**: Optimize code and improve efficiency
- **Testing**: Add tests and improve test coverage
- **UI/UX**: Enhance user interface and experience

### Contribution Areas

#### Backend (Python/Flask)
- API endpoints and business logic
- Database models and migrations
- Authentication and security
- Email notifications and integrations

#### Frontend (React/TypeScript)
- User interface components
- State management and data flow
- Responsive design and accessibility
- User experience improvements

#### MCP Server (Node.js/TypeScript)
- AI assistant integration
- Protocol implementation
- API client functionality
- Configuration and setup

#### Documentation
- User guides and tutorials
- API documentation
- Setup and deployment guides
- Code comments and examples

#### DevOps & Infrastructure
- Docker configurations
- CI/CD pipelines
- Deployment scripts
- Monitoring and logging

## Pull Request Process

### Before Submitting

1. **Check Existing Issues**: Ensure your contribution addresses a real need
2. **Discuss Large Changes**: Open an issue to discuss significant changes
3. **Follow Coding Standards**: Ensure your code follows our style guidelines
4. **Write Tests**: Add tests for new functionality
5. **Update Documentation**: Update relevant documentation

### PR Checklist

- [ ] **Code Quality**: Code follows project standards and best practices
- [ ] **Tests**: All tests pass and new tests are added for new functionality
- [ ] **Documentation**: Documentation is updated for any user-facing changes
- [ ] **Commit Messages**: Clear, descriptive commit messages
- [ ] **No Breaking Changes**: Or clearly documented if unavoidable
- [ ] **Performance**: No significant performance regressions

### PR Template

When submitting a PR, please include:

```markdown
## Description
Brief description of changes and motivation

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Include screenshots for UI changes

## Additional Notes
Any additional context or considerations
```

## Issue Guidelines

### Reporting Bugs

When reporting bugs, please include:

1. **Clear Title**: Descriptive summary of the issue
2. **Environment**: OS, browser, Docker version, etc.
3. **Steps to Reproduce**: Detailed steps to reproduce the issue
4. **Expected Behavior**: What should happen
5. **Actual Behavior**: What actually happens
6. **Screenshots/Logs**: Visual evidence or error logs
7. **Additional Context**: Any other relevant information

### Feature Requests

For feature requests, please include:

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How should this work?
3. **Alternatives**: Other solutions you've considered
4. **Use Cases**: Who would benefit from this feature?
5. **Implementation Ideas**: Technical approach (if applicable)

### Issue Labels

We use labels to categorize issues:

- **bug**: Something isn't working correctly
- **enhancement**: New feature or improvement
- **documentation**: Documentation needs improvement
- **good first issue**: Good for newcomers
- **help wanted**: Extra attention is needed
- **priority/high**: High priority issue
- **component/api**: Backend API related
- **component/ui**: Frontend UI related
- **component/mcp**: MCP server related

## Development Workflow

### Git Workflow

1. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
2. **Make Changes**: Implement your feature or fix
3. **Commit Changes**: Use clear, descriptive commit messages
4. **Push Branch**: `git push origin feature/your-feature-name`
5. **Create PR**: Submit pull request for review
6. **Address Feedback**: Make requested changes
7. **Merge**: Maintainer will merge after approval

### Commit Message Format

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add task filtering by priority
fix(ui): resolve mobile navigation issue
docs(readme): update installation instructions
```

## Testing

### Running Tests

```bash
# Backend tests
cd todo-for-ai-api-server
python -m pytest

# Frontend tests
cd todo-for-ai-webpage
npm test

# MCP tests
cd todo-for-ai-mcp
npm test

# Integration tests
npm run test:integration
```

### Writing Tests

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user workflows
- **API Tests**: Test API endpoints and responses

### Test Guidelines

1. **Test Coverage**: Aim for >80% code coverage
2. **Test Names**: Use descriptive test names
3. **Test Data**: Use realistic test data
4. **Mocking**: Mock external dependencies
5. **Assertions**: Use clear, specific assertions

## Documentation

### Documentation Types

- **User Documentation**: Guides for end users
- **Developer Documentation**: Technical documentation for contributors
- **API Documentation**: Comprehensive API reference
- **Code Documentation**: Inline comments and docstrings

### Documentation Standards

1. **Clear Language**: Use simple, clear language
2. **Examples**: Include practical examples
3. **Up-to-Date**: Keep documentation current with code changes
4. **Accessible**: Consider accessibility in documentation
5. **Searchable**: Use clear headings and structure

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat with the community
- **Email**: Direct contact for sensitive issues

### Getting Help

- **Documentation**: Check our comprehensive documentation first
- **Search Issues**: Look for existing solutions
- **Ask Questions**: Don't hesitate to ask for help
- **Be Patient**: Maintainers are volunteers with limited time

### Recognition

We recognize contributors through:

- **Contributors List**: All contributors are listed in our README
- **Release Notes**: Significant contributions are highlighted
- **Community Spotlight**: Featured contributors in our blog
- **Swag**: Occasional swag for active contributors

---

**Thank you for contributing to Todo for AI!** Your contributions help make AI-powered task management accessible to everyone.

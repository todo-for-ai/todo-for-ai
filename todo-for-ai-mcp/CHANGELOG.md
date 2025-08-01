# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-07-31

### Added
- Enhanced TypeScript configuration with strict type checking
- Incremental compilation support for faster builds
- Additional build scripts (clean, typecheck, build:watch)
- Comprehensive error handling with global error handlers
- Dynamic version reading from package.json
- Extended keywords for better npm discoverability

### Changed
- Updated dependencies to latest stable versions
- Improved API client baseURL configuration
- Enhanced README.md with complete tool documentation
- Optimized package.json metadata and description

### Fixed
- Fixed API client URL duplication issue
- Resolved TypeScript compilation errors with strict mode
- Fixed function initialization order issues
- Improved type safety for optional properties

### Technical Improvements
- Added exactOptionalPropertyTypes for better type safety
- Enabled noImplicitReturns and noFallthroughCasesInSwitch
- Improved build configuration with better output structure
- Enhanced error handling with proper type definitions

## [1.0.0] - 2025-07-28

### Added
- Initial release of Todo for AI MCP Server
- Support for 5 core MCP tools:
  - get_project_tasks_by_name
  - get_task_by_id
  - create_task
  - submit_task_feedback
  - get_project_info
- Comprehensive logging system
- Environment-based configuration
- TypeScript support with full type definitions
- Automatic retry mechanism for API calls
- Built-in verification script

### Features
- Full integration with Todo for AI backend API
- Support for task status filtering
- Project context rules automatic appending
- AI task identification and tracking
- Flexible configuration through environment variables

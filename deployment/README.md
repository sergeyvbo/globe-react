# GeoQuiz Deployment Infrastructure

This directory contains the TypeScript-based deployment automation system for the GeoQuiz application.

## Prerequisites

- Node.js 20.6+
- Docker and Docker Compose
- npm or yarn package manager

## Setup

1. Install dependencies:
```bash
npm install
```

2. Test the infrastructure:
```bash
npx tsx test-infrastructure.ts
```

## Available Scripts

- `npm run deploy` - Run deployment with default environment
- `npm run dev` - Deploy to development environment
- `npm run staging` - Deploy to staging environment  
- `npm run production` - Deploy to production environment
- `npm run build` - Run build process
- `npm run db:migrate` - Run database migrations
- `npm run health-check` - Run health checks

## Project Structure

```
deployment/
├── scripts/                    # TypeScript deployment scripts
│   ├── deploy.ts              # Main deployment orchestrator
│   ├── build.ts               # Build management
│   ├── database.ts            # Database operations
│   ├── health-check.ts        # Health monitoring
│   ├── config.ts              # Configuration management
│   └── utils/                 # Utility modules
│       ├── types.ts           # TypeScript type definitions
│       ├── logger.ts          # Logging utilities
│       └── docker.ts          # Docker management utilities
├── environments/              # Environment configuration files
├── package.json               # Node.js dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Features

### TypeScript Support
- Full type safety and IntelliSense support
- ES modules support
- Comprehensive error handling with typed errors

### Logging System
- Structured JSON logging to file
- Console output with colors and formatting
- Context-aware logging with child loggers
- Automatic error context capture
- Sensitive data sanitization

### Docker Integration
- Docker API integration with dockerode
- Container lifecycle management
- Image building and pulling
- Health check monitoring
- Resource cleanup utilities

### Configuration Management
- Zod-based schema validation
- Environment-specific configurations
- Type-safe configuration loading
- Secret management capabilities

## Development

The infrastructure is designed to be extended with additional deployment logic in subsequent tasks. Each script file contains placeholder implementations that will be completed as the system is built out.

### Testing

Run the infrastructure test to verify all components are working:

```bash
npx tsx test-infrastructure.ts
```

This will test:
- Logger functionality
- Docker daemon connectivity
- Configuration schema validation
- TypeScript compilation and execution

## Next Steps

This infrastructure provides the foundation for:
1. Docker containerization system
2. Environment configuration management
3. Database migration and setup
4. Build and asset management
5. Health check and monitoring
6. GitHub Actions CI/CD integration

Each of these features will be implemented in subsequent tasks according to the deployment specification.
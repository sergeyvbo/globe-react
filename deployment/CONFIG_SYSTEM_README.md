# Configuration Management System

This document describes the comprehensive configuration management system implemented for the deployment automation.

## Overview

The configuration management system provides:
- Type-safe environment configuration loading
- Secure secret management with multiple sources
- Environment variable overrides
- Comprehensive validation with detailed error reporting
- Secret sanitization for logging
- Support for multiple deployment environments

## Components

### 1. ConfigManager (`scripts/config.ts`)

The main configuration management class that:
- Loads environment-specific configuration files
- Validates configuration against TypeScript schemas
- Integrates with SecretManager for secure secret injection
- Provides caching for performance
- Supports environment variable overrides

**Key Features:**
- Type-safe configuration loading using Zod schemas
- Comprehensive validation with business logic rules
- Environment-specific validation (e.g., production security checks)
- Port conflict detection
- Resource limit validation

### 2. SecretManager (`scripts/utils/secrets.ts`)

Handles sensitive configuration data with:
- Multiple secret sources (environment variables, files, defaults)
- Secret validation and strength checking
- Environment variable override system
- Secret sanitization for logs
- Secure secret generation

**Secret Sources (in priority order):**
1. Environment variables
2. Environment-specific secret files (`secrets/{environment}/{key}.txt`)
3. Generic secret files (`secrets/{key}.txt`)
4. Default values (if configured)

### 3. Type Definitions (`scripts/utils/types.ts`)

Comprehensive TypeScript interfaces and Zod schemas for:
- Environment configuration structure
- Raw environment variable parsing
- Secret configuration
- Validation results
- Error types

## Environment Files

The system supports multiple environment configurations:

- `environments/development.env` - Development settings with relaxed security
- `environments/local.env` - Local development with test data
- `environments/staging.env` - Staging environment with secret placeholders
- `environments/production.env` - Production with strict security settings

## Usage

### Loading Configuration

```typescript
import { ConfigManager } from './scripts/config.ts';

const configManager = ConfigManager.getInstance();
const config = await configManager.loadEnvironment('development');
```

### Managing Secrets

```typescript
import { SecretManager } from './scripts/utils/secrets.ts';

const secretManager = SecretManager.getInstance();
const secrets = await secretManager.loadSecrets('production');
```

### CLI Usage

```bash
# Load and display configuration
npm run config development

# Generate secure secrets
npm run secrets generate 32

# Validate secrets for environment
npm run secrets validate production

# Load secrets for environment
npm run secrets load staging
```

## Secret Placeholders

In environment files, use placeholder syntax for secrets:
```
JWT_SECRET_KEY=${JWT_SECRET_KEY_PROD}
DB_PASSWORD=${DB_PASSWORD_PROD}
```

## Environment Variable Overrides

The system supports runtime overrides using environment variables:
- `OVERRIDE_DB_HOST` - Override database host
- `OVERRIDE_DB_PORT` - Override database port
- `OVERRIDE_FRONTEND_PORT` - Override frontend port
- `OVERRIDE_BACKEND_PORT` - Override backend port
- `OVERRIDE_LOG_LEVEL` - Override log level
- `OVERRIDE_DOMAIN_NAME` - Override domain name
- `OVERRIDE_DOCKER_TAG` - Override Docker tag
- `OVERRIDE_DOCKER_REGISTRY` - Override Docker registry

## Validation Features

### Schema Validation
- Type checking using Zod schemas
- Required field validation
- Format validation (URLs, ports, etc.)
- Range validation for numeric values

### Business Logic Validation
- Port conflict detection
- Environment-specific security checks
- Resource limit validation for production
- Secret strength validation

### Security Features
- Secret sanitization in logs
- Development value detection
- Weak password detection
- Secret placeholder validation

## Error Handling

The system provides detailed error reporting with:
- Specific error codes
- Contextual information
- Recovery suggestions
- Structured error types

## Testing

Run the comprehensive test suite:
```bash
npx tsx test-config-system.ts
```

This tests:
- Configuration loading
- Secret generation
- Validation
- Environment overrides
- Secret sanitization
- Available environments

## Security Considerations

1. **Secret Storage**: Secrets should be stored in secure locations (environment variables, secret management systems)
2. **Log Sanitization**: All sensitive data is automatically sanitized in logs
3. **Validation**: Strong validation prevents weak or malformed secrets
4. **Environment Separation**: Clear separation between development and production configurations
5. **Override Protection**: Environment overrides are logged for audit purposes

## Configuration Schema

The system validates against a comprehensive schema including:

```typescript
interface EnvironmentConfig {
  application: {
    environment: 'Development' | 'Staging' | 'Production';
    nodeEnv: 'development' | 'production';
    logLevel: 'Debug' | 'Information' | 'Warning' | 'Error';
    domainName: string;
    enableSwagger: boolean;
    enableCorsAllOrigins: boolean;
    enableDetailedErrors: boolean;
  };
  database: {
    name: string;
    user: string;
    password: string;
    port: number;
    host: string;
    memoryLimit?: string;
    cpuLimit?: number;
  };
  jwt: {
    secretKey: string;
    issuer: string;
    audience: string;
    expirationMinutes: number;
  };
  frontend: {
    url: string;
    port: number;
    apiUrl: string;
    memoryLimit?: string;
    cpuLimit?: number;
  };
  backend: {
    port: number;
    memoryLimit?: string;
    cpuLimit?: number;
  };
  security: {
    enforceHttps: boolean;
    enableHsts: boolean;
  };
  nginx: {
    host: string;
    port: number;
  };
  docker: {
    registry?: string;
    namespace: string;
    tag: string;
  };
  healthCheck: {
    interval: string;
    timeout: string;
    retries: number;
  };
}
```

This configuration management system provides a robust, secure, and type-safe foundation for deployment automation across multiple environments.
import { z } from 'zod';

// Base deployment configuration schema
export const DeploymentConfigSchema = z.object({
  environment: z.enum(['development', 'staging', 'production', 'local']),
  services: z.array(z.object({
    name: z.string(),
    image: z.string(),
    ports: z.array(z.object({
      host: z.number(),
      container: z.number(),
      protocol: z.enum(['tcp', 'udp']).default('tcp')
    })),
    environment: z.record(z.string()),
    volumes: z.array(z.object({
      host: z.string(),
      container: z.string(),
      mode: z.enum(['ro', 'rw']).default('rw')
    })),
    healthCheck: z.object({
      endpoint: z.string(),
      interval: z.number().default(30),
      timeout: z.number().default(10),
      retries: z.number().default(3)
    }).optional()
  })),
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    username: z.string(),
    password: z.string()
  }),
  build: z.object({
    frontend: z.object({
      outputDir: z.string(),
      publicPath: z.string(),
      optimization: z.boolean(),
      sourceMaps: z.boolean()
    }),
    backend: z.object({
      configuration: z.enum(['Debug', 'Release']),
      outputDir: z.string(),
      selfContained: z.boolean()
    }),
    docker: z.object({
      buildArgs: z.record(z.string()),
      labels: z.record(z.string())
    })
  }),
  healthChecks: z.array(z.object({
    name: z.string(),
    endpoint: z.string(),
    interval: z.number(),
    timeout: z.number(),
    retries: z.number()
  }))
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;
export type ServiceConfig = DeploymentConfig['services'][0];
export type DatabaseConfig = DeploymentConfig['database'];
export type BuildConfig = DeploymentConfig['build'];
export type HealthCheckConfig = DeploymentConfig['healthChecks'][0];

// Comprehensive environment configuration schema
export const EnvironmentConfigSchema = z.object({
  // Application environment settings
  application: z.object({
    environment: z.enum(['Development', 'Staging', 'Production']),
    nodeEnv: z.enum(['development', 'production']),
    logLevel: z.enum(['Debug', 'Information', 'Warning', 'Error']),
    domainName: z.string(),
    enableSwagger: z.boolean(),
    enableCorsAllOrigins: z.boolean(),
    enableDetailedErrors: z.boolean()
  }),
  
  // Database configuration
  database: z.object({
    name: z.string(),
    user: z.string(),
    password: z.string(),
    port: z.number().min(1).max(65535),
    host: z.string().default('localhost'),
    memoryLimit: z.string().optional(),
    cpuLimit: z.number().optional()
  }),
  
  // JWT configuration
  jwt: z.object({
    secretKey: z.string().min(32),
    issuer: z.string(),
    audience: z.string(),
    expirationMinutes: z.number().min(1)
  }),
  
  // Frontend configuration
  frontend: z.object({
    url: z.string().url(),
    port: z.number().min(1).max(65535),
    apiUrl: z.string().url(),
    memoryLimit: z.string().optional(),
    cpuLimit: z.number().optional()
  }),
  
  // Backend configuration
  backend: z.object({
    port: z.number().min(1).max(65535),
    memoryLimit: z.string().optional(),
    cpuLimit: z.number().optional()
  }),
  
  // Security configuration
  security: z.object({
    enforceHttps: z.boolean(),
    enableHsts: z.boolean()
  }),
  
  // Nginx configuration
  nginx: z.object({
    host: z.string(),
    port: z.number().min(1).max(65535)
  }),
  
  // Docker configuration
  docker: z.object({
    registry: z.string().optional(),
    namespace: z.string(),
    tag: z.string()
  }),
  
  // Health check configuration
  healthCheck: z.object({
    interval: z.string().regex(/^\d+[smh]$/),
    timeout: z.string().regex(/^\d+[smh]$/),
    retries: z.number().min(1)
  })
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// Raw environment variables schema (before transformation)
export const RawEnvironmentSchema = z.object({
  // Application Environment
  ASPNETCORE_ENVIRONMENT: z.string(),
  NODE_ENV: z.string(),
  
  // Database Configuration
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_PORT: z.string().transform(val => parseInt(val, 10)),
  DB_MEMORY_LIMIT: z.string().optional(),
  DB_CPU_LIMIT: z.string().transform(val => parseFloat(val)).optional(),
  
  // JWT Configuration
  JWT_SECRET_KEY: z.string(),
  JWT_ISSUER: z.string(),
  JWT_AUDIENCE: z.string(),
  JWT_EXPIRATION_MINUTES: z.string().transform(val => parseInt(val, 10)),
  
  // Frontend Configuration
  FRONTEND_URL: z.string(),
  FRONTEND_PORT: z.string().transform(val => parseInt(val, 10)),
  REACT_APP_API_URL: z.string(),
  FRONTEND_MEMORY_LIMIT: z.string().optional(),
  FRONTEND_CPU_LIMIT: z.string().transform(val => parseFloat(val)).optional(),
  
  // Backend Configuration
  BACKEND_PORT: z.string().transform(val => parseInt(val, 10)),
  BACKEND_MEMORY_LIMIT: z.string().optional(),
  BACKEND_CPU_LIMIT: z.string().transform(val => parseFloat(val)).optional(),
  
  // Security Configuration
  ENFORCE_HTTPS: z.string().transform(val => val.toLowerCase() === 'true'),
  ENABLE_HSTS: z.string().transform(val => val.toLowerCase() === 'true'),
  
  // Logging Configuration
  LOG_LEVEL: z.string(),
  
  // Domain Configuration
  DOMAIN_NAME: z.string(),
  
  // Nginx Configuration
  NGINX_HOST: z.string(),
  NGINX_PORT: z.string().transform(val => parseInt(val, 10)),
  
  // Docker Configuration
  DOCKER_REGISTRY: z.string().optional(),
  DOCKER_NAMESPACE: z.string(),
  DOCKER_TAG: z.string(),
  
  // Feature flags
  ENABLE_SWAGGER: z.string().transform(val => val.toLowerCase() === 'true'),
  ENABLE_CORS_ALL_ORIGINS: z.string().transform(val => val.toLowerCase() === 'true'),
  ENABLE_DETAILED_ERRORS: z.string().transform(val => val.toLowerCase() === 'true'),
  
  // Health check configuration
  HEALTH_CHECK_INTERVAL: z.string().optional(),
  HEALTH_CHECK_TIMEOUT: z.string().optional(),
  HEALTH_CHECK_RETRIES: z.string().transform(val => parseInt(val, 10)).optional()
});

export type RawEnvironment = z.infer<typeof RawEnvironmentSchema>;

// Result types
export interface BuildResult {
  success: boolean;
  duration: number;
  outputPath: string;
  errors?: string[];
}

export interface ImageResult {
  success: boolean;
  imageId: string;
  tag: string;
  size: number;
  errors?: string[];
}

export interface MigrationResult {
  success: boolean;
  migrationName: string;
  duration: number;
  errors?: string[];
}

export interface BackupResult {
  success: boolean;
  backupPath: string;
  size: number;
  timestamp: Date;
  errors?: string[];
}

export interface HealthStatus {
  service: string;
  healthy: boolean;
  responseTime: number;
  lastCheck: Date;
  errors?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Configuration loading options
export interface ConfigLoadOptions {
  environment: string;
  validateSecrets?: boolean;
  allowMissingSecrets?: boolean;
  secretsSource?: 'env' | 'file' | 'vault';
}

// Secret configuration
export interface SecretConfig {
  key: string;
  required: boolean;
  defaultValue?: string;
  validation?: (value: string) => boolean;
  description?: string;
}

// Configuration transformation result
export interface ConfigTransformResult {
  config: EnvironmentConfig;
  warnings: string[];
  missingSecrets: string[];
}

// Error types
export abstract class DeploymentError extends Error {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;
  
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BuildError extends DeploymentError {
  readonly code = 'BUILD_FAILED';
  readonly recoverable = true;
}

export class DatabaseError extends DeploymentError {
  readonly code = 'DATABASE_ERROR';
  readonly recoverable = false;
}

export class HealthCheckError extends DeploymentError {
  readonly code = 'HEALTH_CHECK_FAILED';
  readonly recoverable = true;
}

export class ConfigurationError extends DeploymentError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly recoverable = false;
}

export class DockerError extends DeploymentError {
  readonly code = 'DOCKER_ERROR';
  readonly recoverable = true;
}

// Port mapping interface
export interface PortMapping {
  host: number;
  container: number;
  protocol: 'tcp' | 'udp';
}

// Volume mapping interface
export interface VolumeMapping {
  host: string;
  container: string;
  mode: 'ro' | 'rw';
}
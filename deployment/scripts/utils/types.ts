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

// Environment configuration schema
export const EnvironmentConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    username: z.string(),
    password: z.string()
  }),
  api: z.object({
    port: z.number(),
    jwtSecret: z.string(),
    corsOrigins: z.array(z.string())
  }),
  frontend: z.object({
    apiUrl: z.string(),
    port: z.number()
  }),
  docker: z.object({
    registry: z.string().optional(),
    namespace: z.string(),
    tag: z.string()
  })
});

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

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
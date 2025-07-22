#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { Logger } from './utils/logger.js';
import { SecretManager } from './utils/secrets.js';
import { 
  EnvironmentConfig, 
  EnvironmentConfigSchema,
  RawEnvironment,
  RawEnvironmentSchema,
  ValidationResult,
  ConfigLoadOptions,
  ConfigTransformResult,
  ConfigurationError
} from './utils/types.js';

const logger = new Logger('ConfigManager');

export class ConfigManager {
  private static instance: ConfigManager;
  private configCache = new Map<string, EnvironmentConfig>();
  private readonly environmentsDir: string;
  private readonly secretManager: SecretManager;

  constructor(environmentsDir?: string) {
    this.environmentsDir = environmentsDir || resolve(process.cwd(), 'environments');
    this.secretManager = SecretManager.getInstance();
  }

  static getInstance(environmentsDir?: string): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(environmentsDir);
    }
    return ConfigManager.instance;
  }

  /**
   * Load environment configuration with validation
   */
  async loadEnvironment(environment: string, options: Partial<ConfigLoadOptions> = {}): Promise<EnvironmentConfig> {
    const cacheKey = `${environment}-${JSON.stringify(options)}`;
    
    if (this.configCache.has(cacheKey)) {
      logger.debug(`Using cached configuration for environment: ${environment}`);
      return this.configCache.get(cacheKey)!;
    }

    logger.info(`Loading configuration for environment: ${environment}`);

    try {
      // Load environment file
      const envPath = join(this.environmentsDir, `${environment}.env`);
      const rawConfig = await this.loadEnvironmentFile(envPath);
      
      // Transform and validate configuration
      const transformResult = await this.transformConfiguration(rawConfig, options);
      
      // Inject secrets if validation is enabled and there are missing secrets
      let finalConfig = transformResult.config;
      if (options.validateSecrets !== false && transformResult.missingSecrets.length > 0) {
        finalConfig = await this.secretManager.injectSecrets(transformResult.config, environment, options.allowMissingSecrets);
      }
      
      // Apply environment variable overrides
      finalConfig = this.secretManager.createEnvironmentOverrides(finalConfig, process.env as Record<string, string>);
      
      // Log warnings if any
      if (transformResult.warnings.length > 0) {
        transformResult.warnings.forEach(warning => logger.warn(warning));
      }

      // Handle missing secrets
      if (transformResult.missingSecrets.length > 0) {
        if (!options.allowMissingSecrets) {
          throw new ConfigurationError(
            `Missing required secrets: ${transformResult.missingSecrets.join(', ')}`,
            { environment, missingSecrets: transformResult.missingSecrets }
          );
        } else {
          logger.warn(`Missing secrets (allowed): ${transformResult.missingSecrets.join(', ')}`);
        }
      }

      // Validate final configuration
      const validationResult = await this.validateConfig(transformResult.config);
      if (!validationResult.valid) {
        throw new ConfigurationError(
          `Configuration validation failed: ${validationResult.errors.join(', ')}`,
          { environment, errors: validationResult.errors }
        );
      }

      // Cache and return configuration
      this.configCache.set(cacheKey, transformResult.config);
      
      logger.info(`Successfully loaded configuration for environment: ${environment}`);
      logger.logConfig(transformResult.config as Record<string, unknown>, [
        'password', 'secret', 'key', 'token', 'auth'
      ]);

      return transformResult.config;

    } catch (error) {
      logger.error(`Failed to load configuration for environment: ${environment}`, error as Error);
      throw error;
    }
  }

  /**
   * Validate configuration against schema
   */
  async validateConfig(config: EnvironmentConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate against Zod schema
      EnvironmentConfigSchema.parse(config);
      
      // Additional business logic validation
      await this.performBusinessValidation(config, errors, warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        error.errors.forEach((err: any) => {
          errors.push(`${err.path.join('.')}: ${err.message}`);
        });
      } else {
        errors.push(error.message || 'Unknown validation error');
      }

      return {
        valid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Load and parse environment file
   */
  private async loadEnvironmentFile(envPath: string): Promise<RawEnvironment> {
    try {
      logger.debug(`Loading environment file: ${envPath}`);
      
      // Read file content directly
      const fileContent = await readFile(envPath, 'utf-8');
      
      // Parse .env file manually
      const parsed: Record<string, string> = {};
      const lines = fileContent.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines and comments
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          continue;
        }
        
        // Parse key=value pairs
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          
          // Remove quotes if present
          const cleanValue = value.replace(/^["']|["']$/g, '');
          parsed[key] = cleanValue;
        }
      }

      // Parse and validate raw environment variables
      const rawConfig = RawEnvironmentSchema.parse(parsed);
      
      logger.debug(`Successfully loaded environment file: ${envPath}`);
      return rawConfig;

    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      
      throw new ConfigurationError(
        `Error loading environment file: ${envPath}`,
        { path: envPath, originalError: error }
      );
    }
  }

  /**
   * Transform raw environment variables to structured configuration
   */
  private async transformConfiguration(
    rawConfig: RawEnvironment, 
    _options: Partial<ConfigLoadOptions>
  ): Promise<ConfigTransformResult> {
    const warnings: string[] = [];
    const missingSecrets: string[] = [];

    // Transform raw config to structured config
    const config: EnvironmentConfig = {
      application: {
        environment: rawConfig.ASPNETCORE_ENVIRONMENT as 'Development' | 'Staging' | 'Production',
        nodeEnv: rawConfig.NODE_ENV as 'development' | 'production',
        logLevel: rawConfig.LOG_LEVEL as 'Debug' | 'Information' | 'Warning' | 'Error',
        domainName: rawConfig.DOMAIN_NAME,
        enableSwagger: rawConfig.ENABLE_SWAGGER,
        enableCorsAllOrigins: rawConfig.ENABLE_CORS_ALL_ORIGINS,
        enableDetailedErrors: rawConfig.ENABLE_DETAILED_ERRORS
      },
      database: {
        name: rawConfig.DB_NAME,
        user: rawConfig.DB_USER,
        password: rawConfig.DB_PASSWORD,
        port: rawConfig.DB_PORT,
        host: 'localhost', // Default, can be overridden
        ...(rawConfig.DB_MEMORY_LIMIT && { memoryLimit: rawConfig.DB_MEMORY_LIMIT }),
        ...(rawConfig.DB_CPU_LIMIT && { cpuLimit: rawConfig.DB_CPU_LIMIT })
      },
      jwt: {
        secretKey: rawConfig.JWT_SECRET_KEY,
        issuer: rawConfig.JWT_ISSUER,
        audience: rawConfig.JWT_AUDIENCE,
        expirationMinutes: rawConfig.JWT_EXPIRATION_MINUTES
      },
      frontend: {
        url: rawConfig.FRONTEND_URL,
        port: rawConfig.FRONTEND_PORT,
        apiUrl: rawConfig.REACT_APP_API_URL,
        ...(rawConfig.FRONTEND_MEMORY_LIMIT && { memoryLimit: rawConfig.FRONTEND_MEMORY_LIMIT }),
        ...(rawConfig.FRONTEND_CPU_LIMIT && { cpuLimit: rawConfig.FRONTEND_CPU_LIMIT })
      },
      backend: {
        port: rawConfig.BACKEND_PORT,
        ...(rawConfig.BACKEND_MEMORY_LIMIT && { memoryLimit: rawConfig.BACKEND_MEMORY_LIMIT }),
        ...(rawConfig.BACKEND_CPU_LIMIT && { cpuLimit: rawConfig.BACKEND_CPU_LIMIT })
      },
      security: {
        enforceHttps: rawConfig.ENFORCE_HTTPS,
        enableHsts: rawConfig.ENABLE_HSTS
      },
      nginx: {
        host: rawConfig.NGINX_HOST,
        port: rawConfig.NGINX_PORT
      },
      docker: {
        namespace: rawConfig.DOCKER_NAMESPACE,
        tag: rawConfig.DOCKER_TAG,
        ...(rawConfig.DOCKER_REGISTRY && { registry: rawConfig.DOCKER_REGISTRY })
      },
      healthCheck: {
        interval: rawConfig.HEALTH_CHECK_INTERVAL || '30s',
        timeout: rawConfig.HEALTH_CHECK_TIMEOUT || '10s',
        retries: rawConfig.HEALTH_CHECK_RETRIES || 3
      }
    };

    // Check for secret placeholders and missing values
    this.checkForSecrets(config, missingSecrets, warnings);

    return {
      config,
      warnings,
      missingSecrets
    };
  }

  /**
   * Check for secret placeholders and missing values
   */
  private checkForSecrets(config: EnvironmentConfig, missingSecrets: string[], warnings: string[]): void {
    // Check JWT secret
    if (config.jwt.secretKey.startsWith('${') && config.jwt.secretKey.endsWith('}')) {
      const secretKey = config.jwt.secretKey.slice(2, -1);
      missingSecrets.push(secretKey);
    } else if (config.jwt.secretKey.includes('development') || config.jwt.secretKey.includes('change')) {
      warnings.push('JWT secret appears to be a development/placeholder value');
    }

    // Check database password
    if (config.database.password.startsWith('${') && config.database.password.endsWith('}')) {
      const secretKey = config.database.password.slice(2, -1);
      missingSecrets.push(secretKey);
    } else if (config.database.password.includes('dev') || config.database.password.includes('123')) {
      warnings.push('Database password appears to be a development/weak value');
    }
  }

  /**
   * Perform additional business logic validation
   */
  private async performBusinessValidation(
    config: EnvironmentConfig, 
    errors: string[], 
    warnings: string[]
  ): Promise<void> {
    // Port conflict validation
    const ports = [
      config.frontend.port,
      config.backend.port,
      config.nginx.port,
      config.database.port
    ];
    
    const uniquePorts = new Set(ports);
    if (uniquePorts.size !== ports.length) {
      errors.push('Port conflicts detected - multiple services cannot use the same port');
    }

    // Environment-specific validation
    if (config.application.environment === 'Production') {
      // Production-specific validations
      if (config.application.enableSwagger) {
        warnings.push('Swagger is enabled in production environment');
      }
      
      if (config.application.enableDetailedErrors) {
        warnings.push('Detailed errors are enabled in production environment');
      }
      
      if (config.jwt.expirationMinutes > 120) {
        warnings.push('JWT expiration time is longer than recommended for production');
      }
    }

    // Security validation
    if (!config.security.enforceHttps && config.application.environment !== 'Development') {
      warnings.push('HTTPS is not enforced in non-development environment');
    }

    // Resource limits validation
    if (config.application.environment === 'Production') {
      if (!config.database.memoryLimit) {
        warnings.push('Database memory limit not set for production');
      }
      if (!config.backend.memoryLimit) {
        warnings.push('Backend memory limit not set for production');
      }
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.configCache.clear();
    logger.debug('Configuration cache cleared');
  }

  /**
   * Get all available environments
   */
  async getAvailableEnvironments(): Promise<string[]> {
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(this.environmentsDir);
      
      return files
        .filter(file => file.endsWith('.env'))
        .map(file => file.replace('.env', ''));
        
    } catch (error) {
      logger.error('Failed to get available environments', error as Error);
      return [];
    }
  }
}

// CLI functionality
async function main() {
  try {
    console.log('Starting configuration management...');
    const environment = process.argv[2] || 'development';
    console.log(`Environment: ${environment}`);
    
    const configManager = ConfigManager.getInstance();
    
    logger.info(`Loading configuration for environment: ${environment}`);
    
    const config = await configManager.loadEnvironment(environment, { 
      allowMissingSecrets: true 
    });
    
    console.log('\n=== Configuration Summary ===');
    console.log(`Environment: ${config.application.environment}`);
    console.log(`Frontend URL: ${config.frontend.url}`);
    console.log(`Backend Port: ${config.backend.port}`);
    console.log(`Database: ${config.database.name}@${config.database.host}:${config.database.port}`);
    console.log(`Docker: ${config.docker.namespace}:${config.docker.tag}`);
    
    const availableEnvs = await configManager.getAvailableEnvironments();
    console.log(`\nAvailable environments: ${availableEnvs.join(', ')}`);
    
  } catch (error) {
    console.error('Configuration management failed:', error);
    logger.error('Configuration management failed', error as Error);
    process.exit(1);
  }
}

// Check if this file is being run directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main();
}
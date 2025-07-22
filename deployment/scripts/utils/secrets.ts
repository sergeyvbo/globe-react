#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';
import { Logger } from './logger.js';
import { 
  SecretConfig,
  ConfigurationError,
  EnvironmentConfig
} from './types.js';

const logger = new Logger('SecretManager');

export class SecretManager {
  private static instance: SecretManager;
  private secretsCache = new Map<string, string>();
  private readonly secretsDir: string;

  constructor(secretsDir?: string) {
    this.secretsDir = secretsDir || resolve(process.cwd(), 'secrets');
  }

  static getInstance(secretsDir?: string): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager(secretsDir);
    }
    return SecretManager.instance;
  }

  /**
   * Load secrets from environment variables with fallback to files
   */
  async loadSecrets(environment: string, allowMissing: boolean = false): Promise<Record<string, string>> {
    logger.info(`Loading secrets for environment: ${environment}`);
    
    const secrets: Record<string, string> = {};
    const secretConfigs = this.getSecretConfigurations();

    for (const [key, config] of Object.entries(secretConfigs)) {
      try {
        const secretValue = await this.getSecret(key, config, environment);
        if (secretValue) {
          secrets[key] = secretValue;
          this.secretsCache.set(`${environment}-${key}`, secretValue);
        } else if (config.required && !allowMissing) {
          throw new ConfigurationError(
            `Required secret '${key}' not found`,
            { environment, secretKey: key }
          );
        }
      } catch (error) {
        logger.error(`Failed to load secret '${key}'`, error as Error);
        if (config.required && !allowMissing) {
          throw error;
        }
      }
    }

    logger.info(`Successfully loaded ${Object.keys(secrets).length} secrets for environment: ${environment}`);
    return secrets;
  }

  /**
   * Inject secrets into configuration object
   */
  async injectSecrets(config: EnvironmentConfig, environment: string, allowMissing: boolean = false): Promise<EnvironmentConfig> {
    logger.debug(`Injecting secrets into configuration for environment: ${environment}`);
    
    const secrets = await this.loadSecrets(environment, allowMissing);
    const injectedConfig = JSON.parse(JSON.stringify(config)); // Deep clone

    // Inject JWT secret
    if (secrets.JWT_SECRET_KEY) {
      injectedConfig.jwt.secretKey = secrets.JWT_SECRET_KEY;
    }

    // Inject database password
    if (secrets.DB_PASSWORD) {
      injectedConfig.database.password = secrets.DB_PASSWORD;
    }

    // Inject any other secrets that might be placeholders
    this.injectSecretPlaceholders(injectedConfig, secrets);

    logger.debug(`Successfully injected secrets into configuration`);
    return injectedConfig;
  }

  /**
   * Get a single secret value
   */
  private async getSecret(key: string, config: SecretConfig, environment: string): Promise<string | undefined> {
    // Check cache first
    const cacheKey = `${environment}-${key}`;
    if (this.secretsCache.has(cacheKey)) {
      return this.secretsCache.get(cacheKey);
    }

    // 1. Try environment variable first
    const envValue = process.env[key];
    if (envValue && envValue.trim()) {
      if (config.validation && !config.validation(envValue)) {
        throw new ConfigurationError(
          `Secret '${key}' failed validation`,
          { secretKey: key, environment }
        );
      }
      return envValue;
    }

    // 2. Try environment-specific secret file
    try {
      const secretPath = join(this.secretsDir, environment, `${key.toLowerCase()}.txt`);
      const fileValue = await readFile(secretPath, 'utf-8');
      const trimmedValue = fileValue.trim();
      
      if (config.validation && !config.validation(trimmedValue)) {
        throw new ConfigurationError(
          `Secret '${key}' from file failed validation`,
          { secretKey: key, environment, filePath: secretPath }
        );
      }
      
      return trimmedValue;
    } catch (error) {
      // File doesn't exist or can't be read, continue to next method
    }

    // 3. Try generic secret file
    try {
      const secretPath = join(this.secretsDir, `${key.toLowerCase()}.txt`);
      const fileValue = await readFile(secretPath, 'utf-8');
      const trimmedValue = fileValue.trim();
      
      if (config.validation && !config.validation(trimmedValue)) {
        throw new ConfigurationError(
          `Secret '${key}' from generic file failed validation`,
          { secretKey: key, filePath: secretPath }
        );
      }
      
      return trimmedValue;
    } catch (error) {
      // File doesn't exist or can't be read
    }

    // 4. Use default value if available
    if (config.defaultValue) {
      logger.warn(`Using default value for secret '${key}' in environment '${environment}'`);
      return config.defaultValue;
    }

    return undefined;
  }

  /**
   * Define secret configurations
   */
  private getSecretConfigurations(): Record<string, SecretConfig> {
    return {
      JWT_SECRET_KEY: {
        key: 'JWT_SECRET_KEY',
        required: true,
        validation: (value: string) => value.length >= 32,
        description: 'JWT signing secret key (minimum 32 characters)'
      },
      DB_PASSWORD: {
        key: 'DB_PASSWORD',
        required: true,
        validation: (value: string) => value.length >= 8,
        description: 'Database password (minimum 8 characters)'
      },
      DOCKER_REGISTRY_TOKEN: {
        key: 'DOCKER_REGISTRY_TOKEN',
        required: false,
        description: 'Docker registry authentication token'
      },
      GITHUB_TOKEN: {
        key: 'GITHUB_TOKEN',
        required: false,
        description: 'GitHub API token for CI/CD operations'
      },
      SSL_CERT_PASSWORD: {
        key: 'SSL_CERT_PASSWORD',
        required: false,
        description: 'SSL certificate password'
      }
    };
  }

  /**
   * Inject secret placeholders in configuration
   */
  private injectSecretPlaceholders(config: any, secrets: Record<string, string>): void {
    const injectInObject = (obj: any, path: string = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
          // Extract secret key from placeholder
          const secretKey = value.slice(2, -1);
          if (secrets[secretKey]) {
            obj[key] = secrets[secretKey];
            logger.debug(`Injected secret for ${currentPath}`);
          } else {
            logger.warn(`Secret placeholder '${secretKey}' found but no secret value available at ${currentPath}`);
          }
        } else if (typeof value === 'object' && value !== null) {
          injectInObject(value, currentPath);
        }
      }
    };

    injectInObject(config);
  }

  /**
   * Validate that no secrets are exposed in logs or output
   */
  sanitizeForLogging(data: any): any {
    const sensitiveKeys = [
      'password', 'secret', 'key', 'token', 'auth', 'credential',
      'jwt', 'cert', 'private', 'api_key', 'access_key'
    ];

    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        // Check if this looks like a secret value
        if (obj.length > 20 && /^[A-Za-z0-9+/=]+$/.test(obj)) {
          return '[REDACTED]';
        }
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
          
          if (isSensitive) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = sanitize(value);
          }
        }
        return sanitized;
      }

      return obj;
    };

    return sanitize(data);
  }

  /**
   * Clear secrets cache
   */
  clearCache(): void {
    this.secretsCache.clear();
    logger.debug('Secrets cache cleared');
  }

  /**
   * Validate secret strength and security
   */
  validateSecretSecurity(secrets: Record<string, string>): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const [key, value] of Object.entries(secrets)) {
      // Check for common weak patterns
      if (value.toLowerCase().includes('password') || 
          value.toLowerCase().includes('123') ||
          value.toLowerCase().includes('dev') ||
          value.toLowerCase().includes('test')) {
        warnings.push(`Secret '${key}' appears to contain weak or development values`);
      }

      // Check minimum length requirements
      const config = this.getSecretConfigurations()[key];
      if (config?.validation && !config.validation(value)) {
        errors.push(`Secret '${key}' does not meet validation requirements: ${config.description}`);
      }

      // Check for base64 encoding (common for strong secrets)
      if (key.includes('SECRET') || key.includes('KEY')) {
        if (value.length < 32) {
          warnings.push(`Secret '${key}' is shorter than recommended (32+ characters)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Generate a secure random secret
   */
  generateSecret(length: number = 32): string {
    try {
      return randomBytes(length).toString('base64');
    } catch (error) {
      logger.error('Failed to generate secret', error as Error);
      throw new ConfigurationError('Failed to generate secret', { length });
    }
  }

  /**
   * Create environment variable override system
   */
  createEnvironmentOverrides(baseConfig: EnvironmentConfig, overrides: Record<string, string>): EnvironmentConfig {
    logger.debug(`Applying environment variable overrides`);
    
    const config = JSON.parse(JSON.stringify(baseConfig)); // Deep clone
    
    // Define mapping of environment variables to config paths
    const envMappings: Record<string, string> = {
      'OVERRIDE_DB_HOST': 'database.host',
      'OVERRIDE_DB_PORT': 'database.port',
      'OVERRIDE_FRONTEND_PORT': 'frontend.port',
      'OVERRIDE_BACKEND_PORT': 'backend.port',
      'OVERRIDE_LOG_LEVEL': 'application.logLevel',
      'OVERRIDE_DOMAIN_NAME': 'application.domainName',
      'OVERRIDE_DOCKER_TAG': 'docker.tag',
      'OVERRIDE_DOCKER_REGISTRY': 'docker.registry'
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const overrideValue = overrides[envVar] || process.env[envVar];
      if (overrideValue) {
        this.setNestedProperty(config, configPath, this.parseValue(overrideValue));
        logger.debug(`Applied override: ${configPath} = ${overrideValue}`);
      }
    }

    return config;
  }

  /**
   * Set nested property in object using dot notation
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!key) continue;
      
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  /**
   * Parse string value to appropriate type
   */
  private parseValue(value: string): any {
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    
    // Try to parse as float
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
    
    // Return as string
    return value;
  }
}

// CLI functionality for secret management
async function main() {
  try {
    const command = process.argv[2];
    const environment = process.argv[3] || 'development';
    
    const secretManager = SecretManager.getInstance();
    
    switch (command) {
      case 'load':
        logger.info(`Loading secrets for environment: ${environment}`);
        const secrets = await secretManager.loadSecrets(environment, true);
        console.log(`\nLoaded ${Object.keys(secrets).length} secrets:`);
        console.log(Object.keys(secrets).join(', '));
        break;
        
      case 'validate':
        logger.info(`Validating secrets for environment: ${environment}`);
        const loadedSecrets = await secretManager.loadSecrets(environment, true);
        const validation = secretManager.validateSecretSecurity(loadedSecrets);
        
        console.log(`\nValidation Result: ${validation.valid ? 'PASSED' : 'FAILED'}`);
        if (validation.errors.length > 0) {
          console.log('\nErrors:');
          validation.errors.forEach(error => console.log(`  - ${error}`));
        }
        if (validation.warnings.length > 0) {
          console.log('\nWarnings:');
          validation.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        break;
        
      case 'generate':
        console.log('Generating secret...');
        const length = parseInt(process.argv[4] || '32', 10);
        console.log(`Length: ${length}`);
        const newSecret = secretManager.generateSecret(length);
        console.log(`\nGenerated secret (${length} bytes, base64 encoded):`);
        console.log(newSecret);
        break;
        
      default:
        console.log('Usage:');
        console.log('  tsx secrets.ts load [environment]     - Load secrets for environment');
        console.log('  tsx secrets.ts validate [environment] - Validate secrets');
        console.log('  tsx secrets.ts generate [length]      - Generate new secret');
        break;
    }
    
  } catch (error) {
    logger.error('Secret management failed', error as Error);
    process.exit(1);
  }
}

// Check if this file is being run directly
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule) {
  main();
}
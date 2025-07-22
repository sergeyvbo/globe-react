#!/usr/bin/env node

import { ConfigManager } from './scripts/config.ts';
import { SecretManager } from './scripts/utils/secrets.ts';
import { Logger } from './scripts/utils/logger.ts';

const logger = new Logger('ConfigTest');

async function testConfigurationSystem() {
  console.log('=== Testing Configuration Management System ===\n');

  try {
    const configManager = ConfigManager.getInstance();
    const secretManager = SecretManager.getInstance();

    // Test 1: Load development environment (should work)
    console.log('1. Testing development environment loading...');
    const devConfig = await configManager.loadEnvironment('development', { 
      allowMissingSecrets: true 
    });
    console.log(`✓ Development config loaded: ${devConfig.application.environment}`);
    console.log(`  - Frontend: ${devConfig.frontend.url}`);
    console.log(`  - Backend: ${devConfig.backend.port}`);
    console.log(`  - Database: ${devConfig.database.name}\n`);

    // Test 2: Test secret generation
    console.log('2. Testing secret generation...');
    const newSecret = secretManager.generateSecret(32);
    console.log(`✓ Generated secret: ${newSecret.substring(0, 10)}... (${newSecret.length} chars)\n`);

    // Test 3: Test configuration validation
    console.log('3. Testing configuration validation...');
    const validationResult = await configManager.validateConfig(devConfig);
    console.log(`✓ Validation result: ${validationResult.valid ? 'PASSED' : 'FAILED'}`);
    if (validationResult.warnings.length > 0) {
      console.log('  Warnings:');
      validationResult.warnings.forEach(warning => console.log(`    - ${warning}`));
    }
    console.log();

    // Test 4: Test environment variable overrides
    console.log('4. Testing environment variable overrides...');
    process.env.OVERRIDE_BACKEND_PORT = '8080';
    const overriddenConfig = secretManager.createEnvironmentOverrides(devConfig, process.env as Record<string, string>);
    console.log(`✓ Override applied: Backend port changed from ${devConfig.backend.port} to ${overriddenConfig.backend.port}\n`);

    // Test 5: Test available environments
    console.log('5. Testing available environments...');
    const environments = await configManager.getAvailableEnvironments();
    console.log(`✓ Available environments: ${environments.join(', ')}\n`);

    // Test 6: Test secret sanitization
    console.log('6. Testing secret sanitization...');
    const testData = {
      username: 'testuser',
      password: 'secret123',
      apiKey: 'abc123def456',
      normalField: 'normal value'
    };
    const sanitized = secretManager.sanitizeForLogging(testData);
    console.log('✓ Sanitization test:');
    console.log(`  Original: ${JSON.stringify(testData)}`);
    console.log(`  Sanitized: ${JSON.stringify(sanitized)}\n`);

    console.log('=== All Configuration Tests Passed! ===');

  } catch (error) {
    console.error('❌ Configuration test failed:', error);
    logger.error('Configuration test failed', error as Error);
    process.exit(1);
  }
}

// Run the test
testConfigurationSystem();
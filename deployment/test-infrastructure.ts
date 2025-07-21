#!/usr/bin/env node

import { Logger } from './scripts/utils/logger.js';
import { DockerManager } from './scripts/utils/docker.js';
import { DeploymentConfigSchema } from './scripts/utils/types.js';

const logger = new Logger('InfrastructureTest');

async function testInfrastructure() {
  try {
    logger.info('Testing TypeScript deployment infrastructure');
    
    // Test logger
    logger.info('Logger is working correctly');
    logger.warn('Warning test');
    logger.debug('Debug test');
    
    // Test Docker manager
    const dockerManager = new DockerManager();
    const dockerAvailable = await dockerManager.checkDockerAvailability();
    logger.info(`Docker availability: ${dockerAvailable}`);
    
    // Test configuration schema
    const testConfig = {
      environment: 'development',
      services: [],
      database: {
        host: 'localhost',
        port: 5432,
        name: 'geoquiz',
        username: 'test',
        password: 'test'
      },
      build: {
        frontend: {
          outputDir: 'dist',
          publicPath: '/',
          optimization: true,
          sourceMaps: false
        },
        backend: {
          configuration: 'Release',
          outputDir: 'publish',
          selfContained: true
        },
        docker: {
          buildArgs: {},
          labels: {}
        }
      },
      healthChecks: []
    };
    
    const validationResult = DeploymentConfigSchema.safeParse(testConfig);
    logger.info(`Configuration validation: ${validationResult.success ? 'PASSED' : 'FAILED'}`);
    
    if (!validationResult.success) {
      logger.error('Configuration validation errors', new Error(JSON.stringify(validationResult.error.errors)));
    }
    
    logger.info('Infrastructure test completed successfully');
    
  } catch (error) {
    logger.error('Infrastructure test failed', error as Error);
    process.exit(1);
  }
}

testInfrastructure();
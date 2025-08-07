#!/usr/bin/env node

/**
 * Script to set up SonarQube Quality Profile for TypeScript/React
 * This script configures rules for code quality, complexity, and React best practices
 */

const fs = require('fs');
const path = require('path');

// SonarQube configuration
const SONAR_HOST = process.env.SONAR_HOST_URL || 'http://localhost:9000';
const SONAR_TOKEN = process.env.SONAR_TOKEN;
const SONAR_LOGIN = process.env.SONAR_LOGIN || 'admin';
const SONAR_PASSWORD = process.env.SONAR_PASSWORD || 'admin';

// Quality Profile configuration
const PROFILE_NAME = 'GeoQuiz TypeScript React';
const LANGUAGE = 'ts';

/**
 * Make HTTP request to SonarQube API
 */
async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${SONAR_HOST}/api/${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // Use token if available, otherwise use basic auth
  if (SONAR_TOKEN) {
    headers['Authorization'] = `Bearer ${SONAR_TOKEN}`;
  } else {
    const auth = Buffer.from(`${SONAR_LOGIN}:${SONAR_PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = body;
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error making request to ${url}:`, error.message);
    throw error;
  }
}

/**
 * Create quality profile
 */
async function createQualityProfile() {
  console.log(`Creating quality profile: ${PROFILE_NAME}`);
  
  try {
    const params = new URLSearchParams({
      name: PROFILE_NAME,
      language: LANGUAGE
    });

    await makeRequest('qualityprofiles/create', 'POST', params);
    console.log('✓ Quality profile created successfully');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✓ Quality profile already exists');
    } else {
      throw error;
    }
  }
}

/**
 * Activate a rule in the quality profile
 */
async function activateRule(ruleKey, severity = 'MAJOR', params = {}) {
  try {
    const requestParams = new URLSearchParams({
      key: `${PROFILE_NAME}`,
      rule: ruleKey,
      severity: severity
    });

    // Add rule parameters if provided
    Object.entries(params).forEach(([key, value]) => {
      requestParams.append(`params[${key}]`, value);
    });

    await makeRequest('qualityprofiles/activate_rule', 'POST', requestParams);
    console.log(`✓ Activated rule: ${ruleKey} (${severity})`);
  } catch (error) {
    console.warn(`⚠ Could not activate rule ${ruleKey}: ${error.message}`);
  }
}

/**
 * Set quality profile as default
 */
async function setAsDefault() {
  try {
    const params = new URLSearchParams({
      qualityProfile: PROFILE_NAME,
      language: LANGUAGE
    });

    await makeRequest('qualityprofiles/set_default', 'POST', params);
    console.log('✓ Set as default quality profile');
  } catch (error) {
    console.warn(`⚠ Could not set as default: ${error.message}`);
  }
}

/**
 * Configure TypeScript/React specific rules
 */
async function configureRules() {
  console.log('Configuring TypeScript/React rules...');

  // Core TypeScript rules for unused imports and variables
  const coreRules = [
    { key: 'typescript:S1481', severity: 'MAJOR' }, // Unused local variables
    { key: 'typescript:S1128', severity: 'MAJOR' }, // Unused imports
    { key: 'typescript:S1172', severity: 'MAJOR' }, // Unused function parameters
    { key: 'typescript:S1854', severity: 'MAJOR' }, // Unused assignments
  ];

  // Complexity rules
  const complexityRules = [
    { key: 'typescript:S3776', severity: 'CRITICAL', params: { threshold: '15' } }, // Cognitive complexity
    { key: 'typescript:S1541', severity: 'MAJOR', params: { threshold: '10' } },    // Cyclomatic complexity
    { key: 'typescript:S138', severity: 'MAJOR', params: { max: '100' } },          // Function lines
    { key: 'typescript:S104', severity: 'MAJOR', params: { max: '500' } },          // File lines
    { key: 'typescript:S107', severity: 'MAJOR', params: { max: '7' } },            // Function parameters
    { key: 'typescript:S1067', severity: 'CRITICAL', params: { max: '3' } },        // Expression complexity
  ];

  // Code quality rules
  const qualityRules = [
    { key: 'typescript:S1186', severity: 'CRITICAL' }, // Empty methods
    { key: 'typescript:S125', severity: 'MAJOR' },     // Commented code
    { key: 'typescript:S1134', severity: 'MAJOR' },    // FIXME tags
    { key: 'typescript:S1135', severity: 'INFO' },     // TODO tags
    { key: 'typescript:S3358', severity: 'MAJOR' },    // Nested ternary
    { key: 'typescript:S3923', severity: 'CRITICAL' }, // Identical branches
  ];

  // Security rules
  const securityRules = [
    { key: 'typescript:S2068', severity: 'BLOCKER' },  // Hard-coded credentials
    { key: 'typescript:S4502', severity: 'CRITICAL' }, // postMessage validation
    { key: 'typescript:S5122', severity: 'CRITICAL' }, // CORS policy
  ];

  // React-specific rules (these may need to be adjusted based on available rules)
  const reactRules = [
    { key: 'typescript:S6478', severity: 'MAJOR' },    // React TypeScript usage
    { key: 'typescript:S6479', severity: 'MAJOR' },    // React hooks rules
    { key: 'typescript:S6481', severity: 'MAJOR' },    // React key prop
    { key: 'typescript:S6486', severity: 'MAJOR' },    // React state immutability
    { key: 'typescript:S6477', severity: 'MINOR' },    // React component naming
    { key: 'typescript:S6480', severity: 'MAJOR' },    // useEffect dependencies
  ];

  const allRules = [...coreRules, ...complexityRules, ...qualityRules, ...securityRules, ...reactRules];

  for (const rule of allRules) {
    await activateRule(rule.key, rule.severity, rule.params || {});
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('Setting up SonarQube Quality Profile for TypeScript/React...');
  console.log(`SonarQube Host: ${SONAR_HOST}`);
  console.log(`Profile Name: ${PROFILE_NAME}`);
  console.log('');

  try {
    // Check if SonarQube is accessible
    console.log('Checking SonarQube connectivity...');
    await makeRequest('system/status');
    console.log('✓ SonarQube is accessible');
    console.log('');

    // Create quality profile
    await createQualityProfile();
    console.log('');

    // Configure rules
    await configureRules();
    console.log('');

    // Set as default
    await setAsDefault();
    console.log('');

    console.log('🎉 Quality profile setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Visit SonarQube web interface at ' + SONAR_HOST);
    console.log('2. Go to Quality Profiles > TypeScript');
    console.log(`3. Verify that "${PROFILE_NAME}" profile is active`);
    console.log('4. Run code analysis: npm run analyze-frontend');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure SonarQube is running: npm run sonar:start');
    console.log('2. Check SonarQube is accessible at ' + SONAR_HOST);
    console.log('3. Verify credentials (SONAR_TOKEN or SONAR_LOGIN/SONAR_PASSWORD)');
    process.exit(1);
  }
}

// Add fetch polyfill for Node.js versions that don't have it
if (typeof fetch === 'undefined') {
  try {
    const { default: fetch } = require('node-fetch');
    global.fetch = fetch;
    main();
  } catch (error) {
    console.log('Fetch not available, using alternative HTTP client...');
    // Use Node.js built-in https module as fallback
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    global.fetch = async function(url, options = {}) {
      return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const req = client.request({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: options.method || 'GET',
          headers: options.headers || {}
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage,
              headers: {
                get: (name) => res.headers[name.toLowerCase()]
              },
              text: () => Promise.resolve(data),
              json: () => Promise.resolve(JSON.parse(data))
            });
          });
        });
        
        req.on('error', reject);
        
        if (options.body) {
          req.write(options.body);
        }
        
        req.end();
      });
    };
    
    main();
  }
} else {
  main();
}
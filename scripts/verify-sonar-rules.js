#!/usr/bin/env node

/**
 * Script to verify SonarQube TypeScript rules and configuration
 * This script checks available rules and validates the setup
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// SonarQube configuration
const SONAR_HOST = process.env.SONAR_HOST_URL || 'http://localhost:9000';
const SONAR_TOKEN = process.env.SONAR_TOKEN;

/**
 * Make HTTP request using Node.js built-in modules
 */
function makeRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SONAR_HOST}/api/${endpoint}`);
    const client = url.protocol === 'https:' ? https : http;
    
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (SONAR_TOKEN) {
      headers['Authorization'] = `Bearer ${SONAR_TOKEN}`;
    } else {
      const auth = Buffer.from('admin:admin').toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

/**
 * Check available TypeScript rules
 */
async function checkTypeScriptRules() {
  console.log('Checking available TypeScript rules...');
  
  try {
    const response = await makeRequest('rules/search?languages=ts&ps=500');
    const rules = response.rules || [];
    
    console.log(`✓ Found ${rules.length} TypeScript rules`);
    
    // Key rules we want to verify
    const keyRules = [
      'typescript:S1481', // Unused variables
      'typescript:S1128', // Unused imports
      'typescript:S3776', // Cognitive complexity
      'typescript:S1541', // Cyclomatic complexity
      'typescript:S2068', // Hard-coded credentials
    ];

    console.log('\nKey rules status:');
    keyRules.forEach(ruleKey => {
      const rule = rules.find(r => r.key === ruleKey);
      if (rule) {
        console.log(`✓ ${ruleKey}: ${rule.name}`);
      } else {
        console.log(`⚠ ${ruleKey}: Not found`);
      }
    });

    return rules;
  } catch (error) {
    console.error('Error checking rules:', error.message);
    return [];
  }
}

/**
 * Check current quality profiles
 */
async function checkQualityProfiles() {
  console.log('\nChecking quality profiles...');
  
  try {
    const response = await makeRequest('qualityprofiles/search');
    const profiles = response.profiles || [];
    
    const tsProfiles = profiles.filter(p => p.language === 'ts');
    console.log(`✓ Found ${tsProfiles.length} TypeScript quality profiles`);
    
    tsProfiles.forEach(profile => {
      const defaultMark = profile.isDefault ? ' (default)' : '';
      console.log(`  - ${profile.name}${defaultMark} (${profile.activeRuleCount} rules)`);
    });

    return tsProfiles;
  } catch (error) {
    console.error('Error checking quality profiles:', error.message);
    return [];
  }
}

/**
 * Test project analysis configuration
 */
async function testProjectConfig() {
  console.log('\nTesting project configuration...');
  
  // Check if frontend project exists
  try {
    const response = await makeRequest('projects/search');
    const projects = response.components || [];
    
    console.log(`Found ${projects.length} projects in SonarQube:`);
    projects.forEach(project => {
      console.log(`  - ${project.key}: ${project.name}`);
    });
    
    const frontendProject = projects.find(p => p.key === 'geoquiz-frontend');
    if (frontendProject) {
      console.log('✓ Frontend project found in SonarQube');
      
      // Get project quality profile
      try {
        const profileResponse = await makeRequest(`qualityprofiles/search?project=geoquiz-frontend`);
        const profiles = profileResponse.profiles || [];
        const tsProfile = profiles.find(p => p.language === 'ts');
        
        if (tsProfile) {
          console.log(`✓ Using quality profile: ${tsProfile.name} (${tsProfile.activeRuleCount} rules)`);
        }
      } catch (profileError) {
        console.log('⚠ Could not get project quality profile');
      }
    } else {
      console.log('ℹ Frontend project not found');
    }
  } catch (error) {
    console.log('ℹ Could not check projects:', error.message);
  }
}

/**
 * Provide setup recommendations
 */
function provideRecommendations() {
  console.log('\n📋 Setup Recommendations:');
  console.log('');
  console.log('1. Use the default "Sonar way" TypeScript profile which includes:');
  console.log('   - Unused import detection');
  console.log('   - Unused variable detection');
  console.log('   - Complexity analysis');
  console.log('   - Security vulnerability detection');
  console.log('');
  console.log('2. Run frontend analysis to create the project:');
  console.log('   npm run analyze-frontend');
  console.log('');
  console.log('3. After first analysis, you can customize rules in SonarQube web UI:');
  console.log('   - Go to http://localhost:9000');
  console.log('   - Navigate to Quality Profiles > TypeScript');
  console.log('   - Clone "Sonar way" profile and customize rules');
  console.log('   - Assign custom profile to your project');
  console.log('');
  console.log('4. Key configuration in sonar-project-frontend.properties:');
  console.log('   - sonar.typescript.detectUnusedImports=true');
  console.log('   - sonar.typescript.detectUnusedVariables=true');
  console.log('   - sonar.typescript.detectReactHooks=true');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 SonarQube TypeScript/React Configuration Verification');
  console.log(`SonarQube Host: ${SONAR_HOST}`);
  console.log(`Using Token: ${SONAR_TOKEN ? 'Yes' : 'No (using admin:admin)'}`);
  console.log('');

  try {
    // Check connectivity
    console.log('Checking SonarQube connectivity...');
    await makeRequest('system/status');
    console.log('✓ SonarQube is accessible');
    console.log('');

    // Check available rules
    await checkTypeScriptRules();

    // Check quality profiles
    await checkQualityProfiles();

    // Test project configuration
    await testProjectConfig();

    // Provide recommendations
    provideRecommendations();

    console.log('✅ Verification completed successfully!');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Make sure SonarQube is running: npm run sonar:start');
    console.log('2. Check SonarQube is accessible at ' + SONAR_HOST);
    console.log('3. Verify token has correct permissions');
    process.exit(1);
  }
}

main();
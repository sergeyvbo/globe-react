#!/usr/bin/env node

/**
 * Script to set up C# Quality Profile in SonarQube
 * This script creates a custom quality profile for C#/.NET projects
 * with rules for best practices, security vulnerabilities, and code duplication
 */

const fs = require('fs');
const path = require('path');

// SonarQube configuration
const SONAR_URL = process.env.SONAR_URL || 'http://localhost:9000';
const SONAR_TOKEN = process.env.SONAR_TOKEN || 'admin'; // Default admin token
const SONAR_PASSWORD = process.env.SONAR_PASSWORD || 'admin'; // Default admin password

// Quality profile configuration
const PROFILE_NAME = 'GeoQuiz C# Quality Profile';
const LANGUAGE = 'cs';
const PROFILE_FILE = path.join(__dirname, '..', 'sonar-quality-profile-csharp.json');

/**
 * Make HTTP request to SonarQube API
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${SONAR_URL}/api/${endpoint}`;
  const auth = Buffer.from(`${SONAR_TOKEN}:${SONAR_PASSWORD}`).toString('base64');
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  };

  const requestOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, requestOptions);
    
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
    console.error(`Request failed for ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * Check if SonarQube server is accessible
 */
async function checkSonarQubeHealth() {
  console.log('🔍 Checking SonarQube server health...');
  
  try {
    const health = await makeRequest('system/health');
    console.log('✅ SonarQube server is healthy');
    return true;
  } catch (error) {
    console.error('❌ SonarQube server is not accessible:', error.message);
    console.log('💡 Make sure SonarQube is running: npm run sonar:start');
    return false;
  }
}/**
 * 
Check if quality profile already exists
 */
async function checkExistingProfile() {
  console.log(`🔍 Checking if profile "${PROFILE_NAME}" already exists...`);
  
  try {
    const profiles = await makeRequest(`qualityprofiles/search?language=${LANGUAGE}`);
    const existingProfile = profiles.profiles.find(p => p.name === PROFILE_NAME);
    
    if (existingProfile) {
      console.log(`✅ Profile "${PROFILE_NAME}" already exists`);
      return existingProfile;
    }
    
    console.log(`ℹ️  Profile "${PROFILE_NAME}" does not exist, will create new one`);
    return null;
  } catch (error) {
    console.error('❌ Failed to check existing profiles:', error.message);
    throw error;
  }
}

/**
 * Create new quality profile
 */
async function createQualityProfile() {
  console.log(`🔧 Creating quality profile "${PROFILE_NAME}"...`);
  
  try {
    const formData = new URLSearchParams();
    formData.append('name', PROFILE_NAME);
    formData.append('language', LANGUAGE);
    
    const result = await makeRequest('qualityprofiles/create', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${SONAR_TOKEN}:${SONAR_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    console.log('✅ Quality profile created successfully');
    return result;
  } catch (error) {
    console.error('❌ Failed to create quality profile:', error.message);
    throw error;
  }
}

/**
 * Activate rule in quality profile
 */
async function activateRule(profileKey, ruleKey, severity, parameters = {}) {
  try {
    const formData = new URLSearchParams();
    formData.append('key', profileKey);
    formData.append('rule', ruleKey);
    formData.append('severity', severity);
    
    // Add parameters if provided
    Object.entries(parameters).forEach(([key, value]) => {
      formData.append(`params[${key}]`, value);
    });
    
    await makeRequest('qualityprofiles/activate_rule', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${SONAR_TOKEN}:${SONAR_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    return true;
  } catch (error) {
    console.warn(`⚠️  Failed to activate rule ${ruleKey}:`, error.message);
    return false;
  }
}/**

 * Configure quality profile with rules
 */
async function configureQualityProfile(profileKey) {
  console.log('🔧 Configuring quality profile with rules...');
  
  // Load quality profile configuration
  if (!fs.existsSync(PROFILE_FILE)) {
    throw new Error(`Quality profile file not found: ${PROFILE_FILE}`);
  }
  
  const profileConfig = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));
  const rules = profileConfig.rules;
  
  console.log(`📋 Found ${rules.length} rules to configure`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const rule of rules) {
    const ruleKey = `${rule.repositoryKey}:${rule.key}`;
    const success = await activateRule(
      profileKey,
      ruleKey,
      rule.severity,
      rule.parameters || {}
    );
    
    if (success) {
      successCount++;
      process.stdout.write('.');
    } else {
      failureCount++;
      process.stdout.write('x');
    }
  }
  
  console.log(`\n✅ Rules configuration completed: ${successCount} success, ${failureCount} failures`);
  
  if (failureCount > 0) {
    console.log('⚠️  Some rules failed to activate. This might be due to:');
    console.log('   - Rules not available in your SonarQube version');
    console.log('   - Plugin not installed');
    console.log('   - Rule key changes in newer versions');
  }
}

/**
 * Set quality profile as default for the language
 */
async function setAsDefault(profileKey) {
  console.log(`🔧 Setting "${PROFILE_NAME}" as default profile for ${LANGUAGE}...`);
  
  try {
    const formData = new URLSearchParams();
    formData.append('key', profileKey);
    
    await makeRequest('qualityprofiles/set_default', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${SONAR_TOKEN}:${SONAR_PASSWORD}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    
    console.log('✅ Quality profile set as default');
  } catch (error) {
    console.warn('⚠️  Failed to set as default profile:', error.message);
  }
}/**
 *
 Display profile summary
 */
async function displayProfileSummary(profileKey) {
  console.log('\n📊 Quality Profile Summary:');
  
  try {
    const profile = await makeRequest(`qualityprofiles/show?key=${profileKey}`);
    
    console.log(`   Name: ${profile.profile.name}`);
    console.log(`   Language: ${profile.profile.language}`);
    console.log(`   Active Rules: ${profile.profile.activeRuleCount}`);
    console.log(`   Default: ${profile.profile.isDefault ? 'Yes' : 'No'}`);
    
    // Display rule breakdown by severity
    const rules = await makeRequest(`rules/search?qprofile=${profileKey}&ps=500`);
    const severityCount = {};
    
    rules.rules.forEach(rule => {
      const severity = rule.severity;
      severityCount[severity] = (severityCount[severity] || 0) + 1;
    });
    
    console.log('\n   Rules by Severity:');
    Object.entries(severityCount).forEach(([severity, count]) => {
      console.log(`     ${severity}: ${count}`);
    });
    
  } catch (error) {
    console.warn('⚠️  Could not fetch profile summary:', error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Setting up C# Quality Profile for SonarQube\n');
  
  try {
    // Check SonarQube health
    const isHealthy = await checkSonarQubeHealth();
    if (!isHealthy) {
      process.exit(1);
    }
    
    // Check if profile already exists
    let existingProfile = await checkExistingProfile();
    let profileKey;
    
    if (existingProfile) {
      profileKey = existingProfile.key;
      console.log(`ℹ️  Using existing profile with key: ${profileKey}`);
    } else {
      // Create new profile
      const newProfile = await createQualityProfile();
      profileKey = newProfile.profile.key;
      console.log(`✅ Created new profile with key: ${profileKey}`);
    }
    
    // Configure rules
    await configureQualityProfile(profileKey);
    
    // Set as default
    await setAsDefault(profileKey);
    
    // Display summary
    await displayProfileSummary(profileKey);
    
    console.log('\n🎉 C# Quality Profile setup completed successfully!');
    console.log(`\n💡 You can now run: npm run analyze-backend`);
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
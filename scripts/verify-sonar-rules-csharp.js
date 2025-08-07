#!/usr/bin/env node

/**
 * Script to verify C# SonarQube rules configuration
 * This script checks if the C# quality profile is properly configured
 * and validates that key rules are active
 */

const fs = require('fs');
const path = require('path');

// SonarQube configuration
const SONAR_URL = process.env.SONAR_URL || 'http://localhost:9000';
const SONAR_TOKEN = process.env.SONAR_TOKEN || 'admin';
const SONAR_PASSWORD = process.env.SONAR_PASSWORD || 'admin';

const PROFILE_NAME = 'GeoQuiz C# Quality Profile';
const LANGUAGE = 'cs';

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
 * Check SonarQube server health
 */
async function checkSonarQubeHealth() {
  console.log('🔍 Checking SonarQube server health...');
  
  try {
    await makeRequest('system/health');
    console.log('✅ SonarQube server is healthy');
    return true;
  } catch (error) {
    console.error('❌ SonarQube server is not accessible:', error.message);
    console.log('💡 Make sure SonarQube is running: npm run sonar:start');
    return false;
  }
}

/**
 * Find C# quality profile
 */
async function findQualityProfile() {
  console.log(`🔍 Looking for C# quality profile "${PROFILE_NAME}"...`);
  
  try {
    const profiles = await makeRequest(`qualityprofiles/search?language=${LANGUAGE}`);
    const profile = profiles.profiles.find(p => p.name === PROFILE_NAME);
    
    if (!profile) {
      console.log(`❌ Profile "${PROFILE_NAME}" not found`);
      console.log('💡 Run: npm run sonar:setup-profile-csharp');
      return null;
    }
    
    console.log(`✅ Found profile: ${profile.name} (${profile.activeRuleCount} active rules)`);
    return profile;
  } catch (error) {
    console.error('❌ Failed to find quality profile:', error.message);
    throw error;
  }
}

/**
 * Verify critical security rules
 */
async function verifyCriticalRules(profileKey) {
  console.log('🔍 Verifying critical security rules...');
  
  const criticalRules = [
    { key: 'csharpsquid:S2068', name: 'Hard-coded credentials', severity: 'BLOCKER' },
    { key: 'csharpsquid:S2077', name: 'SQL injection', severity: 'BLOCKER' },
    { key: 'csharpsquid:S2053', name: 'Password hashing', severity: 'BLOCKER' },
    { key: 'csharpsquid:S5042', name: 'Archive expansion', severity: 'BLOCKER' },
    { key: 'csharpsquid:S2259', name: 'Null pointer dereference', severity: 'BLOCKER' },
    { key: 'csharpsquid:S5659', name: 'JWT security', severity: 'CRITICAL' },
    { key: 'csharpsquid:S2070', name: 'SHA-1 usage', severity: 'CRITICAL' },
    { key: 'csharpsquid:S4426', name: 'Cryptographic keys', severity: 'CRITICAL' },
  ];
  
  try {
    const rules = await makeRequest(`rules/search?qprofile=${profileKey}&ps=500`);
    const activeRules = new Map(rules.rules.map(r => [r.key, r]));
    
    let verifiedCount = 0;
    let missingCount = 0;
    
    console.log('\n📋 Critical Rules Status:');
    
    for (const rule of criticalRules) {
      const activeRule = activeRules.get(rule.key);
      
      if (activeRule) {
        const severityMatch = activeRule.severity === rule.severity;
        const status = severityMatch ? '✅' : '⚠️';
        const severityInfo = severityMatch ? '' : ` (expected ${rule.severity}, got ${activeRule.severity})`;
        
        console.log(`   ${status} ${rule.name}${severityInfo}`);
        verifiedCount++;
      } else {
        console.log(`   ❌ ${rule.name} - NOT ACTIVE`);
        missingCount++;
      }
    }
    
    console.log(`\n📊 Critical Rules Summary: ${verifiedCount} verified, ${missingCount} missing`);
    
    return missingCount === 0;
  } catch (error) {
    console.error('❌ Failed to verify critical rules:', error.message);
    return false;
  }
}

/**
 * Verify code quality rules
 */
async function verifyQualityRules(profileKey) {
  console.log('🔍 Verifying code quality rules...');
  
  const qualityRules = [
    { key: 'csharpsquid:S101', name: 'Class naming convention' },
    { key: 'csharpsquid:S1144', name: 'Unused private members' },
    { key: 'csharpsquid:S1854', name: 'Unused assignments' },
    { key: 'csharpsquid:S3776', name: 'Cognitive complexity' },
    { key: 'csharpsquid:S138', name: 'Function length' },
    { key: 'csharpsquid:S1541', name: 'Method complexity' },
  ];
  
  try {
    const rules = await makeRequest(`rules/search?qprofile=${profileKey}&ps=500`);
    const activeRules = new Map(rules.rules.map(r => [r.key, r]));
    
    let verifiedCount = 0;
    
    console.log('\n📋 Quality Rules Status:');
    
    for (const rule of qualityRules) {
      const activeRule = activeRules.get(rule.key);
      
      if (activeRule) {
        console.log(`   ✅ ${rule.name} (${activeRule.severity})`);
        verifiedCount++;
      } else {
        console.log(`   ❌ ${rule.name} - NOT ACTIVE`);
      }
    }
    
    console.log(`\n📊 Quality Rules Summary: ${verifiedCount}/${qualityRules.length} verified`);
    
    return verifiedCount >= qualityRules.length * 0.8; // 80% threshold
  } catch (error) {
    console.error('❌ Failed to verify quality rules:', error.message);
    return false;
  }
}

/**
 * Display profile statistics
 */
async function displayProfileStats(profileKey) {
  console.log('\n📊 Quality Profile Statistics:');
  
  try {
    const rules = await makeRequest(`rules/search?qprofile=${profileKey}&ps=500`);
    
    // Count by severity
    const severityCount = {};
    rules.rules.forEach(rule => {
      const severity = rule.severity;
      severityCount[severity] = (severityCount[severity] || 0) + 1;
    });
    
    console.log(`   Total Active Rules: ${rules.rules.length}`);
    console.log('   Rules by Severity:');
    
    const severityOrder = ['BLOCKER', 'CRITICAL', 'MAJOR', 'MINOR', 'INFO'];
    severityOrder.forEach(severity => {
      if (severityCount[severity]) {
        console.log(`     ${severity}: ${severityCount[severity]}`);
      }
    });
    
    // Count by type
    const typeCount = {};
    rules.rules.forEach(rule => {
      const type = rule.type;
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    console.log('   Rules by Type:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    
  } catch (error) {
    console.warn('⚠️  Could not fetch profile statistics:', error.message);
  }
}

/**
 * Main verification function
 */
async function main() {
  console.log('🚀 Verifying C# Quality Profile Configuration\n');
  
  try {
    // Check SonarQube health
    const isHealthy = await checkSonarQubeHealth();
    if (!isHealthy) {
      process.exit(1);
    }
    
    // Find quality profile
    const profile = await findQualityProfile();
    if (!profile) {
      process.exit(1);
    }
    
    // Verify critical rules
    const criticalRulesOk = await verifyCriticalRules(profile.key);
    
    // Verify quality rules
    const qualityRulesOk = await verifyQualityRules(profile.key);
    
    // Display statistics
    await displayProfileStats(profile.key);
    
    // Final assessment
    console.log('\n🎯 Verification Results:');
    console.log(`   Critical Security Rules: ${criticalRulesOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Code Quality Rules: ${qualityRulesOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Profile Default: ${profile.isDefault ? '✅ YES' : '⚠️  NO'}`);
    
    if (criticalRulesOk && qualityRulesOk) {
      console.log('\n🎉 C# Quality Profile verification completed successfully!');
      console.log('💡 You can now run: npm run analyze-backend');
    } else {
      console.log('\n⚠️  Some issues found with the quality profile configuration');
      console.log('💡 Try running: npm run sonar:setup-profile-csharp');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
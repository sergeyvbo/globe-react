# SonarQube C# Quality Profile Setup

This document describes the C# quality profile configuration for the GeoQuiz project, designed to enforce .NET best practices, detect security vulnerabilities, and identify code duplication.

## Overview

The C# quality profile includes rules for:
- **Code Quality**: Naming conventions, complexity, maintainability
- **Security**: Vulnerability detection, cryptographic issues, injection flaws
- **Reliability**: Bug detection, null pointer exceptions, dead code
- **Maintainability**: Code duplication, complexity metrics, documentation

## Quality Profile Rules

### Naming and Conventions
- **S101**: Class names should comply with naming convention (PascalCase)
- **S100**: Methods and properties should be named in PascalCase
- **S1118**: Utility classes should not have public constructors
- **S1075**: URIs should not be hardcoded

### Code Quality and Complexity
- **S138**: Functions should not have too many lines (max 60)
- **S1541**: Methods should not be too complex (max 10 complexity)
- **S1479**: "switch" statements should not have too many "case" clauses (max 30)
- **S3776**: Cognitive complexity should not be too high (max 15)
- **S1067**: Expressions should not be too complex (max 3 operators)

### Security Rules
- **S2068**: Credentials should not be hard-coded (BLOCKER)
- **S2070**: SHA-1 and Message-Digest hash algorithms should not be used (CRITICAL)
- **S2245**: Using pseudorandom number generators is security-sensitive (CRITICAL)
- **S2612**: Setting loose file permissions is security-sensitive (CRITICAL)
- **S4426**: Cryptographic keys should be robust (CRITICAL)
- **S5042**: Expanding archive files is security-sensitive (BLOCKER)
- **S5659**: JWT should be signed and verified (CRITICAL)
- **S2077**: Formatting SQL queries is security-sensitive (BLOCKER)
- **S2053**: Password hashing functions should use an unpredictable salt (BLOCKER)

### Reliability and Bug Detection
- **S2259**: Null pointers should not be dereferenced (BLOCKER)
- **S2583**: Conditionally executed code should be reachable (BLOCKER)
- **S1862**: Related "if/else if" statements should not have the same condition (CRITICAL)
- **S1871**: Two branches in a conditional structure should not have exactly the same implementation (MAJOR)
- **S2292**: Trivial properties should be auto-implemented (CRITICAL)

### Maintainability
- **S1144**: Unused private types or members should be removed (MAJOR)
- **S1481**: Unused local variables should be removed (MINOR)
- **S1854**: Unused assignments should be removed (MAJOR)
- **S125**: Sections of code should not be commented out (MAJOR)
- **S1128**: Unused "using" should be removed (MINOR)

## Setup Instructions

### Prerequisites
1. SonarQube server running (use `npm run sonar:start`)
2. Node.js installed for running setup scripts

### Automatic Setup
Run the automated setup script:
```bash
npm run sonar:setup-profile-csharp
```

This script will:
1. Check SonarQube server connectivity
2. Create the "GeoQuiz C# Quality Profile" if it doesn't exist
3. Configure all quality rules with appropriate severities
4. Set the profile as default for C# projects
5. Display a summary of configured rules

### Manual Setup (Alternative)
If you prefer manual setup:

1. Open SonarQube web interface: http://localhost:9000
2. Go to Quality Profiles → Create
3. Name: "GeoQuiz C# Quality Profile"
4. Language: C#
5. Import the rules from `sonar-quality-profile-csharp.json`

## Usage

### Running C# Code Analysis
```bash
# Analyze backend C# code
npm run analyze-backend

# Analyze all code (frontend + backend)
npm run analyze-all
```

### Viewing Results
1. Open SonarQube dashboard: http://localhost:9000
2. Navigate to the "geoquiz-backend" project
3. Review issues categorized by:
   - **Bugs**: Reliability issues that should be fixed
   - **Vulnerabilities**: Security issues requiring immediate attention
   - **Code Smells**: Maintainability issues for code improvement
   - **Duplications**: Code duplication metrics

## Rule Categories and Severities

### BLOCKER (Must Fix)
- Hard-coded credentials (S2068)
- Null pointer dereferences (S2259)
- Unreachable code (S2583)
- Archive expansion vulnerabilities (S5042)
- SQL injection vulnerabilities (S2077)
- Weak password hashing (S2053)

### CRITICAL (High Priority)
- Weak cryptographic algorithms (S2070, S2245, S4426)
- Security-sensitive operations (S2612, S5659)
- Logic errors (S1862, S2292)
- High cognitive complexity (S3776)
- Hard-coded secrets (S1313)

### MAJOR (Important)
- Naming convention violations (S101, S100)
- Code complexity issues (S138, S1541, S1479)
- Unused code (S1144, S1854)
- Code structure problems (S1118, S1075)

### MINOR (Nice to Have)
- Unused variables (S1481)
- Unused imports (S1128)
- Code style improvements (S1940)

## Integration with Development Workflow

### Pre-commit Analysis
Consider running analysis before commits:
```bash
# Quick backend analysis
npm run analyze-backend
```

### CI/CD Integration
The quality profile can be integrated into CI/CD pipelines to:
- Fail builds on BLOCKER/CRITICAL issues
- Generate quality reports
- Track quality trends over time

## Troubleshooting

### Common Issues

**Script fails with "SonarQube not accessible"**
- Ensure SonarQube is running: `npm run sonar:start`
- Wait for SonarQube to fully start (can take 1-2 minutes)
- Check Docker containers: `docker ps`

**Rules fail to activate**
- Some rules may not be available in your SonarQube version
- Check SonarQube logs for plugin issues
- Verify C# analyzer plugin is installed

**Analysis fails**
- Ensure .NET SDK is available in the analysis container
- Check project compilation: `dotnet build` in backend directory
- Verify SonarQube token configuration

### Getting Help
- Check SonarQube documentation: https://docs.sonarqube.org/
- Review rule descriptions in SonarQube web interface
- Check project logs for detailed error messages

## Customization

To modify the quality profile:
1. Edit `sonar-quality-profile-csharp.json`
2. Add/remove rules or change severities
3. Re-run setup script: `npm run sonar:setup-profile-csharp`

### Adding New Rules
```json
{
  "repositoryKey": "csharpsquid",
  "key": "S1234",
  "severity": "MAJOR",
  "parameters": {
    "paramName": "paramValue"
  }
}
```

### Rule Severity Levels
- **BLOCKER**: Must be fixed before release
- **CRITICAL**: Should be fixed as soon as possible
- **MAJOR**: Should be fixed
- **MINOR**: May be fixed
- **INFO**: For information only
# SonarQube TypeScript/React Quality Profile Configuration

This document describes the custom quality profile configuration for TypeScript/React code analysis in the GeoQuiz project.

## Overview

The project uses the default "Sonar way" TypeScript quality profile, which is configured to enforce:
- **Unused imports and variables detection**
- **React best practices**
- **Code complexity limits**
- **Security vulnerability detection**
- **TypeScript-specific code quality rules**

## Quality Profile Rules

### 1. Unused Code Detection

| Rule | Severity | Description |
|------|----------|-------------|
| `typescript:S1481` | MAJOR | Unused local variables should be removed |
| `typescript:S1128` | MAJOR | Unused imports should be removed |
| `typescript:S1172` | MAJOR | Unused function parameters should be removed |
| `typescript:S1854` | MAJOR | Unused assignments should be removed |

### 2. Code Complexity Rules

| Rule | Severity | Threshold | Description |
|------|----------|-----------|-------------|
| `typescript:S3776` | CRITICAL | 15 | Cognitive complexity of functions |
| `typescript:S1541` | MAJOR | 10 | Cyclomatic complexity of functions |
| `typescript:S138` | MAJOR | 100 | Maximum lines per function |
| `typescript:S104` | MAJOR | 500 | Maximum lines per file |
| `typescript:S107` | MAJOR | 7 | Maximum function parameters |
| `typescript:S1067` | CRITICAL | 3 | Maximum boolean expression complexity |

### 3. React Best Practices

| Rule | Severity | Description |
|------|----------|-------------|
| `typescript:S6478` | MAJOR | React components should use TypeScript |
| `typescript:S6479` | MAJOR | React hooks should follow the rules of hooks |
| `typescript:S6481` | MAJOR | React components should not use array index as key |
| `typescript:S6486` | MAJOR | React state should be immutable |
| `typescript:S6477` | MINOR | React components should be properly named |
| `typescript:S6480` | MAJOR | React useEffect should have dependency array |

### 4. Security Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `typescript:S2068` | BLOCKER | Credentials should not be hard-coded |
| `typescript:S4502` | CRITICAL | Cross-document messaging domains should be validated |
| `typescript:S5122` | CRITICAL | CORS policy should be restrictive |

### 5. Code Quality Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `typescript:S1186` | CRITICAL | Methods should not be empty |
| `typescript:S125` | MAJOR | Sections of code should not be commented out |
| `typescript:S1134` | MAJOR | Track uses of "FIXME" tags |
| `typescript:S1135` | INFO | Track uses of "TODO" tags |
| `typescript:S3358` | MAJOR | Ternary operators should not be nested |
| `typescript:S3923` | CRITICAL | All branches should not have same implementation |

## Setup Instructions

### 1. Start SonarQube Server

```bash
npm run sonar:start
```

Wait for SonarQube to be fully started (usually takes 1-2 minutes).

### 2. Verify Configuration

```bash
npm run sonar:verify-rules
```

This script will:
- Check available TypeScript rules in SonarQube
- Verify the default "Sonar way" quality profile is active
- Show key rules for unused imports, complexity, and security

### 3. Run Code Analysis

```bash
npm run analyze-frontend
```

## Configuration Files

### sonar-project-frontend.properties

The frontend configuration includes:
- Uses default "Sonar way" TypeScript quality profile (317 rules)
- TypeScript-specific settings for unused imports/variables detection
- React hooks detection enabled
- Security analysis enabled
- Complexity thresholds configured

### sonar-quality-profile-typescript.json

Contains the complete rule definitions with:
- Rule keys and severities
- Parameter configurations for complexity thresholds
- Categorized rule groups (core, complexity, quality, security, React)

## Usage Examples

### Detecting Unused Imports

Before:
```typescript
import React, { useState, useEffect } from 'react'; // useEffect is unused
import { Button } from '@mui/material'; // Button is unused

export const MyComponent = () => {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
};
```

SonarQube will flag:
- Unused import `useEffect`
- Unused import `Button`

### Complexity Violations

```typescript
// This function exceeds cognitive complexity threshold (15)
export const complexFunction = (data: any[]) => {
  if (data.length > 0) {                    // +1
    for (const item of data) {              // +1
      if (item.type === 'A') {              // +2 (nested)
        if (item.value > 10) {              // +3 (nested)
          if (item.active) {                // +4 (nested)
            // ... more nested conditions
          }
        }
      } else if (item.type === 'B') {       // +1
        // ... more logic
      }
    }
  }
};
```

### React Best Practices

```typescript
// Bad: Using array index as key
const items = data.map((item, index) => (
  <div key={index}>{item.name}</div>  // SonarQube will flag this
));

// Good: Using unique identifier as key
const items = data.map((item) => (
  <div key={item.id}>{item.name}</div>
));

// Bad: Missing dependency array
useEffect(() => {
  fetchData(userId);  // SonarQube will flag missing dependency
}, []);

// Good: Proper dependency array
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

## Troubleshooting

### Quality Profile Not Applied

1. Check if the profile was created successfully:
   - Visit SonarQube web interface at http://localhost:9000
   - Go to Quality Profiles → TypeScript
   - Verify "GeoQuiz TypeScript React" profile exists and is default

2. Re-run the setup script:
   ```bash
   npm run sonar:setup-profile
   ```

### Rules Not Detecting Issues

1. Ensure the frontend configuration references the correct profile:
   ```properties
   sonar.profile=GeoQuiz TypeScript React
   ```

2. Check TypeScript configuration:
   ```properties
   sonar.typescript.tsconfigPath=tsconfig.json
   sonar.typescript.detectUnusedImports=true
   sonar.typescript.detectUnusedVariables=true
   ```

### Script Execution Errors

1. Verify SonarQube is running:
   ```bash
   curl http://localhost:9000/api/system/status
   ```

2. Check authentication:
   - Default: admin/admin
   - Or set environment variables:
     ```bash
     export SONAR_TOKEN=your_token
     export SONAR_HOST_URL=http://localhost:9000
     ```

## Integration with Development Workflow

### Pre-commit Analysis

Add to your development workflow:

```bash
# Before committing changes
npm run analyze-frontend

# Check SonarQube dashboard for new issues
# Fix any CRITICAL or BLOCKER issues before committing
```

### CI/CD Integration

For automated quality gates, consider:
- Setting up quality gate conditions
- Failing builds on new CRITICAL/BLOCKER issues
- Tracking technical debt trends

## Customization

To modify the quality profile:

1. Edit `sonar-quality-profile-typescript.json`
2. Update rule severities or thresholds
3. Re-run the setup script: `npm run sonar:setup-profile`

Example threshold adjustments:
```json
{
  "key": "typescript:S3776",
  "severity": "CRITICAL",
  "params": {
    "threshold": "20"  // Increase cognitive complexity threshold
  }
}
```
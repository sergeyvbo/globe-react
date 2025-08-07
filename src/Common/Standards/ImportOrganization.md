# Import Organization Standards

This document defines the standardized import organization for the GeoQuiz project.

## Import Order

### 1. React and React-related imports
```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createContext, useContext } from 'react'
```

### 2. Third-party library imports (grouped by library)
```typescript
// Material-UI imports
import { Button, Grid2, Box, Typography } from '@mui/material'
import { Settings, AccountCircle, Logout } from '@mui/icons-material'

// D3 imports
import { ExtendedFeatureCollection } from 'd3'

// Other third-party imports
import { BrowserRouter, Route, Routes } from 'react-router-dom'
```

### 3. Internal imports (grouped by type)
```typescript
// Types
import { GameType, User, CountryOption, Difficulty } from '../Common/types'

// Utilities
import { randomElement, shuffleArray, getSettings } from '../Common/utils'

// Hooks
import { useAuth } from '../Common/Auth/AuthContext'
import { useBaseQuiz } from '../Common/Hooks/useBaseQuiz'
import { useGameProgress } from '../Common/Hooks/useGameProgress'

// Services
import { gameProgressService } from '../Common/GameProgress/GameProgressService'

// Components (ordered by hierarchy: shared -> specific)
import { QuizLayout } from '../Common/QuizLayout'
import { SaveStatusIndicator } from '../Common/SaveStatusIndicator'
import { MainMenu } from '../MainMenu/MainMenu'
import { Globe } from '../Globe/Globe'
import { Quiz } from '../Quiz/Quiz'
import { Score } from './Score'
```

### 4. Asset imports
```typescript
import geoJson from '../Common/GeoData/geo.json'
import flagJson from '../Common/GeoData/countryCodes2.json'
import './Component.css'
```

## Spacing Rules

- Add blank line between different import groups
- No blank lines within the same import group
- Add blank line after all imports before the first code

## Import Formatting

### Multi-line imports
```typescript
// Good: Alphabetical order, one per line for readability
import {
  Button,
  Grid2,
  Typography,
  Box
} from '@mui/material'

// Good: Short imports on single line
import { useState, useEffect } from 'react'
```

### Import aliases
```typescript
// Use aliases for clarity when needed
import { ExtendedFeatureCollection as GeoCollection } from 'd3'
import { GameProgressService as ProgressService } from '../services'
```

### Relative imports
```typescript
// Prefer relative imports for local files
import { Component } from './Component'
import { utils } from '../utils'

// Use absolute imports for shared utilities
import { GameType } from '../Common/types'
```

## Examples

### Quiz Component Import Pattern
```typescript
import React, { useState, useEffect, useCallback } from 'react'
import { Button, Grid2, Box } from '@mui/material'
import { ExtendedFeatureCollection } from 'd3'

import { GameType, User, CountryOption } from '../Common/types'
import { randomElement, shuffleArray } from '../Common/utils'
import { useAuth } from '../Common/Auth/AuthContext'
import { useBaseQuiz } from '../Common/Hooks/useBaseQuiz'
import { QuizLayout } from '../Common/QuizLayout'
import { MainMenu } from '../MainMenu/MainMenu'
import { Score } from './Score'

import geoJson from '../Common/GeoData/geo.json'
import './QuizComponent.css'
```

### Hook Import Pattern
```typescript
import { useState, useEffect, useCallback, useRef } from 'react'

import { GameSession, gameProgressService } from '../GameProgress/GameProgressService'
import { GameType, User } from '../types'
import { useOfflineDetector } from '../Network/useOfflineDetector'
import { useSaveErrorHandler } from '../ErrorHandling/useSaveErrorHandler'
```

### Service Import Pattern
```typescript
import { GameSession } from './GameProgressService.types'
import { apiClient } from '../Api/ApiClient'
import { authService } from '../Auth/AuthService'
import { storageService } from '../Storage/StorageService'
```

## Automated Tools

Consider using these tools to enforce import organization:

1. **ESLint rules:**
   - `import/order`
   - `import/newline-after-import`
   - `import/no-duplicates`

2. **Prettier configuration:**
   - `importOrder`
   - `importOrderSeparation`

3. **VS Code extensions:**
   - TypeScript Importer
   - Auto Import - ES6, TS, JSX, TSX
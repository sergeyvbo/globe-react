# Design Document

## Overview

This design document outlines the architecture for creating a proof of concept Deck.gl-based globe component to replace the current D3.js implementation in the CountryQuiz. The design focuses on minimal implementation to validate performance benefits while maintaining compatibility with existing interfaces.

## Architecture

### High-Level Architecture

```
CountryQuiz Component
    ↓ (props: geoData, selectedCountry, settings)
DeckGlGlobe Component
    ↓ (layers, view state)
Deck.gl Canvas
    ↓ (WebGL rendering)
GeoJsonLayer + SolidPolygonLayer
```

### Component Structure

1. **DeckGlGlobe Component** - New React component that wraps Deck.gl functionality
2. **Layer Factory** - Utility functions to create and configure Deck.gl layers

## Components and Interfaces

### DeckGlGlobe Component Interface

```typescript
interface DeckGlGlobeProps {
    geoData: GeoPermissibleObjects[]
    selectedCountry: string
    showBorders: boolean
    showPin: boolean
    showZoomButtons: boolean
    rotationSpeed?: number
    rotationDirection?: 1 | -1
}

interface DeckGlGlobeState {
    viewState: {
        longitude: number
        latitude: number
        zoom: number
        pitch: number
        bearing: number
    }
    layers: Layer[]
}
```

### Layer Configuration

**Primary Layers:**
1. **GeoJsonLayer** - For rendering country polygons with fill and stroke
2. **IconLayer** - For rendering location pins on small countries (future enhancement)

**Layer Properties:**
- Countries layer: Fill color based on selection state
- Borders layer: Conditional rendering based on showBorders setting
- Selection highlighting: Different fill color for selected country

### View State Management

**Initial View State:**
```typescript
const INITIAL_VIEW_STATE = {
    longitude: 0,
    latitude: 0,
    zoom: 1,
    pitch: 0,
    bearing: 0,
    orthographic: true  // For globe projection
}
```

**View State Updates:**
- Country selection triggers smooth transition to country centroid
- User interactions update view state through Deck.gl's built-in controllers
- Zoom and rotation constraints match current D3.js implementation

## Data Models

### Geographic Data Processing

**Input Format:**
- Same GeoJSON FeatureCollection as current D3.js implementation
- No changes required to existing data loading logic

**Data Transformation:**
```typescript
interface ProcessedGeoData {
    features: GeoJsonFeature[]
    selectedFeature?: GeoJsonFeature
    countryLookup: Map<string, GeoJsonFeature>
}
```

**Layer Data Preparation:**
1. Filter countries by type (Country, Sovereign country, etc.)
2. Create lookup map for fast country selection
3. Prepare separate datasets for fill and stroke layers



## Error Handling

### Basic Error Handling

- Basic error logging for debugging
- Simple error messages if component fails to render

## Testing Strategy

### Manual Testing Only

**Basic Functionality Verification:**
- Visual verification that countries render correctly
- Manual testing of country selection highlighting
- Interactive testing of rotation and zoom
- Verification that component integrates with CountryQuiz

## Implementation Phases

### Phase 1: Basic Globe Rendering
- Install Deck.gl dependencies
- Create basic DeckGlGlobe component
- Render countries using GeoJsonLayer
- Basic view state management

### Phase 2: Country Selection
- Implement country highlighting
- Add smooth transitions to selected countries
- Integrate with CountryQuiz component

### Phase 3: Interactive Controls
- Add rotation and zoom interactions
- Implement zoom buttons functionality
- Match D3.js interaction behavior

## Dependencies

### New Dependencies Required

```json
{
    "@deck.gl/core": "^8.9.0",
    "@deck.gl/layers": "^8.9.0",
    "@deck.gl/react": "^8.9.0",
    "@deck.gl/geo-layers": "^8.9.0"
}
```

### Peer Dependencies
- React 18+ (already available)
- WebGL-capable browser environment

## Migration Strategy

### Simple Replacement Approach

1. **Create DeckGlGlobe Component** - Build new component with same interface as Globe
2. **Direct Integration** - Replace Globe component in CountryQuiz for testing
3. **Manual Validation** - Verify basic functionality works as expected

### Compatibility Considerations

- Maintain identical component interface for seamless replacement
- Focus on core functionality: country rendering, selection, and basic interactions
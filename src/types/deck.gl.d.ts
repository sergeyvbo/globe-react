// Basic type declarations for Deck.gl modules
declare module '@deck.gl/react' {
    import { Component } from 'react'
    
    interface DeckGLProps {
        views?: any
        viewState?: any
        onViewStateChange?: any
        controller?: any
        layers?: any[]
        style?: React.CSSProperties
    }
    
    export default class DeckGL extends Component<DeckGLProps> {}
}

declare module '@deck.gl/layers' {
    export class GeoJsonLayer {
        constructor(props: any)
    }
    export class SolidPolygonLayer {
        constructor(props: any)
    }
    export class IconLayer {
        constructor(props: any)
    }
    export class ScatterplotLayer {
        constructor(props: any)
    }
}

declare module '@deck.gl/core' {
    export class OrbitView {
        constructor(props: any)
    }
    export class GlobeView {
        constructor(props?: any)
    }
    export class _GlobeView {
        constructor(props?: any)
    }
}
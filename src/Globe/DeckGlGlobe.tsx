import { useState, useCallback, useEffect } from 'react'
import * as d3 from 'd3'
import DeckGL from '@deck.gl/react'
import { GeoJsonLayer, SolidPolygonLayer, IconLayer } from '@deck.gl/layers'
import { _GlobeView } from '@deck.gl/core'
import { GeoPermissibleObjects } from 'd3-geo'
import { Button } from '@mui/material'
import { ZoomIn, ZoomOut } from '@mui/icons-material'

interface Props {
    geoData: GeoPermissibleObjects[]
    selectedCountry: string
    rotationSpeed?: number
    rotationDirection?: 1 | -1
    showPin: boolean
    showZoomButtons: boolean
    showBorders: boolean
}

interface ViewState {
    longitude: number
    latitude: number
    zoom: number
    pitch: number
    bearing: number
}

const INITIAL_VIEW_STATE: ViewState = {
    longitude: 0,
    latitude: 0,
    zoom: 0,
    pitch: 0,
    bearing: 0
}

const DeckGlGlobe = (props: Props) => {
    const {
        geoData,
        selectedCountry,
        showPin,
        showZoomButtons,
        showBorders,
    } = props

    const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE)

    const onViewStateChange = useCallback(({ viewState }: { viewState: ViewState }) => {
        setViewState(viewState)
    }, [])

    // Filter countries data similar to current D3.js implementation
    const countryData = geoData.filter((obj: any) =>
        ['Country', 'Sovereign country', 'Disputed', 'Indeterminate'].includes(obj.properties?.type)
    )

    // Center on selected country when selectedCountry changes
    useEffect(() => {
        if (selectedCountry && geoData.length > 0) {
            const selectedFeature = countryData.find((d: any) => d.properties?.name === selectedCountry)
            if (selectedFeature) {
                try {
                    const centroid = d3.geoCentroid(selectedFeature)
                    setViewState(prevState => ({
                        ...prevState,
                        longitude: centroid[0],
                        latitude: centroid[1],
                        zoom: Math.max(prevState.zoom, 2) // Ensure minimum zoom level for visibility
                    }))
                } catch (error) {
                    console.warn('Failed to calculate centroid for country:', selectedCountry, error)
                }
            }
        }
    }, [selectedCountry, geoData])

    // Zoom button handlers
    const zoomIn = useCallback(() => {
        setViewState(prevState => ({
            ...prevState,
            zoom: Math.min(prevState.zoom + 1, 10) // Max zoom limit
        }))
    }, [])

    const zoomOut = useCallback(() => {
        setViewState(prevState => ({
            ...prevState,
            zoom: Math.max(prevState.zoom - 1, -2) // Min zoom limit
        }))
    }, [])

    // Create pin data for small countries
    const pinData = showPin ? countryData
        .filter((country: any) => {
            const area = d3.geoArea(country)
            const hasLabels = country.properties.label_x && country.properties.label_y
            const isSmall = area < 0.00025

            // Debug: log small countries
            if (isSmall && hasLabels) {
                console.log(`Small country found: ${country.properties.name}, area: ${area}`)
            }

            return isSmall && hasLabels
        })
        .map((country: any) => ({
            coordinates: [country.properties.label_x, country.properties.label_y],
            name: country.properties.name,
            isSelected: country.properties.name === selectedCountry
        })) : []

    // Debug: log pin data
    if (showPin && pinData.length > 0) {
        console.log(`Pin data created for ${pinData.length} small countries:`, pinData)
    }

    // Create layers array with background globe, countries, and pins
    const layers = [
        // Background globe (ocean)
        new SolidPolygonLayer({
            id: 'globe-background',
            data: [[[[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]]],
            getPolygon: (d: any) => d,
            getFillColor: [108, 186, 233], // Ocean blue color (GLOBE_FILL equivalent)
            filled: true,
            stroked: false
        }),

        // Countries layer
        new GeoJsonLayer({
            id: 'countries',
            data: countryData,
            filled: true,
            stroked: showBorders,
            getFillColor: (d: any) => {
                // Highlight selected country with different color
                if (d.properties?.name === selectedCountry) {
                    return [255, 99, 71] // SELECTED_COUNTRY_FILL equivalent (tomato color)
                }
                return [184, 222, 189] // Default country color (GROUND_FILL equivalent)
            },
            getLineColor: [0, 0, 0], // Border color
            getLineWidth: 0.3,
            lineWidthMinPixels: 0.3,
            pickable: true,
            updateTriggers: {
                getFillColor: [selectedCountry], // Re-render when selectedCountry changes
                getLineColor: [showBorders], // Re-render when showBorders changes
                getLineWidth: [showBorders] // Re-render when showBorders changes
            }
        }),

        // Pin for selected small country only - using IconLayer with SVG
        ...(showPin && selectedCountry ? (() => {
            const selectedPin = pinData.find(pin => pin.name === selectedCountry)
            return selectedPin ? [
                new IconLayer({
                    id: 'country-pin',
                    data: [selectedPin],
                    getPosition: (d: any) => {
                        console.log(`Creating pin for selected country ${d.name} at [${d.coordinates[0]}, ${d.coordinates[1]}]`)
                        return d.coordinates
                    },
                    getIcon: () => 'marker',
                    getSize: 48,
                    getColor: [255, 99, 71], // Selected country color
                    pickable: true,
                    iconAtlas: `${import.meta.env.BASE_URL}map-pin.svg`,
                    iconMapping: {
                        marker: {
                            x: 0,
                            y: 0,
                            width: 48,
                            height: 48,
                            anchorX: 24,
                            anchorY: 48
                        }
                    },
                    sizeScale: 1,
                    sizeMinPixels: 24,
                    sizeMaxPixels: 48
                })
            ] : []
        })() : [])
    ]

    return (
        <>
            <DeckGL
                views={new _GlobeView()}
                viewState={viewState}
                onViewStateChange={onViewStateChange}
                controller={{
                    minZoom: -2,
                    maxZoom: 10,
                    inertia: true,
                    scrollZoom: true,
                    dragPan: true,
                    dragRotate: true,
                    doubleClickZoom: true,
                    touchZoom: true,
                    touchRotate: true
                }}
                layers={layers}
                style={{ position: 'relative', width: '100%', height: '100vh' }}
            />
            {showZoomButtons && (
                <div className='Globe-zoom'>
                    <Button variant='outlined' type='button' className='Globe-zoom-button' onClick={zoomIn}>
                        <ZoomIn />
                    </Button>
                    <Button variant='outlined' type='button' className='Globe-zoom-button' onClick={zoomOut}>
                        <ZoomOut />
                    </Button>
                </div>
            )}
        </>
    )
}

export { DeckGlGlobe }
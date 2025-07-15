import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { GeoPermissibleObjects } from 'd3-geo'
import { Button, IconButton } from '@mui/material'
import { ZoomIn, ZoomInMap, ZoomOut, ZoomOutMap } from '@mui/icons-material'

interface Props {
    geoData: GeoPermissibleObjects[],
    selectedCountry: string,
    rotationSpeed?: number,
    rotationDirection?: 1 | -1,
    showPin: boolean,
    showZoomButtons: boolean,
    showBorders: boolean,
}

const Globe = (props: Props) => {

    const {
        geoData,
        selectedCountry,
        rotationSpeed,
        rotationDirection,
        showPin,
        showZoomButtons,
        showBorders,
    } = props

    const mapRef = useRef<HTMLDivElement | null>(null)
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
    const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null)


    const GLOBE_FILL = '#6CBAE9'
    const GROUND_FILL = '#B8DEBD'
    const SELECTED_COUNTRY_FILL = '#FF6347'

    const PIN_WIDTH = 48
    const PIN_HEIGHT = 48
    const PIN_OFFSET_X = -24
    const PIN_OFFSET_Y = -48
    const PIN_URL = `${import.meta.env.BASE_URL}map-pin.svg`

    const SCALE_MIN = 0.5
    const SCALE_MAX = 200

    useEffect(() => {
        if (!mapRef.current) return

        const width = mapRef.current.getBoundingClientRect().width
        //const height = 500
        const height = window.innerHeight
        const sensitivity = 75

        const projection = d3.geoOrthographic()
            .scale(250)
            .center([0, 0])
            .rotate([0, -30])
            .translate([width / 2, height / 2])

        const initialScale = projection.scale()
        let path = d3.geoPath().projection(projection)

        const svg = d3.select(mapRef.current)
            .append('svg')
            .attr('width', width)
            .attr('height', height)

        svgRef.current = svg;

        // globe
        const globe = svg.append('circle')
            .attr('fill', GLOBE_FILL)
            .attr('stroke', '#000')
            .attr('stroke-width', '0.2')
            .attr('cx', width / 2)
            .attr('cy', height / 2)
            .attr('r', initialScale)

        // on drag
        svg.call(
            d3.drag<SVGSVGElement, unknown>()
                .on('drag', (event) => {
                    const rotate = projection.rotate()
                    const k = sensitivity / projection.scale()
                    projection.rotate([
                        rotate[0] + event.dx * k,
                        rotate[1] - event.dy * k
                    ])
                    path = d3.geoPath().projection(projection)
                    svg.selectAll('path').attr('d', (d: any) => path(d) as string)
                    updatePin(geoData.find((d: any) => d.properties.name === selectedCountry))
                })
        )

        // on zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([SCALE_MIN, SCALE_MAX])
            .on('zoom', (event) => {
                projection.scale(initialScale * event.transform.k)
                path = d3.geoPath().projection(projection)
                svg.selectAll('path').attr('d', (d: any) => path(d) as string)
                globe.attr('r', projection.scale())
                updatePin(geoData.find((d: any) => d.properties.name === selectedCountry))
            })

        svg.call(zoom)
        zoomRef.current = zoom;

        //map
        const map = svg.append('g')
        map.append('g')
            .attr('class', 'countries')
            .selectAll('path')
            .data(geoData)
            .enter().append('path')
            .attr('class', (d: any) => 'country_' + d.properties.name.replace(' ', '_'))
            .attr('d', d => path(d as GeoPermissibleObjects) as string)
            .attr('fill', (d: any) => d.properties.name === selectedCountry ? SELECTED_COUNTRY_FILL : GROUND_FILL)
            .style('stroke', showBorders ? 'black' : 'transparent')
            .style('stroke-width', 0.3)
            .style('opacity', 0.8)

        // pin
        if (showPin) {
            svg.append("image")
                .attr('class', 'map-pin')
                .attr("xlink:href", PIN_URL)
                .attr('width', PIN_WIDTH)
                .attr("height", PIN_HEIGHT)
        }
        const pin = svg.select('.map-pin')

        const updatePin = (country: any) => {
            const area = d3.geoArea(country)
            if (country && area < .00025) {
                // add pin for small countries at country label coordinates
                const { label_x, label_y } = country.properties
                if (!label_x || !label_y) {
                    return
                }
                const projectedLabel = projection([label_x, label_y])
                if (projectedLabel) {
                    d3.select('.map-pin')
                        .attr('transform', `translate(${projectedLabel[0] + PIN_OFFSET_X},${projectedLabel[1] + PIN_OFFSET_Y})`)
                        .style('display', 'block')
                }
            } else {
                pin.style('display', 'none')
            }
        }

        // rotation
        if (rotationSpeed) {
            d3.timer(function () {
                const rotate = projection.rotate()
                const k = sensitivity / projection.scale() * (rotationDirection ?? 1)
                projection.rotate([
                    rotate[0] - 1 * k,
                    rotate[1]
                ])
                path = d3.geoPath().projection(projection)
                svg.selectAll('path').attr('d', d => path(d as GeoPermissibleObjects) as string)
                if (showPin) updatePin(geoData.find((d: any) => d.properties.name === selectedCountry))
            }, rotationSpeed)
        }

        // center on selected country
        if (selectedCountry) {
            const selected = geoData.find((d: any) => d.properties.name === selectedCountry)
            if (selected) {
                const centroid = d3.geoCentroid(selected)
                projection.rotate([-centroid[0], -centroid[1]])
                path = d3.geoPath().projection(projection)
                svg.selectAll('path').attr('d', d => path(d as GeoPermissibleObjects) as string)
                updatePin(selected)
            }
        }

        return () => {
            svg.remove()
        }
    }, [selectedCountry])

    const zoomIn = () => {
        if (svgRef.current && zoomRef.current) {
            svgRef.current.transition().call(zoomRef.current.scaleBy, 2)
        }
    }

    const zoomOut = () => {
        if (svgRef.current && zoomRef.current) {
            svgRef.current.transition().call(zoomRef.current.scaleBy, 0.5)
        }
    }

    return (
        <>
            <div id="map" ref={mapRef} />
            {showZoomButtons && <div className='Globe-zoom'>
                <Button variant='outlined' type='button' className='Globe-zoom-button' onClick={() => zoomIn()}>
                    <ZoomIn />
                </Button>
                <Button variant='outlined' type='button' className='Globe-zoom-button' onClick={() => zoomOut()}>
                    <ZoomOut />
                </Button>
            </div>}
        </>
    )
}

export { Globe }

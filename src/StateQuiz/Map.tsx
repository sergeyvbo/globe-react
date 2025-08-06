import { ZoomIn, ZoomOut } from "@mui/icons-material"
import { Button } from "@mui/material"
import * as d3 from 'd3'
import { GeoPermissibleObjects } from 'd3-geo'
import { useEffect, useRef } from "react"
import { StateFeature } from '../Common/types'

interface Props {
    geoData: StateFeature[],
    selected: string,
}

const Map = (props: Props) => {
    const { geoData, selected } = props

    const mapRef = useRef<HTMLDivElement | null>(null)
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
    const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null)

    const GROUND_FILL = '#B8DEBD';
    const SELECTED_STATE_FILL = '#FF6347';
    const SCALE_MIN = 0.5;
    const SCALE_MAX = 5;

    useEffect(() => {
        if (!mapRef.current) return;

        const width = mapRef.current.getBoundingClientRect().width;
        const height = window.innerHeight;

        const projection = d3.geoAlbersUsa()
            .translate([width / 2, height / 2])
            .scale(600);

        let path = d3.geoPath().projection(projection);

        const svg = d3.select(mapRef.current)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        svgRef.current = svg;

        const map = svg.append('g');
        map.selectAll('path')
            .data(geoData)
            .enter().append('path')
            .attr('d', path)
            .attr('fill', (d: StateFeature) => d.properties.NAME === selected ? SELECTED_STATE_FILL : GROUND_FILL)
            .attr('stroke', 'black')
            .attr('stroke-width', 0.5);

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([SCALE_MIN, SCALE_MAX])
            .on('zoom', (event) => {
                map.attr('transform', event.transform)
            });

        svg.call(zoom)
        zoomRef.current = zoom

        if (selected) {
            const selectedState = geoData.find((d: StateFeature) => d.properties.NAME === selected);
            if (selectedState) {
                const bounds = path.bounds(selectedState);
                const dx = bounds[1][0] - bounds[0][0];
                const dy = bounds[1][1] - bounds[0][1];
                const x = (bounds[0][0] + bounds[1][0]) / 2;
                const y = (bounds[0][1] + bounds[1][1]) / 2;
                const scale = Math.max(1, Math.min(2, 0.9 / Math.max(dx / width, dy / height)));
                const translate = [width / 2 - scale * x, height / 2 - scale * y];

                svg.transition().duration(750).call(
                    zoom.transform,
                    d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
                );
            }
        }

        return () => {
            svg.remove();
        };
    }, [selected]);

    const zoomIn = (): void => {
        if (svgRef.current && zoomRef.current) {
            svgRef.current.transition().call(zoomRef.current.scaleBy, 2);
        }
    };

    const zoomOut = (): void => {
        if (svgRef.current && zoomRef.current) {
            svgRef.current.transition().call(zoomRef.current.scaleBy, 0.5);
        }
    };

    return (
        <>
            <div id="map" ref={mapRef} style={{ width: '100%', height: '100vh' }} />
            <div className='Globe-zoom'>
                <Button variant='outlined' type='button' className='Globe-zoom-button' onClick={() => zoomIn()}>
                    <ZoomIn />
                </Button>
                <Button variant='outlined' type='button' className='Globe-zoom-button' onClick={() => zoomOut()}>
                    <ZoomOut />
                </Button>
            </div>

        </>
    );
}

export { Map }

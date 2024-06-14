import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GeoPermissibleObjects } from 'd3-geo';

interface Props {
    geoData: GeoPermissibleObjects[],
    selectedCountry: string,
    rotationSpeed?: number,
    rotationDirection?: 1 | -1,
}

const Globe = (props: Props) => {

    const {
        geoData,
        selectedCountry,
        rotationSpeed,
        rotationDirection,
    } = props

    const mapRef = useRef<HTMLDivElement | null>(null);
    const [countryName, setCountryName] = useState('');

    const GLOBE_FILL = '#6CBAE9'
    const GROUND_FILL = '#B8DEBD'
    const SELECTED_COUNTRY_FILL = '#FF6347'

    useEffect(() => {
        if (!mapRef.current) return;

        const width = mapRef.current.getBoundingClientRect().width;
        //const height = 500;
        const height = window.innerHeight - 100;
        const sensitivity = 75;

        const projection = d3.geoOrthographic()
            .scale(250)
            .center([0, 0])
            .rotate([0, -30])
            .translate([width / 2, height / 2]);

        const initialScale = projection.scale();
        let path = d3.geoPath().projection(projection);

        const svg = d3.select(mapRef.current)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const globe = svg.append('circle')
            .attr('fill', GLOBE_FILL)
            .attr('stroke', '#000')
            .attr('stroke-width', '0.2')
            .attr('cx', width / 2)
            .attr('cy', height / 2)
            .attr('r', initialScale);

        svg.call(
            d3.drag<SVGSVGElement, unknown>()
                .on('drag', (event) => {
                    const rotate = projection.rotate();
                    const k = sensitivity / projection.scale();
                    projection.rotate([
                        rotate[0] + event.dx * k,
                        rotate[1] - event.dy * k
                    ]);
                    path = d3.geoPath().projection(projection);
                    svg.selectAll('path').attr('d', (d: any) => path(d) as string);
                })
        );

        svg.call(
            d3.zoom<SVGSVGElement, unknown>()
                .on('zoom', (event) => {
                    if (event.transform.k > 0.3) {
                        projection.scale(initialScale * event.transform.k);
                        path = d3.geoPath().projection(projection);
                        svg.selectAll('path').attr('d', (d: any) => path(d) as string);
                        globe.attr('r', projection.scale());
                    } else {
                        event.transform.k = 0.3;
                    }
                })
        );

        const map = svg.append('g');

        map.append('g')
            .attr('class', 'countries')
            .selectAll('path')
            .data(geoData)
            .enter().append('path')
            .attr('class', (d: any) => 'country_' + d.properties.name.replace(' ', '_'))
            .attr('d', d => path(d as GeoPermissibleObjects) as string)
            .attr('fill', (d: any) => d.properties.name === selectedCountry ? SELECTED_COUNTRY_FILL : GROUND_FILL)
            .style('stroke', 'black')
            .style('stroke-width', 0.3)
            .style('opacity', 0.8)
            .on('click', (_, d: any) => {
                setCountryName(d.properties.name)
            });

        if (rotationSpeed) {
            d3.timer(function (elapsed) {
                const rotate = projection.rotate();
                const k = sensitivity / projection.scale() * (rotationDirection ?? 1);
                projection.rotate([
                    rotate[0] - 1 * k,
                    rotate[1]
                ]);
                path = d3.geoPath().projection(projection);
                svg.selectAll('path').attr('d', d => path(d as GeoPermissibleObjects) as string);
            }, rotationSpeed);
        }


        return () => {
            svg.remove();
        };
    }, []);

    return (
        <>
            <div id="map" ref={mapRef} className='Globe-map' />
            <div className='Globe-countryName'>{countryName}</div>
        </>
    )
};

export { Globe };

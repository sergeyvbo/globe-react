import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GeoPermissibleObjects } from 'd3-geo';

const Globe = () => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [countryName, setCountryName] = useState('');
    const [countriesData, setCountriesData] = useState<GeoPermissibleObjects[] | null>(null);

    const globeFill = '#6CBAE9'
    const groundFill = '#B8DEBD'

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/world.json`);
                const data = await response.json();
                setCountriesData(data.features);
            } catch (error) {
                console.error('Error fetching country data:', error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (!mapRef.current || !countriesData) return;

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
            .attr('fill', globeFill)
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
            .data(countriesData)
            .enter().append('path')
            .attr('class', (d: any) => 'country_' + d.properties.name.replace(' ', '_'))
            .attr('d', d => path(d as GeoPermissibleObjects) as string)
            .attr('fill', groundFill)
            .style('stroke', 'black')
            .style('stroke-width', 0.3)
            .style('opacity', 0.8)
            .on('click', (_, d: any) => {
                setCountryName(d.properties.name)
            });

        // d3.timer(function (elapsed) {
        //     const rotate = projection.rotate();
        //     const k = sensitivity / projection.scale();
        //     projection.rotate([
        //         rotate[0] - 1 * k,
        //         rotate[1]
        //     ]);
        //     path = d3.geoPath().projection(projection);
        //     svg.selectAll('path').attr('d', d => path(d as GeoPermissibleObjects) as string);
        // }, 500);

        return () => {
            svg.remove();
        };
    }, [countriesData]);

    return (
        <>
            <div id="map" ref={mapRef} className='Globe-map' />
            <div className='Globe-countryName'>{countryName}</div>
        </>
    )
};

export { Globe };

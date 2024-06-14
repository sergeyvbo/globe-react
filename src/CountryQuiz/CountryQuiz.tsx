import { GeoPermissibleObjects } from "d3";
import { useState, useEffect } from "react";
import { Globe } from "../Globe/Globe";

const CountryQuiz = () => {

    const [geoData, setGeoData] = useState<GeoPermissibleObjects[] | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/world.json`);
                const data = await response.json();
                setGeoData(data.features);
            } catch (error) {
                console.error('Error fetching country data:', error);
            }
        };

        fetchData();
    }, [])

    if (geoData) {
        return (
            <Globe
                geoData={geoData}
                selectedCountry='Russia'
            />)
    }
    return <p> Loading...</p>
}

export { CountryQuiz }
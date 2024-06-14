import { GeoPermissibleObjects } from "d3";
import { useState, useEffect } from "react";
import { Globe } from "../Globe/Globe";

const CountryQuiz = () => {

    const [countriesData, setCountriesData] = useState<GeoPermissibleObjects[] | null>(null);

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
    }, [])

    if (countriesData) {
        return <Globe />
    }
    return <p> Loading...</p>
}

export { CountryQuiz }
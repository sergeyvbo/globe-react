import { defaultSettings } from "./defaults";
import { CountryQuizSettings } from "./types";

const randomElement = <T>(arr: T[]): T => arr[random(arr.length)]
const random = (max: number): number => Math.floor(Math.random() * max)

const shuffleArray = <T>(array: T[]): T[] => {
    return array.sort(() => Math.random() - 0.5);
};

const kebabize = (str: string) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $.toLowerCase())

const getSettings = (): CountryQuizSettings => {
    const savedSettings = localStorage.getItem('countryQuizSettings')
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings
}





export { random, randomElement, shuffleArray, kebabize, getSettings }
// Re-export API tester for debugging
export { ApiTester } from './utils/apiTest'
export type CountryOption = {
    code: string
    name: string,
    translatedName: string,
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export type CountryQuizSettings = {
    language: 'en' | 'ru',
    showPin: boolean,
    difficulty: Difficulty,
    showZoomButtons: boolean,
    showBorders: boolean,
    showSovereignCountries: boolean,
    showDisputed: boolean,
    showOthers: boolean,
}

type Language = 'en' | 'ru';
type Path = keyof typeof strings['en']['settings'];

const strings = {
    en: {
        settings: {
            settings: "Settings",
            language: "Language",
            showPin: "Show pin for small countries",
            difficulty: "Options difficulty",
            easy: "Easy (world)",
            medium: "Medium (region)",
            hard: "Hard (subregion)",
            showZoomButtons: "Show zoom buttons",
            showBorders: "Show borders",
            countrySet: "Country set",
            showAll: "All",
            showSovereignCountries: "Sovereign countries",
            showDisputed: "Disputed",
            showOthers: "Islands and dependencies",
            correct: "Correct",
            wrong: "Wrong",
        } as const,
    } as const,
    ru: {
        settings: {
            settings: "Настройки",
            language: "Язык",
            showPin: "Показывать метку для маленьких стран",
            difficulty: "Уровень сложности",
            easy: "Легко",
            medium: "Средне",
            hard: "Сложно",
            showZoomButtons: "Показывать кнопки масштаба",
            showBorders: "Показывать государственные границы",
            countrySet: "Набор стран",
            showAll: "Все",
            showSovereignCountries: "Независимые государства",
            showDisputed: "Непризнанные государства",
            showOthers: "Владения, заморские территории и прочее",
            correct: "Правильно",
            wrong: "Ошибок",
        } as const,
    } as const,
} as const

const getString = (key: Path): string => {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    const language: Language = settings.language || 'en';
    return strings[language].settings[key];
};

export { getString }
const strings = {
    en: {
        settings: {
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
        } as const,
    } as const,
    ru: {
        settings: {
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
        } as const,
    } as const,
} as const

export { strings }
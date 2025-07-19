type Language = 'en' | 'ru';
type Path = keyof typeof strings['en']['settings'];
type AuthPath = keyof typeof strings['en']['auth'];

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
        auth: {
            login: "Login",
            logout: "Logout",
            profile: "Profile",
            userProfile: "User Profile",
            email: "Email",
            authProvider: "Authentication Provider",
            lastLogin: "Last Login",
            memberSince: "Member since",
            passwordSettings: "Password Settings",
            changePassword: "Change Password",
            currentPassword: "Current Password",
            newPassword: "New Password",
            confirmPassword: "Confirm New Password",
            passwordChanged: "Password changed successfully!",
            passwordChangeDescription: "Change your account password to keep your account secure.",
            oauthPasswordInfo: "Password management is handled by your {provider} account. Please visit your {provider} account settings to change your password.",
            mustBeLoggedIn: "You must be logged in to view your profile.",
            currentPasswordRequired: "Current password is required",
            newPasswordDifferent: "New password must be different from current password",
            currentPasswordIncorrect: "Current password is incorrect",
            passwordChangeFailed: "Failed to change password. Please try again.",
            changing: "Changing...",
            cancel: "Cancel",
            loading: "Loading...",
            backToHome: "Back to Home",
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
        auth: {
            login: "Войти",
            logout: "Выйти",
            profile: "Профиль",
            userProfile: "Профиль пользователя",
            email: "Email",
            authProvider: "Провайдер авторизации",
            lastLogin: "Последний вход",
            memberSince: "Участник с",
            passwordSettings: "Настройки пароля",
            changePassword: "Изменить пароль",
            currentPassword: "Текущий пароль",
            newPassword: "Новый пароль",
            confirmPassword: "Подтвердите пароль",
            passwordChanged: "Пароль успешно изменен!",
            passwordChangeDescription: "Измените пароль своего аккаунта для обеспечения безопасности.",
            oauthPasswordInfo: "Управление паролем осуществляется через ваш аккаунт {provider}. Пожалуйста, перейдите в настройки аккаунта {provider} для изменения пароля.",
            mustBeLoggedIn: "Вы должны войти в систему, чтобы просмотреть свой профиль.",
            currentPasswordRequired: "Требуется текущий пароль",
            newPasswordDifferent: "Новый пароль должен отличаться от текущего",
            currentPasswordIncorrect: "Неверный текущий пароль",
            passwordChangeFailed: "Не удалось изменить пароль. Попробуйте еще раз.",
            changing: "Изменение...",
            cancel: "Отмена",
            loading: "Загрузка...",
            backToHome: "Вернуться на главную",
        } as const,
    } as const,
} as const

const getString = (key: Path): string => {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    const language: Language = settings.language || 'en';
    return strings[language].settings[key];
};

const getAuthString = (key: AuthPath): string => {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    const language: Language = settings.language || 'en';
    return strings[language].auth[key];
};

export { getString, getAuthString }
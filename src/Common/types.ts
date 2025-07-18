export type CountryOption = {
    code: string
    name: string,
    translatedName: string,
}

export type Language = 'en' | 'ru'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type GameType = 'countries' | 'flags' | 'states'

export type CountryQuizSettings = {
    language: Language,
    showPin: boolean,
    difficulty: Difficulty,
    showZoomButtons: boolean,
    showBorders: boolean,
    showSovereignCountries: boolean,
    showDisputed: boolean,
    showOthers: boolean,
}

export type CountryFlagData = {
    code: string
    name: string
    name_ru?: string
}

export type OAuthProvider = 'google' | 'yandex' | 'vk'

export interface User {
    id: string
    email: string
    name?: string
    avatar?: string
    provider: 'email' | OAuthProvider
    createdAt: Date
    lastLoginAt?: Date
    preferences?: UserPreferences
}

export interface UserPreferences {
    language: Language
    difficulty: Difficulty
    showPin: boolean
    showZoomButtons: boolean
    showBorders: boolean
}

export interface AuthResponse {
    user: User
    accessToken: string
    refreshToken: string
    expiresIn: number
}

export interface AuthContextType {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string, confirmPassword?: string) => Promise<void>
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>
    logout: () => Promise<void>
    updateProfile: (data: Partial<User>) => Promise<void>
}

export enum AuthErrorType {
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    USER_EXISTS = 'USER_EXISTS',
    NETWORK_ERROR = 'NETWORK_ERROR',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    OAUTH_ERROR = 'OAUTH_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface AuthError {
    type: AuthErrorType
    message: string
    details?: any
}

export interface ValidationResult {
    isValid: boolean
    message?: string
}

export interface ValidationErrors {
    [key: string]: string
}

export interface AuthSession {
    accessToken: string
    refreshToken: string
    expiresAt: Date
    user: User
}

export interface GameProgress {
    userId: string
    gameType: GameType
    correctAnswers: number
    wrongAnswers: number
    totalGames: number
    bestStreak: number
    lastPlayedAt: Date
}
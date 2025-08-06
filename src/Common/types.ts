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
    details?: ApiErrorDetails
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

// Game Stats API Types
export interface GameSessionRequest {
    gameType: string
    correctAnswers: number
    wrongAnswers: number
    sessionStartTime: string
    sessionEndTime: string
}

export interface GameSessionDto {
    id: string
    gameType: string
    correctAnswers: number
    wrongAnswers: number
    accuracy: number
    sessionStartTime: string
    sessionEndTime: string
    sessionDurationMs: number
    createdAt: string
}

export interface GameStatsResponse {
    totalGames: number
    totalCorrectAnswers: number
    totalWrongAnswers: number
    bestStreak: number
    averageAccuracy: number
    lastPlayedAt?: string
    gameTypeStats: Record<string, GameTypeStatsDto>
}

export interface GameTypeStatsDto {
    games: number
    correctAnswers: number
    wrongAnswers: number
    accuracy: number
    bestStreak: number
}

export interface GameHistoryResponse {
    sessions: GameSessionDto[]
    totalCount: number
    page: number
    pageSize: number
    hasNextPage: boolean
}

export interface AnonymousGameSession {
    gameType: string
    correctAnswers: number
    wrongAnswers: number
    sessionStartTime: string
    sessionEndTime: string
    timestamp: string
}

export interface MigrateProgressRequest {
    sessions: AnonymousGameSession[]
}

// Leaderboard API Types
export interface LeaderboardResponse {
    entries: LeaderboardEntryDto[]
    totalPlayers: number
    currentUserEntry?: LeaderboardEntryDto
    page: number
    pageSize: number
    totalPages: number
    // Computed properties for compatibility
    players?: LeaderboardEntryDto[]
    hasNextPage?: boolean
    currentUserRank?: number
}

export interface LeaderboardEntryDto {
    userId?: string
    displayName: string
    totalScore: number
    totalGames: number
    accuracy: number
    bestStreak: number
    lastPlayedAt?: string
    rank: number
    // Compatibility properties
    userName?: string
    userAvatar?: string
    gamesPlayed?: number
    isCurrentUser?: boolean
}

export interface LeaderboardFilter {
    gameType?: string
    period?: LeaderboardPeriod
    page?: number
    pageSize?: number
}

export type LeaderboardPeriod = 'all' | 'week' | 'month' | 'year'

// RFC 9457 Problem Details Types
export interface ProblemDetails {
    type?: string
    title?: string
    status?: number
    detail?: string
    instance?: string
    [key: string]: unknown // For additional fields
}

// Extended interface for validation errors
export interface ValidationProblemDetails extends ProblemDetails {
    errors?: Record<string, string[]>
}

// Union type for all possible RFC 9457 errors
export type RFC9457Error = ProblemDetails | ValidationProblemDetails

// Utility types for common patterns
export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>

// Generic array utility types
export type ArrayElement<T extends readonly unknown[]> = T extends readonly (infer U)[] ? U : never

// D3 GeoJSON property types for better type safety
export interface CountryProperties {
    name: string
    name_en?: string
    name_ru?: string
    iso_a2: string
    type: string
    continent: string
    subregion: string
    [key: string]: unknown
}

export interface StateProperties {
    NAME: string
    STATE: string
    [key: string]: unknown
}

// Generic GeoJSON feature type
export interface GeoFeature<T = Record<string, unknown>> {
    properties: T
    [key: string]: unknown
}

// Specific feature types
export type CountryFeature = GeoFeature<CountryProperties>
export type StateFeature = GeoFeature<StateProperties>

// Error handling utility types
export interface ApiErrorDetails {
    code?: string
    field?: string
    message?: string
    [key: string]: unknown
}

// Generic API response wrapper
export interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
    status?: number
}

// Event handler utility types
export type EventHandler<T = Event> = (event: T) => void
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>

// Common function types
export type Predicate<T> = (item: T) => boolean
export type Mapper<T, U> = (item: T) => U
export type Comparator<T> = (a: T, b: T) => number

// Utility types for better type safety
export type NonEmptyArray<T> = [T, ...T[]]
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Error handling utility types
export interface ErrorWithType {
    type: string
    message: string
    details?: ApiErrorDetails
}

export interface ServiceError extends ErrorWithType {
    type: AuthErrorType
}

// HTTP utility types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type HttpHeaders = Record<string, string>
export type HttpRequestBody = string | globalThis.FormData | URLSearchParams | null

export interface HttpRequestConfig {
    method?: HttpMethod
    headers?: HttpHeaders
    body?: HttpRequestBody
    timeout?: number
}

// Quiz-specific utility types
export type QuizOption<T = string> = {
    value: T
    label: string
    isCorrect?: boolean
}

export type QuizAnswer<T = string> = {
    selectedOption: T
    isCorrect: boolean
    timestamp: Date
}

// Component prop utility types
export type ComponentWithChildren<T = {}> = T & {
    children: React.ReactNode
}

export type ComponentWithClassName<T = {}> = T & {
    className?: string
}

export type ComponentWithTestId<T = {}> = T & {
    'data-testid'?: string
}

// Form utility types
export type FormFieldValue = string | number | boolean | Date | null | undefined
export type FormData<T extends Record<string, FormFieldValue>> = T
export type FormErrors<T extends Record<string, FormFieldValue>> = Partial<Record<keyof T, string>>

// Async operation utility types
export type AsyncOperationState<T = unknown, E = Error> = {
    data: T | null
    loading: boolean
    error: E | null
}

export type AsyncOperation<T = unknown, E = Error> = {
    execute: () => Promise<T>
    reset: () => void
} & AsyncOperationState<T, E>

// Array utility types for better type safety
export type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never
export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Rest] ? Rest : []
export type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never

// Object utility types
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type DeepRequired<T> = {
    [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

// Function utility types with better typing
export type AsyncFunction<TArgs extends readonly unknown[] = [], TReturn = unknown> = 
    (...args: TArgs) => Promise<TReturn>

export type SyncFunction<TArgs extends readonly unknown[] = [], TReturn = unknown> = 
    (...args: TArgs) => TReturn

export type AnyFunction<TArgs extends readonly unknown[] = [], TReturn = unknown> = 
    SyncFunction<TArgs, TReturn> | AsyncFunction<TArgs, TReturn>

// Event handler types with proper typing
export type ChangeEventHandler<T = HTMLInputElement> = (event: React.ChangeEvent<T>) => void
export type ClickEventHandler<T = HTMLElement> = (event: React.MouseEvent<T>) => void
export type SubmitEventHandler<T = HTMLFormElement> = (event: React.FormEvent<T>) => void
export type KeyboardEventHandler<T = HTMLElement> = (event: React.KeyboardEvent<T>) => void

// API response utility types
export type ApiSuccessResponse<T> = {
    success: true
    data: T
    error?: never
}

export type ApiErrorResponse = {
    success: false
    data?: never
    error: string
    details?: ApiErrorDetails
}

export type ApiResponseUnion<T> = ApiSuccessResponse<T> | ApiErrorResponse

// Branded types for better type safety
export type Brand<T, B> = T & { __brand: B }
export type UserId = Brand<string, 'UserId'>
export type SessionId = Brand<string, 'SessionId'>
export type GameId = Brand<string, 'GameId'>

// Time utility types
export type Timestamp = Brand<number, 'Timestamp'>
export type Duration = Brand<number, 'Duration'>
export type ISODateString = Brand<string, 'ISODateString'>
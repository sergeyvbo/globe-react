// GameProgress module public API
// This file exports all public interfaces for the game progress module
export { gameProgressService } from './GameProgressService'
export type { GameStats } from './GameProgressService'

// New API services
export { gameStatsApiService, GameStatsApiError } from './GameStatsApiService'
export { leaderboardService, LeaderboardApiError } from './LeaderboardService'
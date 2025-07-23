import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SyncStatusIndicator } from './SyncStatusIndicator'
import { useOfflineSync } from './useOfflineSync'

// Mock the useOfflineSync hook
vi.mock('./useOfflineSync')

const mockUseOfflineSync = vi.mocked(useOfflineSync)

describe('SyncStatusIndicator', () => {
    const mockForceSyncNow = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        mockForceSyncNow.mockResolvedValue(undefined)
    })

    describe('No Pending Actions', () => {
        beforeEach(() => {
            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: false,
                    pendingActionsCount: 0,
                    lastSyncAt: new Date(),
                    lastSyncError: undefined
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: false
            })
        })

        it('should not render when no pending actions by default', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.queryByText(/syncing|pending|synced/i)
            expect(indicator).not.toBeInTheDocument()
        })

        it('should render when no pending actions if showWhenNoActions is true', () => {
            render(<SyncStatusIndicator showWhenNoActions={true} />)

            const indicator = screen.getByText('✅ All synced')
            expect(indicator).toBeInTheDocument()
        })

        it('should have success styling when all synced', () => {
            render(<SyncStatusIndicator showWhenNoActions={true} />)

            const indicator = screen.getByText('✅ All synced')
            expect(indicator).toHaveStyle({
                backgroundColor: '#4caf50'
            })
        })
    })

    describe('Pending Actions', () => {
        beforeEach(() => {
            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: false,
                    pendingActionsCount: 3,
                    lastSyncAt: new Date(),
                    lastSyncError: undefined
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: true
            })
        })

        it('should render when there are pending actions', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 3 pending')
            expect(indicator).toBeInTheDocument()
        })

        it('should have warning styling when pending actions exist', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 3 pending')
            expect(indicator).toHaveStyle({
                backgroundColor: '#ff9800'
            })
        })

        it('should be clickable when online and not syncing', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 3 pending')
            expect(indicator).toHaveStyle({
                cursor: 'pointer',
                opacity: '1'
            })
        })

        it('should trigger sync when clicked', async () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 3 pending')
            fireEvent.click(indicator)

            await waitFor(() => {
                expect(mockForceSyncNow).toHaveBeenCalled()
            })
        })
    })

    describe('Offline State', () => {
        beforeEach(() => {
            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: false,
                    isSyncing: false,
                    pendingActionsCount: 2,
                    lastSyncAt: new Date(),
                    lastSyncError: undefined
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: true
            })
        })

        it('should show offline status with pending count', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('📱 2 pending (offline)')
            expect(indicator).toBeInTheDocument()
        })

        it('should have warning styling when offline', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('📱 2 pending (offline)')
            expect(indicator).toHaveStyle({
                backgroundColor: '#ff9800'
            })
        })

        it('should not be clickable when offline', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('📱 2 pending (offline)')
            expect(indicator).toHaveStyle({
                cursor: 'default',
                opacity: '0.8'
            })
        })

        it('should not trigger sync when clicked while offline', async () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('📱 2 pending (offline)')
            fireEvent.click(indicator)

            // Wait a bit to ensure no async calls are made
            await new Promise(resolve => setTimeout(resolve, 100))

            expect(mockForceSyncNow).not.toHaveBeenCalled()
        })
    })

    describe('Syncing State', () => {
        beforeEach(() => {
            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: true,
                    pendingActionsCount: 1,
                    lastSyncAt: new Date(),
                    lastSyncError: undefined
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: true
            })
        })

        it('should show syncing status', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('🔄 Syncing...')
            expect(indicator).toBeInTheDocument()
        })

        it('should have info styling when syncing', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('🔄 Syncing...')
            expect(indicator).toHaveStyle({
                backgroundColor: '#2196f3'
            })
        })

        it('should not be clickable when syncing', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('🔄 Syncing...')
            expect(indicator).toHaveStyle({
                cursor: 'default',
                opacity: '0.8'
            })
        })

        it('should not trigger sync when clicked while syncing', async () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('🔄 Syncing...')
            fireEvent.click(indicator)

            await new Promise(resolve => setTimeout(resolve, 100))

            expect(mockForceSyncNow).not.toHaveBeenCalled()
        })
    })

    describe('Error State', () => {
        beforeEach(() => {
            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: false,
                    pendingActionsCount: 0,
                    lastSyncAt: new Date(),
                    lastSyncError: 'Network timeout'
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: false
            })
        })

        it('should show error status', () => {
            render(<SyncStatusIndicator showWhenNoActions={true} />)

            const indicator = screen.getByText('⚠️ Sync error')
            expect(indicator).toBeInTheDocument()
        })

        it('should have error styling', () => {
            render(<SyncStatusIndicator showWhenNoActions={true} />)

            const indicator = screen.getByText('⚠️ Sync error')
            expect(indicator).toHaveStyle({
                backgroundColor: '#f44336'
            })
        })

        it('should show error details in tooltip', () => {
            render(<SyncStatusIndicator showWhenNoActions={true} />)

            const indicator = screen.getByText('⚠️ Sync error')
            expect(indicator).toHaveAttribute('title', 'Last error: Network timeout')
        })
    })

    describe('Styling and Props', () => {
        beforeEach(() => {
            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: false,
                    pendingActionsCount: 1,
                    lastSyncAt: new Date(),
                    lastSyncError: undefined
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: true
            })
        })

        it('should apply custom className', () => {
            render(<SyncStatusIndicator className="custom-class" />)

            const indicator = screen.getByText('⏳ 1 pending')
            expect(indicator).toHaveClass('custom-class')
        })

        it('should have proper positioning and styling', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 1 pending')
            expect(indicator).toHaveStyle({
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                padding: '8px 12px',
                transition: 'all 0.3s ease'
            })

            // Check that it has the correct background color for pending
            expect(indicator).toHaveStyle('background-color: #ff9800')
        })

        it('should have sync-status-indicator class', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 1 pending')
            expect(indicator).toHaveClass('sync-status-indicator')
        })
    })

    describe('Tooltip Behavior', () => {
        it('should show last sync time when available', () => {
            const lastSyncAt = new Date('2023-01-01T12:00:00Z')

            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: false,
                    pendingActionsCount: 0,
                    lastSyncAt,
                    lastSyncError: undefined
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: false
            })

            render(<SyncStatusIndicator showWhenNoActions={true} />)

            const indicator = screen.getByText('✅ All synced')
            expect(indicator).toHaveAttribute('title', `Last sync: ${lastSyncAt.toLocaleTimeString()}`)
        })

        it('should show default tooltip when no sync time or error', () => {
            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: false,
                    pendingActionsCount: 0,
                    lastSyncAt: undefined,
                    lastSyncError: undefined
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: false
            })

            render(<SyncStatusIndicator showWhenNoActions={true} />)

            const indicator = screen.getByText('✅ All synced')
            expect(indicator).toHaveAttribute('title', 'Sync status')
        })
    })

    describe('Click Handling', () => {
        it('should handle sync errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
            mockForceSyncNow.mockRejectedValue(new Error('Sync failed'))

            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: false,
                    pendingActionsCount: 1,
                    lastSyncAt: new Date(),
                    lastSyncError: undefined
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: true
            })

            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 1 pending')
            fireEvent.click(indicator)

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Manual sync failed:', expect.any(Error))
            })

            consoleSpy.mockRestore()
        })

        it('should not crash when forceSyncNow is undefined', () => {
            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: false,
                    pendingActionsCount: 1,
                    lastSyncAt: new Date(),
                    lastSyncError: undefined
                },
                forceSyncNow: undefined as any,
                clearPendingActions: vi.fn(),
                hasPendingActions: true
            })

            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 1 pending')

            // Should not crash when clicked
            expect(() => fireEvent.click(indicator)).not.toThrow()
        })
    })

    describe('Accessibility', () => {
        beforeEach(() => {
            mockUseOfflineSync.mockReturnValue({
                syncStatus: {
                    isOnline: true,
                    isSyncing: false,
                    pendingActionsCount: 2,
                    lastSyncAt: new Date(),
                    lastSyncError: undefined
                },
                forceSyncNow: mockForceSyncNow,
                clearPendingActions: vi.fn(),
                hasPendingActions: true
            })
        })

        it('should be visible and accessible', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 2 pending')
            expect(indicator).toBeVisible()
        })

        it('should have appropriate cursor styles for interactive states', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 2 pending')
            expect(indicator).toHaveStyle('cursor: pointer')
        })

        it('should provide meaningful tooltip information', () => {
            render(<SyncStatusIndicator />)

            const indicator = screen.getByText('⏳ 2 pending')
            expect(indicator).toHaveAttribute('title')
            expect(indicator.getAttribute('title')).toBeTruthy()
        })
    })
})
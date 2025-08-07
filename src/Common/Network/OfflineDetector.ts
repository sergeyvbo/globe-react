export interface NetworkStatus {
  isOnline: boolean
  isOffline: boolean
  lastOnlineAt?: Date
  lastOfflineAt?: Date
}

export type NetworkStatusListener = (status: NetworkStatus) => void

class OfflineDetectorService {
  private static instance: OfflineDetectorService
  private listeners: Set<NetworkStatusListener> = new Set()
  private currentStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine
  }

  private constructor() {
    this.initializeEventListeners()
    this.updateStatus(navigator.onLine)
  }

  static getInstance(): OfflineDetectorService {
    if (!OfflineDetectorService.instance) {
      OfflineDetectorService.instance = new OfflineDetectorService()
    }
    return OfflineDetectorService.instance
  }

  private initializeEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }

  private handleOnline(): void {
    this.updateStatus(true)
  }

  private handleOffline(): void {
    this.updateStatus(false)
  }

  private updateStatus(isOnline: boolean): void {
    const now = new Date()
    
    this.currentStatus = {
      isOnline,
      isOffline: !isOnline,
      lastOnlineAt: isOnline ? now : this.currentStatus.lastOnlineAt,
      lastOfflineAt: !isOnline ? now : this.currentStatus.lastOfflineAt
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.currentStatus)
      } catch (error) {
        console.error('Error in network status listener:', error)
      }
    })
  }

  // Subscribe to network status changes
  subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener)
    
    // Immediately call listener with current status
    listener(this.currentStatus)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Get current network status
  getStatus(): NetworkStatus {
    return { ...this.currentStatus }
  }

  // Check if currently online
  isOnline(): boolean {
    return this.currentStatus.isOnline
  }

  // Check if currently offline
  isOffline(): boolean {
    return this.currentStatus.isOffline
  }

  // Test network connectivity by making a simple request
  async testConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      } as RequestInit)
      
      const isConnected = response.ok
      
      // Update status if it differs from current
      if (isConnected !== this.currentStatus.isOnline) {
        this.updateStatus(isConnected)
      }
      
      return isConnected
    } catch (error) {
      console.warn('Connectivity test failed:', error)
      
      // Update status to offline if test fails
      if (this.currentStatus.isOnline) {
        this.updateStatus(false)
      }
      
      return false
    }
  }

  // Cleanup method
  destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this))
    window.removeEventListener('offline', this.handleOffline.bind(this))
    this.listeners.clear()
  }
}

export const offlineDetector = OfflineDetectorService.getInstance()
export default offlineDetector
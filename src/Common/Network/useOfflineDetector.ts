import { useState, useEffect } from 'react'
import { offlineDetector, NetworkStatus } from './OfflineDetector'

export interface UseOfflineDetectorResult {
  isOnline: boolean
  isOffline: boolean
  networkStatus: NetworkStatus
  testConnectivity: () => Promise<boolean>
}

export const useOfflineDetector = (): UseOfflineDetectorResult => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    const status = offlineDetector.getStatus()
    return status || {
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine
    }
  })

  useEffect(() => {
    const unsubscribe = offlineDetector.subscribe((status) => {
      if (status) {
        setNetworkStatus(status)
      }
    })

    return unsubscribe
  }, [])

  return {
    isOnline: networkStatus?.isOnline ?? navigator.onLine,
    isOffline: networkStatus?.isOffline ?? !navigator.onLine,
    networkStatus,
    testConnectivity: offlineDetector.testConnectivity.bind(offlineDetector)
  }
}

export default useOfflineDetector
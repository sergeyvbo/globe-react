import { useState, useEffect } from 'react'
import { offlineDetector, NetworkStatus } from './OfflineDetector'

export interface UseOfflineDetectorResult {
  isOnline: boolean
  isOffline: boolean
  networkStatus: NetworkStatus
  testConnectivity: () => Promise<boolean>
}

export const useOfflineDetector = (): UseOfflineDetectorResult => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    offlineDetector.getStatus()
  )

  useEffect(() => {
    const unsubscribe = offlineDetector.subscribe((status) => {
      setNetworkStatus(status)
    })

    return unsubscribe
  }, [])

  return {
    isOnline: networkStatus.isOnline,
    isOffline: networkStatus.isOffline,
    networkStatus,
    testConnectivity: offlineDetector.testConnectivity.bind(offlineDetector)
  }
}

export default useOfflineDetector
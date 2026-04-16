import { useState, useEffect, useRef, useCallback } from 'react'
import { locationsApi } from '../api/index'
import toast from 'react-hot-toast'

/**
 * GPS tracking hook for the driver dashboard.
 * Watches real device GPS and posts to the backend every intervalMs ms.
 */
export function useGeolocation(tripId, { enabled = false, intervalMs = 3000 } = {}) {
  const [position, setPosition] = useState(null)
  const [error,    setError]    = useState(null)
  const [posting,  setPosting]  = useState(false)

  const watchIdRef       = useRef(null)
  const intervalRef      = useRef(null)
  const lastPositionRef  = useRef(null)

  const postLocation = useCallback(async () => {
    if (!lastPositionRef.current || !tripId) return
    try {
      await locationsApi.postLocation(tripId, {
        latitude:  lastPositionRef.current.latitude,
        longitude: lastPositionRef.current.longitude,
        speed:     lastPositionRef.current.speed,
        heading:   lastPositionRef.current.heading,
        accuracy:  lastPositionRef.current.accuracy,
      })
    } catch {

    }
  }, [tripId])

  useEffect(() => {
    if (!enabled || !tripId) return

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = {
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed:     pos.coords.speed != null ? pos.coords.speed * 3.6 : null, // m/s → km/h
          heading:   pos.coords.heading,
          accuracy:  pos.coords.accuracy,
        }
        setPosition(loc)
        lastPositionRef.current = loc
        setError(null)
      },
      (err) => {
        setError(err.message)
        toast.error('GPS error: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 },
    )

    intervalRef.current = setInterval(postLocation, intervalMs)
    setPosting(true)

    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current)
      if (intervalRef.current)
        clearInterval(intervalRef.current)
      setPosting(false)
    }
  }, [enabled, tripId, intervalMs, postLocation])

  return { position, error, posting }
}
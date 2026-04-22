import { useEffect, useRef } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import useTripStore from '../store/tripStore'

window.Pusher = Pusher //make the pusher gloabal 

let echoInstance = null

function getEcho() {
  if (!echoInstance) {
    echoInstance = new Echo({
      broadcaster:       'reverb',
      key:               import.meta.env.VITE_REVERB_APP_KEY  || 'transport-key',
      wsHost:            import.meta.env.VITE_REVERB_HOST     || 'localhost',
      wsPort:            import.meta.env.VITE_REVERB_PORT     || 8080,
      wssPort:           import.meta.env.VITE_REVERB_PORT     || 8080,
      forceTLS:          (import.meta.env.VITE_REVERB_SCHEME  || 'http') === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint:      '/broadcasting/auth',
      auth: {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          Accept: 'application/json',
        },
      },
    })
  }
  return echoInstance
}

/**
 * Subscribe to a trip's private WebSocket channel.
 * Listens for location updates and trip status changes.
 */
export function useTripChannel(tripId) {
  const { onLocationUpdated, setCurrentTrip } = useTripStore()
  const channelRef = useRef(null)

  useEffect(() => {
    if (!tripId) return

    const echo    = getEcho()
    const channel = echo.private(`trip.${tripId}`)

    channel
      .listen('.location.updated', (data) => {
        onLocationUpdated(data)
      })
      .listen('.trip.status.changed', (data) => {
        setCurrentTrip((prev) =>
          prev ? { ...prev, status: data.new_status } : prev
        )
      })
      .error((err) => {
        console.warn('[Echo] Channel auth error:', err)
      })

    channelRef.current = channel

    return () => {
      echo.leave(`trip.${tripId}`)
      channelRef.current = null
    }
  }, [tripId])
}

export function disconnectEcho() {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}
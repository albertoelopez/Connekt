'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Coordinates, LocationState } from '@/types'

export function useLocation() {
  const [state, setState] = useState<LocationState>({
    coordinates: null,
    error: null,
    loading: true,
  })

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({
        coordinates: null,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      })
      return
    }

    setState((prev) => ({ ...prev, loading: true }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          error: null,
          loading: false,
        })
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.'
            break
        }
        setState({
          coordinates: null,
          error: errorMessage,
          loading: false,
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    )
  }, [])

  const updateUserLocation = useCallback(async (coordinates: Coordinates) => {
    try {
      await fetch('/api/users/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coordinates),
      })
    } catch (error) {
      console.error('Failed to update location:', error)
    }
  }, [])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  useEffect(() => {
    if (state.coordinates) {
      updateUserLocation(state.coordinates)
    }
  }, [state.coordinates, updateUserLocation])

  return {
    ...state,
    requestLocation,
  }
}

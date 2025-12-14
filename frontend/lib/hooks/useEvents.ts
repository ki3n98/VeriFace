import { useState, useEffect } from 'react'
import { apiClient } from '../api'

export interface Event {
  id: number
  event_name: string
  start_date?: string
  end_date?: string
  location?: string
  user_id?: number
}

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get<Event[]>('/protected/event/getEventsFromUser')
      
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setEvents(Array.isArray(response.data) ? response.data : [])
      }
      
      setLoading(false)
    }

    fetchEvents()
  }, [])

  const refetch = async () => {
    setLoading(true)
    const response = await apiClient.get<Event[]>('/protected/event/getEventsFromUser')
    
    if (response.error) {
      setError(response.error)
    } else if (response.data) {
      setEvents(Array.isArray(response.data) ? response.data : [])
    }
    
    setLoading(false)
  }

  return { events, loading, error, refetch }
}


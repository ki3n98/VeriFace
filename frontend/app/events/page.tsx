"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, X, Image as ImageIcon } from "lucide-react"
import { CreateEventModal } from "./components/CreateEventModal"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { useEvents } from "@/lib/hooks/useEvents"
import { apiClient } from "@/lib/api"

interface EventCreateResponse {
  id: number
  event_name: string
  user_id: number
  start_date?: string | null
  end_date?: string | null
  location?: string | null
}

export default function EventsPage() {
  const router = useRouter()
  const { events, loading, error, refetch } = useEvents()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleEventClick = (eventId: number) => {
    // Navigate to dashboard with event ID (can be used later for filtering)
    router.push(`/dashboard?eventId=${eventId}`)
  }

  const handleCreateEvent = async (eventData: {
    name: string
    location?: string
    participantCount?: number
    description?: string
    csvFile?: File | null
  }) => {
    try {
      const response = await apiClient.post<EventCreateResponse>('/protected/event/createEvent', {
        event_name: eventData.name,
        location: eventData.location,
        start_date: null, // You can add date pickers later
        end_date: null,
      })

      if (response.error) {
        alert(`Failed to create event: ${response.error}`)
        return
      }

      const eventId = response.data?.id
      if (!eventId) {
        alert('Event created but could not get event ID')
        return
      }

      // Upload CSV if provided
      if (eventData.csvFile && eventId) {
        try {
          const csvResponse = await apiClient.uploadCSV(eventId, eventData.csvFile)
          if (csvResponse.error) {
            alert(`Event created successfully, but CSV upload failed: ${csvResponse.error}`)
          } else {
            const csvData = csvResponse.data
            if (csvData.success) {
              alert(`Event created and ${csvData.total_rows} members added successfully!`)
            } else {
              alert(`Event created, but CSV upload had errors: ${csvData.message}`)
            }
          }
        } catch (csvError) {
          console.error('Error uploading CSV:', csvError)
          alert('Event created successfully, but CSV upload failed. You can upload it later.')
        }
      }

      // Refresh events list (if this fails, still close modal since event was created)
      try {
        await refetch()
      } catch (refetchError) {
        console.error('Error refreshing events list:', refetchError)
        // Event was created successfully, so we still close the modal
        // User can manually refresh the page to see the new event
      }
      setIsCreateModalOpen(false)
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Failed to create event. Please try again.')
    }
  }

  const handleDeleteEventClick = (eventId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setEventToDelete(eventId)
  }

  const handleConfirmDeleteEvent = async () => {
    if (eventToDelete === null) return
    setIsDeleting(true)
    try {
      const response = await apiClient.removeEvent(eventToDelete)
      if (response.error) {
        alert(`Failed to delete event: ${response.error}`)
        throw new Error(response.error)
      }
      await refetch()
    } catch (error) {
      console.error("Error deleting event:", error)
      throw error // Keep dialog open so user can retry or cancel
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background2 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-muted-foreground">Loading events...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background2">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="VeriFace Logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold">VeriFace</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-foreground2 mb-2">Select Event</h2>
          <p className="text-muted-foreground">
            After logging in, users see all classes or events they belong to. Users can select an
            existing event or create a new one.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error loading events: {error}
          </div>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Event Cards */}
          {events.map((event) => (
            <Card
              key={event.id}
              className="cursor-pointer hover:shadow-lg transition-shadow relative group"
              onClick={() => handleEventClick(event.id)}
            >
              <CardContent className="p-6">
                {/* Delete button - appears on hover */}
                <button
                  onClick={(e) => handleDeleteEventClick(event.id, e)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  aria-label="Delete event"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Event Image Placeholder */}
                <div className="w-full h-48 bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                </div>

                {/* Event Info */}
                <h3 className="text-xl font-semibold text-foreground2 mb-2">{event.event_name}</h3>
                {event.location && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <span className="font-medium">Location:</span> {event.location}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Create Event Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-secondary/40 hover:border-secondary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <CardContent className="p-6 h-full flex flex-col items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary/10 rounded-full mb-4">
                  <Plus className="h-10 w-10 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground2 mb-2">Create Class or Event</h3>
                <p className="text-sm text-muted-foreground">Click to add a new event or class</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEvent}
      />

      {/* Delete Event Confirmation */}
      <DeleteConfirmDialog
        isOpen={eventToDelete !== null}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDeleteEvent}
        title="Delete Event"
        message={`Are you sure you want to delete "${events.find((e) => e.id === eventToDelete)?.event_name ?? "this event"}"? This will remove the event and all associated data. This action cannot be undone.`}
        confirmLabel="Delete Event"
        isLoading={isDeleting}
      />
    </div>
  )
}


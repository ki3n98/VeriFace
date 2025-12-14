"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, X, Image as ImageIcon } from "lucide-react"
import { CreateEventModal } from "./components/CreateEventModal"

interface Event {
  id: number
  name: string
  location?: string
  participantCount?: number
  imageUrl?: string
}

// Hardcoded events data
const initialEvents: Event[] = [
  {
    id: 1,
    name: "CECS 491A",
    location: "CSULB",
    participantCount: 45,
  },
  {
    id: 2,
    name: "MarinaHacks",
    location: "Marina",
    participantCount: 120,
  },
  {
    id: 3,
    name: "CS Job Fair",
    location: "CSULB",
    participantCount: 300,
  },
  {
    id: 4,
    name: "CECS 329",
    location: "CSULB",
    participantCount: 60,
  },
  {
    id: 5,
    name: "CECS 325",
    location: "CSULB",
    participantCount: 55,
  },
]

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleEventClick = (eventId: number) => {
    // Navigate to dashboard with event ID (can be used later for filtering)
    router.push(`/dashboard?eventId=${eventId}`)
  }

  const handleCreateEvent = (eventData: {
    name: string
    location?: string
    participantCount?: number
    description?: string
  }) => {
    const newEvent: Event = {
      id: events.length > 0 ? Math.max(...events.map((e) => e.id)) + 1 : 1,
      name: eventData.name,
      location: eventData.location,
      participantCount: eventData.participantCount,
    }
    setEvents([...events, newEvent])
    setIsCreateModalOpen(false)
  }

  const handleDeleteEvent = (eventId: number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the card click
    if (confirm("Are you sure you want to delete this event?")) {
      setEvents(events.filter((event) => event.id !== eventId))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-purple-600 text-white shadow-md">
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
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Select Event</h2>
          <p className="text-gray-600">
            After logging in, users see all classes or events they belong to. Users can select an
            existing event or create a new one.
          </p>
        </div>

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
                  onClick={(e) => handleDeleteEvent(event.id, e)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  aria-label="Delete event"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Event Image Placeholder */}
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <ImageIcon className="h-16 w-16 text-gray-400" />
                  )}
                </div>

                {/* Event Info */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{event.name}</h3>
                {event.location && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Location:</span> {event.location}
                  </p>
                )}
                {event.participantCount !== undefined && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Participants:</span> {event.participantCount}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Create Event Card */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-purple-400 hover:border-purple-600"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <CardContent className="p-6 h-full flex flex-col items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
                  <Plus className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Class or Event</h3>
                <p className="text-sm text-gray-600">Click to add a new event or class</p>
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
    </div>
  )
}


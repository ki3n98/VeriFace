"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Upload, Image as ImageIcon } from "lucide-react"
import { apiClient } from "@/lib/api"

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (eventData: {
    name: string
    location?: string
    participantCount?: number
    description?: string
    csvFile?: File | null
  }) => void
}

export function CreateEventModal({ isOpen, onClose, onSubmit }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    participantCount: "",
    description: "",
    inviteLink: "https://invited-to-event",
  })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isUploadingCSV, setIsUploadingCSV] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file')
        return
      }
      setCsvFile(file)
    }
  }

  const handleCSVUpload = async (eventId: number) => {
    if (!csvFile) return

    setIsUploadingCSV(true)
    try {
      const response = await apiClient.uploadCSV(eventId, csvFile)
      if (response.error) {
        alert(`Failed to upload CSV: ${response.error}`)
      } else {
        const data = response.data
        if (data.success) {
          alert(`Successfully added ${data.total_rows} members to the event!`)
        } else {
          alert(`CSV upload completed with errors. ${data.message}`)
        }
        setCsvFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      console.error('Error uploading CSV:', error)
      alert('Failed to upload CSV. Please try again.')
    } finally {
      setIsUploadingCSV(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert("Please enter an event name")
      return
    }

    // Create event first, CSV upload will be handled in parent component
    onSubmit({
      name: formData.name,
      location: formData.location || undefined,
      participantCount: formData.participantCount
        ? parseInt(formData.participantCount)
        : undefined,
      description: formData.description || undefined,
      csvFile: csvFile,
    })

    // Reset form
    setFormData({
      name: "",
      location: "",
      participantCount: "",
      description: "",
      inviteLink: "https://invited-to-event",
    })
    setCsvFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Add Class/Event</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left side - Image placeholder */}
              <div className="space-y-4">
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Event Image</p>
                    <p className="text-xs text-gray-400 mt-1">(Optional)</p>
                  </div>
                </div>
                <Button type="button" variant="outline" className="w-full" disabled>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image (Coming Soon)
                </Button>
              </div>

              {/* Right side - Form fields */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name of Event <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter event name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="participantCount"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Number of Participants
                  </label>
                  <input
                    id="participantCount"
                    type="number"
                    min="1"
                    value={formData.participantCount}
                    onChange={(e) => setFormData({ ...formData, participantCount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter number of participants"
                  />
                </div>

                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter location"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter event description"
                  />
                </div>

                <div>
                  <label
                    htmlFor="inviteLink"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Unique Invite Link
                  </label>
                  <input
                    id="inviteLink"
                    type="text"
                    value={formData.inviteLink}
                    onChange={(e) => setFormData({ ...formData, inviteLink: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    placeholder="https://invited-to-event"
                    readOnly
                  />
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingCSV}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {csvFile ? csvFile.name : "Upload members.csv"}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Upload a list of members&apos; names and emails (CSV format: first_name, last_name, email)
                  </p>
                  {csvFile && (
                    <p className="text-xs text-green-600 mt-1">
                      File selected: {csvFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


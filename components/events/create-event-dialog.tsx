'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useLocation } from '@/hooks/useLocation'
import { Loader2 } from 'lucide-react'

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  groupId?: string
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onSuccess,
  groupId,
}: CreateEventDialogProps) {
  const { toast } = useToast()
  const { coordinates } = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    isOnline: false,
    meetingUrl: '',
    address: '',
    city: '',
    state: '',
    maxAttendees: '',
    useLocation: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
      const endDateTime = formData.endDate && formData.endTime
        ? new Date(`${formData.endDate}T${formData.endTime}`)
        : undefined

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime?.toISOString(),
          isOnline: formData.isOnline,
          meetingUrl: formData.isOnline ? formData.meetingUrl : undefined,
          address: !formData.isOnline ? formData.address : undefined,
          city: !formData.isOnline ? formData.city : undefined,
          state: !formData.isOnline ? formData.state : undefined,
          latitude: !formData.isOnline && formData.useLocation ? coordinates?.latitude : undefined,
          longitude: !formData.isOnline && formData.useLocation ? coordinates?.longitude : undefined,
          maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : undefined,
          groupId,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Event Created',
          description: 'Your event has been created successfully.',
        })
        setFormData({
          title: '',
          description: '',
          startDate: '',
          startTime: '',
          endDate: '',
          endTime: '',
          isOnline: false,
          meetingUrl: '',
          address: '',
          city: '',
          state: '',
          maxAttendees: '',
          useLocation: true,
        })
        onSuccess()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to create event',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create event',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create an Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., Weekly Prayer Meeting"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="What is this event about?"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData((p) => ({ ...p, startTime: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((p) => ({ ...p, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isOnline">Online Event</Label>
              <p className="text-xs text-muted-foreground">
                This event will be virtual
              </p>
            </div>
            <Switch
              id="isOnline"
              checked={formData.isOnline}
              onCheckedChange={(checked) => setFormData((p) => ({ ...p, isOnline: checked }))}
            />
          </div>

          {formData.isOnline ? (
            <div className="space-y-2">
              <Label htmlFor="meetingUrl">Meeting URL</Label>
              <Input
                id="meetingUrl"
                type="url"
                value={formData.meetingUrl}
                onChange={(e) => setFormData((p) => ({ ...p, meetingUrl: e.target.value }))}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="useLocation">Use My Location</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow nearby discovery
                  </p>
                </div>
                <Switch
                  id="useLocation"
                  checked={formData.useLocation}
                  onCheckedChange={(checked) => setFormData((p) => ({ ...p, useLocation: checked }))}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="maxAttendees">Max Attendees (optional)</Label>
            <Input
              id="maxAttendees"
              type="number"
              min="1"
              value={formData.maxAttendees}
              onChange={(e) => setFormData((p) => ({ ...p, maxAttendees: e.target.value }))}
              placeholder="Leave empty for unlimited"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

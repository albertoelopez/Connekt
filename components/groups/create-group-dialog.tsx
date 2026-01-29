'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useLocation } from '@/hooks/useLocation'
import { Loader2 } from 'lucide-react'

const groupTypes = [
  { value: 'CHURCH', label: 'Church' },
  { value: 'BIBLE_STUDY', label: 'Bible Study' },
  { value: 'PRAYER_CIRCLE', label: 'Prayer Circle' },
  { value: 'FELLOWSHIP', label: 'Fellowship' },
  { value: 'OTHER', label: 'Other' },
]

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateGroupDialog({ open, onOpenChange, onSuccess }: CreateGroupDialogProps) {
  const { toast } = useToast()
  const { coordinates } = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'OTHER',
    isPrivate: false,
    city: '',
    state: '',
    useLocation: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          type: formData.type,
          isPrivate: formData.isPrivate,
          city: formData.city || undefined,
          state: formData.state || undefined,
          latitude: formData.useLocation ? coordinates?.latitude : undefined,
          longitude: formData.useLocation ? coordinates?.longitude : undefined,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Group Created',
          description: 'Your group has been created successfully.',
        })
        setFormData({
          name: '',
          description: '',
          type: 'OTHER',
          isPrivate: false,
          city: '',
          state: '',
          useLocation: true,
        })
        onSuccess()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to create group',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Downtown Bible Study"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="What is your group about?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Group Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData((p) => ({ ...p, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))}
                placeholder="State"
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

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isPrivate">Private Group</Label>
              <p className="text-xs text-muted-foreground">
                Only visible to members
              </p>
            </div>
            <Switch
              id="isPrivate"
              checked={formData.isPrivate}
              onCheckedChange={(checked) => setFormData((p) => ({ ...p, isPrivate: checked }))}
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
                'Create Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

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
import { Loader2 } from 'lucide-react'

const categories = [
  { value: 'HEALTH', label: 'Health' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'WORK', label: 'Work' },
  { value: 'SPIRITUAL', label: 'Spiritual Growth' },
  { value: 'RELATIONSHIPS', label: 'Relationships' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'OTHER', label: 'Other' },
]

interface CreatePrayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  groupId?: string
}

export function CreatePrayerDialog({
  open,
  onOpenChange,
  onSuccess,
  groupId,
}: CreatePrayerDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'OTHER',
    isAnonymous: false,
    isPrivate: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/prayer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          groupId,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Prayer Request Created',
          description: 'Your prayer request has been shared.',
        })
        setFormData({
          title: '',
          content: '',
          category: 'OTHER',
          isAnonymous: false,
          isPrivate: false,
        })
        onSuccess()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to create prayer request',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create prayer request',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share a Prayer Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              placeholder="Brief summary of your prayer request"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Prayer Request *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))}
              placeholder="Share the details of your prayer request..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData((p) => ({ ...p, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isAnonymous">Post Anonymously</Label>
              <p className="text-xs text-muted-foreground">
                Hide your name from others
              </p>
            </div>
            <Switch
              id="isAnonymous"
              checked={formData.isAnonymous}
              onCheckedChange={(checked) =>
                setFormData((p) => ({ ...p, isAnonymous: checked }))
              }
            />
          </div>

          {!groupId && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isPrivate">Private Request</Label>
                <p className="text-xs text-muted-foreground">
                  Only visible to you
                </p>
              </div>
              <Switch
                id="isPrivate"
                checked={formData.isPrivate}
                onCheckedChange={(checked) =>
                  setFormData((p) => ({ ...p, isPrivate: checked }))
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                'Share Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { getInitials } from '@/lib/utils'
import { DENOMINATIONS, SPIRITUAL_INTERESTS } from '@/types'
import { Loader2, Camera, X } from 'lucide-react'

interface ProfileEditFormProps {
  profile: {
    name: string
    image?: string | null
    bio: string | null
    denomination: string | null
    spiritualInterests: string[]
    city: string | null
    state: string | null
    locationSharing: boolean
  }
  onCancel: () => void
  onSave: () => void
}

export function ProfileEditForm({ profile, onCancel, onSave }: ProfileEditFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(profile.image || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: profile.name,
    image: profile.image || null as string | null,
    bio: profile.bio || '',
    denomination: profile.denomination || '',
    spiritualInterests: profile.spiritualInterests,
    city: profile.city || '',
    state: profile.state || '',
    locationSharing: profile.locationSharing,
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Only JPEG, PNG, GIF, and WebP images are allowed.',
        variant: 'destructive',
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB.',
        variant: 'destructive',
      })
      return
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)

    // Upload to server
    setIsUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)
      uploadData.append('type', 'avatar')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData,
      })

      if (response.ok) {
        const data = await response.json()
        setFormData((prev) => ({ ...prev, image: data.url }))
        setImagePreview(data.url)
        toast({
          title: 'Image uploaded',
          description: 'Your profile photo has been uploaded.',
        })
      } else {
        const data = await response.json()
        // Revert preview on failure
        setImagePreview(profile.image || null)
        toast({
          title: 'Upload failed',
          description: data.error || 'Failed to upload image.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      setImagePreview(profile.image || null)
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: null }))
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been successfully updated.',
        })
        onSave()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to update profile',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      spiritualInterests: prev.spiritualInterests.includes(interest)
        ? prev.spiritualInterests.filter((i) => i !== interest)
        : [...prev.spiritualInterests, interest],
    }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={imagePreview || undefined} alt={formData.name} />
                  <AvatarFallback className="text-xl">
                    {getInitials(formData.name)}
                  </AvatarFallback>
                </Avatar>
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {imagePreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={isUploading}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove Photo
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, GIF or WebP. Max 5MB.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Tell others about yourself and your faith journey..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="denomination">Denomination</Label>
            <Select
              value={formData.denomination}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, denomination: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your denomination" />
              </SelectTrigger>
              <SelectContent>
                {DENOMINATIONS.map((denomination) => (
                  <SelectItem key={denomination} value={denomination}>
                    {denomination}
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, city: e.target.value }))
                }
                placeholder="Your city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, state: e.target.value }))
                }
                placeholder="Your state"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="locationSharing">Location Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to discover you based on location
              </p>
            </div>
            <Switch
              id="locationSharing"
              checked={formData.locationSharing}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, locationSharing: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Spiritual Interests</Label>
            <p className="text-sm text-muted-foreground">
              Select interests to help others connect with you
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {SPIRITUAL_INTERESTS.map((interest) => (
                <div key={interest} className="flex items-center space-x-2">
                  <Checkbox
                    id={interest}
                    checked={formData.spiritualInterests.includes(interest)}
                    onCheckedChange={() => toggleInterest(interest)}
                  />
                  <label
                    htmlFor={interest}
                    className="text-sm cursor-pointer"
                  >
                    {interest}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

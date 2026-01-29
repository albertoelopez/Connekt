'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { DENOMINATIONS, SPIRITUAL_INTERESTS } from '@/types'
import { Loader2 } from 'lucide-react'

interface ProfileEditFormProps {
  profile: {
    name: string
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
  const [formData, setFormData] = useState({
    name: profile.name,
    bio: profile.bio || '',
    denomination: profile.denomination || '',
    spiritualInterests: profile.spiritualInterests,
    city: profile.city || '',
    state: profile.state || '',
    locationSharing: profile.locationSharing,
  })

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

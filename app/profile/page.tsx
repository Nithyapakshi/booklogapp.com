"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProfileService } from "@/lib/services/profile-service"
import type { Profile } from "@/types/database"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    async function loadProfile() {
      try {
        const userProfile = await ProfileService.fetchUserProfile()
        setProfile(userProfile)
        if (userProfile) {
          setFormData({
            name: userProfile.name,
            email: userProfile.email,
          })
        }
      } catch (error) {
        console.error("Error loading profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile",
          type: "error",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [toast])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const updatedProfile = await ProfileService.updateProfile({
        name: formData.name,
        email: formData.email,
      })

      setProfile(updatedProfile)
      setIsEditing(false)
      toast({
        title: "Success",
        description: "Profile updated successfully",
        type: "success",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        type: "error",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">BookLog</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/books" className="text-sm font-medium flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{profile?.name}</span>
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                {initials}
              </div>
            </div>
          </nav>
        </div>
      </header>

      <div className="container py-8">
        <Link href="/books" className="flex items-center text-primary mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Books
        </Link>

        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Profile Settings</h1>
            {!isEditing && <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl">
                  {initials}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{profile?.name}</h2>
                  <p className="text-gray-600">{profile?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{profile?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{profile?.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

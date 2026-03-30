"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  // In a real app, this would come from authentication context
  // For now, we'll hardcode it for demonstration
  const [user, setUser] = useState({
    firstName: "Pakshiraj",
    lastName: "Armano",
    email: "pakshiraj@example.com",
    initials: "PA",
  })

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setUser({
      ...user,
      ...formData,
      initials: `${formData.firstName[0]}${formData.lastName[0]}`,
    })
    setIsEditing(false)
  }

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
              <span className="text-sm font-medium">{user.firstName}</span>
              <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                {user.initials}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} />
                </div>
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
                  {user.initials}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">First Name</p>
                  <p className="font-medium">{user.firstName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Name</p>
                  <p className="font-medium">{user.lastName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"

interface ToastProps {
  title: string
  description?: string
  type?: "default" | "success" | "error" | "warning"
  duration?: number
}

interface Toast extends ToastProps {
  id: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ title, description, type = "default", duration = 3000 }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, title, description, type, duration }

    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)

    return id
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return {
    toast,
    dismiss,
    toasts,
  }
}

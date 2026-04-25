"use client"

import { useState, useEffect } from "react"

interface ToastProps {
  title: string
  description?: string
  type?: "default" | "success" | "error" | "warning"
  duration?: number
}

interface Toast extends ToastProps {
  id: string
}

// Global singleton state
let globalToasts: Toast[] = []
const listeners: Array<(toasts: Toast[]) => void> = []

function notifyListeners() {
  listeners.forEach((l) => l([...globalToasts]))
}

function addToast({ title, description, type = "default", duration = 3000 }: ToastProps) {
  const id = Math.random().toString(36).substring(2, 9)
  const newToast: Toast = { id, title, description, type, duration }
  globalToasts = [...globalToasts, newToast]
  notifyListeners()
  setTimeout(() => {
    globalToasts = globalToasts.filter((t) => t.id !== id)
    notifyListeners()
  }, duration)
  return id
}

function dismissToast(id: string) {
  globalToasts = globalToasts.filter((t) => t.id !== id)
  notifyListeners()
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(globalToasts)

  useEffect(() => {
    listeners.push(setToasts)
    return () => {
      const index = listeners.indexOf(setToasts)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])

  return {
    toasts,
    toast: addToast,
    dismiss: dismissToast,
  }
}

"use client"

import { useEffect, useState } from "react"
import { CheckCircle, AlertCircle, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function Toast() {
  const { toasts, dismiss } = useToast()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center p-4 rounded-md shadow-md min-w-[300px] max-w-md
            animate-in fade-in slide-in-from-bottom-5
            ${
              toast.type === "success"
                ? "bg-green-50 border-l-4 border-green-500"
                : toast.type === "error"
                  ? "bg-red-50 border-l-4 border-red-500"
                  : toast.type === "warning"
                    ? "bg-yellow-50 border-l-4 border-yellow-500"
                    : "bg-white border"
            }
          `}
        >
          <div className="mr-3">
            {toast.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : toast.type === "error" ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : toast.type === "warning" ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : null}
          </div>
          <div className="flex-1">
            <h4 className="font-medium">{toast.title}</h4>
            {toast.description && <p className="text-sm text-gray-600">{toast.description}</p>}
          </div>
          <button onClick={() => dismiss(toast.id)} className="ml-auto">
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      ))}
    </div>
  )
}

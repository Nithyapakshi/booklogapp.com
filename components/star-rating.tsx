"use client"

import { useState } from "react"
import { Star } from "lucide-react"

interface StarRatingProps {
  rating?: number
  maxRating?: number
  size?: number
  interactive?: boolean
  onRatingChange?: (rating: number) => void
  className?: string
}

export function StarRating({
  rating = 0,
  maxRating = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  className = "",
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)
  const [selectedRating, setSelectedRating] = useState(rating)

  const handleClick = (index: number) => {
    if (!interactive) return
    const newRating = index === selectedRating ? 0 : index
    setSelectedRating(newRating)
    onRatingChange?.(newRating)
  }

  const displayRating = hoverRating || selectedRating || rating

  return (
    <div className={`flex items-center ${className}`}>
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1
        return (
          <Star
            key={index}
            size={size}
            className={`${
              starValue <= displayRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
            } ${interactive ? "cursor-pointer" : ""}`}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => handleClick(starValue)}
          />
        )
      })}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { 
  BookmarkRequest, 
  BookmarkResponse, 
  checkBookmark, 
  toggleBookmark 
} from "@/lib/api"

interface BookmarkButtonProps {
  recipe: {
    id: string
    name: string
    description?: string
    ingredients?: string[]
    cookingMethods?: string[]
    cookingTime?: string
    servings?: string
    difficulty?: string
    category?: string
  }
  size?: "sm" | "md" | "lg"
  variant?: "default" | "outline" | "ghost"
}

export function BookmarkButton({ 
  recipe, 
  size = "md", 
  variant = "outline" 
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // 컴포넌트 마운트 시 북마크 상태 확인
  useEffect(() => {
    checkBookmarkStatus()
  }, [recipe.id])

  const checkBookmarkStatus = async () => {
    try {
      const response: BookmarkResponse = await checkBookmark(recipe.id)
      setIsBookmarked(response.isBookmarked || false)
    } catch (error) {
      console.error("북마크 상태 확인 실패:", error)
    }
  }

  const handleBookmarkToggle = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const bookmarkRequest: BookmarkRequest = {
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeDescription: recipe.description,
        ingredients: recipe.ingredients,
        cookingMethods: recipe.cookingMethods,
        cookingTime: recipe.cookingTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        category: recipe.category
      }

      const response: BookmarkResponse = await toggleBookmark(recipe.id, bookmarkRequest)
      
      if (response.success) {
        setIsBookmarked(response.isBookmarked || false)
        toast({
          title: "북마크",
          description: response.message,
        })
      } else {
        toast({
          title: "오류",
          description: response.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("북마크 토글 실패:", error)
      toast({
        title: "오류",
        description: "북마크 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const buttonSize = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  }[size]

  const iconSize = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }[size]

  return (
    <Button
      variant={variant}
      size="icon"
      className={buttonSize}
      onClick={handleBookmarkToggle}
      disabled={isLoading}
      aria-label={isBookmarked ? "북마크 제거" : "북마크 추가"}
    >
      {isBookmarked ? (
        <BookmarkCheck className={`${iconSize} text-yellow-500`} />
      ) : (
        <Bookmark className={iconSize} />
      )}
    </Button>
  )
}

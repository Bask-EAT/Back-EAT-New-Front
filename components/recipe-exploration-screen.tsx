"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ChefHat, Bookmark, BookmarkCheck, ShoppingCart, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UIRecipe } from "../src/types"
import { backendFetch } from "@/lib/api"


interface IngredientItem {
  name: string
  amount: string
  unit: string
  optional?: boolean
}

interface RecipeExplorationScreenProps {
  recipes: UIRecipe[]
  bookmarkedRecipes: string[]
  onBookmarkToggle: (recipeId: string) => void
  onAddToCart: (ingredient: { name: string; amount: string; unit: string }) => void
  isRightSidebarOpen?: boolean
  currentChatId?: string | null
}

export function RecipeExplorationScreen({
  recipes = [],
  bookmarkedRecipes = [],
  onBookmarkToggle,
  onAddToCart,
  isRightSidebarOpen = false,
  currentChatId,
}: RecipeExplorationScreenProps) {
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number>(0)
  const [recipesWithDetails, setRecipesWithDetails] = useState<UIRecipe[]>(recipes)

  const selectedRecipe = recipesWithDetails[selectedRecipeIndex]

  // 레시피 상세 정보 로드
  const loadRecipeDetails = async (recipe: UIRecipe) => {
    if (!currentChatId || !recipe.id || recipe.ingredients.length > 0) return
    
    try {
      console.log('[RECIPE] 상세 정보 로드 시작:', { chatId: currentChatId, messageId: recipe.id })
      
      // 백엔드 API 호출
      const response = await backendFetch(`/api/users/chats/${currentChatId}/recipes/${recipe.id}`)
      console.log('[RECIPE] API 응답 상태:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[RECIPE] API 응답 데이터:', data)
        const recipes = data.data || []
        console.log('[RECIPE] recipes 배열:', recipes)
        
        if (recipes.length > 0) {
          const recipeData = recipes[0]
          console.log('[RECIPE] 첫 번째 레시피 데이터:', recipeData)
          console.log('[RECIPE] ingredients 필드:', recipeData.ingredients)
          console.log('[RECIPE] recipe 필드:', recipeData.recipe)
          console.log('[RECIPE] instructions 필드:', recipeData.instructions)
          
          const updatedRecipe: UIRecipe = {
            ...recipe,
            ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients.map((ing: any) => ({
              name: ing.name || ing.item || "",
              amount: ing.amount || "",
              unit: ing.unit || "",
              optional: false
            })) : [],
            instructions: Array.isArray(recipeData.recipe) ? recipeData.recipe : Array.isArray(recipeData.instructions) ? recipeData.instructions : []
          }
          
          console.log('[RECIPE] 업데이트된 레시피:', updatedRecipe)
          console.log('[RECIPE] ingredients 개수:', updatedRecipe.ingredients.length)
          console.log('[RECIPE] instructions 개수:', updatedRecipe.instructions.length)
          
          setRecipesWithDetails(prev => 
            prev.map(r => r.id === recipe.id ? updatedRecipe : r)
          )
        } else {
          console.log('[RECIPE] recipes 배열이 비어있음')
        }
      } else {
        console.error('[RECIPE] API 응답 실패:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('[RECIPE] 에러 응답 내용:', errorText)
      }
    } catch (error) {
      console.error('[RECIPE] 레시피 상세 정보 로드 실패:', error)
    }
  }

  // 레시피 선택 시 상세 정보 로드
  const handleRecipeSelect = (index: number) => {
    setSelectedRecipeIndex(index)
    const recipe = recipesWithDetails[index]
    if (recipe && recipe.ingredients.length === 0) {
      loadRecipeDetails(recipe)
    }
  }

  // recipes prop이 변경되면 recipesWithDetails도 업데이트
  useEffect(() => {
    setRecipesWithDetails(recipes)
  }, [recipes])

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Recipe List - Dynamic position based on sidebar state */}
      <div
        className={cn(
          "fixed top-4 w-64 z-10 transition-all duration-300",
          isRightSidebarOpen ? "right-84" : "right-16",
        )}
      >
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Recipes ({recipes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 레시피 리스트 전용 스크롤 */}
            <ScrollArea className="h-[calc(100vh-10rem)] pr-2">
              <div className="space-y-2">
                {recipes.map((recipe, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                      selectedRecipeIndex === index
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800",
                    )}
                    onClick={() => handleRecipeSelect(index)}
                  >
                    <span className="text-sm font-medium truncate flex-1">{recipe.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation()
                        onBookmarkToggle(recipe.id)
                      }}
                    >
                      {bookmarkedRecipes.includes(recipe.id) ? (
                        <BookmarkCheck className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Recipe Content */}
      <div className={cn("flex-1 p-6 transition-all duration-300", isRightSidebarOpen ? "pr-96" : "pr-84")}>
        {selectedRecipe ? (
          <ScrollArea className="h-[calc(100vh-2rem)] pr-2">
            <div className="max-w-4xl mx-auto">
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-3xl mb-2">{selectedRecipe.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-4">
                        {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                          <Badge variant="outline" className="capitalize">{selectedRecipe.tags[0]}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Ingredients ({selectedRecipe.ingredients.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedRecipe.ingredients.map((ingredient, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex-1">
                            <span className="font-medium">
                              {ingredient.name}
                              {(ingredient.amount || ingredient.unit) && (
                                <span className="text-sm text-gray-500 ml-2">
                                  {ingredient.amount} {ingredient.unit}
                                </span>
                              )}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAddToCart({ name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit })}
                            className="ml-2"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recipe Steps ({selectedRecipe.instructions.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedRecipe.instructions.map((step, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl">No recipes available</p>
              <p>Start a conversation to get recipe suggestions!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ChefHat, Bookmark, BookmarkCheck, ShoppingCart, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UIRecipe } from "../src/types"

interface IngredientItem {
  name: string
  amount: string
  unit: string
  optional?: boolean
}

interface RecipeExplorationScreenProps {
  recipes: UIRecipe[]
  // 누적된 레시피 목록 추가
  accumulatedRecipes?: Array<{
    messageId: string;
    content: string;
    timestamp: number;
    recipes: any[];
  }>
  bookmarkedRecipes: string[]
  onBookmarkToggle: (recipeId: string) => void
  onAddToCart: (ingredient: { name: string; amount: string; unit: string }) => void
  isRightSidebarOpen?: boolean
}

export function RecipeExplorationScreen({
  recipes = [],
  accumulatedRecipes = [],
  bookmarkedRecipes = [],
  onBookmarkToggle,
  onAddToCart,
  isRightSidebarOpen = false,
}: RecipeExplorationScreenProps) {
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number>(0)

  // 누적된 레시피 목록만 표시 (최신 데이터가 아래로 쌓이도록 정렬)
  const displayRecipes = accumulatedRecipes
    .sort((a, b) => a.timestamp - b.timestamp) // 시간순 정렬 (오래된 것부터)
    .flatMap(item => 
      item.recipes.map((r: any, index: number) => ({
        id: `accumulated_${item.messageId}_${index}`,
        name: r.food_name || r.title || `Recipe ${index + 1}`,
        description: `${r.source === "video" ? "영상" : r.source === "ingredient_search" ? "상품" : "텍스트"} 기반 레시피`,
        prepTime: "준비 시간 미정",
        cookTime: "조리 시간 미정",
        servings: 1,
        difficulty: "Medium",
        ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map((ing: any) => ({
          name: ing.product_name || ing.item || "",
          amount: ing.amount || "",
          unit: ing.unit || "",
          optional: false
        })),
        instructions: Array.isArray(r.recipe) ? r.recipe : Array.isArray(r.steps) ? r.steps : [],
        tags: [r.source === "video" ? "영상레시피" : r.source === "ingredient_search" ? "상품" : "텍스트레시피"],
        image: `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(r.food_name || r.title || '')}`,
        timestamp: item.timestamp
      }))
    )

  const selectedRecipe = displayRecipes[selectedRecipeIndex]

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
              Recipes ({displayRecipes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 레시피 리스트 전용 스크롤 */}
            <ScrollArea className="h-[calc(100vh-10rem)] pr-2">
              <div className="space-y-2">
                {displayRecipes.map((recipe, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
                      selectedRecipeIndex === index
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800",
                    )}
                    onClick={() => setSelectedRecipeIndex(index)}
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

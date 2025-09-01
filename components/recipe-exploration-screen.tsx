"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ChefHat, Bookmark, BookmarkCheck, ShoppingCart, Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UIRecipe } from "../src/types"
import { backendFetch, searchIngredientAndAddToCart, addToCart } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"


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
  onAddProductToCart?: (cartRecipe: any) => void
  isRightSidebarOpen?: boolean
  currentChatId?: string | null
  cartItems?: any[] // 장바구니 아이템 추가
}

export function RecipeExplorationScreen({
  recipes = [],
  bookmarkedRecipes = [],
  onBookmarkToggle,
  onAddToCart,
  onAddProductToCart,
  isRightSidebarOpen = false,
  currentChatId,
  cartItems = [], // 기본값 설정
}: RecipeExplorationScreenProps) {
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number>(0)
  const [recipesWithDetails, setRecipesWithDetails] = useState<UIRecipe[]>(recipes)

  const selectedRecipe = recipesWithDetails[selectedRecipeIndex]

  // 재료가 장바구니에 있는지 확인하는 함수
  const isIngredientInCart = (ingredientName: string): boolean => {
    return cartItems.some((item: any) => {
      // cartItems의 구조에 따라 확인
      if (item.food_name) {
        return item.food_name === ingredientName
      }
      if (item.name) {
        return item.name === ingredientName
      }
      return false
    })
  }

  // 레시피 상세 정보 로드
  const loadRecipeDetails = async (recipe: UIRecipe) => {
    if (!currentChatId || !recipe.id || recipe.ingredients.length > 0) return
    
    try {
      console.log('[RECIPE] 상세 정보 로드 시작:', { chatId: currentChatId, messageId: recipe.id })
      
      // 백엔드 API 호출
      const response = await backendFetch(`/api/users/me/chats/${currentChatId}/recipes/${recipe.id}`)
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
          "fixed top-4 w-56 z-50 transition-all duration-300",
          isRightSidebarOpen ? "right-[31rem]" : "right-16",
        )}
      >
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Recipes ({recipes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {/* 레시피 리스트 전용 스크롤 */}
            <ScrollArea className="h-[calc(100vh-12rem)] pr-1">
              <div className="space-y-2">
                {recipes.map((recipe, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors",
                      selectedRecipeIndex === index
                        ? "bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800",
                    )}
                    onClick={() => handleRecipeSelect(index)}
                  >
                    <span className="text-xs font-medium truncate flex-1">{recipe.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0.5 h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        onBookmarkToggle(recipe.id)
                      }}
                    >
                      {bookmarkedRecipes.includes(recipe.id) ? (
                        <BookmarkCheck className="w-3 h-3 text-blue-600" />
                      ) : (
                        <Bookmark className="w-3 h-3" />
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
      <div className={cn("flex-1 p-6 transition-all duration-300", isRightSidebarOpen ? "pr-[29rem]" : "pr-72")}>
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
                            variant={isIngredientInCart(ingredient.name) ? "secondary" : "outline"}
                            size="sm"
                            onClick={async () => {
                              if (currentChatId && !isIngredientInCart(ingredient.name)) {
                                try {
                                  const response = await addToCart({
                                    chatId: currentChatId,
                                    foodName: ingredient.name
                                  });
                                  console.log('장바구니 추가 성공:', response);
                                  
                                  // 응답 데이터를 onAddProductToCart prop으로 전달하여 UI 업데이트
                                  if (response.products && response.products.length > 0) {
                                    // API 응답의 상품 데이터를 Recipe 형태로 변환
                                    const cartRecipe = {
                                      source: "ingredient_search",
                                      food_name: ingredient.name,
                                      product: response.products.map((product: any) => ({
                                        product_name: product.product_name,
                                        price: product.price,
                                        image_url: product.image_url,
                                        product_address: product.product_address
                                      })),
                                      recipe: []
                                    };
                                    
                                    // onAddProductToCart 호출하여 UI 업데이트
                                    if (onAddProductToCart) {
                                      onAddProductToCart(cartRecipe);
                                    }
                                    
                                    console.log('카트에 추가된 상품:', cartRecipe);
                                  }
                                } catch (error) {
                                  console.error('장바구니 추가 실패:', error);
                                  // 에러 메시지 표시
                                }
                              } else if (isIngredientInCart(ingredient.name)) {
                                console.log('이미 장바구니에 추가된 재료입니다:', ingredient.name);
                              } else {
                                console.error('현재 채팅 ID가 없습니다.');
                              }
                            }}
                            className={cn(
                              "ml-2",
                              isIngredientInCart(ingredient.name) && "bg-green-50 border-green-200 text-green-700 hover:bg-green-50"
                            )}
                            disabled={isIngredientInCart(ingredient.name)}
                          >
                            {isIngredientInCart(ingredient.name) ? (
                              <Check className="w-4 h-4 mr-1 text-green-600" />
                            ) : (
                              <Plus className="w-4 h-4 mr-1" />
                            )}
                            {isIngredientInCart(ingredient.name) ? "Added" : "Add"}
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
              <p className="text-xl">사용 가능한 레시피가 없습니다</p>
              <p>대화를 시작하여 레시피 제안을 받아보세요!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

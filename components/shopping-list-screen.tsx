"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Check, ExternalLink, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  name: string
  price: number
  image: string
  brand?: string
  size?: string 
  rating?: number
}

interface IngredientWithProducts {
  name: string
  amount: string
  unit: string
  isActive: boolean
  products: Product[]
  selectedProductId?: string
}

interface ShoppingListScreenProps {
  ingredients: Array<{ name: string; amount: string; unit: string }>
  onGenerateCart: (selectedProducts: Array<{ ingredient: string; product: Product }>) => void
  isRightSidebarOpen?: boolean
}

// Mock product data for demonstration
const generateMockProducts = (ingredientName: string): Product[] => {
  const baseProducts = [
    {
      id: `${ingredientName}-1`,
      name: `Organic ${ingredientName}`,
      price: Math.random() * 10 + 2,
      image: `/placeholder.svg?height=120&width=120&query=${ingredientName}`,
      brand: "Organic Valley",
      size: "1 lb",
      rating: 4.5,
    },
    {
      id: `${ingredientName}-2`,
      name: `Fresh ${ingredientName}`,
      price: Math.random() * 8 + 1.5,
      image: `/placeholder.svg?height=120&width=120&query=${ingredientName}`,
      brand: "Fresh Market",
      size: "1 lb",
      rating: 4.2,
    },
    {
      id: `${ingredientName}-3`,
      name: `Premium ${ingredientName}`,
      price: Math.random() * 15 + 3,
      image: `/placeholder.svg?height=120&width=120&query=${ingredientName}`,
      brand: "Premium Choice",
      size: "1 lb",
      rating: 4.8,
    },
    {
      id: `${ingredientName}-4`,
      name: `Value ${ingredientName}`,
      price: Math.random() * 5 + 1,
      image: `/placeholder.svg?height=120&width=120&query=${ingredientName}`,
      brand: "Value Brand",
      size: "1 lb",
      rating: 3.9,
    },
  ]

  return baseProducts.map((product) => ({
    ...product,
    price: Math.round(product.price * 100) / 100, // Round to 2 decimal places
  }))
}

export function ShoppingListScreen({
  ingredients = [],
  onGenerateCart,
  isRightSidebarOpen = false,
}: ShoppingListScreenProps) {
  const [ingredientsWithProducts, setIngredientsWithProducts] = useState<IngredientWithProducts[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Initialize ingredients with products
  useEffect(() => {
    const initialIngredients: IngredientWithProducts[] = ingredients.map((ingredient) => ({
      ...ingredient,
      isActive: true,
      products: generateMockProducts(ingredient.name),
      selectedProductId: undefined,
    }))
    setIngredientsWithProducts(initialIngredients)
  }, [ingredients])

  const toggleIngredientActive = (index: number) => {
    setIngredientsWithProducts((prev) =>
      prev.map((ingredient, i) =>
        i === index
          ? {
              ...ingredient,
              isActive: !ingredient.isActive,
              selectedProductId: !ingredient.isActive ? undefined : ingredient.selectedProductId,
            }
          : ingredient,
      ),
    )
  }

  const selectProduct = (ingredientIndex: number, productId: string) => {
    setIngredientsWithProducts((prev) =>
      prev.map((ingredient, i) =>
        i === ingredientIndex
          ? {
              ...ingredient,
              selectedProductId: ingredient.selectedProductId === productId ? undefined : productId,
            }
          : ingredient,
      ),
    )
  }

  const getSelectedProducts = () => {
    return ingredientsWithProducts
      .filter((ingredient) => ingredient.isActive && ingredient.selectedProductId)
      .map((ingredient) => ({
        ingredient: ingredient.name,
        product: ingredient.products.find((p) => p.id === ingredient.selectedProductId)!,
      }))
  }

  const getTotalPrice = () => {
    return getSelectedProducts().reduce((total, item) => total + item.product.price, 0)
  }

  const handleGenerateCart = async () => {
    setIsGenerating(true)
    const selectedProducts = getSelectedProducts()

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))
      onGenerateCart(selectedProducts)
    } catch (error) {
      console.error("Failed to generate cart:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  if (ingredientsWithProducts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl mb-2">No ingredients in your shopping list</p>
          <p>Add ingredients from recipes to start shopping!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 relative">
      {/* Cart Summary Card - Fixed position top right */}
      <Card
        className={cn(
          "fixed top-4 z-30 w-80 shadow-lg transition-all duration-300",
          isRightSidebarOpen ? "right-84" : "right-16",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Cart Summary ({getSelectedProducts().length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getSelectedProducts().length > 0 ? (
            <>
              <ScrollArea className="max-h-64 mb-4">
                <div className="space-y-2">
                  {getSelectedProducts().map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">{item.ingredient}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">{item.product.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-lg font-bold text-green-600">{getTotalPrice().toFixed(2)}</span>
                  </div>
                </div>

                <Button onClick={handleGenerateCart} disabled={isGenerating} className="w-full" size="sm">
                  {isGenerating ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3 h-3 mr-2" />
                      Buy Now
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-500 mb-2">No products selected</p>
              <p className="text-xs text-gray-400">Select products from ingredients below</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div
        className={cn(
          "bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 transition-all duration-300",
          isRightSidebarOpen ? "pr-96" : "pr-84",
        )}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Shopping List</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Select products for your ingredients. Click ingredient names to toggle them on/off.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">${getTotalPrice().toFixed(2)}</div>
              <div className="text-sm text-gray-500">{getSelectedProducts().length} items selected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Shopping List Content */}
      <div className={cn("flex-1 overflow-auto transition-all duration-300", isRightSidebarOpen ? "pr-96" : "pr-84")}>
        <div className="max-w-6xl mx-auto p-6">
          <div className="space-y-8">
            {ingredientsWithProducts.map((ingredient, ingredientIndex) => (
              <Card key={ingredientIndex} className={cn("transition-all", !ingredient.isActive && "opacity-50")}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleIngredientActive(ingredientIndex)}
                      className="flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                          ingredient.isActive
                            ? "bg-green-600 border-green-600 text-white"
                            : "border-gray-300 dark:border-gray-600",
                        )}
                      >
                        {ingredient.isActive && <Check className="w-4 h-4" />}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{ingredient.name}</CardTitle>
                        <p className="text-sm text-gray-500">
                          {ingredient.amount} {ingredient.unit}
                        </p>
                      </div>
                    </button>
                    {!ingredient.isActive && (
                      <Badge variant="outline" className="text-gray-500">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {ingredient.isActive && (
                  <CardContent>
                    <ScrollArea className="w-full">
                      <div className="flex gap-4 pb-4" style={{ width: "max-content" }}>
                        {ingredient.products.map((product) => (
                          <div
                            key={product.id}
                            className={cn(
                              "flex-shrink-0 w-64 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                              ingredient.selectedProductId === product.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
                            )}
                            onClick={() => selectProduct(ingredientIndex, product.id)}
                          >
                            <div className="text-center">
                              <img
                                src={product.image || "/placeholder.svg"}
                                alt={product.name}
                                className="w-24 h-24 object-cover rounded-lg mx-auto mb-3"
                              />
                              <h4 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h4>
                              {product.brand && <p className="text-xs text-gray-500 mb-1">{product.brand}</p>}
                              {product.size && <p className="text-xs text-gray-500 mb-2">{product.size}</p>}
                              <div className="flex items-center justify-center gap-1 mb-2">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="font-bold text-green-600">{product.price.toFixed(2)}</span>
                              </div>
                              {product.rating && (
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-xs text-yellow-500">★</span>
                                  <span className="text-xs text-gray-500">{product.rating}</span>
                                </div>
                              )}
                              {ingredient.selectedProductId === product.id && (
                                <div className="mt-2">
                                  <Badge className="bg-blue-600 text-white">Selected</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer with Generate Cart Button */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getSelectedProducts().length} of {ingredientsWithProducts.filter((i) => i.isActive).length} active
                ingredients selected
              </p>
              <p className="text-lg font-semibold">Total: ${getTotalPrice().toFixed(2)}</p>
            </div>
            <Button
              onClick={handleGenerateCart}
              disabled={getSelectedProducts().length === 0 || isGenerating}
              size="lg"
              className="min-w-48"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Generating Cart...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Generate Shopping Cart
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollAreaRoot, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Check, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product, Recipe, Ingredient } from "../src/types"


// interface IngredientWithProducts {
//   name: string
//   amount: string
//   unit: string
//   isActive: boolean
//   products: Product[]
//   selectedProductId?: string
// }

interface ShoppingListScreenProps {
  cartItems: Recipe[]
  onGenerateCart: (selectedProducts: Array<{ ingredient: string; product: Product }>) => void
  isRightSidebarOpen?: boolean
}

// 컴포넌트 내부에서 사용할 데이터 구조 정의
interface CartItemGroup {
  ingredientName: string
  products: Product[]
  isActive: boolean
  // 상품의 고유 ID로 product_address를 사용합니다.
  selectedProductId?: string 
}


export function ShoppingListScreen({
  cartItems = [],
  onGenerateCart,
  isRightSidebarOpen = false,
}: ShoppingListScreenProps) {
  const [cartItemGroups, setCartItemGroups] = useState<CartItemGroup[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // cartItems prop이 변경될 때마다 최신 데이터로 cartItemGroups를 업데이트합니다.
  useEffect(() => {
    // cartItems 배열이 비어있으면 아무것도 하지 않고 상태를 비웁니다.
    if (!cartItems || cartItems.length === 0) {
      setCartItemGroups([]);
      return;
    }

    // cartItems 배열의 '가장 마지막' 요소만 사용해서 최신 검색 결과를 반영합니다.
    const latestRecipeItem = cartItems[cartItems.length - 1];
    console.log("cartItems 배열의 가장 마지막 요소(latestRecipeItem) --------", latestRecipeItem)

    // 최신 데이터가 유효한지 확인합니다.
    if (latestRecipeItem && latestRecipeItem.food_name && latestRecipeItem.ingredients) {
        // cart 타입일 때는 ingredients가 Product[] 타입입니다
        const products = latestRecipeItem.ingredients as Product[];
        const newGroup: CartItemGroup = {
            ingredientName: latestRecipeItem.food_name,
            products: products,
            isActive: true,
            selectedProductId: undefined,
        };

      // 콘솔 로그를 통해 최신 그룹 하나만으로 업데이트되는 것을 확인할 수 있습니다.
      console.log("🛒 ShoppingListScreen: 최신 cartItem으로 cartItemGroups를 업데이트합니다.", [newGroup]);
      
      // 항상 단 하나의 그룹을 가진 배열로 상태를 설정합니다.
      setCartItemGroups([newGroup]);
    } else {
        // 유효하지 않은 데이터가 들어오면 상태를 비웁니다.
        setCartItemGroups([]);
    }
  }, [cartItems])

  // 토글 버튼 클릭 시 해당 재료 그룹의 활성 상태를 변경합니다.
  const toggleIngredientActive = (index: number) => {
    setCartItemGroups((prev) =>
      prev.map((group, i) =>
        i === index
          ? {
              ...group,
              isActive: !group.isActive,
              selectedProductId: !group.isActive ? undefined : group.selectedProductId,
            }
          : group,
      ),
    )
  }

  // 선택된 상품을 토글합니다. 이미 선택된 상품을 다시 클릭하면 선택 해제됩니다.
  const selectProduct = (groupIndex: number, productId: string) => {
    setCartItemGroups((prev) =>
      prev.map((group, i) =>
        i === groupIndex
          ? {
              ...group,
              selectedProductId: group.selectedProductId === productId ? undefined : productId,
            }
          : group,
      ),
    )
  }

  // 선택된 상품을 가져옵니다. 각 그룹에서 활성화된 상품만 필터링합니다.
  const getSelectedProducts = () => {
     return cartItemGroups
      .filter((group) => group.isActive && group.selectedProductId)
      .map((group) => ({
        ingredient: group.ingredientName,
        // product_address를 ID로 사용해서 선택된 상품을 찾습니다.
        product: group.products.find((p) => p.product_address === group.selectedProductId)!,
      }))
  }

  // 선택된 상품의 총 가격을 계산합니다.
  const getTotalPrice = () => {
    return getSelectedProducts().reduce((total, item) => total + item.product.price, 0)
  }

  // 장바구니 생성 버튼 클릭 시 선택된 상품을 전달합니다.
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

  // 초기 화면
  if (cartItemGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl mb-2">검색 결과가 없습니다.</p>
          <p>재료를 찾아달라고 요청해보세요</p>
        </div>
      </div>
    )
  }

  // 각 재료 그룹을 렌더링합니다.
  const IngredientGroup = ({ group, groupIndex }: { group: CartItemGroup, groupIndex: number }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isScrolled, setIsScrolled] = useState({ left: false, right: true });

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (container) {
        const atLeft = container.scrollLeft === 0;
        const atRight = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1; // -1 to handle precision
        setIsScrolled({ left: !atLeft, right: !atRight });
      }
    };

    const scroll = (direction: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      if (container) {
        const scrollAmount = container.clientWidth * 0.8; // 한 번에 화면 너비의 80%씩 스크롤
        container.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth',
        });
      }
    };
    
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (container) {
        // 초기 스크롤 상태 체크
        handleScroll();
        // 리사이즈 될 때 스크롤 상태 다시 체크
        window.addEventListener('resize', handleScroll);
        // 스크롤 이벤트 리스너 추가
        container.addEventListener('scroll', handleScroll);
      }
      return () => {
        if (container) {
          window.removeEventListener('resize', handleScroll);
          container.removeEventListener('scroll', handleScroll);
        }
      };
    }, [group.products]);


    return (
      <Card key={groupIndex} className={cn("transition-all", !group.isActive && "opacity-50")}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleIngredientActive(groupIndex)}
                      className="flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                          group.isActive
                            ? "bg-green-600 border-green-600 text-white"
                            : "border-gray-300 dark:border-gray-600",
                        )}
                      >
                        {group.isActive && <Check className="w-4 h-4" />}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{group.ingredientName}</CardTitle>
                        {/* <p className="text-sm text-gray-500">
                          {group.amount} {group.unit}
                        </p> */}
                      </div>
                    </button>
                    {!group.isActive && (
                      <Badge variant="outline" className="text-gray-500">
                        Disabled
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {group.isActive && (
                  <CardContent className="relative">
                    {isScrolled.left && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-md bg-accent text-accent-foreground border-black"
                        onClick={() => scroll('left')}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    )}

                    <ScrollAreaRoot className="w-full">
                      <ScrollAreaViewport className="w-full" ref={scrollContainerRef}>
                        <div className="flex flex-row gap-4 pb-4">
                        {group.products?.map((product) => (
                          <div
                            key={product.product_address}
                            className={cn(
                              "flex-shrink-0 w-64 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                              group.selectedProductId === product.product_address
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                                : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
                            )}
                            onClick={() => selectProduct(groupIndex, product.product_address)}
                          >
                            <div className="text-center">
                              <img
                                src={product.image_url || "/placeholder.svg"}
                                alt={product.product_name}
                                className="w-24 h-24 object-cover rounded-lg mx-auto mb-3"
                              />
                              <h4 className="font-medium text-sm mb-1 line-clamp-2">{product.product_name}</h4>
                              <div className="flex items-center justify-center gap-1 mb-2">
                                <span className="font-bold text-green-600">{product.price?.toLocaleString()}원</span>
                              </div>
                              {group.selectedProductId === product.product_address  && (
                                <div className="mt-2">
                                  <Badge className="bg-blue-600 text-white">Selected</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        </div>
                      </ScrollAreaViewport>
                      <ScrollBar orientation="horizontal" />
                    </ScrollAreaRoot>

                    {isScrolled.right && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full shadow-md bg-accent text-accent-foreground border-black"
                        onClick={() => scroll('right')}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
    )
  }



  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 relative">
      {/* Cart Summary Card - Fixed position top right */}
      <Card
        className={cn(
          "fixed top-4 z-30 w-80 shadow-lg transition-all duration-300",
          isRightSidebarOpen ? "right-124" : "right-16",
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
                        <p className="text-sm font-medium truncate">{item.product.product_name}</p>
                        <p className="text-xs text-gray-500">{item.ingredient}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <span className="text-sm font-semibold text-green-600">{item.product.price.toLocaleString()} 원</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-green-600">{getTotalPrice().toLocaleString()} 원</span>
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
              <div className="text-2xl font-bold text-green-600">{getTotalPrice()} 원</div>
              <div className="text-sm text-gray-500">{getSelectedProducts().length} items selected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Shopping List Content */}
      <div className={cn("flex-1 overflow-auto transition-all duration-300", isRightSidebarOpen ? "pr-96" : "pr-84")}>
        <div className="max-w-6xl mx-auto p-6">
          <div className="space-y-8">
            {cartItemGroups.map((group, groupIndex) => (
              <IngredientGroup key={groupIndex} group={group} groupIndex={groupIndex} />
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
                {getSelectedProducts().length} of {cartItemGroups.filter((i) => i.isActive).length} active
                ingredients selected
              </p>
              <p className="text-lg font-semibold">Total: {getTotalPrice().toLocaleString()}원</p>
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

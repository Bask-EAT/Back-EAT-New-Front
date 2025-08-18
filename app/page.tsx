"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { WelcomeScreen } from "@/components/welcome-screen"
import { RecipeExplorationScreen } from "@/components/recipe-exploration-screen"
import { ShoppingListScreen } from "@/components/shopping-list-screen"
import {
  ChatMessage,
  DBRecipe,
  DBCartItem,
  ChatRecord,
  openChatDB,
  getAllChatsDesc,
  getAllBookmarkIds,
  createChat,
  appendMessage,
  appendRecipes,
  appendCartItems,
  getChat,
  toggleBookmark,
} from "@/lib/chat-db"

interface ChatSession {
  id: number
  title: string
  messages: ChatMessage[]
  lastUpdated: number
}

interface UIRecipe {
  id: string
  name: string
  description: string
  prepTime: string
  cookTime: string
  servings: number
  difficulty: "Easy" | "Medium" | "Hard"
  ingredients: Array<{
    name: string
    amount: string
    unit: string
    optional?: boolean
  }>
  instructions: string[]
  tags: string[]
  image?: string
}

interface AIResponse {
  type: "recipe" | "cart" | "general"
  content: string
  recipes?: UIRecipe[]
  ingredients?: Array<{ name: string; amount: string; unit: string }>
}

// 표준 백엔드 스키마 (chatType/content/recipes)
interface ServiceHealth { intent: boolean; shopping: boolean; video: boolean; agent: boolean }
interface Ingredient { item: string; amount: string; unit: string }
interface Product { product_name: string; price: number; image_url: string; product_address: string }
interface Recipe { source: "text" | "video" | "ingredient_search"; food_name: string; ingredients: (Ingredient | Product)[]; recipe: string[] }
type ChatServiceResponse = { chatType: "chat" | "cart"; content: string; recipes: Recipe[] }

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"welcome" | "recipe" | "cart">("welcome")
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState<string[]>([])
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentRecipes, setCurrentRecipes] = useState<UIRecipe[]>([])
  const [currentIngredients, setCurrentIngredients] = useState<Array<{ name: string; amount: string; unit: string }>>(
    [],
  )
  const [cartItems, setCartItems] = useState<Array<{ name: string; amount: string; unit: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([])

  // 초기 로드: IndexedDB에서 최근 채팅 목록 로드
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        await openChatDB()
        const chats = await getAllChatsDesc()
        const bookmarks = await getAllBookmarkIds()
        if (cancelled) return
        const normalized: ChatSession[] = chats.map((c) => ({
          id: c.id,
          title: c.messages.find((m) => m.role === "user")?.content.slice(0, 50) || "New Chat",
          messages: c.messages,
          lastUpdated: c.messages[c.messages.length - 1]?.timestamp || c.timestamp,
        }))
        setChatHistory(normalized)
        setBookmarkedRecipes(bookmarks)
        // 과거 대화 자동 선택을 비활성화하여 이전 레시피가 자동 표시되지 않도록 함
        // 사용자가 왼쪽 사이드바에서 채팅을 직접 선택하면 해당 대화가 로드됩니다.
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "IndexedDB 초기화 오류")
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleNewChat = () => {
    ;(async () => {
      try {
        const newChatId = await createChat()
        const newChat: ChatSession = {
          id: newChatId,
          title: "New Chat",
          messages: [],
          lastUpdated: newChatId,
        }
        setChatHistory((prev) => [newChat, ...prev])
        setCurrentChatId(newChatId)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "새 채팅 생성 실패")
      }
    })()
    setCurrentMessages([])
    setCurrentView("welcome")
    setCurrentRecipes([])
    setCurrentIngredients([])
    setCartItems([])
    setLastSuggestions([])
    setError(null)
  }

  const updateChatTitle = (messages: ChatMessage[]) => {
    if (messages.length > 0) {
      const firstUserMessage = messages.find((m) => m.role === "user")
      if (firstUserMessage) {
        const title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
        return title
      }
    }
    return "New Chat"
  }

  const parseAIResponse = (text: string): AIResponse => {
    try {
      const parsed = JSON.parse(text)
      return parsed
    } catch {
      // If not valid JSON, try to extract recipe information from text
      const recipeMatch = text.match(/recipe|cook|ingredient|preparation/i)
      const cartMatch = text.match(/shopping|buy|store|ingredient|cart/i)

      if (recipeMatch && !cartMatch) {
        // Try to extract basic recipe info from text
        const lines = text.split("\n").filter((line) => line.trim())
        const mockRecipe: UIRecipe = {
          id: Date.now().toString(),
          name: lines[0] || "AI Generated Recipe",
          description: lines[1] || "A delicious recipe suggested by AI",
          prepTime: "15 min",
          cookTime: "30 min",
          servings: 4,
          difficulty: "Medium" as const,
          ingredients: [],
          instructions: lines.slice(2) || ["Follow the AI's instructions above"],
          tags: ["AI Generated"],
        }

        return {
          type: "recipe",
          content: text,
          recipes: [mockRecipe],
        }
      } else if (cartMatch) {
        return {
          type: "cart",
          content: text,
          ingredients: [],
        }
      }

      return {
        type: "general",
        content: text,
      }
    }
  }

  const handleChatSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    // Create new chat if none exists
    let chatId = currentChatId
    if (!chatId) {
      try {
        chatId = await createChat()
        setCurrentChatId(chatId)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "채팅 생성 실패")
        setIsLoading(false)
        return
      }
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: Date.now(),
    }

    const updatedMessages = [...currentMessages, userMessage]
    setCurrentMessages(updatedMessages)
    try {
      await appendMessage(chatId, userMessage)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || "메시지 저장 실패")
    }
    // 좌측 리스트의 최근 업데이트 시간/순서를 즉시 반영
    setChatHistory((prev) => {
      const others = prev.filter((c) => c.id !== chatId)
      const me: ChatSession = {
        id: chatId!,
        title: updateChatTitle(updatedMessages),
        messages: updatedMessages,
        lastUpdated: Date.now(),
      }
      return [me, ...others]
    })

    try {
      // Call AI API
      // 숫자 선택은 서버(TextAgent)가 직전 추천목록으로 매핑합니다. 클라이언트에서는 원문 그대로 전달합니다.
      const messageToSend = message

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageToSend,
          chatHistory: currentMessages,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get AI response")
      }

      const raw = await response.json()

      // 1) 표준 스키마(chatType/content/recipes) 우선 처리
      if (raw && typeof raw === "object" && (raw as ChatServiceResponse).chatType) {
        const service: ChatServiceResponse = raw as ChatServiceResponse

        // 메시지 저장용 (content 없으면 레시피 타이틀로 대체)
        const fallbackText = (() => {
          const first = (service.recipes || [])[0]
          const title = first?.food_name
          return title ? `네. ${title} 레시피를 알려드릴게요.` : "요청하신 결과를 준비했어요."
        })()
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: (service.content && service.content.trim()) ? service.content : fallbackText,
          timestamp: Date.now(),
        }

        const finalMessages = [...updatedMessages, assistantMessage]
        setCurrentMessages(finalMessages)
        try {
          await appendMessage(chatId, assistantMessage)
        } catch (e: any) {
          console.error(e)
          setError(e?.message || "응답 저장 실패")
        }

        // 표준 → UI 변환
        const uiRecipes: UIRecipe[] = (service.recipes || []).map((r, index) => {
          const foodName = r.food_name || `Recipe ${index + 1}`
          const normalizedIngs = (Array.isArray(r.ingredients) ? r.ingredients : []).map((ing: any) => {
            if (ing && typeof ing === "object" && (ing as any).product_name) {
              return { name: (ing as Product).product_name || "", amount: "", unit: "", optional: false }
            }
            const ii = ing as Ingredient
            return { name: ii?.item || "", amount: ii?.amount || "", unit: ii?.unit || "", optional: false }
          })
          const tag = r.source === "video" ? "영상레시피" : r.source === "ingredient_search" ? "상품" : "텍스트레시피"
          return {
            id: `recipe_${Date.now()}_${index}`,
            name: foodName,
            description: `${r.source === "video" ? "영상" : r.source === "ingredient_search" ? "상품" : "텍스트"} 기반 레시피`,
            prepTime: "준비 시간 미정",
            cookTime: "조리 시간 미정",
            servings: 1,
            difficulty: "Medium",
            ingredients: normalizedIngs,
            instructions: Array.isArray(r.recipe) ? r.recipe : [],
            tags: [tag],
            image: `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(foodName)}`,
          }
        })

        // 좌측 리스트 갱신
        const title = updateChatTitle(finalMessages)
        const updatedChat: ChatSession = { id: chatId, title, messages: finalMessages, lastUpdated: Date.now() }
        setChatHistory((prev) => {
          const filtered = prev.filter((chat) => chat.id !== chatId)
          return [updatedChat, ...filtered]
        })

        // 화면 상태 분기 및 저장
        if (service.chatType === "chat") {
          setCurrentView("recipe")
          setCurrentRecipes(uiRecipes)
          try {
            await appendRecipes(chatId, uiRecipes as unknown as DBRecipe[])
          } catch (e: any) {
            console.error(e)
            setError(e?.message || "레시피 저장 실패")
          }
          setLastSuggestions([])
        } else {
          setCurrentView("cart")
          const cartList = (service.recipes || []).flatMap((r) =>
            (Array.isArray(r.ingredients) ? r.ingredients : []).map((ing: any) => {
              if (ing && typeof ing === "object" && (ing as any).product_name) {
                return { name: (ing as Product).product_name || "", amount: "", unit: "" }
              }
              const ii = ing as Ingredient
              return { name: ii?.item || "", amount: ii?.amount || "", unit: ii?.unit || "" }
            }),
          )
          setCurrentIngredients(cartList)
          setCartItems(cartList)
          try {
            await appendCartItems(chatId, cartList as unknown as DBCartItem[])
          } catch (e: any) {
            console.error(e)
            setError(e?.message || "카트 저장 실패")
          }
        }
        return
      }

      // 2) 구 스키마(AIResponse) 폴백 처리
      const parsedResponse: AIResponse = raw

      // Add AI response
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: parsedResponse.content,
        timestamp: Date.now(),
      }

      const finalMessages = [...updatedMessages, assistantMessage]
      setCurrentMessages(finalMessages)
      try {
        await appendMessage(chatId, assistantMessage)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "응답 저장 실패")
      }

      // Update chat history
      const title = updateChatTitle(finalMessages)
      const updatedChat: ChatSession = {
        id: chatId,
        title,
        messages: finalMessages,
        lastUpdated: Date.now(),
      }

      setChatHistory((prev) => {
        const filtered = prev.filter((chat) => chat.id !== chatId)
        return [updatedChat, ...filtered]
      })

      // 후보 목록 추출/정리 (순수 추천 응답에서만 의미가 있음)
      const suggestions = extractNumberedSuggestions(parsedResponse.content)
      setLastSuggestions(suggestions)

      // Set view and data based on AI response type
      if (parsedResponse.type === "recipe") {
        setCurrentView("recipe")
        if (parsedResponse.recipes && parsedResponse.recipes.length > 0) {
          setCurrentRecipes(parsedResponse.recipes)
          try {
            await appendRecipes(chatId, parsedResponse.recipes as unknown as DBRecipe[])
          } catch (e: any) {
            console.error(e)
            setError(e?.message || "레시피 저장 실패")
          }
          // 실제 레시피가 채워진 경우에만 후보 초기화
          setLastSuggestions([])
        }
      } else if (parsedResponse.type === "cart") {
        setCurrentView("cart")
        if (parsedResponse.ingredients && parsedResponse.ingredients.length > 0) {
          setCurrentIngredients(parsedResponse.ingredients)
          setCartItems(parsedResponse.ingredients)
          try {
            await appendCartItems(chatId, parsedResponse.ingredients as unknown as DBCartItem[])
          } catch (e: any) {
            console.error(e)
            setError(e?.message || "카트 저장 실패")
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      setError("Failed to get AI response. Please try again.")

      // Add error message
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      }
      setCurrentMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  function isNumericSelection(input: string): boolean {
    const text = (input || "").trim()
    if (!/\d/.test(text)) return false
    // 허용: 숫자/공백/콤마/한글 '번'
    return /^([0-9]+\s*(번)?\s*[,\s]?)+$/.test(text)
  }

  function mapSelectionToDish(input: string, suggestions: string[]): string | null {
    const indices = (input.match(/\d+/g) || []).map((s) => parseInt(s, 10)).filter((n) => n >= 1)
    for (const n of indices) {
      const idx = n - 1
      if (idx >= 0 && idx < suggestions.length) return suggestions[idx]
    }
    return null
  }

  function extractNumberedSuggestions(text: string): string[] {
    if (!text) return []
    const lines = text.split(/\r?\n/)
    const out: string[] = []
    for (const line of lines) {
      const m = line.match(/^\s*(\d+)\.\s*(.+?)\s*$/)
      if (m) {
        const name = m[2].split(" — ")[0].trim()
        if (name) out.push(name)
      }
    }
    return out
  }

  const handleChatSelect = (chatId: number) => {
    const chat = chatHistory.find((c) => c.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setCurrentMessages(chat.messages)
      setLastSuggestions([])
      // 다른 채팅의 레시피/카트가 비치지 않도록 즉시 초기화
      setCurrentRecipes([])
      setCurrentIngredients([])
      setCartItems([])
      setCurrentView("welcome")
      setError(null)
      ;(async () => {
        try {
          const full = await getChat(chatId)
          if (full) {
            // 복원: 레시피와 카트
            setCurrentRecipes((full.recipes || []) as unknown as UIRecipe[])
            const items = (full.cartItems || []) as Array<{ name: string; amount: string; unit: string }>
            setCurrentIngredients(items)
            setCartItems(items)
            // 컨텐츠 기반으로 뷰 결정
            if ((full.recipes && full.recipes.length > 0)) {
              setCurrentView("recipe")
            } else if ((full.cartItems && full.cartItems.length > 0)) {
              setCurrentView("cart")
            }
          }
        } catch (e: any) {
          console.error(e)
          setError(e?.message || "채팅 불러오기 실패")
        }
      })()

      // 메시지 기반의 폴백 뷰 결정 (비동기 복원 전에 잠깐 필요한 경우)
      if (chat.messages.length > 0) {
        const lastAssistantMessage = chat.messages.filter((m) => m.role === "assistant").pop()
        if (lastAssistantMessage) {
          const content = lastAssistantMessage.content.toLowerCase()
          if (content.includes("recipe") || content.includes("cook")) setCurrentView("recipe")
          else if (content.includes("shopping") || content.includes("ingredient")) setCurrentView("cart")
        }
      }
    }
  }

  const handleBookmarkToggle = (recipeId: string) => {
    // 현재 화면의 레시피 중 대상 찾기
    const recipe = currentRecipes.find((r) => r.id === recipeId)
    if (!recipe) return
    ;(async () => {
      try {
        const toggled = await toggleBookmark(recipe as unknown as DBRecipe)
        setBookmarkedRecipes((prev) =>
          toggled ? [...new Set([...prev, recipeId])] : prev.filter((id) => id !== recipeId),
        )
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "북마크 저장 실패")
      }
    })()
  }

  const handleAddToCart = (ingredient: { name: string; amount: string; unit: string }) => {
    setCartItems((prev) => {
      // Check if ingredient already exists, if so, don't add duplicate
      const exists = prev.some((item) => item.name === ingredient.name)
      if (exists) return prev
      return [...prev, ingredient]
    })
    ;(async () => {
      try {
        if (currentChatId) {
          await appendCartItems(currentChatId, [ingredient as unknown as DBCartItem])
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "카트 저장 실패")
      }
    })()
    // Switch to cart view when adding items
    setCurrentView("cart")
  }

  const handleGenerateCart = async (selectedProducts: Array<{ ingredient: string; product: any }>) => {
    try {
      setIsLoading(true)

      // Call API to generate shopping cart
      const response = await fetch("/api/generate-cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: selectedProducts,
          timestamp: Date.now(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Shopping cart generated:", result)

        // Show success message
        const totalPrice = selectedProducts.reduce((sum, item) => sum + item.product.price, 0).toFixed(2)
        alert(`Shopping cart generated successfully! Total: $${totalPrice}`)

        // Clear cart items after successful generation
        setCartItems([])
      } else {
        throw new Error("Failed to generate cart")
      }
    } catch (error) {
      console.error("Error generating cart:", error)
      setError("Failed to generate shopping cart. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewChange = (view: "welcome" | "recipe" | "cart") => {
    setCurrentView(view)
    setError(null)
  }

  return (
    <div className="relative">
      <MainLayout
        currentView={currentView}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        currentMessages={currentMessages}
        isLoading={isLoading}
        rightSidebarCollapsed={rightSidebarCollapsed}
        onNewChat={handleNewChat}
        onChatSubmit={handleChatSubmit}
        onChatSelect={handleChatSelect}
        onViewChange={handleViewChange}
        onRightSidebarToggle={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
      >
        {/* Error Display */}
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
              <div className="flex items-center">
                <span className="mr-2">⚠️</span>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-4 text-red-500 hover:text-red-700">
                  ×
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content with Smooth Transitions */}
        <div className="transition-all duration-300 ease-in-out">
          {currentView === "welcome" && <WelcomeScreen onChatSubmit={handleChatSubmit} />}
          {currentView === "recipe" && (
            <RecipeExplorationScreen
              recipes={currentRecipes}
              bookmarkedRecipes={bookmarkedRecipes}
              onBookmarkToggle={handleBookmarkToggle}
              onAddToCart={handleAddToCart}
              isRightSidebarOpen={!rightSidebarCollapsed}
            />
          )}
          {currentView === "cart" && (
            <ShoppingListScreen
              ingredients={cartItems}
              onGenerateCart={handleGenerateCart}
              isRightSidebarOpen={!rightSidebarCollapsed}
            />
          )}
        </div>
      </MainLayout>
    </div>
  )
}

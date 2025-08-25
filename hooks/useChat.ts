import { useState, useEffect } from "react"
import type {
    ChatSession as UIChatSession,
    ChatMessage as UIChatMessage,
    UIRecipe,
    Recipe,
    Ingredient,
    Product,
    AIResponse
} from "../src/types"
import {
    DBRecipe, DBCartItem, getAllChatsDesc, getAllBookmarkIds, createChat,
    appendMessage, appendRecipes, appendCartItems, getChat, toggleBookmark, ChatMessage as DBChatMessage
} from "@/lib/chat-service"
import { updateChatTitle, extractNumberedSuggestions, mapSelectionToDish, isNumericSelection } from "@/src/chat"
import { postJson } from "@/lib/api"

type ChatServiceResponse = {
    chatType: "chat" | "recipe" | "cart"  // 3가지 타입 중 하나
    content?: string
    answer?: string // 이전 버전 또는 다른 백엔드와의 호환성을 위해 추가
    message?: string // 추가 필드 지원
    recipes?: any[]
    chat_id?: string
    jobId?: string
    timestamp?: string
    payload?: any
}

export function useChat() {
  const [currentView, setCurrentView] = useState<"welcome" | "recipe" | "cart" | "bookmark">("welcome")
  const [chatHistory, setChatHistory] = useState<UIChatSession[]>([])
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState<string[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [serverChatId, setServerChatId] = useState<string | null>(null)
  const [currentMessages, setCurrentMessages] = useState<UIChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentRecipes, setCurrentRecipes] = useState<UIRecipe[]>([])
  const [currentIngredients, setCurrentIngredients] = useState<Array<{ name: string; amount: string; unit: string }>>(
    [],
  )
  const [cartItems, setCartItems] = useState<Recipe[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([])

  // 초기 로드: 백엔드에서 채팅 기록과 북마크 로드
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // JWT 토큰 가져오기
        const token = localStorage.getItem("jwtToken")
        if (!token) {
          console.log("No JWT token found, skipping data load")
          return
        }

        // 채팅 기록 가져오기
        const chatResponse = await fetch("/api/chat-history", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        })
        
        if (chatResponse.ok && !cancelled) {
          const chats = await chatResponse.json()
          setChatHistory(chats)
        }

        // 북마크 가져오기
        const bookmarkResponse = await fetch("/api/bookmarks", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        })
        
        if (bookmarkResponse.ok && !cancelled) {
          const bookmarks = await bookmarkResponse.json()
          setBookmarkedRecipes(bookmarks.map((b: any) => b.id))
        }
      } catch (e: any) {
        console.error("Failed to load data from backend:", e)
        setError(e?.message || "백엔드 데이터 로드 실패")
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 새 채팅 시작
  const handleNewChat = () => {
    const newChatId = `chat_${Date.now()}`
    const newChat: UIChatSession  = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      lastUpdated: new Date(),
    }
    setChatHistory((prev) => [newChat, ...prev])
    setCurrentChatId(newChatId)
    setCurrentMessages([])
    setCurrentView("welcome")
    setCurrentRecipes([])
    setCurrentIngredients([])
    setCartItems([])
    setLastSuggestions([])
    setError(null)
  }

  // 채팅 제출 처리
  const handleChatSubmit = async (message: string, image?: File) => {
    if ((!message.trim() && !image) || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // 새 채팅 생성 (필요한 경우)
      let chatId = currentChatId
      if (!chatId) {
        chatId = `chat_${Date.now()}`
        setCurrentChatId(chatId)
        const newChat: UIChatSession  = {
          id: chatId,
          title: message.slice(0, 50),
          messages: [],
          lastUpdated: new Date(),
        }
        setChatHistory((prev) => [newChat, ...prev])
      }

      // 사용자 메시지 추가
      const userMessage: UIChatMessage  = {
        role: "user",
        content: message,
        timestamp: new Date(),
        imageUrl: image ? URL.createObjectURL(image) : undefined,
      }

      const updatedMessages: UIChatMessage[] = [...currentMessages, userMessage];
      setCurrentMessages((prev) => [...prev, userMessage])

      // FormData 준비
      const formData = new FormData()
      if (message) formData.append("message", message)
      if (chatId) formData.append("chat_id", chatId)
      if (image) formData.append("image", image)

      // JWT 토큰 가져오기
      const token = localStorage.getItem("jwtToken")
      if (!token) {
        throw new Error("No authentication token found")
      }

      // 채팅 API 호출
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`)
      }

      const result = await response.json()
      console.log("Chat API response:", result)

      // AI 응답 메시지 추가
      const aiMessage: UIChatMessage  = {
        role: "assistant",
        content: result.content || result.answer || "AI 응답을 처리할 수 없습니다.",
        timestamp: new Date(),
        recipes: result.recipes || [],
        chatType: result.chatType || "chat",
      }

      setCurrentMessages((prev) => [...prev, aiMessage])

      // 레시피 처리
      if (result.recipes && result.recipes.length > 0) {
        const uiRecipes: UIRecipe[] = result.recipes.map((recipe: any, index: number) => ({
          id: recipe.id || `recipe_${Date.now()}_${index}`,
          name: recipe.food_name || recipe.title || `Recipe ${index + 1}`,
          description: recipe.description || "AI가 추천한 레시피입니다.",
          prepTime: recipe.prepTime || "15 min",
          cookTime: recipe.cookTime || "30 min",
          servings: recipe.servings || 4,
          difficulty: (recipe.difficulty as "Easy" | "Medium" | "Hard") || "Medium",
          ingredients: (recipe.ingredients || []).map((ing: any) => ({
            name: ing.item || ing.name || "",
            amount: ing.amount || "",
            unit: ing.unit || "",
            optional: ing.optional || false,
          })),
          instructions: recipe.recipe || recipe.steps || recipe.instructions || [],
          tags: recipe.tags || ["AI Generated"],
          image: recipe.image,
        }))

        setCurrentRecipes(uiRecipes)
        setCurrentView("recipe")
      }

      // 제안 추출
      if (result.content) {
        const suggestions = extractNumberedSuggestions(result.content)
        if (suggestions.length > 0) {
          setLastSuggestions(suggestions)
        }
      }

      // 채팅 히스토리 업데이트
      setChatHistory((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                title: message.slice(0, 50),
                lastUpdated: new Date(),
              }
            : chat
        )
      )
    } catch (e: any) {
      console.error("Chat submit error:", e)
      setError(e?.message || "채팅 전송 실패")
    } finally {
      setIsLoading(false)
    }
  }

  // 채팅 선택 처리
  const handleChatSelect = async (chatId: string) => {
    try {
      setCurrentChatId(chatId)
      setCurrentMessages([])
      setCurrentRecipes([])
      setCurrentView("welcome")
      setError(null)

      // 백엔드에서 해당 채팅의 메시지 가져오기
      const token = localStorage.getItem("jwtToken")
      if (token) {
        const response = await fetch(`/api/chat-history/${chatId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const chat = await response.json()
          if (chat.messages) {
            setCurrentMessages(chat.messages)
            
            // 메시지 기반의 폴백 뷰 결정
            if (chat.messages.length > 0) {
              const lastAssistantMessage = chat.messages.filter((m: any) => m.role === "assistant").pop()
              if (lastAssistantMessage) {
                const content = lastAssistantMessage.content.toLowerCase()
                if (content.includes("recipe") || content.includes("cook")) setCurrentView("recipe")
                else if (content.includes("shopping") || content.includes("ingredient")) setCurrentView("cart")
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.error("Chat select error:", e)
      setError(e?.message || "채팅 로드 실패")
    }
  }

  // 북마크 토글 핸들러
  const handleBookmarkToggle = async (recipeId: string) => {
    try {
      const token = localStorage.getItem("jwtToken")
      if (!token) {
        throw new Error("No authentication token found")
      }

      const isBookmarked = bookmarkedRecipes.includes(recipeId)
      const action = isBookmarked ? "remove" : "add"

      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipeId, action }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} bookmark`)
      }

      // 로컬 상태 업데이트
      if (action === "add") {
        setBookmarkedRecipes((prev) => [...prev, recipeId])
      } else {
        setBookmarkedRecipes((prev) => prev.filter((id) => id !== recipeId))
      }
    } catch (e: any) {
      console.error("Bookmark toggle error:", e)
      setError(e?.message || "북마크 저장 실패")
    }
  }

  // 카트에 추가 핸들러
  const handleAddToCart = (ingredient: Ingredient) => {
    // Ingredient를 CartRecipe로 변환
    const cartRecipe: Recipe = {
      source: "ingredient_search",
      food_name: ingredient.item,
      product: [],
      recipe: []
    }
    
    setCartItems((prev) => {
      const exists = prev.some((item) => item.food_name === ingredient.item)
      if (exists) return prev
      return [...prev, cartRecipe]
    })
    
    // Switch to cart view when adding items
    setCurrentView("cart")
  }

  // 쇼핑 카트 생성 핸들러
  const handleGenerateCart = async (selectedProducts: Array<{ ingredient: string; product: Product }>) => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/generate-cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: selectedProducts,
          timestamp: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("------- Shopping cart generated:", result)

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

  // 뷰 변경 핸들러
  const handleViewChange = (view: "welcome" | "recipe" | "cart" | "bookmark") => {
    setCurrentView(view)
    setError(null)
  }

  return {
    currentView,
    chatHistory,
    currentChatId,
    currentMessages,
    isLoading,
    error,
    currentRecipes,
    currentIngredients,
    cartItems,
    bookmarkedRecipes,
    lastSuggestions,
    handleNewChat,
    handleChatSubmit,
    handleChatSelect,
    handleBookmarkToggle,
    handleAddToCart,
    handleGenerateCart,
    handleViewChange,
  }
}
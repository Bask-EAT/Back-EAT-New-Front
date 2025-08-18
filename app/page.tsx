"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { WelcomeScreen } from "@/components/welcome-screen"
import { RecipeExplorationScreen } from "@/components/recipe-exploration-screen"
import { ShoppingListScreen } from "@/components/shopping-list-screen"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { ChatSession, ChatMessage, Recipe, Ingredient, Product } from "../src/types"



export default function HomePage() {
  const [currentView, setCurrentView] = useState<"welcome" | "recipe" | "cart">("welcome")
  const [chatHistory, setChatHistory] = useLocalStorage<ChatSession[]>("recipe-ai-chat-history", [])
  // 북마크는 이제 food_name과 같은 고유한 문자열을 저장해야 합니다.
  const [bookmarkedRecipes, setBookmarkedRecipes] = useLocalStorage<string[]>("recipe-ai-bookmarks", [])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentRecipes, setCurrentRecipes] = useState<Recipe[]>([])
  // const [currentIngredients, setCurrentIngredients] = useState<Array<{ name: string; amount: string; unit: string }>>(
  //   [],
  // )
  const [currentCartData, setCurrentCartData] = useState<Recipe[]>([])
  const [error, setError] = useState<string | null>(null)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([])

  // Load current chat on mount
  useEffect(() => {
    if (chatHistory.length > 0 && !currentChatId) {
      const latestChat = chatHistory[0]
      setCurrentChatId(latestChat.id)
      setCurrentMessages(latestChat.messages)
      if (latestChat.messages.length > 0) {
        setCurrentView("recipe") // Default to recipe view if there are messages
      }
    }
  }, [chatHistory, currentChatId])

  const handleNewChat = () => {
    const newChatId = Date.now().toString()
    const newChat: ChatSession = {
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
    // setCurrentIngredients([])
    setCartItems([])
    setError(null)
  }

  const updateChatTitle = (messages: ChatMessage[]) => {
    if (messages.length > 0) {
      const firstUserMessage = messages.find((m) => m.type === "user")
      if (firstUserMessage) {
        const title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
        return title
      }
    }
    return "New Chat"
  }

  // const parseAIResponse = (text: string): AIResponse => {
  //   try {
  //     const parsed = JSON.parse(text)
  //     return parsed
  //   } catch {
  //     // If not valid JSON, try to extract recipe information from text
  //     const recipeMatch = text.match(/recipe|cook|ingredient|preparation/i)
  //     const cartMatch = text.match(/shopping|buy|store|ingredient|cart/i)

  //     if (recipeMatch && !cartMatch) {
  //       // Try to extract basic recipe info from text
  //       const lines = text.split("\n").filter((line) => line.trim())
  //       const mockRecipe: Recipe = {
  //         id: Date.now().toString(),
  //         name: lines[0] || "AI Generated Recipe",
  //         description: lines[1] || "A delicious recipe suggested by AI",
  //         prepTime: "15 min",
  //         cookTime: "30 min",
  //         servings: 4,
  //         difficulty: "Medium" as const,
  //         ingredients: [],
  //         instructions: lines.slice(2) || ["Follow the AI's instructions above"],
  //         tags: ["AI Generated"],
  //       }

  //       return {
  //         type: "recipe",
  //         content: text,
  //         recipes: [mockRecipe],
  //       }
  //     } else if (cartMatch) {
  //       return {
  //         type: "cart",
  //         content: text,
  //         ingredients: [],
  //       }
  //     }

  //     return {
  //       type: "general",
  //       content: text,
  //     }
  //   }
  // }

  const handleChatSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    // Create new chat if none exists
    let chatId = currentChatId
    if (!chatId) {
      chatId = Date.now().toString()
      setCurrentChatId(chatId)
    }

    // Add user message
    const userMessage: ChatMessage = {
      type: "user",
      content: message,
      timestamp: new Date(),
      chatType: "chat",
    }
    
    const updatedMessages = [...currentMessages, userMessage]
    setCurrentMessages(updatedMessages)
    console.log("------------ 사용자 메시지 추가됨. 현재 메시지 :", updatedMessages)

    try {
      // Call AI API
      const messageToSend = (() => {
        if (isNumericSelection(message) && lastSuggestions.length > 0) {
          const mapped = mapSelectionToDish(message, lastSuggestions)
          if (mapped) return `${mapped} 레시피 알려줘`
        }
        return message
      })()
      console.log("------------- API로 보낼 메시지:", messageToSend)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageToSend,
          chatHistory: currentMessages.map((msg) => ({ 
            ...msg, 
            timestamp: new Date(msg.timestamp).toISOString() 
          })),
        }),
      })
      console.log("------------- API 응답 상태:", response.status)

      if (!response.ok) {
        throw new Error("AI 응답 가져오기 실패")
      }

      const botMessagePayload: Omit<ChatMessage, "type" | "timestamp"> = await response.json()
      console.log("-------------------AI 응답:", botMessagePayload)


      // Add AI response
      const assistantMessage: ChatMessage = {
        type: "bot",
        content: botMessagePayload.content,
        recipes: botMessagePayload.recipes,
        chatType: botMessagePayload.chatType,
        timestamp: new Date(),
      }

      const finalMessages = [...updatedMessages, assistantMessage]
      setCurrentMessages(finalMessages)
      console.log("------------- AI 메시지 추가됨. 최종 메시지:", finalMessages)

      // Update chat history
      const title = updateChatTitle(finalMessages)
      const updatedChat: ChatSession = {
        id: chatId,
        title,
        messages: finalMessages,
        lastUpdated: new Date(),
      }

      setChatHistory((prev) => {
        const filtered = prev.filter((chat) => chat.id !== chatId)
        return [updatedChat, ...filtered]
      })
      console.log("채팅 기록 업데이트됨:", updatedChat)

      // 후보 목록 추출/정리
      // const suggestions = extractNumberedSuggestions(botMessagePayload.content)
      // setLastSuggestions(suggestions)
      // console.log("추천 후보 추출:", suggestions)

      if (botMessagePayload.chatType === "cart" || botMessagePayload.type === "cart") {
        setCurrentView("cart")
        console.log("응답 타입이 'cart'입니다. 뷰를 'cart'로 전환합니다.");
        
          if (botMessagePayload.recipes) {
            setCurrentCartData(botMessagePayload.recipes);
            console.log("Cart 데이터를 상태에 저장했습니다:", botMessagePayload.recipes);
          }
      } else if (botMessagePayload.recipes && botMessagePayload.recipes.length > 0) {
        setCurrentView("recipe");
        setCurrentRecipes(botMessagePayload.recipes);
        setLastSuggestions([]);
        console.log("응답 타입이 'recipe'입니다. 뷰를 'recipe'로 전환합니다.");
      }
    } catch (error) {
      console.error("Chat error:", error)
      setError("AI 응답 가져오기 실패. 다시 시도해주세요.")

      // Add error message
      const errorMessage: ChatMessage = {
        type: "bot",
        content: "죄송합니다, 오류가 발생했습니다. 다시 시도해주세요.",
        timestamp: new Date(),
      }
      setCurrentMessages((prev) => [...prev, errorMessage])
      console.log("에러 메시지가 채팅에 추가됨")
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

  const handleChatSelect = (chatId: string) => {
    const chat = chatHistory.find((c) => c.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setCurrentMessages(chat.messages)
      setError(null)

      // Determine view based on chat content
      if (chat.messages.length > 0) {
        const lastBotMessage = [...chat.messages].reverse().find((m) => m.type === "bot")

        if (lastBotMessage) {
          if(lastBotMessage.chatType === 'cart') {
                setCurrentView("cart")
            } else if (lastBotMessage.recipes && lastBotMessage.recipes.length > 0) {
                setCurrentView("recipe")
                setCurrentRecipes(lastBotMessage.recipes)
            }
             else {
                setCurrentView("recipe")
            }
        }
      }
    }
  }

  // 이 함수는 이제 recipe.id 대신 recipe.food_name 같은 고유한 값을 받아야 합니다.
  const handleBookmarkToggle = (recipeIdentifier: string) => {
    setBookmarkedRecipes((prev) =>
      prev.includes(recipeIdentifier) ? prev.filter((id) => id !== recipeIdentifier) : [...prev, recipeIdentifier],
    )
  }

  const handleAddToCart = (ingredient: Ingredient) => {
    setCartItems((prev) => {
      const exists = prev.some((item) => item.item === ingredient.item)
      if (exists) return prev
      return [...prev, ingredient]
    })
    setCurrentView("cart")
  }

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
              cartData={currentCartData}
              onGenerateCart={handleGenerateCart}
              isRightSidebarOpen={!rightSidebarCollapsed}
            />
          )}
        </div>
      </MainLayout>
    </div>
  )
}

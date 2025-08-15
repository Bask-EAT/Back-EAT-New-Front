"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { WelcomeScreen } from "@/components/welcome-screen"
import { RecipeExplorationScreen } from "@/components/recipe-exploration-screen"
import { ShoppingListScreen } from "@/components/shopping-list-screen"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  lastUpdated: number
}

interface Recipe {
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
  recipes?: Recipe[]
  ingredients?: Array<{ name: string; amount: string; unit: string }>
}

export default function HomePage() {
  const [currentView, setCurrentView] = useState<"welcome" | "recipe" | "cart">("welcome")
  const [chatHistory, setChatHistory] = useLocalStorage<ChatSession[]>("recipe-ai-chat-history", [])
  const [bookmarkedRecipes, setBookmarkedRecipes] = useLocalStorage<string[]>("recipe-ai-bookmarks", [])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentRecipes, setCurrentRecipes] = useState<Recipe[]>([])
  const [currentIngredients, setCurrentIngredients] = useState<Array<{ name: string; amount: string; unit: string }>>(
    [],
  )
  const [cartItems, setCartItems] = useState<Array<{ name: string; amount: string; unit: string }>>([])
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
      lastUpdated: Date.now(),
    }
    setChatHistory((prev) => [newChat, ...prev])
    setCurrentChatId(newChatId)
    setCurrentMessages([])
    setCurrentView("welcome")
    setCurrentRecipes([])
    setCurrentIngredients([])
    setCartItems([])
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
        const mockRecipe: Recipe = {
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
      chatId = Date.now().toString()
      setCurrentChatId(chatId)
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
      // Call AI API
      const messageToSend = (() => {
        if (isNumericSelection(message) && lastSuggestions.length > 0) {
          const mapped = mapSelectionToDish(message, lastSuggestions)
          if (mapped) return `${mapped} 레시피 알려줘`
        }
        return message
      })()

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

      const parsedResponse: AIResponse = await response.json()

      // Add AI response
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: parsedResponse.content,
        timestamp: Date.now(),
      }

      const finalMessages = [...updatedMessages, assistantMessage]
      setCurrentMessages(finalMessages)

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

      // 후보 목록 추출/정리
      const suggestions = extractNumberedSuggestions(parsedResponse.content)
      setLastSuggestions(suggestions)

      // Set view and data based on AI response type
      if (parsedResponse.type === "recipe") {
        setCurrentView("recipe")
        if (parsedResponse.recipes && parsedResponse.recipes.length > 0) {
          setCurrentRecipes(parsedResponse.recipes)
        }
        // 레시피 응답이면 후보 초기화
        setLastSuggestions([])
      } else if (parsedResponse.type === "cart") {
        setCurrentView("cart")
        if (parsedResponse.ingredients && parsedResponse.ingredients.length > 0) {
          setCurrentIngredients(parsedResponse.ingredients)
          setCartItems(parsedResponse.ingredients)
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

  const handleChatSelect = (chatId: string) => {
    const chat = chatHistory.find((c) => c.id === chatId)
    if (chat) {
      setCurrentChatId(chatId)
      setCurrentMessages(chat.messages)
      setError(null)

      // Determine view based on chat content
      if (chat.messages.length > 0) {
        const lastAssistantMessage = chat.messages.filter((m) => m.role === "assistant").pop()

        if (lastAssistantMessage) {
          const content = lastAssistantMessage.content.toLowerCase()
          if (content.includes("recipe") || content.includes("cook")) {
            setCurrentView("recipe")
          } else if (content.includes("shopping") || content.includes("ingredient")) {
            setCurrentView("cart")
          } else {
            setCurrentView("recipe") // Default
          }
        }
      }
    }
  }

  const handleBookmarkToggle = (recipeId: string) => {
    setBookmarkedRecipes((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId],
    )
  }

  const handleAddToCart = (ingredient: { name: string; amount: string; unit: string }) => {
    setCartItems((prev) => {
      // Check if ingredient already exists, if so, don't add duplicate
      const exists = prev.some((item) => item.name === ingredient.name)
      if (exists) return prev
      return [...prev, ingredient]
    })
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

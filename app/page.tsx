"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { WelcomeScreen } from "@/components/welcome-screen"
import { RecipeExplorationScreen } from "@/components/recipe-exploration-screen"
import { ShoppingListScreen } from "@/components/shopping-list-screen"
import type { ChatSession, ChatMessage, UIRecipe, AIResponse, Recipe, Ingredient, Product } from "../src/types"
import { useChat } from "@/hooks/useChat"
import { getJson } from "@/lib/api"


// 표준 백엔드 스키마 (chatType/content/recipes)
interface ServiceHealth { intent: boolean; shopping: boolean; video: boolean; agent: boolean }
type ChatServiceResponse = { chatType: "chat" | "cart"; content: string; recipes: Recipe[] }

export default function HomePage() {
  // const [currentView, setCurrentView] = useState<"welcome" | "recipe" | "cart">("welcome")
  // const [chatHistory, setChatHistory] = useLocalStorage<ChatSession[]>("recipe-ai-chat-history", [])
  // 북마크는 이제 food_name과 같은 고유한 문자열을 저장해야 합니다.
  // const [bookmarkedRecipes, setBookmarkedRecipes] = useLocalStorage<string[]>("recipe-ai-bookmarks", [])
  // const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  // const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([])
  // const [isLoading, setIsLoading] = useState(false)
  // const [currentRecipes, setCurrentRecipes] = useState<Recipe[]>([])
  const [currentIngredients, setCurrentIngredients] = useState<Array<{ name: string; amount: string; unit: string }>>(
    [],
  )
  const [currentCartData, setCurrentCartData] = useState<Recipe[]>([])
  // const [cartItems, setCartItems] = useState<Array<{ name: string; amount: string; unit: string }>>([])
  // const [error, setError] = useState<string | null>(null)
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([])
  const {
    currentView,
    chatHistory,
    currentChatId,
    currentMessages,
    isLoading,
    error,
    currentRecipes,
    cartItems, // useChat에서 cartItems를 직접 사용
    bookmarkedRecipes,
    handleNewChat,
    handleChatSubmit,
    handleChatSelect,
    handleBookmarkToggle,
    handleAddToCart,
    handleGenerateCart,
    handleViewChange,
  } = useChat()
  

  
  useEffect(() => {
    getJson("/api/auth/me")
      .then((me) => console.log("me:", me))
      .catch((e) => console.error("auth/me error:", e))
  }, [])
  
  

  // const parseAIResponse = (text: string): AIResponse => {
  //   try {
  //     const parsed = JSON.parse(text)
  //     return parsed
  //   } catch {
  //     // If not valid JSON, try to extract recipe information from text
  //     const recipeMatch = text.match(/recipe|cook|ingredient|preparation/i)
  //     const cartMatch = text.match(/shopping|buy|store|ingredient|cart/i)

      // if (recipeMatch && !cartMatch) {
      //   // Try to extract basic recipe info from text
      //   const lines = text.split("\n").filter((line) => line.trim())
      //   const mockRecipe: UIRecipe = {
      //     id: Date.now().toString(),
      //     name: lines[0] || "AI Generated Recipe",
      //     description: lines[1] || "A delicious recipe suggested by AI",
      //     prepTime: "15 min",
      //     cookTime: "30 min",
      //     servings: 4,
      //     difficulty: "Medium" as const,
      //     ingredients: [],
      //     instructions: lines.slice(2) || ["Follow the AI's instructions above"],
      //     tags: ["AI Generated"],
      //   }

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
                <button onClick={() => handleViewChange(currentView)} className="ml-4 text-red-500 hover:text-red-700">
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
              onAddToCart={(ing) => handleAddToCart({ item: ing.name, amount: ing.amount, unit: ing.unit })}
              isRightSidebarOpen={!rightSidebarCollapsed}
            />
          )}
          {currentView === "cart" && (
            <ShoppingListScreen
              cartItems={cartItems}
              onGenerateCart={handleGenerateCart}
              isRightSidebarOpen={!rightSidebarCollapsed}
            />
          )}
        </div>
      </MainLayout>
    </div>
  )
}
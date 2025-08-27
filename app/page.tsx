"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/main-layout"
import { WelcomeScreen } from "@/components/welcome-screen"
import { RecipeExplorationScreen } from "@/components/recipe-exploration-screen"
import { ShoppingListScreen } from "@/components/shopping-list-screen"
import { useChat } from "@/hooks/useChat"
import { getJson } from "@/lib/api"

export default function HomePage() {
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false)
  
  const {
    currentView,
    chatHistory,
    currentChatId,
    currentMessages,
    isLoading,
    error,
    currentRecipes,
    cartItems,
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
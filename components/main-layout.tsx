"use client"

import type React from "react"

import { useState } from "react"
import { LeftSidebar } from "./left-sidebar"
import { RightChatSidebar } from "./right-chat-sidebar"
import { cn } from "@/lib/utils"
import type { ChatMessage, ChatSession } from "../src/types"

interface MainLayoutProps {
  children: React.ReactNode
  currentView: "welcome" | "recipe" | "cart"
  chatHistory: ChatSession[]
  currentChatId: string | null
  currentMessages: ChatMessage[]
  isLoading: boolean
  rightSidebarCollapsed: boolean
  onNewChat: () => void
  onChatSubmit: (message: string) => void
  onChatSelect: (chatId: string) => void
  onViewChange: (view: "welcome" | "recipe" | "cart") => void
  onRightSidebarToggle: () => void
}

export function MainLayout({
  children,
  currentView,
  chatHistory,
  currentChatId,
  currentMessages,
  isLoading,
  rightSidebarCollapsed,
  onNewChat,
  onChatSubmit,
  onChatSelect,
  onViewChange,
  onRightSidebarToggle,
}: MainLayoutProps) {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Sidebar */}
      <LeftSidebar
        collapsed={leftSidebarCollapsed}
        onToggle={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onNewChat={onNewChat}
        onChatSelect={onChatSelect}
      />

      {/* Main Content Area */}
      <div className={cn("flex-1 flex transition-all duration-300", leftSidebarCollapsed ? "ml-16" : "ml-64")}>
        <div className={cn("flex-1 transition-all duration-300", rightSidebarCollapsed ? "mr-12" : "mr-80")}>
          {children}
        </div>

        {/* Right Chat Sidebar */}
        <RightChatSidebar
          collapsed={rightSidebarCollapsed}
          onToggle={onRightSidebarToggle}
          currentView={currentView}
          messages={currentMessages}
          isLoading={isLoading}
          onChatSubmit={onChatSubmit}
          onViewChange={onViewChange}
        />
      </div>
    </div>
  )
}

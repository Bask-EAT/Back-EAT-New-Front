"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Send, ChevronRight, ChevronLeft, ShoppingCart, ChefHat, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

interface RightChatSidebarProps {
  collapsed: boolean
  onToggle: () => void
  currentView: "welcome" | "recipe" | "cart"
  messages: ChatMessage[]
  isLoading: boolean
  onChatSubmit: (message: string) => void
  onViewChange: (view: "welcome" | "recipe" | "cart") => void
}

export function RightChatSidebar({
  collapsed,
  onToggle,
  currentView,
  messages,
  isLoading,
  onChatSubmit,
  onViewChange,
}: RightChatSidebarProps) {
  const [message, setMessage] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onChatSubmit(message)
      setMessage("")
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 overscroll-contain overflow-hidden",
        collapsed ? "w-12" : "w-[30rem]", // 가로 영역 확장
      )}
    >
      {collapsed ? (
        <div className="flex flex-col h-full items-center py-4 gap-3">
          <Button variant="ghost" size="sm" onClick={onToggle} className="p-2">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {(currentView === "recipe" || currentView === "cart") && (
            <div className="flex flex-col gap-2">
              <Button
                variant={currentView === "recipe" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange("recipe")}
                className="p-2 w-10 h-10"
                title="Recipes"
              >
                <ChefHat className="w-4 h-4" />
              </Button>
              <Button
                variant={currentView === "cart" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange("cart")}
                className="p-2 w-10 h-10"
                title="Shopping Cart"
              >
                <ShoppingCart className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Chat</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onToggle} className="p-2">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* View Toggle Buttons */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex gap-2">
              <Button
                variant={currentView === "recipe" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange("recipe")}
                className="flex-1"
              >
                <ChefHat className="w-4 h-4 mr-1" />
                Recipe
              </Button>
              <Button
                variant={currentView === "cart" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange("cart")}
                className="flex-1"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Cart
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0">
            {/* 스크롤 가능 메시지 뷰 (남은 높이를 꽉 채우고, 입력창과 겹치지 않도록 footer는 별도 영역) */}
            <ScrollArea className="h-full p-4 overscroll-contain pr-2" ref={scrollAreaRef}>
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation to get recipe suggestions!</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg max-w-[90%]",
                        msg.role === "user" ? "bg-blue-600 text-white ml-auto" : "bg-gray-100 dark:bg-gray-700",
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words overflow-x-auto overflow-y-auto max-h-[40vh]">{msg.content}</div>
                      <div
                        className={cn(
                          "text-xs mt-1 opacity-70",
                          msg.role === "user" ? "text-blue-100" : "text-gray-500",
                        )}
                      >
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-[90%]">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask for recipes or ingredients..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="sm" disabled={isLoading || !message.trim()}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

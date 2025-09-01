"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Send, ChevronRight, ChevronLeft, ShoppingCart, ChefHat, Loader2, Paperclip, X, Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "../src/types"
import Image from "next/image"

interface RightChatSidebarProps {
  collapsed: boolean
  onToggle: () => void
  currentView: "welcome" | "recipe" | "cart" | "bookmark"
  messages: ChatMessage[]
  isLoading: boolean
  onChatSubmit: (message: string, image?: File) => void
  onViewChange: (view: "welcome" | "recipe" | "cart" | "bookmark") => void
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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if ((message.trim() || imageFile) && !isLoading) {
      onChatSubmit(message, imageFile ?? undefined)
      setMessage("")
      handleRemoveImage()
    }
  }

  // 이미지 업로드
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 이미지 업로드 취소
  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
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

          {(currentView === "recipe" || currentView === "cart" || currentView === "bookmark") && (
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
              <Button
                variant={currentView === "bookmark" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange("bookmark")}
                className="p-2 w-10 h-10"
                title="Bookmarks"
              >
                <Bookmark className="w-4 h-4" />
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
              <Button
                variant={currentView === "bookmark" ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange("bookmark")}
                className="flex-1"
              >
                <Bookmark className="w-4 h-4 mr-1" />
                Bookmark
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
                  <p>대화를 시작하여 레시피 제안을 받아보세요!</p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((msg, index) => {
                    const role = (msg as any).role ?? (msg as any).type
                    const isUser = role === "user"
                    const imageUrl = msg.imageUrl
                    const ts = typeof (msg as any).timestamp === "number" ? (msg as any).timestamp : new Date((msg as any).timestamp as any).getTime()
                    
                    console.log(`메시지 ${index}:`, { role, content: msg.content, isUser });
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "flex flex-col p-3 rounded-lg max-w-[90%]",
                          isUser ? "bg-blue-600 text-white ml-auto" : "bg-gray-100 dark:bg-gray-700",
                        )}
                      >
                        {imageUrl && (
                          <img
                            src={imageUrl}
                            alt="User upload"
                            className="rounded-md mb-2 max-w-full h-auto max-h-60 object-contain"
                          />
                        )}
                        {msg.content && (
                          <div className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </div>
                        )}
                        <div
                          className={cn(
                            "text-xs mt-1 opacity-70",
                            isUser ? "text-blue-100" : "text-gray-500",
                          )}
                        >
                          {formatTime(ts)}
                        </div>
                      </div>
                    )
                  })}
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
            {imagePreview && (
              <div className="mb-2 relative w-24 h-24">
                <img src={imagePreview} alt="Image preview" className="rounded-md object-cover w-full h-full" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex-shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="레시피나 재료에 대해 물어보세요..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="sm" disabled={isLoading || (!message.trim() && !imageFile)}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

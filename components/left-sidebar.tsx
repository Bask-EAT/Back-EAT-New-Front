"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquarePlus, ChefHat, Menu, Bookmark, Moon, Sun, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import type { ChatSession } from "../src/types"
import { getFirebaseAuth } from "@/lib/firebase"
import Link from "next/link"

// 기존 로컬 인터페이스 제거: 전역 타입과 충돌하므로 src/types.ts 의 ChatSession 사용

interface LeftSidebarProps {
  collapsed: boolean
  onToggle: () => void
  chatHistory: ChatSession[]
  currentChatId: string | null
  onNewChat: () => void
  onChatSelect: (chatId: string) => void
}

export function LeftSidebar({
  collapsed,
  onToggle,
  chatHistory,
  currentChatId,
  onNewChat,
  onChatSelect,
}: LeftSidebarProps) {
  const { theme, setTheme } = useTheme()
  const [bookmarks] = useState<string[]>([]) // Will be implemented later
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatDate = (dateInput: Date | string) => {
    const date = new Date(dateInput)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
  }

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-background border-r border-border transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-blue-600" />
              <Link href="/">
                <span className="font-bold text-lg text-foreground">Recipe AI</span>
              </Link>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={onToggle} className="p-2">
            <Menu className="w-4 h-4" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button onClick={onNewChat} className="w-full justify-start gap-2 bg-transparent" variant="outline">
            <MessageSquarePlus className="w-4 h-4" />
            {!collapsed && "New Chat"}
          </Button>
        </div>

        {/* Chat History */}
        <div className="flex-1 px-4">
          {!collapsed && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Chat History</h3>
              <ScrollArea className="h-48">
                {chatHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No chats yet</p>
                ) : (
                  chatHistory.map((chat) => (
                    <Button
                      key={chat.id}
                      variant={currentChatId === chat.id ? "secondary" : "ghost"}
                      className="w-full justify-start mb-1 text-left truncate h-auto py-2"
                      size="sm"
                      onClick={() => onChatSelect(chat.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm">{chat.title}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(chat.lastUpdated)}</div>
                      </div>
                    </Button>
                  ))
                )}
              </ScrollArea>
            </div>
          )}

          {/* Bookmarks */}
          {!collapsed && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Recipe Bookmarks</h3>
              <ScrollArea className="h-32">
                {bookmarks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookmarks yet</p>
                ) : (
                  bookmarks.map((bookmark, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start mb-1 text-left truncate"
                      size="sm"
                    >
                      <Bookmark className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{bookmark}</span>
                    </Button>
                  ))
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Logout + Theme Toggle */}
        <div className="p-4 border-t border-border">
          <div className="mb-2">
            <Button
              variant="destructive"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={async () => {
                try {
                  // Firebase sign out (best-effort)
                  try { await getFirebaseAuth().signOut() } catch {}
                  // Clear local token and reload
                  localStorage.removeItem("jwtToken")
                  window.location.href = "/"
                } catch {}
              }}
            >
              로그아웃
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThemeToggle}
            className="w-full justify-start gap-2 hover:bg-accent"
            disabled={!mounted}
          >
            {!mounted ? (
              <div className="w-4 h-4 animate-pulse bg-muted-foreground rounded" />
            ) : theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            {!collapsed && <span>{!mounted ? "Loading..." : theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}

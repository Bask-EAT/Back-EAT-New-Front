"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChefHat, Send } from "lucide-react"

interface WelcomeScreenProps {
  onChatSubmit: (message: string) => void
}

export function WelcomeScreen({ onChatSubmit }: WelcomeScreenProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onChatSubmit(message)
      setMessage("")
    }
  }

  const suggestions = [
    "가지로 할 수 있는 프랑스 요리 추천해줘",
    "양파 담아줘",
    "된장찌개 레시피 알려줘",
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-8">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-6">
          <ChefHat className="w-16 h-16 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold mb-4">오늘은 어떤 요리를 도와드릴까요?</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          도전하고 싶은 요리나 필요한 재료를 알려주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-lg mb-8">
        <div className="relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="요리에 관한 질문이나 요청을 적어주세요"
            className="pr-12 py-6 text-lg"
          />
          <Button type="submit" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>

      <div className="w-full max-w-lg">
        <p className="text-sm text-gray-500 mb-4">Try these suggestions:</p>
        <div className="grid gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              className="justify-start text-left h-auto py-3 px-4 bg-transparent"
              onClick={() => {
                setMessage(suggestion)
                onChatSubmit(suggestion)
              }}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
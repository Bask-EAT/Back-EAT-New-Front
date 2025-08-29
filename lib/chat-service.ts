"use client"

import { postJson, getJson, deleteJson } from "./api"

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export type DBRecipe = {
  id: string
  name: string
  description: string
  prepTime: string
  cookTime: string
  servings: number
  difficulty: string
  ingredients: Array<{ name: string; amount: string; unit: string; optional?: boolean }>
  instructions: string[]
  tags: string[]
  image?: string
}

export type DBCartItem = { name: string; amount: string; unit: string }

export type ChatRecord = {
  id: string  // UUID 문자열로 변경
  title: string  // 채팅방 제목 추가
  timestamp: number
  messages: ChatMessage[]
}

// 백엔드 API를 통한 채팅 관리
export class ChatService {
  private static instance: ChatService

  private constructor() {
    // 생성자에서 특별한 초기화가 필요하지 않음
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  // 새 채팅 생성
  async createChat(): Promise<string> {
    try {
      const response = await postJson<any>(`/api/chat/create`, {})
      // 백엔드 응답 구조에 맞게 수정
      return response.chatId || Date.now().toString()
    } catch (error) {
      console.error("채팅 생성 실패:", error)
      throw new Error("채팅 생성에 실패했습니다.")
    }
  }

  // 채팅 조회
  async getChat(id: string): Promise<ChatRecord | undefined> {
    try {
      // 백엔드 API를 직접 호출
      const response = await getJson<any>(`/api/users/me/chats/${id}`)
      console.log('[CHAT] 채팅 상세 응답:', response)
      
      // 백엔드 응답 구조에 맞게 수정
      const data = response
      if (!data) return undefined
      
      return {
        id: data.chat?.id || id, // UUID 문자열을 그대로 사용
        // title: data.chat?.title || "새로운 대화", // 채팅방 제목
        title: data.chat?.title, // 채팅방 제목
        timestamp: new Date(data.chat?.updatedAt).getTime() || Date.now(),
        messages: (data.messages || []).map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime()
        }))
      }
    } catch (error) {
      console.error("채팅 조회 실패:", error)
      return undefined
    }
  }

  // 모든 채팅 조회 (최신순)
  async getAllChatsDesc(): Promise<ChatRecord[]> {
    try {
      // 백엔드 API를 직접 호출
      const response = await getJson<any>(`/api/users/me/chats`)
      console.log('[CHAT] 백엔드 응답:', response)
      
      // 백엔드 응답 구조에 맞게 수정
      const chats = response || []
      // ConversationSummary를 ChatRecord로 변환
      return chats.map((chat: any) => ({
        id: chat.id, // UUID 문자열을 그대로 사용
        // title: chat.title || "새로운 대화", // 채팅방 제목
        title: chat.title, // 채팅방 제목
        timestamp: new Date(chat.updatedAt).getTime(), // updatedAt을 timestamp로 변환
        messages: [] // 메시지는 필요할 때 별도로 로드
      }))
    } catch (error) {
      console.error("채팅 목록 조회 실패:", error)
      return []
    }
  }

  // 메시지 추가
  // async appendMessage(chatId: string, message: ChatMessage): Promise<void> {
  //   try {
  //     await postJson(`/api/chat/${chatId}/message`, {
  //       role: message.role,
  //       content: message.content,
  //       timestamp: message.timestamp
  //     })
  //   } catch (error) {
  //     console.error("메시지 저장 실패:", error)
  //     throw new Error("메시지 저장에 실패했습니다.")
  //   }
  // }

  // 레시피 추가
  async appendRecipes(chatId: string, recipes: DBRecipe[]): Promise<void> {
    try {
      await postJson(`/api/chat/${chatId}/recipes`, { recipes })
    } catch (error) {
      console.error("레시피 저장 실패:", error)
      throw new Error("레시피 저장에 실패했습니다.")
    }
  }

  // 장바구니 아이템 추가
  async appendCartItems(chatId: string, items: DBCartItem[]): Promise<void> {
    try {
      await postJson(`/api/chat/${chatId}/cart-items`, { items })
    } catch (error) {
      console.error("장바구니 아이템 저장 실패:", error)
      throw new Error("장바구니 아이템 저장에 실패했습니다.")
    }
  }

  // 북마크 관련 API
  async getAllBookmarkIds(): Promise<string[]> {
    try {
      const response = await getJson<any>(`/api/bookmarks`)
      return response.data || []
    } catch (error) {
      console.error("북마크 목록 조회 실패:", error)
      return []
    }
  }

  async addBookmark(recipe: DBRecipe): Promise<void> {
    try {
      await postJson(`/api/bookmarks`, recipe)
    } catch (error) {
      console.error("북마크 추가 실패:", error)
      throw new Error("북마크 추가에 실패했습니다.")
    }
  }

  async removeBookmark(id: string): Promise<void> {
    try {
      await deleteJson(`/api/bookmarks/${id}`)
    } catch (error) {
      console.error("북마크 제거 실패:", error)
      throw new Error("북마크 제거에 실패했습니다.")
    }
  }

  async isBookmarked(id: string): Promise<boolean> {
    try {
      const response = await getJson<any>(`/api/bookmarks/${id}/check`)
      return response.data || false
    } catch (error) {
      console.error("북마크 확인 실패:", error)
      return false
    }
  }

  async toggleBookmark(recipe: DBRecipe): Promise<boolean> {
    try {
      const isBookmarked = await this.isBookmarked(recipe.id)
      if (isBookmarked) {
        await this.removeBookmark(recipe.id)
        return false
      } else {
        await this.addBookmark(recipe)
        return true
      }
    } catch (error) {
      console.error("북마크 토글 실패:", error)
      throw new Error("북마크 토글에 실패했습니다.")
    }
  }
}

// 싱글톤 인스턴스 export
export const chatService = ChatService.getInstance()

// 편의를 위한 함수들 직접 export (this 컨텍스트 유지)
export const createChat = chatService.createChat.bind(chatService)
export const getChat = chatService.getChat.bind(chatService)
export const getAllChatsDesc = chatService.getAllChatsDesc.bind(chatService)
// export const appendMessage = chatService.appendMessage.bind(chatService)
export const appendRecipes = chatService.appendRecipes.bind(chatService)
export const appendCartItems = chatService.appendCartItems.bind(chatService)
export const getAllBookmarkIds = chatService.getAllBookmarkIds.bind(chatService)
export const addBookmark = chatService.addBookmark.bind(chatService)
export const removeBookmark = chatService.removeBookmark.bind(chatService)
export const isBookmarked = chatService.isBookmarked.bind(chatService)
export const toggleBookmark = chatService.toggleBookmark.bind(chatService)

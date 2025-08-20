import { useState, useEffect } from "react"
import type { ChatSession, ChatMessage, UIRecipe, Recipe, Ingredient, Product, AIResponse } from "../src/types"
import {
  DBRecipe, DBCartItem,openChatDB, getAllChatsDesc, getAllBookmarkIds, createChat,
  appendMessage, appendRecipes, appendCartItems, getChat, toggleBookmark
} from "@/lib/chat-db"
import { updateChatTitle, extractNumberedSuggestions, mapSelectionToDish, isNumericSelection } from "@/src/chat"

export function useChat() {
  const [currentView, setCurrentView] = useState<"welcome" | "recipe" | "cart">("welcome")
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState<string[]>([])
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentRecipes, setCurrentRecipes] = useState<UIRecipe[]>([])
  const [currentIngredients, setCurrentIngredients] = useState<Array<{ name: string; amount: string; unit: string }>>(
    [],
  )
//   const [currentCartData, setCurrentCartData] = useState<Recipe[]>([]) // 이 상태의 용도를 확인하고 필요하면 currentRecipes와 통합 고려
  const [cartItems, setCartItems] = useState<Recipe[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([])
  
  



  // 초기 로드: IndexedDB에서 최근 채팅 목록 로드
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        await openChatDB()
        const chats = await getAllChatsDesc()
        const bookmarks = await getAllBookmarkIds()
        if (cancelled) return
        const normalized: ChatSession[] = chats.map((c) => ({
          id: c.id,
          title: c.messages.find((m) => m.role === "user")?.content.slice(0, 50) || "New Chat",
          messages: c.messages,
          lastUpdated: c.messages[c.messages.length - 1]?.timestamp || c.timestamp,
        }))
        setChatHistory(normalized)
        setBookmarkedRecipes(bookmarks)
        // 과거 대화 자동 선택을 비활성화하여 이전 레시피가 자동 표시되지 않도록 함
        // 사용자가 왼쪽 사이드바에서 채팅을 직접 선택하면 해당 대화가 로드됩니다.
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "IndexedDB 초기화 오류")
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])
  


  // 새 채팅 시작
  const handleNewChat = () => {
    ;(async () => {
      try {
        const newChatId = await createChat()
        const newChat: ChatSession = {
          id: newChatId,
          title: "New Chat",
          messages: [],
          lastUpdated: Date.now(),
        }
        setChatHistory((prev) => [newChat, ...prev])
        setCurrentChatId(newChatId)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "새 채팅 생성 실패")
      }
    })()
    setCurrentMessages([])
    setCurrentView("welcome")
    setCurrentRecipes([])
    setCurrentIngredients([])
    setCartItems([])
    setLastSuggestions([])
    setError(null)
  }



  // 채팅 제출 처리
  const handleChatSubmit = async (message: string) => {
        if (!message.trim() || isLoading) return

        setIsLoading(true)
        setError(null)

    // Create new chat if none exists
    let chatId = currentChatId
    if (!chatId) {
      try {
        chatId = await createChat()
        setCurrentChatId(chatId)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "채팅 생성 실패")
        setIsLoading(false)
        return
      }
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      timestamp: Date.now(),
      chatType: "chat",
    }
    
    const updatedMessages = [...currentMessages, userMessage]
    setCurrentMessages(updatedMessages)
    try {
      await appendMessage(chatId, userMessage)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || "메시지 저장 실패")
    }
    // 좌측 리스트의 최근 업데이트 시간/순서를 즉시 반영
    setChatHistory((prev) => {
      const others = prev.filter((c) => c.id !== chatId)
      const me: ChatSession = {
        id: chatId!,
        title: updateChatTitle(updatedMessages),
        messages: updatedMessages,
        lastUpdated: Date.now(),
      }
      return [me, ...others]
    })

    try {
      // Call AI API
      // 숫자 선택은 서버(TextAgent)가 직전 추천목록으로 매핑합니다. 클라이언트에서는 원문 그대로 전달합니다.
      const messageToSend = message

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageToSend,
          chatHistory: currentMessages.map((msg) => ({
            role: (msg as any).role ?? (msg as any).type,
            content: msg.content,
            timestamp: msg.timestamp,
          })),
        }),
      })
      console.log("------------- API 응답 상태:", response.status)

      if (!response.ok) {
        throw new Error("AI 응답 가져오기 실패")
      }

      
      const raw = await response.json()
      console.log("-------------------AI 응답:", raw)

      // 1) 표준 스키마(chatType/content/recipes) 우선 처리
      if (raw && typeof raw === "object" && (raw as ChatServiceResponse).chatType) {
        const service: ChatServiceResponse = raw as ChatServiceResponse

        // 메시지 저장용 (content 없으면 레시피 타이틀로 대체)
        const fallbackText = (() => {
          const first = (service.recipes || [])[0]
          const title = first?.food_name
          return title ? `네. ${title} 레시피를 알려드릴게요.` : "요청하신 결과를 준비했어요."
        })()
        const assistantMessage: ChatMessage = {
          role: "bot",
          content: (service.content && service.content.trim()) ? service.content : fallbackText,
          timestamp: Date.now(),
        }

        const finalMessages = [...updatedMessages, assistantMessage]
        setCurrentMessages(finalMessages)
        try {
          await appendMessage(chatId, assistantMessage)
        } catch (e: any) {
          console.error(e)
          setError(e?.message || "응답 저장 실패")
        }

        // 표준 → UI 변환
        const uiRecipes: UIRecipe[] = (service.recipes || []).map((r, index) => {
          const foodName = r.food_name || `Recipe ${index + 1}`
          const normalizedIngs = (Array.isArray(r.ingredients) ? r.ingredients : []).map((ing: any) => {
            if (ing && typeof ing === "object" && (ing as any).product_name) {
              return { name: (ing as Product).product_name || "", amount: "", unit: "", optional: false }
            }
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
        try {
            await appendMessage(chatId, userMessage)
        } catch (e: any) {
            console.error(e)
            setError(e?.message || "메시지 저장 실패")
        }

        // 좌측 리스트의 최근 업데이트 시간/순서를 즉시 반영
        setChatHistory((prev) => {
            const others = prev.filter((c) => c.id !== chatId)
            const me: ChatSession = {
                id: chatId!,
                title: updateChatTitle(updatedMessages),
                messages: updatedMessages,
                lastUpdated: Date.now(),
            }   

            return [me, ...others]
        })

        try {
            // Call AI API
            // 숫자 선택은 서버(TextAgent)가 직전 추천목록으로 매핑합니다. 클라이언트에서는 원문 그대로 전달합니다.
            const messageToSend = message

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

        
            const raw = await response.json()
            console.log("-------------------AI 응답:", raw)

            // 1) 표준 스키마(chatType/content/recipes) 우선 처리
            if (raw && typeof raw === "object" && (raw as ChatServiceResponse).chatType) {
                const service: ChatServiceResponse = raw as ChatServiceResponse

                // 메시지 저장용 (content 없으면 레시피 타이틀로 대체)
                const fallbackText = (() => {
                    const first = (service.recipes || [])[0]
                    const title = first?.food_name
                    return title ? `네. ${title} 레시피를 알려드릴게요.` : "요청하신 결과를 준비했어요."
                })()
                const assistantMessage: ChatMessage = {
                    role: "assistant",
                    content: (service.content && service.content.trim()) ? service.content : fallbackText,
                    timestamp: Date.now(),
                }

                const finalMessages = [...updatedMessages, assistantMessage]
                setCurrentMessages(finalMessages)
                try {
                    await appendMessage(chatId, assistantMessage)
                } catch (e: any) {
                    console.error(e)
                    setError(e?.message || "응답 저장 실패")
                }

                // 표준 → UI 변환
                const uiRecipes: UIRecipe[] = (service.recipes || []).map((r, index) => {
                const foodName = r.food_name || `Recipe ${index + 1}`
                const normalizedIngs = (Array.isArray(r.ingredients) ? r.ingredients : []).map((ing: any) => {
                    if (ing && typeof ing === "object" && (ing as any).product_name) {
                    return { name: (ing as Product).product_name || "", amount: "", unit: "", optional: false }
                    }
                    const ii = ing as Ingredient
                    return { name: ii?.item || "", amount: ii?.amount || "", unit: ii?.unit || "", optional: false }
                })
                const tag = r.source === "video" ? "영상레시피" : r.source === "ingredient_search" ? "상품" : "텍스트레시피"
                return {
                    id: `recipe_${Date.now()}_${index}`,
                    name: foodName,
                    description: `${r.source === "video" ? "영상" : r.source === "ingredient_search" ? "상품" : "텍스트"} 기반 레시피`,
                    prepTime: "준비 시간 미정",
                    cookTime: "조리 시간 미정",
                    servings: 1,
                    difficulty: "Medium",
                    ingredients: normalizedIngs,
                    instructions: Array.isArray(r.recipe) ? r.recipe : [],
                    tags: [tag],
                    image: `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(foodName)}`,
                }
                })

                // 좌측 리스트 갱신
                const title = updateChatTitle(finalMessages)
                const updatedChat: ChatSession = { id: chatId, title, messages: finalMessages, lastUpdated: Date.now() }
                setChatHistory((prev) => {
                    const filtered = prev.filter((chat) => chat.id !== chatId)
                    return [updatedChat, ...filtered]
                })

                // 화면 상태 분기 및 저장
                if (service.chatType === "chat") {
                    setCurrentView("recipe")
                    setCurrentRecipes(uiRecipes)
                    try {
                        await appendRecipes(chatId, uiRecipes as unknown as DBRecipe[])
                    } catch (e: any) {
                        console.error(e)
                        setError(e?.message || "레시피 저장 실패")
                    }
                    setLastSuggestions([])
                } else {
                    setCurrentView("cart")
                    const cartList = (service.recipes || []).flatMap((r) =>
                        (Array.isArray(r.ingredients) ? r.ingredients : []).map((ing: any) => {
                        if (ing && typeof ing === "object" && (ing as any).product_name) {
                            return { name: (ing as Product).product_name || "", amount: "", unit: "" }
                        }
                        const ii = ing as Ingredient
                        return { name: ii?.item || "", amount: ii?.amount || "", unit: ii?.unit || "" }
                        }),
                    )
                    setCurrentIngredients(cartList)
                    //   setCartItems(cartList)
                    //   setCartItems(service.recipes || [])

                    // 기존 재료 검색 결과에 새 항목 추가
                    setCartItems((prevCartItems) => {
                        const newItems = service.recipes || [];
                        
                        // (선택 사항) 이미 목록에 있는 재료는 중복 추가하지 않도록 처리
                        const existingNames = new Set(prevCartItems.map(item => item.food_name));
                        const filteredNewItems = newItems.filter(item => !existingNames.has(item.food_name));
                        
                        console.log("useChat: 기존 장바구니에 새 항목을 추가합니다.", filteredNewItems);

                        // ★★ 새로 추가된 임베딩 데이터들을 IndexedDB의 recipes 필드에 저장 ★★
                        if (chatId && filteredNewItems.length > 0) {
                        console.log(`⏩[디버그] DB에 저장할 recipes 데이터 (chatId: ${chatId}):`, filteredNewItems);
                        // 타입스크립트가 타입을 추론할 수 있도록 형 변환을 해줍니다.
                        appendRecipes(chatId, filteredNewItems as unknown as DBRecipe[]);
                        }
                        
                        return [...prevCartItems, ...filteredNewItems];
                    });

                    try {
                        await appendCartItems(chatId, cartList as unknown as DBCartItem[])
                    } catch (e: any) {
                        console.error(e)
                        setError(e?.message || "카트 저장 실패")
                    }
                }
                return
            }

            // 2) 구 스키마(AIResponse) 폴백 처리
            const parsedResponse: AIResponse = raw

            // Add AI response
            const assistantMessage: ChatMessage = {
                type: "bot",
                content: raw.content,
                recipes: raw.recipes,
                chatType: raw.chatType,
                timestamp: new Date(),
            }

            const finalMessages = [...updatedMessages, assistantMessage]
            setCurrentMessages(finalMessages)
            console.log("------------- AI 메시지 추가됨. 최종 메시지:", finalMessages)
            try {
                await appendMessage(chatId, assistantMessage)
            } catch (e: any) {
                console.error(e)
                setError(e?.message || "응답 저장 실패")
            }

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

            // 후보 목록 추출/정리 (순수 추천 응답에서만 의미가 있음)
            const suggestions = extractNumberedSuggestions(parsedResponse.content)
            setLastSuggestions(suggestions)

            // Set view and data based on AI response type
            if (parsedResponse.type === "recipe") {
                setCurrentView("recipe")
                if (parsedResponse.recipes && parsedResponse.recipes.length > 0) {
                    setCurrentRecipes(parsedResponse.recipes)
                try {
                    await appendRecipes(chatId, parsedResponse.recipes as unknown as DBRecipe[])
                } catch (e: any) {
                    console.error(e)
                    setError(e?.message || "레시피 저장 실패")
                }
                // 실제 레시피가 채워진 경우에만 후보 초기화
                setLastSuggestions([])
                }
            } else if (parsedResponse.type === "cart") {
                setCurrentView("cart")
                if (parsedResponse.ingredients && parsedResponse.ingredients.length > 0) {
                    setCurrentIngredients(parsedResponse.ingredients)
                    setCartItems(parsedResponse.ingredients)
                    try {
                        await appendCartItems(chatId, parsedResponse.ingredients as unknown as DBCartItem[])
                    } catch (e: any) {
                        console.error(e)
                        setError(e?.message || "카트 저장 실패")
                    }
                }
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
        return
      }

      // 2) 구 스키마(AIResponse) 폴백 처리
      const parsedResponse: AIResponse = raw

      // Add AI response
      const assistantMessage: ChatMessage = {
        role: "bot",
        content: raw.content,
        recipes: raw.recipes,
        chatType: raw.chatType,
        timestamp: Date.now(),
      }

      const finalMessages = [...updatedMessages, assistantMessage]
      setCurrentMessages(finalMessages)
      console.log("------------- AI 메시지 추가됨. 최종 메시지:", finalMessages)
      try {
        await appendMessage(chatId, assistantMessage)
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "응답 저장 실패")
      }

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
      console.log("채팅 기록 업데이트됨:", updatedChat)

      // 후보 목록 추출/정리 (순수 추천 응답에서만 의미가 있음)
      const suggestions = extractNumberedSuggestions(parsedResponse.content)
      setLastSuggestions(suggestions)

      // Set view and data based on AI response type
      if (parsedResponse.type === "recipe") {
        setCurrentView("recipe")
        if (parsedResponse.recipes && parsedResponse.recipes.length > 0) {
          setCurrentRecipes(parsedResponse.recipes)
          try {
            await appendRecipes(chatId, parsedResponse.recipes as unknown as DBRecipe[])
          } catch (e: any) {
            console.error(e)
            setError(e?.message || "레시피 저장 실패")
          }
          // 실제 레시피가 채워진 경우에만 후보 초기화
          setLastSuggestions([])
        }
      } else if (parsedResponse.type === "cart") {
        setCurrentView("cart")
        if (parsedResponse.ingredients && parsedResponse.ingredients.length > 0) {
          setCurrentIngredients(parsedResponse.ingredients)
          setCartItems(parsedResponse.ingredients)
          try {
            await appendCartItems(chatId, parsedResponse.ingredients as unknown as DBCartItem[])
          } catch (e: any) {
            console.error(e)
            setError(e?.message || "카트 저장 실패")
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      setError("AI 응답 가져오기 실패. 다시 시도해주세요.")

      // Add error message
      const errorMessage: ChatMessage = {
        role: "bot",
        content: "죄송합니다, 오류가 발생했습니다. 다시 시도해주세요.",
        timestamp: Date.now(),
      }
      setCurrentMessages((prev) => [...prev, errorMessage])
      console.log("에러 메시지가 채팅에 추가됨")
    } finally {
      setIsLoading(false)
    }
  }


  // 채팅 선택 핸들러
  const handleChatSelect = (chatId: number) => {
      const chat = chatHistory.find((c) => c.id === chatId)
      if (chat) {
        setCurrentChatId(chatId)
        setCurrentMessages(chat.messages)
        setLastSuggestions([])
        // 다른 채팅의 레시피/카트가 비치지 않도록 즉시 초기화
        setCurrentRecipes([])
        setCurrentIngredients([])
        setCartItems([])
        setCurrentView("welcome")
        setError(null)
        ;(async () => {
          try {
            const full = await getChat(chatId)
            console.log(`⏩[디버그] DB에서 불러온 전체 채팅 데이터 (chatId: ${chatId}):`, full);

            if (full) {
            //   // 복원: 레시피와 카트
            //   setCurrentRecipes((full.recipes || []) as unknown as UIRecipe[])
            //   const items = (full.cartItems || []) as Array<{ name: string; amount: string; unit: string }>
            //   setCurrentIngredients(items)
            //   setCartItems(items)
            //   // 컨텐츠 기반으로 뷰 결정
            //   if ((full.recipes && full.recipes.length > 0)) {
            //     setCurrentView("recipe")
            //   } else if ((full.cartItems && full.cartItems.length > 0)) {
            //     setCurrentView("cart")
            //   }
            
            // 1. 레시피/상품 데이터를 모두 cartItems 상태에 설정합니다.
              //    UI는 이 데이터를 기반으로 recipe 또는 cart 뷰를 그립니다.
              //    DB의 recipes 필드에 모든 것이 저장되어 있어야 합니다.
              setCartItems(full.recipes as unknown as Recipe[] || []);
              
              // 2. DB의 cartItems 필드는 다른 용도로 사용하거나,
              //    UI 복원을 위해 사용하지 않는다면 아래 라인은 주석처리/삭제 가능합니다.
              const items = (full.cartItems || []) as Array<{ name: string; amount: string; unit: string }>
              setCurrentIngredients(items)

              // 3. 컨텐츠 기반으로 뷰를 결정합니다.
              //    recipes 배열에 'ingredient_search' 소스가 하나라도 있으면 cart 뷰로 간주합니다.
              const isCartView = (full.recipes || []).some(r => r.source === 'ingredient_search');

              if (isCartView) {
                setCurrentView("cart");
              } else if (full.recipes && full.recipes.length > 0) {
                // 일반 레시피만 있는 경우 recipe 뷰로 설정
                setCurrentView("recipe");
                setCurrentRecipes(full.recipes as unknown as UIRecipe[]);
              }
            
            }
          } catch (e: any) {
            console.error(e)
            setError(e?.message || "채팅 불러오기 실패")
          }
        })()
  
        // 메시지 기반의 폴백 뷰 결정 (비동기 복원 전에 잠깐 필요한 경우)
        if (chat.messages.length > 0) {
          const lastAssistantMessage = chat.messages.filter((m: any) => (m.role ?? m.type) === "bot").pop()
          if (lastAssistantMessage) {
            const content = lastAssistantMessage.content.toLowerCase()
            if (content.includes("recipe") || content.includes("cook")) setCurrentView("recipe")
            else if (content.includes("shopping") || content.includes("ingredient")) setCurrentView("cart")
          }
        }
      }
    }


    // 북마크 토글 핸들러
  const handleBookmarkToggle = (recipeId: string) => {
        // 현재 화면의 레시피 중 대상 찾기
        const recipe = currentRecipes.find((r) => r.id === recipeId)
        if (!recipe) return
        ;(async () => {
          try {
            const toggled = await toggleBookmark(recipe as unknown as DBRecipe)
            setBookmarkedRecipes((prev) =>
              toggled ? [...new Set([...prev, recipeId])] : prev.filter((id) => id !== recipeId),
            )
          } catch (e: any) {
            console.error(e)
            setError(e?.message || "북마크 저장 실패")
          }
        })()
      }



    // 카트에 추가 핸들러
  const handleAddToCart = (ingredient: Ingredient) => {
    setCartItems((prev) => {
      const exists = prev.some((item) => item.item === ingredient.item)
      if (exists) return prev
      return [...prev, ingredient]
    })
    ;(async () => {
      try {
        if (currentChatId) {
          await appendCartItems(currentChatId, [ingredient as unknown as DBCartItem])
        }
      } catch (e: any) {
        console.error(e)
        setError(e?.message || "카트 저장 실패")
      }
    })()
    // Switch to cart view when adding items
    setCurrentView("cart")
  }


  // 쇼핑 카트 생성 핸들러
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


    // 뷰 변경 핸들러
    const handleViewChange = (view: "welcome" | "recipe" | "cart") => {
    setCurrentView(view)
    setError(null)
  } 

  return {
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
  }
}
}
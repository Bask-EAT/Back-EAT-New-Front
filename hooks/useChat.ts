import { useState, useEffect } from "react"
import type { ChatSession as UIChatSession, ChatMessage as UIChatMessage, UIRecipe, Recipe, Ingredient, Product, AIResponse } from "../src/types"
import {
  DBRecipe, DBCartItem,openChatDB, getAllChatsDesc, getAllBookmarkIds, createChat,
  appendMessage, appendRecipes, appendCartItems, getChat, toggleBookmark, ChatMessage as DBChatMessage
} from "@/lib/chat-db"
import { updateChatTitle, extractNumberedSuggestions, mapSelectionToDish, isNumericSelection } from "@/src/chat"
import { getOrCreateUserId, generateChatIdForUser } from "@/lib/utils"

type ChatServiceResponse = {
  chatType?: "chat" | "cart"
  content?: string
  recipes?: any[]
}

export function useChat() {
  const [currentView, setCurrentView] = useState<"welcome" | "recipe" | "cart">("welcome")
  const [chatHistory, setChatHistory] = useState<UIChatSession[]>([])
  const [bookmarkedRecipes, setBookmarkedRecipes] = useState<string[]>([])
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  // 서버 전송용 해시 기반 Chat ID (UI/IndexedDB와 분리)
  const [serverChatId, setServerChatId] = useState<string | null>(null)
  const [currentMessages, setCurrentMessages] = useState<UIChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentRecipes, setCurrentRecipes] = useState<UIRecipe[]>([])
  const [currentIngredients, setCurrentIngredients] = useState<Array<{ name: string; amount: string; unit: string }>>(
    [],
  )
//   const [currentCartData, setCurrentCartData] = useState<Recipe[]>([]) // 이 상태의 용도를 확인하고 필요하면 currentRecipes와 통합 고려
  const [cartItems, setCartItems] = useState<any[]>([])
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
        const normalized: UIChatSession[] = chats.map((c) => ({
          id: c.id,
          title: (c.messages.find((m) => m.role === "user")?.content || "New Chat").slice(0, 50),
          messages: (c.messages || []).map((m): UIChatMessage => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
          })),
          lastUpdated: new Date(c.messages[c.messages.length - 1]?.timestamp || c.timestamp),
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
        const newChat: UIChatSession = {
          id: newChatId,
          title: "New Chat",
          messages: [],
          lastUpdated: new Date(),
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
    // 새 대화 시작 시 서버용 chat_id 초기화
    setServerChatId(null)
  }



  // 채팅 제출 처리
   const handleChatSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // 1-a. 로컬 IndexedDB용 채팅 ID 준비 (없으면 새로 생성)
    let chatId = currentChatId;
    if (!chatId) {
      try {
        chatId = await createChat();
        setCurrentChatId(chatId);
        const newChat: UIChatSession = {
          id: chatId,
          title: "New Chat",
          messages: [],
          lastUpdated: new Date(),
        };
        setChatHistory((prev) => [newChat, ...prev]);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "채팅 생성 실패");
        setIsLoading(false);
        return;
      }
    }

    // 1-b. 서버 전송용 해시 기반 chat_id 준비 (최초 1회 생성)
    let effectiveServerChatId = serverChatId
    try {
      if (!effectiveServerChatId) {
        const userId = getOrCreateUserId()
        const newServerId = await generateChatIdForUser(userId)
        setServerChatId(newServerId)
        effectiveServerChatId = newServerId
      }
    } catch (e) {
      console.error(e)
      // 서버 chat_id 생성 실패해도 전송은 진행 (백엔드가 무시 가능)
    }

    // 2. 사용자 메시지 UI에 먼저 표시하고 DB에 저장
    const userMessage: UIChatMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    
    const updatedMessages: UIChatMessage[] = [...currentMessages, userMessage];
    setCurrentMessages(updatedMessages);

    try {
      const dbMessage: DBChatMessage = { role: userMessage.role as any, content: userMessage.content, timestamp: userMessage.timestamp.getTime() }
      await appendMessage(chatId, dbMessage);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "메시지 저장 실패");
    }

    // 좌측 채팅 목록에도 즉시 반영
    setChatHistory((prev) => {
      const me: UIChatSession = {
        id: chatId!,
        title: updateChatTitle(updatedMessages),
        messages: updatedMessages,
        lastUpdated: new Date(),
      };
      const others = prev.filter((c) => c.id !== chatId);
      return [me, ...others];
    });

    // 3. AI 서버에 요청 (사용자 메시지만 전송, 히스토리 미포함)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          chat_id: effectiveServerChatId,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI 응답 실패: ${response.statusText}`);
      }

      const raw = await response.json();
      console.log("-------------------AI 응답:", raw);

      // 4. AI 응답 처리 (스키마 분기)
      let assistantMessage: UIChatMessage;

      // --- 4-1. 새로운 표준 스키마 처리 ---
      if (raw && typeof raw === "object" && (raw as ChatServiceResponse).chatType) {
        const service: ChatServiceResponse = raw as ChatServiceResponse;

        const fallbackText = (() => {
          const firstRecipe = (service.recipes || [])[0];
          return firstRecipe?.food_name ? `네. ${firstRecipe.food_name} 레시피를 알려드릴게요.` : "요청하신 결과를 준비했어요.";
        })();

        assistantMessage = {
          role: "bot",
          content: (service.content && service.content.trim()) ? service.content : fallbackText,
          timestamp: new Date(),
        };
        
        // 표준 스키마에 따른 UI 업데이트
        if (service.chatType === "chat" && service.recipes) {
            const uiRecipes: UIRecipe[] = service.recipes.map((r: any, index: number) => ({
              id: `recipe_${Date.now()}_${index}`,
              name: r.food_name || `Recipe ${index + 1}`,
              description: `${r.source === "video" ? "영상" : r.source === "ingredient_search" ? "상품" : "텍스트"} 기반 레시피`,
              prepTime: "준비 시간 미정",
              cookTime: "조리 시간 미정",
              servings: 1,
              difficulty: "Medium",
              ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).map((ing: any) => ({
                name: (ing as Product).product_name || (ing as Ingredient).item || "",
                amount: (ing as Ingredient).amount || "",
                unit: (ing as Ingredient).unit || "",
                optional: false
              })),
              instructions: Array.isArray(r.recipe) ? r.recipe : [],
              tags: [r.source === "video" ? "영상레시피" : r.source === "ingredient_search" ? "상품" : "텍스트레시피"],
              image: `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(r.food_name || '')}`,
            }));
            setCurrentView("recipe");
            setCurrentRecipes(uiRecipes);
            await appendRecipes(chatId, uiRecipes as unknown as DBRecipe[]);
        } else if (service.chatType !== "chat" && service.recipes) {
            setCurrentView("cart");
            setCartItems((prev) => [...prev, ...service.recipes!]);
            await appendRecipes(chatId, service.recipes as unknown as DBRecipe[]);
        }

      // --- 4-2. 이전 스키마 (폴백) 처리 ---
      } else {
        const parsedResponse: AIResponse = raw;
        assistantMessage = {
          role: "bot",
          content: parsedResponse.content,
          timestamp: new Date(),
        };

        // 이전 스키마에 따른 UI 업데이트
        if (parsedResponse.type === "recipe" && parsedResponse.recipes) {
          setCurrentView("recipe");
          setCurrentRecipes(parsedResponse.recipes);
          await appendRecipes(chatId, parsedResponse.recipes as unknown as DBRecipe[]);
        } else if (parsedResponse.type === "cart" && parsedResponse.ingredients) {
          setCurrentView("cart");
          setCurrentIngredients(parsedResponse.ingredients);
          // setCartItems(parsedResponse.ingredients); // 용도에 맞게 조정
          await appendCartItems(chatId, parsedResponse.ingredients as unknown as DBCartItem[]);
        }
        const suggestions = extractNumberedSuggestions(parsedResponse.content);
        setLastSuggestions(suggestions);
      }

      // 5. 최종적으로 AI 메시지를 UI에 업데이트하고 DB에 저장
      const finalMessages = [...updatedMessages, assistantMessage];
      setCurrentMessages(finalMessages);
      await appendMessage(chatId, { role: assistantMessage.role as any, content: assistantMessage.content, timestamp: (assistantMessage.timestamp as Date).getTime() });

      // 좌측 채팅 목록 최종 업데이트
      setChatHistory((prev) => {
        const me: UIChatSession = {
          id: chatId!,
          title: updateChatTitle(finalMessages),
          messages: finalMessages,
          lastUpdated: new Date(),
        };
        const others = prev.filter((c) => c.id !== chatId);
        return [me, ...others];
      });

    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessageContent = error?.message || "AI 응답 처리 중 오류가 발생했습니다.";
      setError(errorMessageContent);

      // UI에 에러 메시지 표시
      const errorMessage: UIChatMessage = {
        role: "bot",
        content: `죄송합니다, 오류가 발생했습니다: ${errorMessageContent}`,
        timestamp: new Date(),
      };
      setCurrentMessages((prev) => [...prev, errorMessage]);

    } finally {
      setIsLoading(false);
    }
  };
        


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
              const isCartView = (full.recipes as any[] || []).some((r: any) => r?.source === 'ingredient_search');

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

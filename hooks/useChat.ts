import {useState, useEffect} from "react"
import type {
    ChatSession as UIChatSession,
    ChatMessage as UIChatMessage,
    UIRecipe,
    Recipe,
    Ingredient,
    Product,
    AIResponse
} from "../src/types"
import {
    DBRecipe, DBCartItem, getAllChatsDesc, getAllBookmarkIds, createChat,
    appendMessage, appendRecipes, appendCartItems, getChat, toggleBookmark, ChatMessage as DBChatMessage
} from "@/lib/chat-service"
import {updateChatTitle, extractNumberedSuggestions, mapSelectionToDish, isNumericSelection} from "@/src/chat"
import {postJson} from "@/lib/api"

type ChatServiceResponse = {
    chatType: "chat" | "recipe" | "cart"  // 3가지 타입 중 하나
    content?: string
    answer?: string // 이전 버전 또는 다른 백엔드와의 호환성을 위해 추가
    message?: string // 추가 필드 지원
    recipes?: any[]
    chat_id?: string
    jobId?: string
    timestamp?: string
    payload?: any
}

export function useChat() {
    const [currentView, setCurrentView] = useState<"welcome" | "recipe" | "cart">("welcome")
    const [chatHistory, setChatHistory] = useState<UIChatSession[]>([])
    const [bookmarkedRecipes, setBookmarkedRecipes] = useState<string[]>([])
    // UUID 기반 채팅방 ID로 변경
    const [currentChatId, setCurrentChatId] = useState<string | null>(null)
    // 서버 전송용 해시 기반 Chat ID (UI/백엔드와 분리)
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


    // 초기 로드: 백엔드에서 최근 채팅 목록 로드
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                console.log('[CHAT] 초기 채팅 목록 로드 시작')
                
                // chat-service를 사용하여 채팅 목록 조회
                try {
                    const chats = await getAllChatsDesc()
                    console.log(`[CHAT] chat-service에서 로드된 채팅 수: ${chats.length}`)
                    console.log('[CHAT] chat-service 응답:', chats)
                    
                    // 채팅 목록이 비어있을 때의 처리
                    if (!chats || chats.length === 0) {
                        console.log('[CHAT] 채팅 목록이 비어있습니다. 새 채팅을 시작해보세요.')
                        setChatHistory([])
                        setError(null) // 에러가 아닌 정상적인 상황
                    } else {
                        // chat-service 응답을 UI 형식으로 변환
                        const normalized: UIChatSession[] = chats.map((chat) => ({
                            id: chat.id, // UUID 문자열을 그대로 사용
                            title: chat.title, // ChatRecord의 title 속성 사용
                            messages: [], // 메시지는 필요할 때 별도로 로드
                            lastUpdated: new Date(chat.timestamp),
                        }))
                        
                        setChatHistory(normalized)
                        setError(null) // 성공 시 에러 상태 초기화
                    }
                } catch (chatError) {
                    console.error('[CHAT] chat-service를 통한 채팅 목록 로드 실패:', chatError)
                    setError("채팅 목록을 불러올 수 없습니다.")
                    setChatHistory([])
                }
                
                // 북마크는 별도로 로드 (기존 함수 사용)
                try {
                    const bookmarks = await getAllBookmarkIds()
                    setBookmarkedRecipes(bookmarks)
                } catch (bookmarkError) {
                    console.error('[CHAT] 북마크 로드 실패:', bookmarkError)
                    setBookmarkedRecipes([])
                }
                
                console.log('[CHAT] 초기 채팅 목록 로드 완료')
            } catch (e: any) {
                console.error('[CHAT] 초기 로드 오류:', e)
                const errorMessage = e?.message || "백엔드 연결 오류"
                setError(errorMessage)
                
                // 에러 발생 시 빈 상태로 초기화
                setChatHistory([])
                setBookmarkedRecipes([])
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
                console.log('[CHAT] 새 채팅 생성 시작')
                
                // chat-service를 사용하여 새 채팅 생성
                const newChatId = await createChat()
                console.log(`[CHAT] 새 채팅 생성 성공: ${newChatId}`)
                
                const newChat: UIChatSession = {
                    id: newChatId,
                    title: "New Chat",
                    messages: [],
                    lastUpdated: new Date(),
                }
                setChatHistory((prev) => [newChat, ...prev])
                setCurrentChatId(newChatId)
                setError(null) // 성공 시 에러 상태 초기화
            } catch (e: any) {
                console.error('[CHAT] 새 채팅 생성 오류:', e)
                const errorMessage = e?.message || "새 채팅 생성 실패"
                setError(errorMessage)
                return // 오류 발생 시 함수 종료
            }
        })()
        setCurrentMessages([])
        setCurrentView("welcome")
        setCurrentRecipes([])
        setCurrentIngredients([])
        setCartItems([])
        setLastSuggestions([])
        // 새 대화 시작 시 서버용 chat_id 초기화
        setServerChatId(null)
    }

    // 기존 채팅 선택 시 serverChatId 설정
    const handleChatSelect = async (chatId: string) => {
        try {
            console.log(`[CHAT] 채팅 선택: ${chatId}`)
            
            // chat-service를 사용하여 채팅 조회
            const chatRecord = await getChat(chatId)
            if (!chatRecord) {
                console.error(`[CHAT] 채팅방을 찾을 수 없음: ${chatId}`)
                setError(`채팅방을 찾을 수 없습니다. (ID: ${chatId})`)
                
                // 채팅 히스토리에서 해당 채팅 제거
                setChatHistory((prev) => prev.filter(c => c.id !== chatId))
                
                // 현재 채팅이 삭제된 채팅이었다면 초기화
                if (currentChatId === chatId) {
                    setCurrentChatId(null)
                    setCurrentMessages([])
                    setServerChatId(null)
                    setCurrentView("welcome")
                }
                return
            }
            
            console.log(`[CHAT] 채팅 조회 성공: ${chatId}`)
            
            // serverChatId 설정 (chat-service에서는 별도로 관리하지 않으므로 chatId 사용)
            setServerChatId(chatId)
            setCurrentChatId(chatId)
            
            // 메시지들을 UI 형식으로 변환
            const uiMessages: UIChatMessage[] = chatRecord.messages.map((msg) => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
            }))
            
            setCurrentMessages(uiMessages)
            console.log(`[CHAT] 메시지 로드: ${uiMessages.length}개`)
            
            // 채팅 히스토리에서 선택된 채팅을 최상단으로 이동
            setChatHistory((prev) => {
                const selectedChat = prev.find(c => c.id === chatId)
                const otherChats = prev.filter(c => c.id !== chatId)
                if (selectedChat) {
                    return [selectedChat, ...otherChats]
                }
                return prev
            })
            
            // 에러 상태 초기화
            setError(null)
        } catch (error) {
            console.error('[CHAT] 채팅 선택 중 오류:', error)
            setError(`채팅 선택 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
        }
    }


    // 채팅 제출 처리
    const handleChatSubmit = async (message: string, image?: File) => {
        if ((!message.trim() && !image) || isLoading) return;

        console.log('[CHAT] 채팅 제출 시작:', { message: message.substring(0, 50), hasImage: !!image })
        setIsLoading(true);
        setError(null);

        // 1-a. 백엔드용 채팅 ID 준비 (없으면 새로 생성)
        let chatId = currentChatId;
        if (!chatId) {
            try {
                console.log('[CHAT] 새 채팅 ID 생성 필요')
                
                // chat-service를 사용하여 새 채팅 생성
                chatId = await createChat()
                
                setCurrentChatId(chatId);
                const newChat: UIChatSession = {
                    id: chatId,
                    title: "New Chat",
                    messages: [],
                    lastUpdated: new Date(),
                };
                setChatHistory((prev) => [newChat, ...prev]);
                console.log(`[CHAT] 새 채팅 ID 생성 완료: ${chatId}`)
            } catch (e: any) {
                console.error('[CHAT] 채팅 생성 실패:', e);
                const errorMessage = e?.message || "채팅 생성 실패";
                setError(errorMessage);
                setIsLoading(false);
                return;
            }
        }

        // 1-b. 서버 전송용 chat_id: 최초 요청에서는 null, 이후에는 서버에서 받은 chat_id 사용
        const effectiveServerChatId = serverChatId
        console.log(`[CHAT] 서버 전송용 chat_id: ${effectiveServerChatId || 'null (신규)'}`)


        // ------------------
        // 2. 사용자 메시지 UI에 먼저 표시하고 DB에 저장
        const userMessage: UIChatMessage = {
            role: "user",
            content: message,
            timestamp: new Date(),
            // 이미지 미리보기를 위한 임시 로컬 URL 생성
            imageUrl: image ? URL.createObjectURL(image) : undefined,
        };

        const updatedMessages: UIChatMessage[] = [...currentMessages, userMessage];
        setCurrentMessages(updatedMessages);

        try {
            // chat-service를 사용하여 메시지 저장
            await appendMessage(chatId, {
                role: userMessage.role,
                content: userMessage.content,
                timestamp: userMessage.timestamp.getTime()
            })

            console.log('[CHAT] 사용자 메시지 저장 완료')
        } catch (e: any) {
            console.error('[CHAT] 메시지 저장 실패:', e);
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


        // ------------------
        // 3. AI 서버에 요청 (사용자 메시지만 전송, 히스토리 미포함)
        try {
            const token = localStorage.getItem("jwtToken");
            if (!token) {
                throw new Error("토큰이 없습니다. 로그인하세요.");
            }
            
            console.log('[CHAT] AI 서버 요청 시작')
            // FormData 대신 JSON으로 요청 전송 (이미지는 나중에 처리)
            const data = await postJson<any>("/api/chat", {
                message,
                chat_id: effectiveServerChatId,
            })
            
            console.log('[CHAT] AI 서버 응답 받음:', data)
            
            // 서버가 신규 대화에 대해 chat_id를 생성해 반환하므로 상태에 저장
            if (data && typeof data === "object" && (data as any).chat_id) {
                const returnedId = (data as any).chat_id as string
                console.log(`[CHAT] 서버에서 반환된 chat_id: ${returnedId}`)
                if (!serverChatId || serverChatId !== returnedId) {
                    setServerChatId(returnedId)
                    console.log(`[CHAT] serverChatId 업데이트: ${returnedId}`)
                }
            }
            console.log("-------------------AI 응답:", data)

            const raw = data as any
            console.log("-------------------AI 응답:", raw)


            // ------------------
            // 4. AI 응답 처리 (스키마 분기)
            let assistantMessage: UIChatMessage;

            console.log("=== AI 응답 처리 시작 ===");
            console.log("Raw response:", raw);
            console.log("Raw response type:", typeof raw);
            console.log("Raw response chatType:", raw?.chatType);
            console.log("Raw response content:", raw?.content);
            console.log("Raw response recipes:", raw?.recipes);

            // 응답 유효성 검증
            if (!raw || typeof raw !== "object") {
                console.error("유효하지 않은 응답:", raw);
                assistantMessage = {
                    role: "assistant",
                    content: "AI 응답을 받았습니다.",
                    timestamp: new Date(),
                };
            } else if (raw.chatType) {
                // 4-1. 새로운 표준 스키마 처리 (백엔드 응답 구조)
                console.log("백엔드 응답 구조로 처리:", raw);

                // 백엔드에서 message 필드가 있으면 그대로 사용
                const messageContent = raw.message || raw.content || "AI 응답을 받았습니다.";

                console.log("최종 메시지 내용:", messageContent);

                assistantMessage = {
                    role: "assistant",
                    content: messageContent,
                    timestamp: new Date(),
                };

                // chatType에 따른 UI 업데이트
                console.log(`=== ${raw.chatType} 타입 처리 시작 ===`);
                console.log("레시피 개수:", raw.recipes?.length || 0);
                console.log("현재 뷰:", currentView);
                console.log("chatType이 'chat'인 경우 화면 변화 없음:", raw.chatType === "chat");
                
                switch (raw.chatType) {
                    case "recipe":
                        if (raw.recipes && raw.recipes.length > 0) {
                            console.log("recipe 타입 + 레시피 있음 -> recipe 뷰로 설정");
                            const uiRecipes: UIRecipe[] = raw.recipes.map((r: any, index: number) => ({
                                id: `recipe_${Date.now()}_${index}`,
                                name: r.food_name || r.title || `Recipe ${index + 1}`,
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
                                instructions: Array.isArray(r.recipe) ? r.recipe : Array.isArray(r.steps) ? r.steps : [],
                                tags: [r.source === "video" ? "영상레시피" : r.source === "ingredient_search" ? "상품" : "텍스트레시피"],
                                image: `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(r.food_name || r.title || '')}`,
                            }));
                            console.log("변환된 UI 레시피:", uiRecipes);
                            setCurrentView("recipe");
                            setCurrentRecipes(uiRecipes);
                            
                            // chat-service를 사용하여 레시피 저장
                            try {
                                await appendRecipes(chatId, uiRecipes)
                                console.log('[CHAT] 레시피 저장 완료')
                            } catch (e) {
                                console.error('[CHAT] 레시피 저장 실패:', e)
                            }
                        } else {
                            console.log("recipe 타입이지만 레시피가 없음 -> welcome 뷰 유지");
                            setCurrentView("welcome");
                        }
                        break;
                        
                    case "cart":
                        if (raw.recipes && raw.recipes.length > 0) {
                            console.log("cart 타입 + 레시피 있음 -> cart 뷰로 설정");
                            setCurrentView("cart");
                            // cart 타입일 때는 상품 정보를 카트 아이템으로 변환
                            const cartRecipes = raw.recipes.map((r: any) => ({
                                ...r,
                                ingredients: Array.isArray(r.ingredients) ? r.ingredients : []
                            }));
                            setCartItems((prev) => [...prev, ...cartRecipes]);
                            
                            // chat-service를 사용하여 카트 아이템 저장
                            try {
                                await appendCartItems(chatId, cartRecipes)
                                console.log('[CHAT] 카트 아이템 저장 완료')
                            } catch (e) {
                                console.error('[CHAT] 카트 아이템 저장 실패:', e)
                            }
                        } else {
                            console.log("cart 타입이지만 레시피가 없음 -> cart 뷰로 설정 (빈 카트)");
                            setCurrentView("cart");
                        }
                        break;
                        
                    case "chat":
                        console.log("=== chat 타입 처리 ===");
                        console.log("chat 타입 -> 화면 변화 없음, 현재 뷰 유지:", currentView);
                        console.log("chat 타입이므로 setCurrentView 호출하지 않음");
                        console.log("chat 타입이므로 레시피나 카트 아이템 추가하지 않음");
                        console.log("chat 타입이므로 백엔드에 저장하지 않음");
                        // chat 타입일 때는 화면 변화가 없어야 함
                        // 현재 뷰를 그대로 유지 (setCurrentView 호출하지 않음)
                        // 레시피나 카트 아이템도 추가하지 않음
                        // 백엔드에도 저장하지 않음
                        break;
                        
                    default:
                        console.log(`알 수 없는 chatType: ${raw.chatType} -> welcome 뷰 유지`);
                        setCurrentView("welcome");
                        break;
                }
                
                console.log("화면 전환 후 현재 뷰:", currentView);
                console.log("chatType 처리 완료:", raw.chatType);

                // --- 4-2. 이전 스키마 (폴백) 처리 ---
            } else {
                console.log("이전 스키마로 처리 (폴백)");
                const parsedResponse: AIResponse = raw;
                assistantMessage = {
                    role: "assistant",
                    content: parsedResponse.content || "AI 응답을 받았습니다.",
                    timestamp: new Date(),
                };

                // 이전 스키마에 따른 UI 업데이트
                if (parsedResponse.type === "recipe" && parsedResponse.recipes) {
                    setCurrentView("recipe");
                    setCurrentRecipes(parsedResponse.recipes);
                    
                    // chat-service를 사용하여 레시피 저장
                    try {
                        await appendRecipes(chatId, parsedResponse.recipes)
                        console.log('[CHAT] 레시피 저장 완료 (이전 스키마)')
                    } catch (e) {
                        console.error('[CHAT] 레시피 저장 실패 (이전 스키마):', e)
                    }
                } else if (parsedResponse.type === "cart" && parsedResponse.ingredients) {
                    setCurrentView("cart");
                    setCurrentIngredients(parsedResponse.ingredients);
                    
                    // chat-service를 사용하여 카트 아이템 저장
                    try {
                        await appendCartItems(chatId, parsedResponse.ingredients)
                        console.log('[CHAT] 카트 아이템 저장 완료 (이전 스키마)')
                    } catch (e) {
                        console.error('[CHAT] 카트 아이템 저장 실패 (이전 스키마):', e)
                    }
                } else {
                    setCurrentView("welcome");
                }
                const suggestions = extractNumberedSuggestions(parsedResponse.content);
                setLastSuggestions(suggestions);
            }

            // ------------------
            // 5. 최종적으로 AI 메시지를 UI에 업데이트하고 DB에 저장
            const finalMessages = [...updatedMessages, assistantMessage];
            setCurrentMessages(finalMessages);
            console.log('최종적으로 AI 메시지 확인 (finalMessages) -------- ', finalMessages);
            
            // 메시지를 DB에 저장
            try {
                // chat-service를 사용하여 AI 메시지 저장
                await appendMessage(chatId, {
                    role: assistantMessage.role,
                    content: assistantMessage.content,
                    timestamp: (assistantMessage.timestamp as Date).getTime()
                })

                console.log('[CHAT] AI 메시지 저장 완료')
            } catch (e) {
                console.error("[CHAT] 메시지 저장 실패:", e);
            }

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

            // 응답 타입에 따른 뷰 전환 확인
            console.log("현재 뷰:", currentView);
            console.log("현재 레시피:", currentRecipes);
            console.log("현재 카트 아이템:", cartItems);

        } catch (error: any) {
            console.error("[CHAT] Chat error:", error);
            const errorMessageContent = error?.message || "AI 응답 처리 중 오류가 발생했습니다.";
            setError(errorMessageContent);

            // UI에 에러 메시지 표시
            const errorMessage: UIChatMessage = {
                role: "assistant",
                content: `죄송합니다, 오류가 발생했습니다: ${errorMessageContent}`,
                timestamp: new Date(),
            };
            setCurrentMessages((prev) => [...prev, errorMessage]);

        } finally {
            setIsLoading(false);
            console.log('[CHAT] 채팅 제출 완료')
        }
    };


    // 북마크 토글 핸들러
    const handleBookmarkToggle = (recipeId: string) => {
        // 현재 화면의 레시피 중 대상 찾기
        const recipe = currentRecipes.find((r) => r.id === recipeId)
        if (!recipe) return
            ;
        (async () => {
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
                    // chat-service를 사용하여 카트 아이템 저장
                    await appendCartItems(currentChatId, [{
                        name: ingredient.item,  // Ingredient.item을 DBCartItem.name으로 매핑
                        amount: ingredient.amount,
                        unit: ingredient.unit
                    }])
                    console.log('[CHAT] 카트 아이템 추가 완료')
                }
            } catch (e: any) {
                console.error('[CHAT] 카트 아이템 추가 실패:', e)
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

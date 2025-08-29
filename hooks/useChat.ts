import {useState, useEffect} from "react"
import type {
    ChatSession as UIChatSession,
    ChatMessage as UIChatMessage,
    UIRecipe,
    Recipe,
    Ingredient,
    Product,
    AIResponse,
    BackendMessage
} from "../src/types"
import {
    DBRecipe, DBCartItem, getAllChatsDesc, getAllBookmarkIds, createChat,
    appendMessage, appendRecipes, appendCartItems, getChat, toggleBookmark, ChatMessage as DBChatMessage
} from "@/lib/chat-service"
import {updateChatTitle, extractNumberedSuggestions, mapSelectionToDish, isNumericSelection} from "@/src/chat"
import {postJson, postMultipart, getJson, searchIngredient} from "@/lib/api"

// 메시지 정렬 함수 - 사용자 메시지가 AI 메시지보다 먼저 오도록 보장
const sortMessages = (messages: UIChatMessage[]): UIChatMessage[] => {
    return messages.sort((a, b) => {
        // 먼저 timestamp로 정렬
        const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
        if (timeDiff !== 0) return timeDiff;
        
        // timestamp가 같은 경우 role로 정렬 (user가 assistant보다 먼저)
        if (a.role === "user" && b.role === "assistant") return -1;
        if (a.role === "assistant" && b.role === "user") return 1;
        
        return 0;
    });
};

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
                
                // JWT 토큰 확인
                const token = localStorage.getItem("jwtToken")
                if (!token) {
                    console.log('[CHAT] JWT 토큰이 없습니다. 로그인이 필요합니다.')
                    setChatHistory([])
                    setError("로그인이 필요합니다.")
                    return
                }
                
                console.log('[CHAT] JWT 토큰 확인됨:', token.substring(0, 20) + '...')
                
                // chat-service를 사용하여 채팅 목록 조회
                try {
                    console.log('[CHAT] getAllChatsDesc 호출 시작')
                    const chats = await getAllChatsDesc()
                    console.log(`[CHAT] chat-service에서 로드된 채팅 수: ${chats.length}`)
                    console.log('[CHAT] chat-service 응답:', chats)
                    console.log('[CHAT] 응답 타입:', typeof chats)
                    console.log('[CHAT] 응답 구조:', JSON.stringify(chats, null, 2))
                    
                    // 채팅 목록이 비어있을 때의 처리
                    if (!chats || chats.length === 0) {
                        console.log('[CHAT] 채팅 목록이 비어있습니다. 새 채팅을 시작해보세요.')
                        setChatHistory([])
                        setError(null) // 에러가 아닌 정상적인 상황
                    } else {
                        // chat-service 응답을 UI 형식으로 변환
                        const normalized: UIChatSession[] = chats.map((chat) => {
                            console.log('[CHAT] 채팅 변환 중:', chat)
                            return {
                                id: chat.id, // UUID 문자열을 그대로 사용
                                title: chat.title, // ChatRecord의 title 속성 사용
                                messages: [], // 메시지는 필요할 때 별도로 로드
                                lastUpdated: new Date(chat.timestamp),
                            }
                        })
                        
                        console.log('[CHAT] 변환된 채팅 목록:', normalized)
                        setChatHistory(normalized)
                        setError(null) // 성공 시 에러 상태 초기화
                    }
                } catch (chatError) {
                    console.error('[CHAT] chat-service를 통한 채팅 목록 로드 실패:', chatError)
                    console.error('[CHAT] 에러 상세:', chatError)
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
            
            // 이전 채팅방의 데이터 완전 초기화
            setCurrentRecipes([])
            setCartItems([])
            setCurrentIngredients([])
            setCurrentMessages([])
            setLastSuggestions([])
            
            // 백엔드에서 채팅과 메시지, 레시피, 카트 아이템을 함께 조회
            const token = localStorage.getItem("jwtToken")
            if (!token) {
                throw new Error("토큰이 없습니다. 로그인하세요.")
            }
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"}/api/users/me/chats/${chatId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            
            if (!response.ok) {
                throw new Error(`채팅방을 찾을 수 없습니다: ${response.status}`)
            }
            
            const chatData = await response.json()
            console.log(`[CHAT] 백엔드에서 채팅 데이터 조회 성공: ${chatId}`)
            console.log('[CHAT] 백엔드 응답:', chatData)
            
            // serverChatId 설정
            setServerChatId(chatId)
            setCurrentChatId(chatId)
            
            // 백엔드 메시지를 UI 형식으로 변환 (recipeData와 cartData는 별도 컬렉션에서 가져옴)
            const messages = chatData.messages || []
            const recipes = chatData.recipes || []
            const cartMessages = chatData.cartMessages || []
            
            // 메시지들을 UI 형식으로 변환 (chatType만 포함)
            const uiMessages: UIChatMessage[] = messages.map((msg: BackendMessage) => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp),
                chatType: msg.chatType as "chat" | "recipe" | "cart"
            }))
            
            // 메시지 정렬 후 설정
            const sortedMessages = sortMessages(uiMessages);
            setCurrentMessages(sortedMessages);
            console.log(`[CHAT] 메시지 로드: ${uiMessages.length}개`)
            
            // chatType에 따라 현재 뷰와 데이터 설정
            let hasRecipeType = false
            let hasCartType = false
            
            uiMessages.forEach(msg => {
                if (msg.chatType === "recipe") hasRecipeType = true
                if (msg.chatType === "cart") hasCartType = true
            })
            
            // 백엔드에서 직접 받은 레시피 사용 (별도 컬렉션에서 가져온 데이터)
            const uniqueRecipes = recipes
            
            // 레시피 설정 (UIRecipe 형태로 변환) - 이전 데이터와 완전히 교체
            if (uniqueRecipes.length > 0) {
                const uiRecipes: UIRecipe[] = uniqueRecipes.map((r: any, index: number) => ({
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
                }))
                setCurrentRecipes(uiRecipes)
                console.log(`[CHAT] 총 ${uiRecipes.length}개의 레시피 로드됨`)
            } else {
                setCurrentRecipes([])
            }
            
            // 카트 메시지 설정 (CartMessage 형태로 가져온 데이터 사용) - 이전 데이터와 완전히 교체
            if (cartMessages.length > 0) {
                console.log('[CHAT] 카트 메시지 원본 데이터:', cartMessages)
                
                const cartRecipes = cartMessages.map((cartMsg: any) => {
                    // CartMessage에서 foodName과 product 정보를 사용
                    const foodName = cartMsg.foodName || cartMsg.food_name || "상품"
                    console.log('[CHAT] 카트 메시지 처리:', { cartMsg, foodName })
                    
                    const cartRecipe: Recipe = {
                        source: cartMsg.source || "ingredient_search",
                        food_name: foodName,
                        product: cartMsg.product || [],
                        recipe: []
                    }
                    console.log('[CHAT] 변환된 카트 레시피:', cartRecipe)
                    return cartRecipe
                })
                
                // food_name을 기준으로 그룹화하여 중복 제거
                const groupedCartRecipes = cartRecipes.reduce((acc: any[], current: any) => {
                    const existingGroup = acc.find(item => item.food_name === current.food_name)
                    if (existingGroup) {
                        // 기존 그룹에 상품 추가
                        existingGroup.product = [...(existingGroup.product || []), ...(current.product || [])]
                    } else {
                        // 새로운 그룹 생성
                        acc.push(current)
                    }
                    return acc
                }, [])
                
                setCartItems(groupedCartRecipes)
                console.log(`[CHAT] 총 ${groupedCartRecipes.length}개의 카트 아이템 그룹 로드됨`)
                console.log('[CHAT] 카트 아이템 상세:', groupedCartRecipes)
            } else {
                setCartItems([])
            }
            
            // 뷰 설정 (우선순위: recipe > cart > welcome)
            if (hasRecipeType && recipes.length > 0) {
                setCurrentView("recipe")
            } else if (hasCartType && cartMessages.length > 0) {
                setCurrentView("cart")
            } else {
                setCurrentView("welcome")
            }
            
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

        // 1. 채팅 ID 관리 개선 - 기존 채팅 ID 우선 사용
        let chatId = currentChatId;
        let effectiveServerChatId = serverChatId;
        
        console.log(`[CHAT] 현재 채팅 ID: ${chatId || '없음'}`)
        console.log(`[CHAT] 서버 전송용 chat_id: ${effectiveServerChatId || 'null (신규)'}`)
        
        // 기존 채팅이 있으면 그 채팅 ID를 우선 사용
        if (chatId && !effectiveServerChatId) {
            effectiveServerChatId = chatId;
            setServerChatId(chatId);
            console.log(`[CHAT] 기존 채팅 ID를 서버 전송용으로 설정: ${chatId}`)
        }

        // ------------------
        // 2. 사용자 메시지 UI에 먼저 표시
        const userMessage: UIChatMessage = {
            role: "user",
            content: message,
            timestamp: new Date(),
            imageUrl: image ? URL.createObjectURL(image) : undefined,
        };

        const updatedMessages: UIChatMessage[] = sortMessages([...currentMessages, userMessage]);
        setCurrentMessages(updatedMessages);

        // 3. 채팅 목록 업데이트 - 기존 채팅이 있으면 업데이트, 없으면 새로 생성
        if (chatId) {
            // 기존 채팅 업데이트
            setChatHistory((prev) => {
                const existingChat = prev.find((c) => c.id === chatId);
                if (existingChat) {
                    const updatedChat: UIChatSession = {
                        ...existingChat,
                        title: updateChatTitle(updatedMessages),
                        messages: updatedMessages,
                        lastUpdated: new Date(),
                    };
                    const others = prev.filter((c) => c.id !== chatId);
                    return [updatedChat, ...others];
                }
                return prev;
            });
        } else {
            // 새 채팅 생성 (임시 ID 사용하지 않음)
            console.log('[CHAT] 새 채팅 시작 - 백엔드에서 채팅방 생성 예정')
        }

        // ------------------
        // 4. AI 서버에 요청 (프론트엔드에서는 메시지와 채팅방 ID만 전달)
        try {
            const token = localStorage.getItem("jwtToken");
            if (!token) {
                throw new Error("토큰이 없습니다. 로그인하세요.");
            }

            console.log('[CHAT] AI 서버 요청 시작')
            console.log('[CHAT] 백엔드에서 DB 히스토리를 조회하여 LLM에 전달할 예정')
            
            const formData = new FormData();
            const messageForServer = message.trim() || (image ? "이미지 분석 요청" : "메시지 없음");
            console.log("전송할 메시지:", messageForServer)
            
            // 프론트엔드에서는 메시지와 채팅방 ID만 전달
            formData.append("message", messageForServer);
            if (effectiveServerChatId) {
                formData.append("chat_id", effectiveServerChatId);
                console.log('[CHAT] 기존 채팅방 ID 전달:', effectiveServerChatId)
            } else {
                console.log('[CHAT] 새 채팅방 생성 예정')
            }
            if (image) {
                formData.append("image", image);
            }

            console.log('[CHAT] 백엔드로 요청 전송 완료')
            console.log('[CHAT] 백엔드에서 DB 히스토리를 조회하여 LLM에 전달 중...')
            console.log('[CHAT] 백엔드: 최근 15개 메시지로 제한하여 컨텍스트 생성')
            
            const data = await postMultipart<any>(`${process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"}/api/chat`, formData);
            
            console.log('[CHAT] 백엔드 응답 받음:', data)
            console.log('[CHAT] 백엔드에서 DB 히스토리 조회 및 LLM 처리 완료')
            console.log('[CHAT] LLM이 과거 대화 컨텍스트를 인지하여 응답 생성 완료')
            
            // 5. 백엔드 응답에서 채팅 ID 확인 및 동기화
            let returnedChatId: string | null = null;
            
            if (data && typeof data === "object" && (data as any).result?.chatId) {
                returnedChatId = (data as any).result.chatId as string;
                console.log(`[CHAT] 서버에서 반환된 chat_id: ${returnedChatId}`)
                
                // 새로운 채팅 ID인 경우에만 업데이트
                if (!effectiveServerChatId || effectiveServerChatId !== returnedChatId) {
                    setServerChatId(returnedChatId);
                    effectiveServerChatId = returnedChatId;
                    console.log(`[CHAT] serverChatId 업데이트: ${returnedChatId}`)
                }
                
                // currentChatId가 없거나 다른 경우에만 업데이트
                if (!currentChatId || currentChatId !== returnedChatId) {
                    setCurrentChatId(returnedChatId);
                    console.log(`[CHAT] currentChatId 업데이트: ${returnedChatId}`)
                    
                    // 채팅 목록에서 임시 채팅을 실제 채팅으로 교체
                    setChatHistory((prev) => {
                        const tempChat = prev.find(c => c.id.startsWith('temp_'));
                        if (tempChat) {
                            const updatedChat: UIChatSession = {
                                ...tempChat,
                                id: returnedChatId!
                            };
                            const others = prev.filter(c => !c.id.startsWith('temp_'));
                            return [updatedChat, ...others];
                        }
                        return prev;
                    });
                }
            } else if (effectiveServerChatId) {
                // 서버에서 chat_id를 반환하지 않았지만 기존 채팅 ID가 있는 경우
                returnedChatId = effectiveServerChatId;
                console.log(`[CHAT] 기존 채팅 ID 사용: ${returnedChatId}`)
            }

            console.log("-------------------AI 응답:", data)

            const raw = data as any
            console.log("-------------------AI 응답:", raw)
            console.log("-------------------AI 응답 구조 분석:")
            console.log("- status:", raw.status)
            console.log("- result:", raw.result)
            console.log("- result.chatType:", raw.result?.chatType)
            console.log("- result.answer:", raw.result?.answer)
            console.log("- result.recipes:", raw.result?.recipes)

            // ------------------
            // 6. AI 응답 처리 및 데이터 저장
            let assistantMessage: UIChatMessage;

            console.log("=== AI 응답 처리 시작 ===");
            console.log("Raw response:", raw);

            const responseData = raw.result || raw.payload || raw;

            // 응답 유효성 검증
            if (!responseData || typeof responseData !== "object") {
                console.error("유효하지 않은 응답:", raw);
                assistantMessage = {
                    role: "assistant",
                    content: "AI 응답을 받았습니다.",
                    timestamp: new Date(),
                };
            } else if (responseData.chatType === "error") {
                console.error("백엔드 오류 응답:", responseData);
                assistantMessage = {
                    role: "assistant",
                    content: responseData.answer || "서버 오류가 발생했습니다.",
                    timestamp: new Date(),
                };
                setError(responseData.answer || "서버 오류가 발생했습니다.");
            } else if (raw.status === "error" || raw.error) {
                console.error("백엔드 HTTP 오류 응답:", raw);
                const errorMessage = raw.message || raw.error || "서버 오류가 발생했습니다.";
                assistantMessage = {
                    role: "assistant",
                    content: `오류가 발생했습니다: ${errorMessage}`,
                    timestamp: new Date(),
                };
                setError(errorMessage);
            } else if (responseData.chatType || responseData.answer) {
                // 백엔드 표준 스키마 처리
                console.log("백엔드 응답 구조로 처리:", responseData);

                const messageContent = responseData.answer || responseData.content || "AI 응답을 받았습니다.";
                console.log("최종 메시지 내용:", messageContent);

                assistantMessage = {
                    role: "assistant",
                    content: messageContent,
                    timestamp: new Date(),
                };

                // chatType에 따른 UI 업데이트 및 데이터 저장
                const chatType = responseData.chatType || "chat";
                const recipes = responseData.recipes || [];

                console.log(`=== ${chatType} 타입 처리 시작 ===`);
                console.log("현재 뷰:", currentView);
                
                // 7. 데이터 저장 - 백엔드에서 이미 저장했으므로 프론트엔드에서는 저장하지 않음
                const finalChatId = returnedChatId || effectiveServerChatId || chatId;
                console.log(`[CHAT] 백엔드에서 이미 메시지를 저장했으므로 프론트엔드 저장 생략: ${finalChatId}`);

                if (finalChatId) {
                    // 백엔드에서 이미 메시지를 저장했으므로 프론트엔드에서는 저장하지 않음
                    console.log('[CHAT] 백엔드에서 메시지 저장 완료 - 프론트엔드 저장 생략')

                    // chatType에 따른 추가 데이터 저장
                    switch (chatType) {
                        case "recipe":
                            if (recipes && recipes.length > 0) {
                                console.log("recipe 타입 + 레시피 있음 -> recipe 뷰로 설정");
                                const uiRecipes: UIRecipe[] = recipes.map((r: any, index: number) => ({
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
                                
                                // 새로운 레시피로 완전히 교체 (축적 방지)
                                setCurrentRecipes(uiRecipes);
                                
                                // 레시피 저장
                                try {
                                    await appendRecipes(finalChatId, uiRecipes)
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
                            if (recipes && recipes.length > 0) {
                                console.log("cart 타입 + 레시피 있음 -> cart 뷰로 설정");
                                setCurrentView("cart");
                                
                                const cartRecipes = recipes.map((r: any) => {
                                    console.log("cart 레시피 처리:", r);
                                    
                                    let processedIngredients = r.ingredients;
                                    if ((!r.ingredients || r.ingredients.length === 0) && 
                                        r.product && Array.isArray(r.product) && r.product.length > 0) {
                                        console.log("ingredients가 비어있어서 product를 ingredients로 복사");
                                        processedIngredients = r.product;
                                    }
                                    
                                    return {
                                        ...r,
                                        food_name: r.food_name || "상품 검색 결과",
                                        ingredients: Array.isArray(processedIngredients) ? processedIngredients : [],
                                        product: Array.isArray(r.product) ? r.product : []
                                    };
                                });
                                
                                console.log("처리된 cart 레시피:", cartRecipes);
                                
                                const validCartRecipes = cartRecipes.filter((r: any) => {
                                    const hasProducts = Array.isArray(r.product) && r.product.length > 0;
                                    const hasIngredients = Array.isArray(r.ingredients) && r.ingredients.length > 0;
                                    return hasProducts || hasIngredients;
                                });
                                
                                if (validCartRecipes.length > 0) {
                                    // 새로운 카트 아이템으로 완전히 교체 (축적 방지)
                                    setCartItems(validCartRecipes);
                                    
                                    // 카트 아이템 저장
                                    try {
                                        const cartItemsForDB = validCartRecipes.flatMap((recipe: any) => 
                                            (recipe.product || []).map((product: any) => ({
                                                product_name: product.product_name,
                                                price: product.price,
                                                image_url: product.image_url,
                                                product_address: product.product_address,
                                                food_name: recipe.food_name || "상품",
                                                quantity: 1
                                            }))
                                        );
                                        await appendCartItems(finalChatId, cartItemsForDB)
                                        console.log('[CHAT] 카트 아이템 저장 완료')
                                    } catch (e) {
                                        console.error('[CHAT] 카트 아이템 저장 실패:', e)
                                    }
                                } else {
                                    console.log("cart 타입이지만 유효한 상품이 없음 -> cart 뷰로 설정 (빈 카트)");
                                    setCartItems([]);
                                }
                            } else {
                                console.log("cart 타입이지만 레시피가 없음 -> cart 뷰로 설정 (빈 카트)");
                                setCurrentView("cart");
                                setCartItems([]);
                            }
                            break;
                            
                        case "chat":
                            console.log("=== chat 타입 처리 ===");
                            console.log("chat 타입 -> 화면 변화 없음, 현재 뷰 유지:", currentView);
                            break;
                            
                        default:
                            console.log(`알 수 없는 chatType: ${chatType} -> welcome 뷰 유지`);
                            setCurrentView("welcome");
                            break;
                    }
                } else {
                    console.error('[CHAT] 채팅 ID가 없어서 데이터 저장 불가')
                }

                // 이전 스키마 (폴백) 처리
            } else {
                console.log("이전 스키마로 처리 (폴백)");
                const parsedResponse: AIResponse = raw;
                assistantMessage = {
                    role: "assistant",
                    content: parsedResponse.content || "AI 응답을 받았습니다.",
                    timestamp: new Date(),
                };

                const finalChatId = returnedChatId || effectiveServerChatId || chatId;
                
                if (finalChatId) {
                    // 이전 스키마에 따른 UI 업데이트만 수행 (데이터는 백엔드에서 이미 저장됨)
                    if (parsedResponse.type === "recipe" && parsedResponse.recipes) {
                        setCurrentView("recipe");
                        setCurrentRecipes(parsedResponse.recipes || []);
                        
                        console.log('[CHAT] 레시피 UI 업데이트 완료 (백엔드에서 이미 저장됨)')
                    } else if (parsedResponse.type === "cart" && parsedResponse.ingredients) {
                        setCurrentView("cart");
                        setCurrentIngredients(parsedResponse.ingredients);
                        
                        console.log('[CHAT] 카트 아이템 UI 업데이트 완료 (백엔드에서 이미 저장됨)')
                    } else {
                        setCurrentView("welcome");
                    }
                    
                    const suggestions = extractNumberedSuggestions(parsedResponse.content);
                    setLastSuggestions(suggestions);
                }
            }

            // ------------------
            // 8. 최종 UI 업데이트
            const finalMessages = sortMessages([...updatedMessages, assistantMessage]);
            setCurrentMessages(finalMessages);
            console.log('최종적으로 AI 메시지 확인 (finalMessages) -------- ', finalMessages);

            // 9. 채팅 목록 최종 업데이트
            const finalChatId = returnedChatId || effectiveServerChatId || chatId;
            if (finalChatId) {
                setChatHistory((prev) => {
                    const me: UIChatSession = {
                        id: finalChatId,
                        title: updateChatTitle(finalMessages),
                        messages: finalMessages,
                        lastUpdated: new Date(),
                    };
                    const others = prev.filter((c) => c.id !== finalChatId);
                    return [me, ...others];
                });
            }

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
            setCurrentMessages((prev) => sortMessages([...prev, errorMessage]));

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
                    // 1. 임베딩 서버 검색 API 호출 (백엔드에서 이미 저장했으므로 프론트엔드 저장 생략)
                    try {
                        const searchResult = await searchIngredient(currentChatId, ingredient.item)
                        console.log('[CHAT] 재료 검색 완료:', searchResult)
                    } catch (searchError: any) {
                        console.error('[CHAT] 재료 검색 실패:', searchError)
                        // 검색 실패해도 카트 저장은 계속 진행
                    }
                    
                    // 2. 백엔드에서 이미 저장했으므로 프론트엔드 저장 생략
                    console.log('[CHAT] 백엔드에서 이미 카트 아이템을 저장했으므로 프론트엔드 저장 생략')
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

                // Success message logged to console instead of alert
                const totalPrice = selectedProducts.reduce((sum, item) => sum + item.product.price, 0).toFixed(2)
                console.log(`Shopping cart generated successfully! Total: $${totalPrice}`)

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
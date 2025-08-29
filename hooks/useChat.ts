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
import {postMultipart, searchProductsByText} from "@/lib/api"

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
    const [currentView, setCurrentView] = useState<"welcome" | "recipe" | "cart" | "bookmark">("welcome")
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
                    // console.log('[CHAT] 응답 타입:', typeof chats)
                    // console.log('[CHAT] 응답 구조:', JSON.stringify(chats, null, 2))
                    
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
                setServerChatId(newChatId); 
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
            
            // 백엔드 메시지를 UI 형식으로 변환하고 chatType에 따라 데이터 처리
            const messages = chatData.messages || []
            const recipes = chatData.recipes || []
            const cartItems = chatData.cartItems || []
            
            // 메시지들을 UI 형식으로 변환하면서 모든 레시피와 카트 데이터 수집
            const allRecipes: Recipe[] = []
            const allCartItems: any[] = []
            
            const uiMessages: UIChatMessage[] = messages.map((msg: BackendMessage) => {
                const uiMessage: UIChatMessage = {
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.timestamp),
                    chatType: msg.chatType as "chat" | "cart" | "recipe"
                }
                
                // chatType에 따라 추가 데이터 포함하고 전체 레시피/카트 목록에 추가
                if (msg.chatType === "recipe" && msg.recipeData) {
                    uiMessage.recipes = [msg.recipeData]
                    allRecipes.push(msg.recipeData)
                } else if (msg.chatType === "cart" && msg.cartData) {
                    // cartData를 Recipe 형태로 변환
                    const cartRecipe: Recipe = {
                        source: "ingredient_search",
                        food_name: "장바구니 상품",
                        product: msg.cartData,
                        recipe: []
                    }
                    uiMessage.recipes = [cartRecipe]
                    allCartItems.push(...msg.cartData)
                }
                
                return uiMessage
            })
            
            setCurrentMessages(uiMessages)
            console.log(`[CHAT] 메시지 로드: ${uiMessages.length}개`)
            
            // chatType에 따라 현재 뷰와 데이터 설정
            let hasRecipeType = false
            let hasCartType = false
            
            uiMessages.forEach(msg => {
                if (msg.chatType === "recipe") hasRecipeType = true
                if (msg.chatType === "cart") hasCartType = true
            })
            
            // 백엔드에서 직접 받은 레시피와 메시지에서 수집한 레시피를 합쳐서 중복 제거
            const combinedRecipes = [...recipes, ...allRecipes]
            const uniqueRecipes = combinedRecipes.filter((recipe, index, self) => 
                index === self.findIndex(r => 
                    r.food_name === recipe.food_name && 
                    r.source === recipe.source
                )
            )
            
            // 레시피 설정 (UIRecipe 형태로 변환)
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
            }
            
            // 카트 아이템 설정 (백엔드 카트 아이템과 메시지에서 수집한 카트 데이터 합치기)
            const combinedCartItems = [...cartItems, ...allCartItems]
            if (combinedCartItems.length > 0) {
                const cartRecipes = combinedCartItems.map((item: any) => {
                    const cartRecipe: Recipe = {
                        source: "ingredient_search",
                        food_name: item.product?.product_name || item.product_name || "상품",
                        product: item.product ? [item.product] : [item],
                        recipe: []
                    }
                    return cartRecipe
                })
                setCartItems(cartRecipes)
                console.log(`[CHAT] 총 ${cartRecipes.length}개의 카트 아이템 로드됨`)
            }
            
            // 뷰 설정 (우선순위: recipe > cart > welcome)
            if (hasRecipeType && recipes.length > 0) {
                setCurrentView("recipe")
            } else if (hasCartType && cartItems.length > 0) {
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

        // 1. 백엔드에서 채팅방 생성하도록 수정 - 프론트엔드에서는 생성하지 않음
        let chatId = currentChatId;
        const effectiveServerChatId = serverChatId;
        let returnedChatId: string | null = null; // 백엔드에서 반환된 채팅 ID
        
        console.log(`[CHAT] 현재 채팅 ID: ${chatId || '없음'}`)
        console.log(`[CHAT] 서버 전송용 chat_id: ${effectiveServerChatId || 'null (신규)'}`)
        
        // chatId가 없으면 백엔드에서 생성하도록 null로 전송
        if (!chatId) {
            console.log('[CHAT] 새 채팅 시작 - 백엔드에서 채팅방 생성 예정')
        }


        // ------------------
        // 2. 사용자 메시지 UI에 먼저 표시 (백엔드 응답 후 저장)
        const userMessage: UIChatMessage = {
            role: "user",
            content: message,
            timestamp: new Date(),
            // 이미지 미리보기를 위한 임시 로컬 URL 생성
            imageUrl: image ? URL.createObjectURL(image) : undefined,
        };

        const updatedMessages: UIChatMessage[] = [...currentMessages, userMessage];
        setCurrentMessages(updatedMessages);

        // 백엔드 응답 후 채팅 ID와 메시지를 저장하도록 수정
        // 좌측 채팅 목록에도 즉시 반영 (임시 ID 사용)
        const tempChatId = chatId || `temp_${Date.now()}`;
        setChatHistory((prev) => {
            const me: UIChatSession = {
                id: tempChatId,
                title: updateChatTitle(updatedMessages),
                messages: updatedMessages,
                lastUpdated: new Date(),
            };
            const others = prev.filter((c) => c.id !== tempChatId);
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
            // ✨ 서버로 보낼 최종 응답을 담을 변수
            let data: any;

            // ✨ 항상 FormData로 전송 (이미지 유무와 관계없이)
            const formData = new FormData();
            const messageForServer = message.trim() || (image ? "이미지 분석 요청" : "메시지 없음");
            console.log("전송할 메시지------", messageForServer)
            
            formData.append("message", messageForServer);
            if (effectiveServerChatId) {
                formData.append("chat_id", effectiveServerChatId);
            }
            if (image) {
                formData.append("image", image);
            }

            data = await postMultipart<any>(`${process.env.NEXT_PUBLIC_BACKEND_BASE || "http://localhost:8080"}/api/chat`, formData);
            
            console.log('★★ [CHAT] AI 서버 응답 받음 ★★:', data)
            // console.log('[CHAT] AI 서버 응답 타입:', typeof data)
            // console.log('[CHAT] AI 서버 응답 구조:', JSON.stringify(data, null, 2))
            
            // 서버가 신규 대화에 대해 chat_id를 생성해 반환하므로 상태에 저장
            if (data?.result?.chatId) {
                returnedChatId = data.result.chatId as string;
                console.log(`[CHAT] 서버에서 반환된 chat_id: ${returnedChatId}`)

                if (!serverChatId || serverChatId !== returnedChatId) {
                    setServerChatId(returnedChatId)
                    console.log(`[CHAT] serverChatId 업데이트: ${returnedChatId}`)
                }
            }
            
            // 백엔드에서 반환된 채팅 ID가 있으면 currentChatId 업데이트
            if (returnedChatId && !currentChatId) {
                setCurrentChatId(returnedChatId);
                console.log(`[CHAT] currentChatId 업데이트 성공: ${returnedChatId}`)
                
                // 임시 채팅을 실제 채팅으로 교체
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

            const raw = data as any
            console.log("-------------------AI 응답:", raw)
            console.log("-------------------AI 응답 구조 분석:")
            console.log("- status:", raw.status)
            console.log("- result:", raw.result)
            console.log("- result.chatType:", raw.result?.chatType)
            console.log("- result.answer:", raw.result?.answer)
            console.log("- result.recipes:", raw.result?.recipes)


            // ------------------
            // 4. AI 응답 처리 (스키마 분기)
            let assistantMessage: UIChatMessage;

            console.log("=== AI 응답 처리 시작 ===");
            // console.log("Raw response:", raw);

            // 백엔드 응답 구조 확인
            // 백엔드에서는 ChatResponse(status, result) 형태로 응답
            // result에는 ChatResult(chatType, answer, recipes)가 들어있음
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
                // 백엔드에서 오류 응답을 보낸 경우
                console.error("백엔드 오류 응답:", responseData);
                assistantMessage = {
                    role: "assistant",
                    content: responseData.answer || "서버 오류가 발생했습니다.",
                    timestamp: new Date(),
                };
                setError(responseData.answer || "서버 오류가 발생했습니다.");
            } else if (raw.status === "error" || raw.error) {
                // 백엔드에서 HTTP 오류 응답을 보낸 경우
                console.error("백엔드 HTTP 오류 응답:", raw);
                const errorMessage = raw.message || raw.error || "서버 오류가 발생했습니다.";
                assistantMessage = {
                    role: "assistant",
                    content: `오류가 발생했습니다: ${errorMessage}`,
                    timestamp: new Date(),
                };
                setError(errorMessage);
            } else if (responseData.chatType || responseData.answer) {
                // 4-1. 백엔드 표준 스키마 처리
                console.log("백엔드 응답 구조로 처리:", responseData);

                // 백엔드에서 answer 필드에 실제 AI 응답이 들어있음
                const messageContent = responseData.answer || responseData.content || "AI 응답을 받았습니다.";

                console.log("최종 메시지 내용:", messageContent);

                assistantMessage = {
                    role: "assistant",
                    content: messageContent,
                    timestamp: new Date(),
                };

                // 4-2. chatType에 따른 UI 업데이트
                const chatType = responseData.chatType || "chat";
                const recipes = responseData.recipes || [];

                console.log(`=== ${chatType} 타입 처리 시작 ===`);
                console.log("현재 뷰:", currentView);
                console.log("chatType이 'chat'인 경우 화면 변화 없음:", chatType === "chat");
                
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
                            // 기존 레시피 목록에 새로운 레시피 추가 (축적)
                            setCurrentRecipes((prev) => {
                                const existingIds = new Set(prev.map(r => r.name + r.description));
                                const newRecipes = uiRecipes.filter(r => 
                                    !existingIds.has(r.name + r.description)
                                );
                                return [...prev, ...newRecipes];
                            });
                            
                            // chat-service를 사용하여 레시피 저장 (백엔드에서 반환된 채팅 ID 사용)
                            try {
                                const effectiveChatId = returnedChatId || chatId;
                                if (effectiveChatId) {
                                    await appendRecipes(effectiveChatId, uiRecipes)
                                    console.log('[CHAT] 레시피 저장 완료')
                                } else {
                                    console.log('[CHAT] 채팅 ID가 없어서 레시피 저장 건너뜀')
                                }
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
                            
                            // cart 타입일 때는 상품 정보를 카트 아이템으로 변환
                            const cartRecipes = recipes.map((r: any) => {
                                console.log("cart 레시피 처리:", r);
                                
                                // ingredients가 비어있고 product가 있는 경우, product를 ingredients로 복사
                                let processedIngredients = r.ingredients;
                                if ((!r.ingredients || r.ingredients.length === 0) && 
                                    r.product && Array.isArray(r.product) && r.product.length > 0) {
                                    console.log("ingredients가 비어있어서 product를 ingredients로 복사");
                                    processedIngredients = r.product;
                                }
                                
                                return {
                                    ...r,
                                    ingredients: Array.isArray(processedIngredients) ? processedIngredients : [],
                                    product: Array.isArray(r.product) ? r.product : []
                                };
                            });
                            
                            console.log("처리된 cart 레시피:", cartRecipes);
                            
                            // product가 있거나 ingredients에 상품 정보가 있는 레시피만 필터링
                            const validCartRecipes = cartRecipes.filter((r: any) => {
                                const hasProducts = Array.isArray(r.product) && r.product.length > 0;
                                const hasIngredients = Array.isArray(r.ingredients) && r.ingredients.length > 0;
                                return hasProducts || hasIngredients;
                            });
                            
                            console.log("유효한 cart 레시피:", validCartRecipes);
                            
                            if (validCartRecipes.length > 0) {
                                // 기존 카트 아이템에 새로운 아이템 추가 (축적)
                                setCartItems((prev) => {
                                    const existingIds = new Set(prev.map((r: any) => r.food_name + r.source));
                                    const newItems = validCartRecipes.filter((r: any) => 
                                        !existingIds.has(r.food_name + r.source)
                                    );
                                    return [...prev, ...newItems];
                                });
                                
                                // chat-service를 사용하여 카트 아이템 저장 (백엔드에서 반환된 채팅 ID 사용)
                                try {
                                    const effectiveChatId = returnedChatId || chatId;
                                    if (effectiveChatId) {
                                        await appendCartItems(effectiveChatId, validCartRecipes)
                                        console.log('[CHAT] 카트 아이템 저장 완료')
                                    } else {
                                        console.log('[CHAT] 채팅 ID가 없어서 카트 아이템 저장 건너뜀')
                                    }
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
                        // console.log("chat 타입이므로 setCurrentView 호출하지 않음");
                        // console.log("chat 타입이므로 레시피나 카트 아이템 추가하지 않음");
                        // console.log("chat 타입이므로 백엔드에 저장하지 않음");
                        // chat 타입일 때는 화면 변화가 없어야 함
                        // 현재 뷰를 그대로 유지 (setCurrentView 호출하지 않음)
                        // 레시피나 카트 아이템도 추가하지 않음
                        // 백엔드에도 저장하지 않음
                        break;
                        
                    default:
                        console.log(`알 수 없는 chatType: ${chatType} -> welcome 뷰 유지`);
                        setCurrentView("welcome");
                        break;
                }
                
                console.log("화면 전환 후 현재 뷰:", currentView);
                console.log("chatType 처리 완료:", chatType);

                // --- 4-2. 이전 스키마 (폴백) 처리 ---
            // } else {
                // console.log("이전 스키마로 처리 (폴백)");
                // const parsedResponse: AIResponse = raw;
                // assistantMessage = {
                //     role: "assistant",
                //     content: parsedResponse.content || "AI 응답을 받았습니다.",
                //     timestamp: new Date(),
                // };

                // 이전 스키마에 따른 UI 업데이트
                // if (parsedResponse.type === "recipe" && parsedResponse.recipes) {
                    // setCurrentView("recipe");
                    // // 기존 레시피 목록에 새로운 레시피 추가 (축적)
                    // setCurrentRecipes((prev) => {
                    //     const existingIds = new Set(prev.map(r => r.name + r.description));
                    //     const newRecipes = parsedResponse.recipes!.filter((r: any) => 
                    //         !existingIds.has(r.name + r.description)
                    //     );
                    //     return [...prev, ...newRecipes];
                    // });
                    
                    // // chat-service를 사용하여 레시피 저장 (백엔드에서 반환된 채팅 ID 사용)
                    // try {
                    //     const effectiveChatId = returnedChatId || chatId;
                    //     if (effectiveChatId) {
                    //         await appendRecipes(effectiveChatId, parsedResponse.recipes)
                    //         console.log('[CHAT] 레시피 저장 완료 (이전 스키마)')
                    //     } else {
                    //         console.log('[CHAT] 채팅 ID가 없어서 레시피 저장 건너뜀 (이전 스키마)')
                    //     }
                    // } catch (e) {
                    //     console.error('[CHAT] 레시피 저장 실패 (이전 스키마):', e)
                    // }
                // } else if (parsedResponse.type === "cart" && parsedResponse.ingredients) {
                    // setCurrentView("cart");
                    // setCurrentIngredients(parsedResponse.ingredients);
                    
                    // // chat-service를 사용하여 카트 아이템 저장 (백엔드에서 반환된 채팅 ID 사용)
                    // try {
                    //     const effectiveChatId = returnedChatId || chatId;
                    //     if (effectiveChatId) {
                    //         await appendCartItems(effectiveChatId, parsedResponse.ingredients)
                    //         console.log('[CHAT] 카트 아이템 저장 완료 (이전 스키마)')
                    //     } else {
                    //         console.log('[CHAT] 채팅 ID가 없어서 카트 아이템 저장 건너뜀 (이전 스키마)')
                    //     }
                    // } catch (e) {
                    //     console.error('[CHAT] 카트 아이템 저장 실패 (이전 스키마):', e)
                    // }
                // } else {
                    // setCurrentView("welcome");
                // }
                // const suggestions = extractNumberedSuggestions(parsedResponse.content);
                // setLastSuggestions(suggestions);
            }

            // ------------------
            // 5. 최종적으로 AI 메시지를 UI에 업데이트하고 DB에 저장
            const finalMessages = [...updatedMessages, assistantMessage];
            setCurrentMessages(finalMessages);
            console.log('최종적으로 AI 메시지 확인 (finalMessages) -------- ', finalMessages);
            
            // 메시지를 DB에 저장 (백엔드에서 반환된 채팅 ID 사용)
            // try {
            //     const effectiveChatId = returnedChatId || chatId;
            //     if (effectiveChatId) {
            //         // chat-service를 사용하여 AI 메시지 저장
            //         await appendMessage(effectiveChatId, {
            //             role: assistantMessage.role,
            //             content: assistantMessage.content,
            //             timestamp: (assistantMessage.timestamp as Date).getTime()
            //         })
            //         console.log('[CHAT] AI 메시지 저장 완료')
            //     } else {
            //         console.log('[CHAT] 채팅 ID가 없어서 메시지 저장 건너뜀')
            //     }
            // } catch (e) {
            //     console.error("[CHAT] 메시지 저장 실패:", e);
            // }

            // 좌측 채팅 목록 최종 업데이트 (백엔드에서 반환된 채팅 ID 사용)
            // setChatHistory((prev) => {
            //     const effectiveChatId = returnedChatId || chatId;
            //     if (effectiveChatId) {
            //         const me: UIChatSession = {
            //             id: effectiveChatId,
            //             title: updateChatTitle(finalMessages),
            //             messages: finalMessages,
            //             lastUpdated: new Date(),
            //         };
            //         const others = prev.filter((c) => c.id !== effectiveChatId);
            //         return [me, ...others];
            //     }
            //     return prev;
            // });

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
        console.log("북마크 클릭 - ", recipeId)
        // 1. 현재 recipeId가 이미 북마크 목록에 있는지 확인합니다.
        const isAlreadyBookmarked = bookmarkedRecipes.includes(recipeId);

        // 2. 확인된 상태에 따라 UI를 즉시 업데이트합니다. (Optimistic Update)
        if (isAlreadyBookmarked) {
            // 이미 북마크 되어 있다면 -> 목록에서 제거
            setBookmarkedRecipes((prev) => prev.filter((id) => id !== recipeId));
        } else {
            // 북마크 되어 있지 않다면 -> 목록에 추가
            setBookmarkedRecipes((prev) => [...prev, recipeId]);
        }

        // 3. 실제 DB와 상태를 동기화하는 비동기 로직을 실행합니다.
        //    UI는 이미 변경되었으므로, 이 함수의 반환값은 더 이상 UI 업데이트에 사용하지 않습니다.
        (async () => {
            const recipe = currentRecipes.find((r) => r.id === recipeId);
            if (!recipe) return;

            try {
                await toggleBookmark(recipe as unknown as DBRecipe);
                // 성공! 아무것도 할 필요가 없습니다.
            } catch (e: any) {
                console.error("북마크 업데이트 실패:", e);
                setError(e?.message || "북마크 저장에 실패했습니다.");

                // 🚨 에러 발생 시, UI를 원래 상태로 되돌립니다. (Rollback)
                if (isAlreadyBookmarked) {
                    // 제거했던 것을 다시 추가
                    setBookmarkedRecipes((prev) => [...prev, recipeId]);
                } else {
                    // 추가했던 것을 다시 제거
                    setBookmarkedRecipes((prev) => prev.filter((id) => id !== recipeId));
                }
            }
        })();

        // 현재 화면의 레시피 중 대상 찾기
        // const recipe = currentRecipes.find((r) => r.id === recipeId)
        // if (!recipe) return
        //     ;
        // (async () => {
        //     try {
        //         const toggled = await toggleBookmark(recipe as unknown as DBRecipe)
        //         setBookmarkedRecipes((prev) =>
        //             toggled ? [...new Set([...prev, recipeId])] : prev.filter((id) => id !== recipeId),
        //         )
        //     } catch (e: any) {
        //         console.error(e)
        //         setError(e?.message || "북마크 저장 실패")
        //     }
        // })()
    }


    // 카트에 추가 핸들러
    const handleAddToCart = (ingredient: Ingredient) => { // `Ingredient` 타입은 { item: string, ... } 입니다.
        (async () => {
            if (!currentChatId) {
                setError("채팅 세션이 없습니다. 새 채팅을 시작해주세요.");
                return;
            }
            setIsLoading(true);
            setError(null);

            try {
                // 1. ingredient_service의 /search/text API를 직접 호출
                console.log(`[CHAT] 재료 상품 검색 시작: ${ingredient.item}`);
                const searchResult = await searchProductsByText(ingredient.item);
                console.log('[CHAT] 재료 검색 API 응답:', searchResult);

                // 2. 검색 결과 처리 (handleChatSubmit의 'cart' 로직과 유사)
                if (searchResult && searchResult.chatType === 'cart') {
                    const recipes = searchResult.recipes || [];
                    const content = searchResult.content || `'${ingredient.item}' 관련 상품을 찾았습니다.`;

                    // 2-1. UI에 검색 요청 및 결과 메시지 추가
                    const userMessage: UIChatMessage = {
                        role: "user",
                        content: `${ingredient.item} 상품 찾아줘`,
                        timestamp: new Date(),
                    };
                    const assistantMessage: UIChatMessage = {
                        role: "assistant",
                        content: content,
                        timestamp: new Date(),
                        chatType: 'cart',
                        recipes: recipes,
                    };
                    setCurrentMessages(prev => [...prev, userMessage, assistantMessage]);

                    // 2-2. cartItems 상태 업데이트
                    if (recipes.length > 0) {
                        const validCartRecipes = recipes.filter((r: any) => 
                            (r.ingredients && r.ingredients.length > 0) || (r.product && r.product.length > 0)
                        );

                        if (validCartRecipes.length > 0) {
                            setCartItems((prev) => {
                                const existingIds = new Set(prev.map((r: any) => r.food_name + r.source));
                                const newItems = validCartRecipes.filter((r: any) =>
                                    !existingIds.has(r.food_name + r.source)
                                );
                                return [...prev, ...newItems];
                            });

                            // 2-3. DB에 카트 아이템 저장
                            await appendCartItems(currentChatId, validCartRecipes);
                            console.log('[CHAT] 카트 아이템 DB 저장 완료');
                        }
                    }

                    // 3. Cart 뷰로 전환
                    setCurrentView("cart");
                } else {
                    throw new Error("관련 상품을 찾지 못했습니다.");
                }
            } catch (e: any) {
                console.error('[CHAT] 상품 검색 또는 카트 추가 실패:', e);
                setError(e.message || "상품 검색 또는 카트 추가에 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        })();
    };


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
    const handleViewChange = (view: "welcome" | "recipe" | "cart" | "bookmark") => {
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
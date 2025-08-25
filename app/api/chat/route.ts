export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    let chat_id: string | null = null;
    
    try {
        const formData = await req.formData();
        const message = formData.get("message") as string | null;
        chat_id = formData.get("chat_id") as string | null;
        const image = formData.get("image") as File | null;

        if ((!message || !String(message).trim()) && !image) {
            return Response.json({error: "message or image is required"}, {status: 400});
        }

        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return Response.json({error: "Unauthorized"}, {status: 401});
        }
        const token = authHeader.replace("Bearer ", "");

        const AI_SERVER_URL = "http://localhost:8080";
        const aiServerFormData = new FormData();
        if (message) aiServerFormData.append("message", message);
        if (chat_id) aiServerFormData.append("chat_id", chat_id);
        if (image) aiServerFormData.append("image", image);

        // 바로 /api/chat 요청 후 응답을 반환하도록 변경
        const chatResponse = await fetch(`${AI_SERVER_URL}/api/chat`, {
            headers: {"Authorization": `Bearer ${token}`},
            method: "POST",
            body: aiServerFormData,
        });

        const responseText = await chatResponse.text();
        console.log("API가 실제로 받은 메시지. Raw chat response:", responseText);

        if (!chatResponse.ok) {
            throw new Error(`Chat request failed: ${chatResponse.status} - ${responseText}`);
        }

        // 응답 파싱 및 필드 정규화
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error("Failed to parse response as JSON:", parseError);
            // JSON 파싱 실패 시 텍스트를 content로 사용
            result = { content: responseText };
        }

        console.log("백엔드 원본 응답:", result);
        console.log("백엔드 응답 타입:", typeof result);
        console.log("백엔드 응답 payload:", result?.payload);

        // 백엔드 응답 구조 정규화
        // payload 안에 chatType, content/answer, recipes가 들어있음
        if (result && typeof result === "object" && result.payload) {
            const payload = result.payload;
            console.log("Payload 내용:", payload);
            
            // chatType이 "chat"인 경우 화면 변화가 없어야 함
            const chatType = payload.chatType || "chat";
            console.log("백엔드에서 받은 chatType:", chatType);
            
            // payload에서 필요한 정보 추출
            const normalizedResult = {
                chatType: chatType,
                content: payload.content || payload.answer || result.message || "AI 응답을 받았습니다.",
                recipes: Array.isArray(payload.recipes) ? payload.recipes : [],
                chat_id: result.chat_id,
                jobId: result.job_id,
                timestamp: result.timestamp,
                payload: payload
            };
            
            console.log("정규화된 응답:", normalizedResult);
            console.log("chatType이 'chat'인 경우 화면 변화 없음:", chatType === "chat");
            return Response.json(normalizedResult);
        }

        // payload가 없는 경우 기본 응답
        console.log("payload가 없는 응답 -> 기본 처리");
        const defaultResult = {
            chatType: "chat",
            content: result.message || result.content || "AI 응답을 받았습니다.",
            recipes: [],
            chat_id: result.chat_id,
            timestamp: result.timestamp
        };
        return Response.json(defaultResult);

    } catch (error) {
        console.error("Chat API error:", error);
        return Response.json(
            {
                chatType: "chat",
                content: "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
                error: error instanceof Error ? error.message : "Failed to process chat message",
                recipes: [],
                chat_id: chat_id,
            },
            {status: 500}
        );
    }
}

export function transformExternalResponse(result: any) {
    const answer: string = result?.answer ?? "AI의 답변입니다.";
    const chatType: "cart" | "chat" | "recipe" = result?.chatType;
    const originalRecipes: any[] = Array.isArray(result?.recipes) ? result.recipes : [];
    const type = chatType === "cart" ? "cart" : "recipe";

    if (type === "cart") {
        console.log("[transform] 'cart' 타입으로 처리.");
        return {
            type: "cart" as const,
            content: answer,
            recipes: originalRecipes,
        };
    } else {
        console.log("[transform] 'recipe' 타입으로 처리.");
        const transformedRecipes = originalRecipes.map((recipe: any, index: number) => {
            const foodName = recipe.food_name || recipe.title || `Recipe ${index + 1}`;
            const source = recipe.source || "text";
            const rawIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
            const normalizedIngredients = rawIngredients.map((ing: any) => {
                if (typeof ing === "string") {
                    return {item: ing, amount: "", unit: ""};
                }
                return {
                    item: ing.item || ing.name || ing.product_name || "",
                    amount: ing.amount || "",
                    unit: ing.unit || "",
                };
            });
            return {
                id: `recipe_${Date.now()}_${index}`,
                food_name: foodName,
                source,
                recipe: Array.isArray(recipe.recipe) ? recipe.recipe : Array.isArray(recipe.steps) ? recipe.steps : [],
                ingredients: normalizedIngredients,
            };
        });
        return {
            type: "recipe" as const,
            content: answer,
            recipes: transformedRecipes,
        };
    }
}

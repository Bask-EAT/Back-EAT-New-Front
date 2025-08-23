export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const message = formData.get("message") as string | null;
        const chat_id = formData.get("chat_id") as string | null;
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
        console.log("Raw chat response:", responseText);

        if (!chatResponse.ok) {
            throw new Error(`Chat request failed: ${chatResponse.status} - ${responseText}`);
        }

        // polling 없이 /api/chat 응답을 바로 JSON으로 파싱해 반환
        const result = JSON.parse(responseText);
        // content 필드가 없으면 answer 사용
        const content = typeof result.content === "string" && result.content.trim()
            ? result.content
            : (typeof result.answer === "string" ? result.answer : "");
        return Response.json({...result, content});

    } catch (error) {
        console.error("Chat API error:", error);
        return Response.json(
            {
                type: "general",
                content: "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
                error: error instanceof Error ? error.message : "Failed to process chat message",
                recipes: [],
                ingredients: [],
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

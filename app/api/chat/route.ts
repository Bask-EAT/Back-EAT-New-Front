// Using Web standard Request to avoid build-time type coupling on next/server in some environments

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, chatHistory } = await req.json()
    let sendMessage = message

    for (let i = 0; i < chatHistory.length; i++) {
      sendMessage += `\n${chatHistory[i].role}: ${chatHistory[i].content}`
    }

    sendMessage += `\nuser: ${message}`
    
    console.log("[v0] message:", message)
    console.log("[v0] chatHistory:", chatHistory)



    // LLM-Agent의 intent_service 기본 포트(8001)에 맞춤. 필요시 환경변수로 오버라이드
    const env = (globalThis as any).process?.env || {}
    const AI_SERVER_URL = (env.AI_SERVER_URL || env.NEXT_PUBLIC_AI_SERVER_URL || "http://localhost:8001")

    console.log("[v0] AI_SERVER_URL:", AI_SERVER_URL) 
    console.log("[v0] Sending message to external server:", sendMessage)
    console.log("[v0] Full request URL:", `${AI_SERVER_URL}/chat`)

    // Step 1: Send chat request to external AI server
    const chatResponse = await fetch(`${AI_SERVER_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: sendMessage,
      }),
    })

    console.log("[v0] Chat response status:", chatResponse.status)
    console.log("[v0] Chat response headers:", Object.fromEntries(chatResponse.headers.entries()))

    // 1. 응답 본문을 text로 먼저 읽어서 변수에 저장합니다.
    const responseText = await chatResponse.text();

    // 2. 저장된 텍스트 전체를 로그로 출력합니다. 이제 내용이 보입니다.
    console.log("✅ API가 실제로 받은 메시지 (Raw Text):", responseText);

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text()
      console.log("[v0] Chat response error body:", errorText)
      throw new Error(`Chat request failed: ${chatResponse.status} - ${errorText}`)
    }

    // 3. 성공했다면, 저장해둔 텍스트를 JSON으로 파싱(변환)합니다.
    const { job_id } = JSON.parse(responseText);
    // const { job_id } = await chatResponse.json()
    console.log("[v0] Received job_id:", job_id)

    // Step 2: Poll status endpoint until job is complete
    const pollStatus = async (): Promise<any> => {
      const maxAttempts = 60 // 5 minutes with 5-second intervals
      let attempts = 0

      while (attempts < maxAttempts) {
        try {
          console.log("[v0] Polling status, attempt:", attempts + 1)
          const statusResponse = await fetch(`${AI_SERVER_URL}/status/${job_id}`)
          console.log("[v0] Status response status:", statusResponse.status)

          if (statusResponse.ok) {
            const result = await statusResponse.json()
            console.log("[v0] Status result:", result.status)

            if (result.status === "completed") {
              console.log("[v0] Job completed successfully")
              return result
            }

            // If not completed, wait and try again
            console.log("[v0] Job not completed, waiting 5 seconds...")
            await new Promise((resolve) => setTimeout(resolve, 5000)) // 5 second delay
            attempts++
          } else if (statusResponse.status === 404) {
            // Job not ready yet, wait and try again
            console.log("[v0] Job not found (404), waiting 5 seconds...")
            await new Promise((resolve) => setTimeout(resolve, 5000))
            attempts++
          } else {
            const errorText = await statusResponse.text()
            console.log("[v0] Status check error body:", errorText)
            throw new Error(`Status check failed: ${statusResponse.status} - ${errorText}`)
          }
        } catch (error) {
          console.error("[v0] Status polling error:", error)
          await new Promise((resolve) => setTimeout(resolve, 5000))
          attempts++
        }
      }

      throw new Error("Job timeout - no response after 5 minutes")
    }

    const jobResult = await pollStatus()
    // 백엔드가 반환하는 표준 스키마(chatType/content/recipes)를 그대로 전달
    return Response.json(jobResult.result)
  } catch (error) {
    console.error("[v0] Chat API error:", error)
    return Response.json(
      {
        type: "general",
        content: "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
        error: error instanceof Error ? error.message : "Failed to process chat message",
        recipes: [],
        ingredients: [],
      },
      { status: 500 },
    )
  }
}

/**
 * 외부 AI 서버의 응답을 프론트엔드 UI에 맞게 변환하는 함수.
 * chatType에 따라 '장보기'와 '레시피' 응답을 분기하여 처리합니다.
 */
function transformExternalResponse(result: any) {
  const answer: string = result?.answer ?? "AI의 답변입니다.";
  const chatType: "cart" | "chat" | undefined = result?.chatType;
  const originalRecipes: any[] = Array.isArray(result?.recipes) ? result.recipes : [];

  // 1. 응답 타입 결정 (장보기 vs 레시피)
  // 서버가 명시한 chatType을 최우선으로 존중합니다.
  const type = chatType === "cart" ? "cart" : "recipe";

  // 2. 응답 타입에 따라 데이터를 다르게 처리
  if (type === "cart") {
    // =================================================================
    // 🛒 장보기(cart) 타입일 경우의 처리
    // =================================================================
    // 서버가 보내준 원본 상품 데이터를 그대로 사용합니다.
    // 추가적인 가공을 하지 않아 price, image_url 등이 보존됩니다.
    console.log("[transform] 'cart' 타입으로 처리. 원본 데이터를 유지합니다.");
    
    return {
      type: "cart" as const,
      content: answer,
      recipes: originalRecipes, // 서버에서 받은 원본 recipes 배열을 그대로 반환
    };

  } else {
    // =================================================================
    // 📖 레시피(recipe) 타입일 경우의 처리
    // =================================================================
    // 기존 로직을 사용하여 레시피 탐색 화면에 맞는 형태로 데이터를 가공합니다.
    console.log("[transform] 'recipe' 타입으로 처리. 데이터를 레시피 형식으로 변환합니다.");

    const transformedRecipes = originalRecipes.map((recipe: any, index: number) => {
      const foodName = recipe.food_name || recipe.title || `Recipe ${index + 1}`;
      const source = recipe.source || "text";
      const rawIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

      const normalizedIngredients = rawIngredients.map((ing: any) => {
        if (typeof ing === "string") {
          return { item: ing, amount: "", unit: "" };
        }
        return {
          item: ing.item || ing.name || ing.product_name || "",
          amount: ing.amount || "",
          unit: ing.unit || "",
        };
      });

      return {
        // 이 구조는 RecipeExplorationScreen에 맞게 유지됩니다.
        id: `recipe_${Date.now()}_${index}`,
        food_name: foodName,
        source: source,
        recipe: Array.isArray(recipe.recipe) ? recipe.recipe : Array.isArray(recipe.steps) ? recipe.steps : [],
        ingredients: normalizedIngredients,
        // 필요하다면 다른 레시피 관련 필드를 여기에 추가할 수 있습니다.
      };
    });

    return {
      type: "recipe" as const,
      content: answer,
      recipes: transformedRecipes,
    };
  }
}
// 구 변환 로직 제거: 표준 스키마를 그대로 전달합니다.

// Using Web standard Request to avoid build-time type coupling on next/server in some environments

export async function POST(req: Request) {
  try {
    const { message, chatHistory } = await req.json()

    // LLM-Agent의 intent_service 기본 포트(8001)에 맞춤. 필요시 환경변수로 오버라이드
    const env = (globalThis as any).process?.env || {}
    const AI_SERVER_URL = (env.AI_SERVER_URL || env.NEXT_PUBLIC_AI_SERVER_URL || "http://localhost:8001")

    console.log("[v0] AI_SERVER_URL:", AI_SERVER_URL)
    console.log("[v0] Sending message to external server:", message)
    console.log("[v0] Full request URL:", `${AI_SERVER_URL}/chat`)

    // Step 1: Send chat request to external AI server
    const chatResponse = await fetch(`${AI_SERVER_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
      }),
    })

    console.log("[v0] Chat response status:", chatResponse.status)
    console.log("[v0] Chat response headers:", Object.fromEntries(chatResponse.headers.entries()))

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text()
      console.log("[v0] Chat response error body:", errorText)
      throw new Error(`Chat request failed: ${chatResponse.status} - ${errorText}`)
    }

    const { job_id } = await chatResponse.json()
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

    // Step 3: Transform external response to match frontend expectations
    const transformedResponse = transformExternalResponse(jobResult.result)
    console.log("[v0] Transformed response type:", transformedResponse.type)

    return Response.json(transformedResponse)
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

function transformExternalResponse(result: any) {
  const answer: string = result?.answer ?? ""
  let recipes: any[] = Array.isArray(result?.recipes) ? result.recipes : []
  const chatType: string | undefined = typeof result?.chatType === "string" ? result.chatType : undefined

  // 우선순위: 서버가 명시한 chatType → 없으면 휴리스틱
  let type: "recipe" | "cart" | "general" = "general"
  if (chatType === "cart") {
    type = "cart"
  } else if (chatType === "chat") {
    type = "recipe"
  } else if (recipes.length > 0) {
    type = "recipe"
  } else if (/재료|장보기|쇼핑/.test(answer)) {
    type = "cart"
  }

  // 폴백: 최상위에 food_name/ingredients/recipe만 존재하는 경우 단일 레시피로 변환
  if (recipes.length === 0 && (result?.food_name || result?.recipe || result?.steps)) {
    recipes = [
      {
        source: result?.source || "text",
        food_name: result?.food_name || "레시피",
        ingredients: result?.ingredients || [],
        recipe: Array.isArray(result?.recipe) ? result.recipe : Array.isArray(result?.steps) ? result.steps : [],
      },
    ]
    type = "recipe"
  }

  // 레시피 화면용 변환 (chatType=chat 기준)
  const transformedRecipes = recipes.map((recipe: any, index: number) => {
    const foodName = recipe.food_name || recipe.title || `Recipe ${index + 1}`
    const source = recipe.source || "text"
    const rawIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

    const normalizedIngredients = rawIngredients.map((ing: any) => {
      if (typeof ing === "string") {
        return { name: ing, amount: "", unit: "", optional: false }
      }
      if (ing && typeof ing === "object") {
        const name = ing.item || ing.name || ing.product_name || ""
        const amount = ing.amount || ""
        const unit = ing.unit || ""
        return { name, amount, unit, optional: false }
      }
      return { name: "", amount: "", unit: "", optional: false }
    })

    const steps = Array.isArray(recipe.recipe) ? recipe.recipe : Array.isArray(recipe.steps) ? recipe.steps : []

    return {
      id: `recipe_${Date.now()}_${index}`,
      name: foodName,
      description: `${source === "video" ? "영상" : "텍스트"} 기반 레시피`,
      prepTime: "준비 시간 미정",
      cookTime: "조리 시간 미정",
      servings: 1,
      difficulty: "Medium" as const,
      ingredients: normalizedIngredients,
      instructions: steps,
      tags: [source === "video" ? "영상레시피" : "텍스트레시피"],
      image: `/placeholder.svg?height=300&width=400&query=${encodeURIComponent(foodName)}`,
    }
  })

  // 장보기 화면용 재료 추출
  let cartIngredients: Array<{ name: string; amount: string; unit: string }> = []
  if (type === "cart") {
    const candidateList = recipes?.[0]?.ingredients
    if (Array.isArray(candidateList)) {
      cartIngredients = candidateList.map((ing: any) => ({
        name: ing?.product_name || ing?.name || ing?.item || "",
        amount: "",
        unit: "",
      }))
    }
  } else {
    // 일반(recipe) 케이스에서는 모든 레시피 재료를 평탄화하여 전달
    cartIngredients = recipes.flatMap((recipe: any) =>
      (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).map((ing: any) => ({
        name: typeof ing === "string" ? ing : ing?.item || ing?.name || "",
        amount: typeof ing === "string" ? "" : ing?.amount || "",
        unit: typeof ing === "string" ? "" : ing?.unit || "",
      })),
    )
  }

  return {
    type,
    content: answer,
    recipes: transformedRecipes,
    ingredients: cartIngredients,
  }
}

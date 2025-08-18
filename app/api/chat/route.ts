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

// 구 변환 로직 제거: 표준 스키마를 그대로 전달합니다.

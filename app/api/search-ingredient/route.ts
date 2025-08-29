import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { query, userId, chatId } = await request.json()
    
    if (!query || !userId || !chatId) {
      return NextResponse.json(
        { error: 'Missing required fields: query, userId, chatId' },
        { status: 400 }
      )
    }

    // localhost:8000의 /search/text 엔드포인트로 요청
    const searchResponse = await fetch('http://localhost:8000/search/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    })

    if (!searchResponse.ok) {
      throw new Error(`Search API error: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    
    // Firebase DB에 저장할 데이터 구조 생성
    const cartMessageData = {
      foodName: query,
      id: generateUUID(),
      ingredients: [],
      product: searchData.results.map((item: any) => ({
        imageUrl: item.image_url,
        price: item.price,
        productAddress: item.product_address,
        productName: item.product_name,
      })),
      recipe: [],
      source: "ingredient_search",
      timestamp: Date.now(),
      userId: userId
    }

    // Firebase DB에 저장 (백엔드 서버를 통해)
    const backendResponse = await fetch(`${process.env.BACKEND_BASE_URL || 'http://localhost:8080'}/api/users/${userId}/chats/${chatId}/cart_messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cartMessageData),
    })

    if (!backendResponse.ok) {
      throw new Error(`Backend API error: ${backendResponse.status}`)
    }

    const backendData = await backendResponse.json()

    return NextResponse.json({
      success: true,
      data: backendData,
      searchResults: searchData.results
    })

  } catch (error) {
    console.error('Search ingredient error:', error)
    return NextResponse.json(
      { error: 'Failed to search ingredient' },
      { status: 500 }
    )
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export interface Ingredient {
  item: string
  amount: string
  unit: string
}

export interface Product {
  product_name: string
  price: number
  image_url: string
  product_address: string
}

export interface TextRecipe {
  source: "text" | "video"
  food_name: string
  ingredients: Ingredient[] // 레시피 재료
  recipe: string[] // 조리 방법
}

export interface CartRecipe {
  source: "ingredient_search"
  food_name: string
  product: Product[] | null // null일 수 있도록 수정
  recipe: [] // 항상 빈 배열
}

export type Recipe = TextRecipe | CartRecipe

// 백엔드 응답 구조에 맞는 새로운 타입 (kippeum BackEAT_Front에서 통합)
export interface BackendChatResponse {
  chat_id: string
  message: string
  timestamp: string
  chatType: "chat" | "cart" | "recipe"
  recipes: Recipe[]
}

// 백엔드 Message 엔티티에 맞는 새로운 타입
export interface BackendMessage {
  role: "user" | "assistant"
  content: string
  timestamp: number
  chatType: "general" | "recipe" | "cart"
  recipeData?: Recipe | null
  cartData?: Product[] | null
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  recipes?: Recipe[]
  timestamp: Date
  chatType?: "chat" | "cart" | "recipe"
  imageUrl?: string
}

// ChatSession은 새로운 ChatMessage를 사용하도록 업데이트합니다.
export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  lastUpdated: Date
}

export interface UIRecipe {
  id: string
  name: string
  description: string
  prepTime: string
  cookTime: string
  servings: number
  difficulty: "Easy" | "Medium" | "Hard"
  ingredients: Array<{
    name: string
    amount: string
    unit: string
    optional?: boolean
  }>
  instructions: string[]
  tags: string[]
  image?: string
}

export interface AIResponse {
  type: "recipe" | "cart" | "general"
  content: string
  recipes?: UIRecipe[]
  ingredients?: Array<{ name: string; amount: string; unit: string }>
}
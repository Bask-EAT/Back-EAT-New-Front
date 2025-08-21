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

export interface Recipe {
  source: "text" | "video" | "ingredient_search"
  food_name: string
  ingredients: (Ingredient | Product)[]
  recipe: string[]
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  recipes?: Recipe[]
  timestamp: Date
  chatType?: "chat" | "cart"
  imageUrl?: string
}

// ChatSession은 새로운 ChatMessage를 사용하도록 업데이트합니다.
export interface ChatSession {
  id: number
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
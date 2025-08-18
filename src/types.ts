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
  type: "user" | "bot"
  content: string
  recipes?: Recipe[]
  timestamp: Date
  chatType?: "chat" | "cart"
}

// ChatSession은 새로운 ChatMessage를 사용하도록 업데이트합니다.
export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  lastUpdated: Date
}
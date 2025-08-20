"use client"

export type ChatMessage = {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export type DBRecipe = {
  id: string
  name: string
  description: string
  prepTime: string
  cookTime: string
  servings: number
  difficulty: string
  ingredients: Array<{ name: string; amount: string; unit: string; optional?: boolean }>
  instructions: string[]
  tags: string[]
  image?: string
}

export type DBCartItem = { name: string; amount: string; unit: string }

export type ChatRecord = {
  id: number
  timestamp: number
  messages: ChatMessage[]
  recipes: DBRecipe[]
  cartItems: DBCartItem[]
}

const DB_NAME = "chat_history"
const STORE_NAME = "chats"
const BOOKMARKS_STORE = "bookmarks"
const DB_VERSION = 2

function isIndexedDBSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window
}

export async function openChatDB(): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    throw new Error("IndexedDB is not supported in this environment")
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      // v1: chats store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
        store.createIndex("timestamp", "timestamp", { unique: false })
      }
      // v2: bookmarks store
      if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
        db.createObjectStore(BOOKMARKS_STORE, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
}

export async function createChat(): Promise<number> {
  const db = await openChatDB()
  const id = Date.now()
  const record: ChatRecord = {
    id,
    timestamp: id,
    messages: [],
    recipes: [],
    cartItems: [],
  }
  await new Promise<void>((resolve, reject) => {
    const req = tx(db, "readwrite").add(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
  return id
}

export async function getChat(id: number): Promise<ChatRecord | undefined> {
  const db = await openChatDB()
  const result = await new Promise<ChatRecord | undefined>((resolve, reject) => {
    const req = tx(db, "readonly").get(id)
    req.onsuccess = () => {
      // 🔽🔽🔽 디버깅 코드 추가 🔽🔽🔽
      console.log(`[DB 디버그] getChat(${id}) 결과:`, req.result);
      resolve(req.result as ChatRecord | undefined)
    }
    req.onerror = () => reject(req.error)
  })
  db.close()
  return result
}

export async function getAllChatsDesc(): Promise<ChatRecord[]> {
  const db = await openChatDB()
  const result = await new Promise<ChatRecord[]>((resolve, reject) => {
    const out: ChatRecord[] = []
    const cursorReq = tx(db, "readonly").openCursor()
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        out.push(cursor.value as ChatRecord)
        cursor.continue()
      } else {
        // Sort by most recent activity (latest message timestamp), fallback to timestamp
        out.sort((a, b) => {
          const aLatest = a.messages.length > 0 ? a.messages[a.messages.length - 1].timestamp : a.timestamp
          const bLatest = b.messages.length > 0 ? b.messages[b.messages.length - 1].timestamp : b.timestamp
          return bLatest - aLatest
        })
        resolve(out)
      }
    }
    cursorReq.onerror = () => reject(cursorReq.error)
  })
  db.close()
  return result
}

// --- Bookmarks API ---
export type BookmarkRecord = DBRecipe & { createdAt: number }

export async function getAllBookmarkIds(): Promise<string[]> {
  const db = await openChatDB()
  const result = await new Promise<string[]>((resolve, reject) => {
    const out: string[] = []
    const cursorReq = db.transaction(BOOKMARKS_STORE, "readonly").objectStore(BOOKMARKS_STORE).openCursor()
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        const rec = cursor.value as BookmarkRecord
        out.push(rec.id)
        cursor.continue()
      } else {
        resolve(out)
      }
    }
    cursorReq.onerror = () => reject(cursorReq.error)
  })
  db.close()
  return result
}

export async function addBookmark(recipe: DBRecipe): Promise<void> {
  const db = await openChatDB()
  await new Promise<void>((resolve, reject) => {
    const rec: BookmarkRecord = { ...recipe, createdAt: Date.now() }
    const req = db.transaction(BOOKMARKS_STORE, "readwrite").objectStore(BOOKMARKS_STORE).add(rec)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
}

export async function removeBookmark(id: string): Promise<void> {
  const db = await openChatDB()
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(BOOKMARKS_STORE, "readwrite").objectStore(BOOKMARKS_STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
}

export async function isBookmarked(id: string): Promise<boolean> {
  const db = await openChatDB()
  const exists = await new Promise<boolean>((resolve, reject) => {
    const req = db.transaction(BOOKMARKS_STORE, "readonly").objectStore(BOOKMARKS_STORE).get(id)
    req.onsuccess = () => resolve(!!req.result)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return exists
}

export async function toggleBookmark(recipe: DBRecipe): Promise<boolean> {
  const already = await isBookmarked(recipe.id)
  if (already) {
    await removeBookmark(recipe.id)
    return false
  }
  await addBookmark(recipe)
  return true
}

export async function appendMessage(chatId: number, message: ChatMessage): Promise<void> {
  const db = await openChatDB()
  const store = tx(db, "readwrite")
  const record = await new Promise<ChatRecord | undefined>((resolve, reject) => {
    const req = store.get(chatId)
    req.onsuccess = () => resolve(req.result as ChatRecord | undefined)
    req.onerror = () => reject(req.error)
  })
  if (!record) {
    db.close()
    throw new Error("Chat not found")
  }
  record.messages = [...record.messages, message]
  await new Promise<void>((resolve, reject) => {
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
}

export async function appendRecipes(chatId: number, recipes: DBRecipe[]): Promise<void> {
  if (!recipes || recipes.length === 0) return
  // 🔽🔽🔽 디버깅 코드 추가 🔽🔽🔽
  console.log(`🟩[DB 디버그] appendRecipes 호출됨 (chatId: ${chatId})`, recipes);
  const db = await openChatDB()
  const store = tx(db, "readwrite")
  const record = await new Promise<ChatRecord | undefined>((resolve, reject) => {
    const req = store.get(chatId)
    req.onsuccess = () => resolve(req.result as ChatRecord | undefined)
    req.onerror = () => reject(req.error)
  })
  if (!record) {
    db.close()
    throw new Error("Chat not found")
  }
  record.recipes = [...record.recipes, ...recipes]
  await new Promise<void>((resolve, reject) => {
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
}

export async function appendCartItems(chatId: number, items: DBCartItem[]): Promise<void> {
  if (!items || items.length === 0) return
  const db = await openChatDB()
  const store = tx(db, "readwrite")
  const record = await new Promise<ChatRecord | undefined>((resolve, reject) => {
    const req = store.get(chatId)
    req.onsuccess = () => resolve(req.result as ChatRecord | undefined)
    req.onerror = () => reject(req.error)
  })
  if (!record) {
    db.close()
    throw new Error("Chat not found")
  }
  record.cartItems = [...record.cartItems, ...items]
  await new Promise<void>((resolve, reject) => {
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  db.close()
}



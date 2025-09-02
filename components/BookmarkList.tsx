"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bookmark as BookmarkIcon, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Recipe } from "@/src/types"
import type { Bookmark as BookmarkItem, RecipeData } from "@/lib/bookmark-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { X } from "lucide-react";


// Props 타입 정의
interface BookmarkListProps {
    bookmarkedRecipes: BookmarkItem[];
    onRemoveBookmark: (recipeId: string, name: string) => void;
    isLoading: boolean;
    isRightSidebarOpen?: boolean;
}


export function BookmarkList({
    bookmarkedRecipes,
    onRemoveBookmark,
    isLoading,
}: BookmarkListProps) {

    const [selectedRecipe, setSelectedRecipe] = useState<RecipeData | null>(null);


    // Dialog의 open 상태를 관리하는 핸들러
    const handleOpenChange = (open: boolean) => {
        // 'open' prop이 false가 될 때만 selectedRecipe를 초기화
        if (!open) {
            setSelectedRecipe(null);
        }
    };


    // 로딩 중일 때 표시할 UI
    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">
                        북마크 목록을 불러오는 중...
                    </p>
                </div>
            </div>
        );
    }

    // 북마크가 없을 때 표시할 UI
    if (!bookmarkedRecipes || bookmarkedRecipes.length === 0) {
        return (
            <div className="text-center p-8">
                <BookmarkIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    북마크된 레시피가 없습니다
                </h3>
                <p className="text-gray-500">
                    채팅에서 레시피를 북마크하면 여기에 표시됩니다.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 text-foreground">내 북마크</h2>
                <span className="text-sm text-gray-500">
                    {bookmarkedRecipes.length}개의 레시피
                </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookmarkedRecipes.map((bookmark) => {
                    const recipe = bookmark.recipeData;
                    // 디버깅을 위한 로그 추가
                    // console.log(`Bookmark ${index}:`, { id: bookmark.id, recipeId: recipe?.id });
                    return (
                        <Card
                            key={bookmark.id}
                            className="hover:shadow-md transition-shadow cursor-pointe"
                            onClick={() => setSelectedRecipe(recipe)} // 카드 클릭 시 모달 열기
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 pr-2">
                                        <CardTitle className="text-lg line-clamp-2">
                                            {recipe?.name}
                                        </CardTitle>
                                            <CardDescription className="line-clamp-2 mt-2">
                                                {recipe?.description}
                                            </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={(e) =>{
                                            e.stopPropagation(); // 클릭 시 모달 안 열리게 막기
                                            onRemoveBookmark(recipe.id, recipe.name)}
                                        }
                                        aria-label="북마크 제거"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                        </Card>
                    );
                })}
            </div>

            {/* 모달 영역 */}
            <Dialog open={!!selectedRecipe} onOpenChange={handleOpenChange}>
                <DialogContent className="max-w-lg mx-auto bg-background text-foreground rounded-lg shadow-lg" showCloseButton={false}>
                <DialogClose asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-3 top-3 rounded-md p-2 hover:bg-accent"
                        aria-label="닫기"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogClose> 
                
                <DialogHeader>
                    <DialogTitle>{selectedRecipe?.name}</DialogTitle>
                </DialogHeader>
                {selectedRecipe && (
                    <>
                    <div className="pt-2 space-y-3">
                        {/* 재료 */}
                        {selectedRecipe.ingredients?.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            재료:
                            </p>
                            <div className="flex flex-wrap gap-1">
                            {selectedRecipe.ingredients.map((ingredient) => (
                                <span
                                key={ingredient.id}
                                className="inline-block px-2 py-1 text-xs rounded-full border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                                >
                                {`${ingredient.name} ${ingredient.amount}${ingredient.unit}`}
                                </span>
                            ))}
                            </div>
                        </div>
                        )}
                    
                        {selectedRecipe.instructions?.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                조리 방법:
                            </p>
                            <div className="space-y-1">
                                {selectedRecipe.instructions.map((step, index) => (
                                    <div
                                        key={index}
                                        className="text-xs text-gray-800 dark:text-gray-200"
                                    >
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                            {index + 1}.
                                        </span>{" "}
                                        {step}
                                    </div>
                                ))}
                            </div>
                        </div>
                        )}
                    </div>
                    </>
                )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

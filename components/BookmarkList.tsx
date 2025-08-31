"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bookmark as BookmarkIcon, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Recipe } from "@/src/types"
import type { Bookmark as BookmarkItem, RecipeData } from "@/lib/bookmark-service"


// Props 타입 정의
interface BookmarkListProps {
    bookmarkedRecipes: BookmarkItem[];
    onRemoveBookmark: (recipeId: string, recipeName: string) => void;
    isLoading: boolean;
    isRightSidebarOpen?: boolean;
}


export function BookmarkList({
    bookmarkedRecipes,
    onRemoveBookmark,
    isLoading,
}: BookmarkListProps) {
    // const [bookmarks, setBookmarks] = useState<Recipe[]>([]);
    // const [isLoading, setIsLoading] = useState(true)
    const { toast } = useToast();


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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">내 북마크</h2>
                <span className="text-sm text-gray-500">
                    {bookmarkedRecipes.length}개의 레시피
                </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookmarkedRecipes.map((bookmark) => {
                    const recipe = bookmark.recipeData;
                    return (
                        <Card
                            key={recipe.id}
                            className="hover:shadow-md transition-shadow"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 pr-2">
                                        <CardTitle className="text-lg line-clamp-2">
                                            {recipe.recipeName}
                                        </CardTitle>
                                        {recipe.recipeDescription && (
                                            <CardDescription className="line-clamp-2 mt-2">
                                                {recipe.recipeDescription}
                                            </CardDescription>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() =>
                                            onRemoveBookmark(
                                                recipe.id,
                                                recipe.recipeName
                                            )
                                        }
                                        aria-label="북마크 제거"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-0">
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            카테고리, 조리시간 등등 우리
                                            정보에는 음
                                        </span>
                                    </div>
                                </div>

                                {recipe.ingredients &&
                                recipe.ingredients.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-sm font-medium text-gray-700 mb-1">
                                            주요 재료:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {recipe.ingredients
                                                .slice(0, 3)
                                                .map((ingredient, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                                                    >
                                                        {ingredient.name}
                                                    </span>
                                                ))}
                                            {recipe.ingredients.length > 3 && (
                                                <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                                                    +
                                                    {recipe.ingredients.length -
                                                        3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {recipe.cookingMethods &&
                                recipe.cookingMethods.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-sm font-medium text-gray-700 mb-1">
                                            조리 방법:
                                        </p>
                                        <div className="space-y-1">
                                            {recipe.cookingMethods
                                                .slice(0, 2)
                                                .map((step, index) => (
                                                    <div
                                                        key={index}
                                                        className="text-xs text-gray-600"
                                                    >
                                                        <span className="font-medium">
                                                            {step.stepNumber}.
                                                        </span>{" "}
                                                        {step.description}
                                                    </div>
                                                ))}
                                            {recipe.cookingMethods.length >
                                                2 && (
                                                <div className="text-xs text-gray-500">
                                                    +
                                                    {recipe.cookingMethods
                                                        .length - 2}
                                                    단계 더...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

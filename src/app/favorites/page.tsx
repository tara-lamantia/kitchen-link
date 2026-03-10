'use client';

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { RecipeCard } from "@/components/RecipeCard";

type Favorite = {
  id: string;
  recipe?: {
    id: string;
    title: string;
    vibe: string;
    setup: string;
    imageUrl?: string | null;
    imagePosition?: string | null;
    instructions: string;
    createdAt?: Date | string | null;
    author?: {
      id: string;
    } | null;
  } | null;
};

export default function FavoritesPage() {
  const { user, isLoading: authLoading } = db.useAuth();

  const { data, isLoading, error } = db.useQuery(
    user
      ? {
          favorites: {
            $: { where: { "user.id": user.id } },
            recipe: {
              author: {},
            },
          },
        }
      : null,
  );

  const favorites = (data?.favorites ?? []) as Favorite[];
  const recipesMap = new Map<string, Favorite["recipe"]>();
  for (const fav of favorites) {
    if (fav.recipe?.id) {
      recipesMap.set(fav.recipe.id, fav.recipe);
    }
  }
  const recipes = Array.from(recipesMap.values()).filter(
    (r): r is NonNullable<Favorite["recipe"]> => !!r,
  );

  if (authLoading || (!user && !isLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-brown-500">
          {authLoading ? "Loading…" : "Log in to see your favorites."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-brown-200 bg-white p-6 text-center">
        <p className="text-sm text-brown-600">
          Log in to favorite recipes and see them here.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-full bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-brown-900 sm:text-3xl">
          Favorites
        </h1>
        <p className="mt-1 text-sm text-brown-600">
          Recipes you&apos;ve starred as favorites from the Community Kitchen.
        </p>
      </section>

      {isLoading && (
        <p className="text-sm text-brown-500">Loading favorites…</p>
      )}
      {error && (
        <p className="text-sm text-red-600">
          Error loading favorites: {error.message}
        </p>
      )}

      {!isLoading && !error && recipes.length === 0 && (
        <div className="rounded-2xl border border-brown-200 bg-white p-8 text-center">
          <p className="text-sm text-brown-600">
            You haven&apos;t favorited any recipes yet.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-brown-200 px-4 py-2 text-sm font-medium text-brown-700 hover:bg-brown-50"
            >
              Community Kitchen
            </Link>
            <Link
              href="/search"
              className="rounded-full bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700"
            >
              Search recipes
            </Link>
          </div>
        </div>
      )}

      {!isLoading && !error && recipes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              id={recipe.id}
              title={recipe.title}
              vibe={recipe.vibe}
              setup={recipe.setup}
              imageUrl={recipe.imageUrl}
              imagePosition={recipe.imagePosition}
              instructions={recipe.instructions}
              createdAt={recipe.createdAt}
              canDelete={
                !!user &&
                (!!recipe.author && recipe.author.id === user.id ||
                  user.email === "tarajadelamantia@icloud.com")
              }
              onDelete={() => {
                if (!user) return;
                db.transact(db.tx.recipes[recipe.id].delete()).catch(() => {
                  alert("Failed to delete recipe. Please try again.");
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}


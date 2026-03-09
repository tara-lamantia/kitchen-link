'use client';

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";

type ShoppingListItem = {
  id: string;
  recipe?: {
    id: string;
    title: string;
    ingredients: string;
  } | null;
};

function ingredientLines(ingredients: string): string[] {
  return ingredients
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ShoppingListPage() {
  const { user, isLoading: authLoading } = db.useAuth();

  const { data, isLoading, error } = db.useQuery(
    user
      ? {
          shopping_list: {
            $: { where: { "user.id": user.id } },
            recipe: {},
          },
        }
      : null,
  );

  const items = (data?.shopping_list ?? []) as ShoppingListItem[];
  const byRecipe = React.useMemo(() => {
    const map = new Map<
      string,
      { title: string; ingredients: string[]; recipeId: string }
    >();
    for (const item of items) {
      const recipe = item.recipe;
      if (!recipe?.id) continue;
      const existing = map.get(recipe.id);
      const lines = ingredientLines(recipe.ingredients ?? "");
      if (existing) {
        const combined = new Set([...existing.ingredients, ...lines]);
        map.set(recipe.id, {
          title: recipe.title ?? "Untitled",
          ingredients: Array.from(combined),
          recipeId: recipe.id,
        });
      } else {
        map.set(recipe.id, {
          title: recipe.title ?? "Untitled",
          ingredients: lines,
          recipeId: recipe.id,
        });
      }
    }
    return Array.from(map.values());
  }, [items]);

  if (authLoading || (!user && !isLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-brown-500">
          {authLoading ? "Loading…" : "Log in to use your shopping list."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-brown-200 bg-white p-6 text-center">
        <p className="text-sm text-brown-600">
          Log in to add recipes to your shopping list and see ingredients here.
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
          Shopping List
        </h1>
        <p className="mt-1 text-sm text-brown-600">
          Ingredients from recipes you&apos;ve added. Add more from any recipe
          page.
        </p>
      </section>

      {isLoading && (
        <p className="text-sm text-brown-500">Loading your list…</p>
      )}
      {error && (
        <p className="text-sm text-red-600">
          Error loading list: {error.message}
        </p>
      )}

      {!isLoading && !error && byRecipe.length === 0 && (
        <div className="rounded-2xl border border-brown-200 bg-white p-8 text-center">
          <p className="text-sm text-brown-600">
            Your shopping list is empty. Add recipes from the Community Kitchen
            or Search to see ingredients here.
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

      {!isLoading && !error && byRecipe.length > 0 && (
        <div className="space-y-6">
          {byRecipe.map(({ recipeId, title, ingredients }) => (
            <section
              key={recipeId}
              className="rounded-2xl border border-brown-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-brown-900">
                <Link
                  href={`/recipes/${recipeId}`}
                  className="hover:text-sage-700 hover:underline"
                >
                  {title}
                </Link>
              </h2>
              <ul className="mt-3 space-y-1.5 pl-1">
                {ingredients.map((line, index) => (
                  <li
                    key={`${recipeId}-${index}`}
                    className="flex gap-2 text-sm text-brown-800"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brown-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

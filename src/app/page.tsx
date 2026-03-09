'use client';

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { VIBES } from "@/lib/constants";
import { RecipeCard } from "@/components/RecipeCard";

type Recipe = {
  id: string;
  title: string;
  vibe: string;
  setup: string;
  ingredients?: string;
  instructions: string;
  createdAt?: Date | string | null;
};

export default function Home() {
  const { user, isLoading: authLoading } = db.useAuth();

  const {
    data,
    isLoading,
    error,
  } = db.useQuery({
    recipes: {
      $: { order: { createdAt: "desc" } },
      author: {},
    },
  });

  const {
    data: myData,
    isLoading: myLoading,
    error: myError,
  } = db.useQuery(
    user
      ? {
          recipes: {
            $: {
              where: { "author.id": user.id },
              order: { createdAt: "desc" },
            },
          },
        }
      : null,
  );

  const recipes = (data?.recipes ?? []) as Recipe[];
  const myRecipes = (myData?.recipes ?? []) as Recipe[];

  const [selectedVibe, setSelectedVibe] = React.useState<string | null>(null);

  const filteredRecipes =
    selectedVibe == null
      ? recipes
      : recipes.filter((r) => r.vibe === selectedVibe);

  const showMyCookbook = !!user && !myLoading && !myError && myRecipes.length;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-brown-900 sm:text-3xl">
          Community Kitchen
        </h1>
        <p className="max-w-2xl text-sm text-brown-600 sm:text-base">
          A private feed of real meals from the people you trust. Built for{" "}
          <span className="font-semibold text-brown-700">
            small kitchens, tight budgets, and busy weeks.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {VIBES.map((vibe) => {
              const isActive = selectedVibe === vibe;
              return (
                <button
                  key={vibe}
                  type="button"
                  onClick={() =>
                    setSelectedVibe(isActive ? null : vibe as string)
                  }
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors sm:text-sm",
                    isActive
                      ? "border-sage-500 bg-sage-100 text-sage-700"
                      : "border-sand bg-white text-brown-700 hover:border-sage-400 hover:text-sage-700",
                  ].join(" ")}
                >
                  {vibe}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setSelectedVibe(null)}
            className="text-xs font-medium text-brown-500 underline-offset-4 hover:underline"
          >
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/recipes/new"
            className="inline-flex items-center rounded-full bg-sage-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sage-700"
          >
            Post a Recipe
          </Link>
          {!authLoading && !user && (
            <p className="text-xs text-brown-500">
              Log in to save your own recipes and notes.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-700">
            Latest from the Community
          </h2>
        </div>

        {isLoading && (
          <p className="text-sm text-brown-500">Loading recipes…</p>
        )}
        {error && (
          <p className="text-sm text-red-600">
            Error loading recipes: {error.message}
          </p>
        )}

        {!isLoading && !recipes.length && !error && (
          <p className="text-sm text-brown-500">
            No recipes yet. Be the first to share what&apos;s cooking in your
            kitchen.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              id={recipe.id}
              title={recipe.title}
              vibe={recipe.vibe}
              setup={recipe.setup}
              instructions={recipe.instructions}
              createdAt={recipe.createdAt}
            />
          ))}
        </div>
      </section>

      {showMyCookbook && (
        <section className="space-y-4 border-t border-sand pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-700">
              My Cookbook
            </h2>
            <span className="text-xs text-brown-500">
              {myRecipes.length} recipe
              {myRecipes.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {myRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                id={recipe.id}
                title={recipe.title}
                vibe={recipe.vibe}
                setup={recipe.setup}
                instructions={recipe.instructions}
                createdAt={recipe.createdAt}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


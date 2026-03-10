'use client';

import * as React from "react";
import { db } from "@/lib/db";
import { RecipeCard } from "@/components/RecipeCard";
import { SETUPS, TAGS, VIBES } from "@/lib/constants";

type Recipe = {
  id: string;
  title: string;
  vibe: string;
  setup: string;
  imageUrl?: string | null;
  author?: {
    id: string;
  } | null;
  tags?: string | null;
  instructions: string;
  createdAt?: Date | string | null;
};

export default function SearchPage() {
  const { user } = db.useAuth();
  const {
    data,
    isLoading,
    error,
  } = db.useQuery({
    recipes: {
      $: { order: { serverCreatedAt: "desc" } },
      author: {},
    },
  });

  const recipes = (data?.recipes ?? []) as Recipe[];

  const [vibe, setVibe] = React.useState<string>("");
  const [setup, setSetup] = React.useState<string>("");
  const [tag, setTag] = React.useState<string>("");

  const filtered = recipes.filter((recipe) => {
    if (vibe && recipe.vibe !== vibe) return false;
    if (setup && recipe.setup !== setup) return false;
    if (tag) {
      if (!recipe.tags) return false;
      let parsed: string[] = [];
      try {
        const t = JSON.parse(recipe.tags);
        if (Array.isArray(t)) {
          parsed = t
            .map((v) => (typeof v === "string" ? v : ""))
            .filter(Boolean);
        }
      } catch {
        parsed = [];
      }
      if (!parsed.includes(tag)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-brown-900 sm:text-2xl">
          What can you cook tonight?
        </h1>
        <p className="max-w-2xl text-sm text-brown-600">
          Filter the community recipes by category and appliances to match your
          current time, energy, and tools.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-2xl border border-sand bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 text-sm">
          <label
            htmlFor="vibe"
            className="text-xs font-medium uppercase tracking-wide text-brown-700"
          >
            Category
          </label>
          <select
            id="vibe"
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            className="min-w-[12rem] rounded-lg border border-sand px-3 py-2 text-sm shadow-sm outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
          >
            <option value="">Any</option>
            {VIBES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label
            htmlFor="setup"
            className="text-xs font-medium uppercase tracking-wide text-brown-700"
          >
            Appliances
          </label>
          <select
            id="setup"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            className="min-w-[12rem] rounded-lg border border-sand px-3 py-2 text-sm shadow-sm outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
          >
            <option value="">Any</option>
            {SETUPS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label
            htmlFor="tag"
            className="text-xs font-medium uppercase tracking-wide text-brown-700"
          >
            Tag
          </label>
          <select
            id="tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="min-w-[12rem] rounded-lg border border-sand px-3 py-2 text-sm shadow-sm outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
          >
            <option value="">Any</option>
            {TAGS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {(vibe || setup || tag) && (
          <button
            type="button"
            onClick={() => {
              setVibe("");
              setSetup("");
              setTag("");
            }}
            className="self-end rounded-full border border-sand px-3 py-1 text-xs font-medium text-brown-600 hover:bg-cream-100"
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-brown-500">Loading recipes…</p>
      )}
      {error && (
        <p className="text-sm text-red-600">
          Error loading recipes: {error.message}
        </p>
      )}

      {!isLoading && !filtered.length && !error && (
        <p className="text-sm text-brown-500">
          Nothing matches those filters yet. Try relaxing one of them, or come
          back after the kitchen has shared more.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            id={recipe.id}
            title={recipe.title}
            vibe={recipe.vibe}
            setup={recipe.setup}
            imageUrl={recipe.imageUrl}
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
    </div>
  );
}


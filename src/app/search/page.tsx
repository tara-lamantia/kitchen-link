'use client';

import * as React from "react";
import { db } from "@/lib/db";
import { RecipeCard } from "@/components/RecipeCard";
import { SETUPS, VIBES } from "@/lib/constants";

type Recipe = {
  id: string;
  title: string;
  vibe: string;
  setup: string;
  instructions: string;
  createdAt?: Date | string | null;
};

export default function SearchPage() {
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

  const filtered = recipes.filter((recipe) => {
    if (vibe && recipe.vibe !== vibe) return false;
    if (setup && recipe.setup !== setup) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-brown-900 sm:text-2xl">
          What can you cook tonight?
        </h1>
        <p className="max-w-2xl text-sm text-brown-600">
          Filter the community recipes by vibe and kitchen setup to match your
          current time, energy, and appliances.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-2xl border border-sand bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1 text-sm">
          <label
            htmlFor="vibe"
            className="text-xs font-medium uppercase tracking-wide text-brown-700"
          >
            Vibe
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
            Setup
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

        {(vibe || setup) && (
          <button
            type="button"
            onClick={() => {
              setVibe("");
              setSetup("");
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
            instructions={recipe.instructions}
            createdAt={recipe.createdAt}
          />
        ))}
      </div>
    </div>
  );
}


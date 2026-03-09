'use client';

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";

type ShoppingListItem = {
  id: string;
  ingredientsOverride?: string | null;
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

function getDisplayIngredients(item: ShoppingListItem): string {
  const fromRecipe = item.recipe?.ingredients ?? "";
  if (item.ingredientsOverride != null && item.ingredientsOverride !== "") {
    return item.ingredientsOverride;
  }
  return fromRecipe;
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
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => alert("Copied to clipboard!"),
      () => alert("Could not copy."),
    );
  };

  const handleRemoveLine = async (item: ShoppingListItem, lineIndex: number) => {
    const current = getDisplayIngredients(item);
    const lines = ingredientLines(current);
    const next = lines.filter((_, i) => i !== lineIndex).join("\n");
    await db.transact(
      db.tx.shopping_list[item.id].update({ ingredientsOverride: next }),
    );
  };

  const startEditing = (item: ShoppingListItem) => {
    setEditingId(item.id);
    setEditText(getDisplayIngredients(item));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEditing = async (itemId: string) => {
    await db.transact(
      db.tx.shopping_list[itemId].update({
        ingredientsOverride: editText.trim() || null,
      }),
    );
    setEditingId(null);
    setEditText("");
  };

  const resetToRecipe = async (item: ShoppingListItem) => {
    await db.transact(
      db.tx.shopping_list[item.id].update({ ingredientsOverride: null }),
    );
    setEditingId(null);
    setEditText("");
  };

  const removeFromList = async (itemId: string) => {
    if (confirm("Remove this recipe from your shopping list?")) {
      await db.transact(db.tx.shopping_list[itemId].delete());
    }
  };

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
          Ingredients from recipes you&apos;ve added. Copy, edit, or remove lines
          to match what you need.
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

      {!isLoading && !error && items.length === 0 && (
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

      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-6">
          {items.map((item) => {
            const recipe = item.recipe;
            const recipeId = recipe?.id;
            const title = recipe?.title ?? "Untitled";
            const isEditing = editingId === item.id;
            const displayText = getDisplayIngredients(item);
            const lines = ingredientLines(displayText);

            return (
              <section
                key={item.id}
                className="rounded-2xl border border-brown-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-brown-900">
                    {recipeId ? (
                      <Link
                        href={`/recipes/${recipeId}`}
                        className="hover:text-sage-700 hover:underline"
                      >
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isEditing && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCopy(displayText)}
                          className="rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-700 hover:bg-brown-50"
                        >
                          Copy ingredients
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          className="rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-700 hover:bg-brown-50"
                        >
                          Edit list
                        </button>
                        {item.ingredientsOverride != null &&
                          item.ingredientsOverride !== "" && (
                            <button
                              type="button"
                              onClick={() => resetToRecipe(item)}
                              className="rounded-full border border-sage-200 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-50"
                            >
                              Reset to recipe
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={() => removeFromList(item.id)}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove from list
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-brown-200 px-3 py-2 text-sm text-brown-800 focus:border-sage-500 focus:outline-none focus:ring-1 focus:ring-sage-500"
                      placeholder="One ingredient per line..."
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => saveEditing(item.id)}
                        className="rounded-full bg-sage-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-700 hover:bg-brown-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => resetToRecipe(item)}
                        className="rounded-full border border-sage-200 px-3 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-50"
                      >
                        Reset to recipe
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="mt-3 space-y-1.5 pl-1">
                    {lines.length === 0 ? (
                      <li className="text-sm text-brown-500">
                        No ingredients. Use Edit list to add some, or Reset to
                        recipe to restore the original.
                      </li>
                    ) : (
                      lines.map((line, index) => (
                        <li
                          key={`${item.id}-${index}`}
                          className="flex items-start gap-2 text-sm text-brown-800"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brown-400" />
                          <span className="min-w-0 flex-1">{line}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(item, index)}
                            className="shrink-0 rounded p-0.5 text-brown-400 hover:bg-red-50 hover:text-red-600"
                            title="Remove this line"
                            aria-label="Remove this line"
                          >
                            ×
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { id as instantId } from "@instantdb/react";
import { db } from "@/lib/db";
import { NotesList } from "@/components/NotesList";
import { SETUPS, VIBES } from "@/lib/constants";

type RecipeAuthor = {
  id: string;
  email?: string | null;
};

type NoteAuthor = {
  id: string;
  email?: string | null;
};

type Note = {
  id: string;
  text: string;
  createdAt: Date | string | null;
  author?: NoteAuthor | null;
};

type Recipe = {
  id: string;
  title: string;
  vibe: string;
  setup: string;
  ingredients: string;
  instructions: string;
  author?: RecipeAuthor | null;
  notes?: Note[];
};

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = db.useAuth();

  const {
    data,
    isLoading,
    error,
  } = db.useQuery(
    id
      ? {
          recipes: {
            $: { where: { id } },
            author: {},
            notes: {
              $: { order: { createdAt: "desc" } },
              author: {},
            },
          },
        }
      : null,
  );

  const recipe = (data?.recipes?.[0] ?? null) as Recipe | null;
  const notes: Note[] = recipe?.notes ?? [];

  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [vibe, setVibe] = React.useState<string>(VIBES[0]);
  const [setup, setSetup] = React.useState<string>(SETUPS[0]);
  const [ingredients, setIngredients] = React.useState("");
  const [instructions, setInstructions] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const [noteText, setNoteText] = React.useState("");
  const [noteError, setNoteError] = React.useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = React.useState(false);

  React.useEffect(() => {
    if (recipe && !isEditing) {
      setTitle(recipe.title ?? "");
      setVibe(recipe.vibe ?? VIBES[0]);
      setSetup(recipe.setup ?? SETUPS[0]);
      setIngredients(recipe.ingredients ?? "");
      setInstructions(recipe.instructions ?? "");
    }
  }, [recipe, isEditing]);

  const isOwner =
    !!user && !!recipe?.author && recipe.author.id === user.id;

  const handleDelete = async () => {
    if (!id || !isOwner) return;
    const confirmed = window.confirm(
      "Delete this recipe? This will also remove its Kitchen Notes.",
    );
    if (!confirmed) return;

    try {
      await db.transact(db.tx.recipes[id as string].delete());
      router.push("/");
    } catch {
      alert("Failed to delete recipe. Please try again.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !isOwner) return;

    if (!title.trim() || !ingredients.trim() || !instructions.trim()) {
      setEditError("Please fill in all required fields.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      await db.transact(
        db.tx.recipes[id as string].update({
          title: title.trim(),
          vibe,
          setup,
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
        }),
      );
      setIsEditing(false);
    } catch (err: unknown) {
      const message =
        (err as { body?: { message?: string } })?.body?.message ??
        "Failed to update recipe. Please try again.";
      setEditError(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    if (!noteText.trim()) {
      setNoteError("Write a quick tip or thought first.");
      return;
    }

    setIsSavingNote(true);
    setNoteError(null);
    const noteId = instantId();

    try {
      await db.transact(
        db.tx.notes[noteId]
          .create({
            text: noteText.trim(),
            createdAt: new Date(),
          })
          .link({
            recipe: id as string,
            author: user.id,
          }),
      );
      setNoteText("");
    } catch (err: unknown) {
      const message =
        (err as { body?: { message?: string } })?.body?.message ??
        "Failed to add note. Please try again.";
      setNoteError(message);
    } finally {
      setIsSavingNote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-brown-500">Loading recipe…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load recipe: {error.message}
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="rounded-xl border border-brown-200 bg-white px-4 py-3 text-sm text-brown-600">
        Recipe not found.
      </div>
    );
  }

  const ingredientsLines =
    typeof recipe.ingredients === "string"
      ? recipe.ingredients.split(/\r?\n/).filter(Boolean)
      : [];

  const instructionsLines =
    typeof recipe.instructions === "string"
      ? recipe.instructions.split(/\r?\n/).filter(Boolean)
      : [];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-brown-200 bg-white p-6 shadow-sm">
        {!isEditing ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-brown-900 sm:text-2xl">
                  {recipe.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  <span className="rounded-full bg-sage-50 px-2.5 py-1 text-sage-700">
                    {recipe.vibe}
                  </span>
                  <span className="rounded-full bg-brown-100 px-2.5 py-1 text-brown-700">
                    {recipe.setup}
                  </span>
                  {recipe.author?.email && (
                    <span className="text-brown-500">
                      by{" "}
                      <span className="font-medium">
                        {recipe.author.email}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {isOwner && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-700 hover:bg-brown-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-700">
                  Ingredients
                </h2>
                {ingredientsLines.length ? (
                  <ul className="space-y-1 text-sm text-brown-800">
                    {ingredientsLines.map((line: string, index: number) => (
                      <li key={`${line}-${index}`} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brown-400" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-brown-500">
                    No ingredients listed.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-700">
                  Instructions
                </h2>
                {instructionsLines.length ? (
                  <ol className="space-y-2 text-sm text-brown-800">
                    {instructionsLines.map((line: string, index: number) => (
                      <li key={`${line}-${index}`} className="flex gap-2">
                        <span className="mt-0.5 text-xs font-semibold text-brown-500">
                          {index + 1}.
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-brown-500">
                    No instructions yet.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold text-brown-900">
                Edit recipe
              </h1>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditError(null);
                }}
                className="text-xs font-medium text-brown-500 underline-offset-4 hover:underline"
              >
                Cancel editing
              </button>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-brown-700"
              >
                Meal name
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full rounded-lg border border-brown-300 px-3 py-2 text-sm shadow-sm outline-none ring-sage-100 placeholder:text-brown-400 focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="vibe"
                  className="block text-sm font-medium text-brown-700"
                >
                  Vibe
                </label>
                <select
                  id="vibe"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="block w-full rounded-lg border border-brown-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
                >
                  {VIBES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="setup"
                  className="block text-sm font-medium text-brown-700"
                >
                  Setup
                </label>
                <select
                  id="setup"
                  value={setup}
                  onChange={(e) => setSetup(e.target.value)}
                  className="block w-full rounded-lg border border-brown-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
                >
                  {SETUPS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="ingredients"
                className="block text-sm font-medium text-brown-700"
              >
                Ingredients
              </label>
              <textarea
                id="ingredients"
                required
                rows={5}
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                className="block w-full resize-y rounded-lg border border-brown-300 px-3 py-2 text-sm shadow-sm outline-none ring-sage-100 placeholder:text-brown-400 focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="instructions"
                className="block text-sm font-medium text-brown-700"
              >
                Instructions
              </label>
              <textarea
                id="instructions"
                required
                rows={6}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="block w-full resize-y rounded-lg border border-brown-300 px-3 py-2 text-sm shadow-sm outline-none ring-sage-100 placeholder:text-brown-400 focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
              />
            </div>

            {editError && <p className="text-xs text-red-600">{editError}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditError(null);
                }}
                className="rounded-full border border-brown-200 px-4 py-2 text-sm font-medium text-brown-700 hover:bg-brown-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="rounded-full bg-sage-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-400"
              >
                {isSavingEdit ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-brown-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-700">
            Kitchen Notes
          </h2>
          {user ? (
            <p className="text-xs text-brown-500">
              Share tips, swaps, or what you&apos;d do differently next time.
            </p>
          ) : (
            <p className="text-xs text-brown-500">
              Log in to add your own notes.
            </p>
          )}
        </div>

        <NotesList notes={notes} />

        {user && (
          <form onSubmit={handleAddNote} className="space-y-2 pt-4">
            <label
              htmlFor="note"
              className="block text-xs font-medium text-brown-700"
            >
              Add a Kitchen Note
            </label>
            <textarea
              id="note"
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Quick tip, timing tweak, or what you served it with…"
              className="block w-full resize-y rounded-lg border border-brown-300 px-3 py-2 text-sm shadow-sm outline-none ring-sage-100 placeholder:text-brown-400 focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
            />
            {noteError && (
              <p className="text-xs text-red-600">{noteError}</p>
            )}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isSavingNote}
                className="rounded-full bg-sage-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-400"
              >
                {isSavingNote ? "Saving…" : "Post note"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}


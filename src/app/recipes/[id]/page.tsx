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
  imageUrl?: string | null;
  ingredients: string;
  instructions: string;
  author?: RecipeAuthor | null;
  notes?: Note[];
  favorites?: { id: string; user?: { id: string } | null }[];
  cooked?: { id: string; user?: { id: string } | null }[];
  shopping_list?: { id: string; user?: { id: string } | null }[];
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
              $: { order: { serverCreatedAt: "desc" } },
              author: {},
            },
            favorites: { user: {} },
            cooked: { user: {} },
            shopping_list: { user: {} },
          },
        }
      : null,
  );

  const recipe = (data?.recipes?.[0] ?? null) as Recipe | null;
  const notes: Note[] = recipe?.notes ?? [];
  const favorites = recipe?.favorites ?? [];
  const cooked = recipe?.cooked ?? [];
  const favoriteCount = favorites.length;
  const cookedCount = cooked.length;
  const isFavorited =
    !!user && favorites.some((f) => f.user && String(f.user.id) === String(user.id));
  const myCookedId = user
    ? cooked.find((c) => c.user && String(c.user.id) === String(user.id))?.id
    : null;
  const hasCooked = !!myCookedId;
  const shoppingList = recipe?.shopping_list ?? [];
  const myShoppingListItemId = user
    ? shoppingList.find((s) => s.user && String(s.user.id) === String(user.id))?.id
    : null;
  const isOnShoppingList = !!myShoppingListItemId;

  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [vibe, setVibe] = React.useState<string>(VIBES[0]);
  const [setup, setSetup] = React.useState<string>(SETUPS[0]);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(
    null,
  );
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
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
      setImageFile(null);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      setImageError(null);
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
    setImageError(null);
    try {
      let imageUrl: string | null | undefined = recipe?.imageUrl ?? undefined;
      if (imageFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append("file", imageFile);

        const res = await fetch("/api/recipe-image", {
          method: "POST",
          body: formData,
        });

        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          throw new Error(json.error || "Failed to upload image.");
        }
        imageUrl = json.url;
      }

      await db.transact(
        db.tx.recipes[id as string].update({
          title: title.trim(),
          vibe,
          setup,
          imageUrl,
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
        }),
      );
      setIsEditing(false);
    } catch (err: unknown) {
      const message =
        (err as { body?: { message?: string } })?.body?.message ??
        (err as { message?: string })?.message ??
        "Failed to update recipe. Please try again.";
      if (message.toLowerCase().includes("upload")) {
        setImageError(message);
      } else {
        setEditError(message);
      }
    } finally {
      setIsSavingEdit(false);
      setIsUploadingImage(false);
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

  const handleEditNote = async (noteId: string, newText: string) => {
    if (!newText.trim()) return;
    try {
      await db.transact(db.tx.notes[noteId].update({ text: newText.trim() }));
    } catch (err: unknown) {
      const message =
        (err as { body?: { message?: string } })?.body?.message ??
        "Failed to update note.";
      alert(message);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await db.transact(db.tx.notes[noteId].delete());
    } catch (err: unknown) {
      const message =
        (err as { body?: { message?: string } })?.body?.message ??
        "Failed to delete note.";
      alert(message);
    }
  };

  const handleToggleFavorite = async () => {
    if (!id || !user) return;
    if (isFavorited) {
      const fav = favorites.find((f) => f.user && String(f.user.id) === String(user.id));
      if (fav) await db.transact(db.tx.favorites[fav.id].delete());
    } else {
      const favId = instantId();
      await db.transact(
        db.tx.favorites[favId].create({}).link({
          recipe: id as string,
          user: user.id,
        }),
      );
    }
  };

  const handleToggleCooked = async () => {
    if (!id || !user) return;
    if (hasCooked && myCookedId) {
      await db.transact(db.tx.cooked[myCookedId].delete());
    } else {
      const cookedId = instantId();
      await db.transact(
        db.tx.cooked[cookedId].create({}).link({
          recipe: id as string,
          user: user.id,
        }),
      );
    }
  };

  const handleToggleShoppingList = async () => {
    if (!id || !user) return;
    if (isOnShoppingList && myShoppingListItemId) {
      await db.transact(db.tx.shopping_list[myShoppingListItemId].delete());
    } else {
      const itemId = instantId();
      await db.transact(
        db.tx.shopping_list[itemId].create({}).link({
          recipe: id as string,
          user: user.id,
        }),
      );
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

            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-brown-100 pt-4">
              <span className="text-sm text-brown-600">
                {favoriteCount === 0
                  ? "No favorites yet"
                  : favoriteCount === 1
                    ? "1 favorite"
                    : `${favoriteCount} favorites`}
              </span>
              {user ? (
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={
                    isFavorited
                      ? "rounded-full border border-sage-300 bg-sage-100 px-3 py-1.5 text-xs font-medium text-sage-800 hover:bg-sage-200"
                      : "rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-700 hover:bg-brown-50"
                  }
                >
                  {isFavorited ? "Unfavorite" : "Favorite"}
                </button>
              ) : null}
              <span className="text-sm text-brown-600">
                {cookedCount === 0
                  ? "No one has cooked this yet"
                  : cookedCount === 1
                    ? "1 person cooked this"
                    : `${cookedCount} people cooked this`}
              </span>
              {user ? (
                <button
                  type="button"
                  onClick={handleToggleCooked}
                  className={
                    hasCooked
                      ? "rounded-full border border-sage-300 bg-sage-100 px-3 py-1.5 text-xs font-medium text-sage-800 hover:bg-sage-200"
                      : "rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-700 hover:bg-brown-50"
                  }
                >
                  {hasCooked ? "You cooked this" : "Cooked this"}
                </button>
              ) : null}
              {user ? (
                <button
                  type="button"
                  onClick={handleToggleShoppingList}
                  className={
                    isOnShoppingList
                      ? "rounded-full border border-sage-300 bg-sage-100 px-3 py-1.5 text-xs font-medium text-sage-800 hover:bg-sage-200"
                      : "rounded-full border border-brown-200 px-3 py-1.5 text-xs font-medium text-brown-700 hover:bg-brown-50"
                  }
                >
                  {isOnShoppingList ? "Remove from list" : "Add to shopping list"}
                </button>
              ) : null}
            </div>

            {recipe.imageUrl ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-brown-200 bg-cream-100/40">
                <img
                  src={recipe.imageUrl}
                  alt={`${recipe.title} photo`}
                  className="h-64 w-full object-cover sm:h-80"
                  loading="lazy"
                />
              </div>
            ) : null}

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
            <div className="rounded-2xl border border-brown-200 bg-cream-100/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-700">
                    Photo
                  </h2>
                  <p className="text-xs text-brown-600">
                    Upload a new image to replace the current one.
                  </p>
                  {imageError && (
                    <p className="text-xs text-red-600">{imageError}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input
                    id="recipe-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setImageError(null);
                      if (!file) {
                        setImageFile(null);
                        if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                        setImagePreviewUrl(null);
                        return;
                      }
                      if (!file.type.startsWith("image/")) {
                        setImageError("Please choose an image file.");
                        e.target.value = "";
                        return;
                      }
                      setImageFile(file);
                      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                      setImagePreviewUrl(URL.createObjectURL(file));
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("recipe-image")?.click()
                    }
                    className="inline-flex items-center justify-center rounded-full border border-brown-200 bg-white px-3 py-2 text-sm font-medium text-brown-700 shadow-sm transition hover:bg-brown-50"
                    title="Upload a photo"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2 2 0 0 1 8.64 5h6.72a2 2 0 0 1 1.813 1.175L18 8h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1l.827-1.825Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                    <span className="ml-2">Choose photo</span>
                  </button>

                  {imagePreviewUrl || recipe.imageUrl ? (
                    <div className="h-14 w-14 overflow-hidden rounded-xl border border-brown-200 bg-white">
                      <img
                        src={imagePreviewUrl ?? recipe.imageUrl ?? ""}
                        alt="Recipe photo preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-brown-200 bg-white text-xs text-brown-400">
                      Preview
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                  Category
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
                  Appliances
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
                disabled={isSavingEdit || isUploadingImage}
                className="rounded-full bg-sage-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-400"
              >
                {isSavingEdit || isUploadingImage ? "Saving…" : "Save changes"}
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

        <NotesList
          notes={notes}
          currentUserId={user?.id}
          currentUserEmail={user?.email}
          onEditNote={handleEditNote}
          onDeleteNote={handleDeleteNote}
        />

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


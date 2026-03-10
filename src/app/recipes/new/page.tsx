'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { SETUPS, VIBES } from "@/lib/constants";
import { id } from "@instantdb/react";

export default function NewRecipePage() {
  const router = useRouter();
  const { user, isLoading } = db.useAuth();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-brown-500">
          {isLoading ? "Checking your session…" : "Redirecting to login…"}
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !ingredients.trim() || !instructions.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setImageError(null);

    const recipeId = id();

    try {
      let imageUrl: string | null = null;
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
        db.tx.recipes[recipeId]
          .create({
            title: title.trim(),
            vibe,
            setup,
            imageUrl: imageUrl ?? undefined,
            ingredients: ingredients.trim(),
            instructions: instructions.trim(),
            createdAt: new Date(),
          })
          .link({ author: user.id }),
      );
      router.push(`/recipes/${recipeId}`);
    } catch (err: unknown) {
      const message =
        (err as { body?: { message?: string } })?.body?.message ??
        (err as { message?: string })?.message ??
        "Failed to save recipe. Please try again.";
      if (message.toLowerCase().includes("upload")) {
        setImageError(message);
      } else {
        setError(message);
      }
      setIsSubmitting(false);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-sand bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-brown-900">
          Post a new recipe
        </h1>
        <p className="text-sm text-brown-600">
          Capture the real version you cook in your kitchen—no food styling
          required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-sand bg-cream-100/60 p-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brown-700">
              Photo
            </h2>
            <p className="text-xs text-brown-600">
              Optional. Upload an image for your recipe card.
            </p>
            {imageError && <p className="text-xs text-red-600">{imageError}</p>}
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
              onClick={() => document.getElementById("recipe-image")?.click()}
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
              <span className="ml-2">Add photo</span>
            </button>

            {imagePreviewUrl ? (
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-brown-200 bg-white">
                <img
                  src={imagePreviewUrl}
                  alt="Selected recipe preview"
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
            className="block w-full rounded-lg border border-sand px-3 py-2 text-sm shadow-sm outline-none placeholder:text-brown-500 focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
            placeholder={`e.g. Mom's Sunday Sauce`}
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
              className="block w-full rounded-lg border border-sand px-3 py-2 text-sm shadow-sm outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
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
              className="block w-full rounded-lg border border-sand px-3 py-2 text-sm shadow-sm outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
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
            className="block w-full resize-y rounded-lg border border-sand px-3 py-2 text-sm shadow-sm outline-none placeholder:text-brown-500 focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
            placeholder="- 1 cup rice
- 2 eggs
- 1 handful frozen peas"
          />
          <p className="text-xs text-brown-500">
            Use one item per line so it&apos;s easy to scan on a phone.
          </p>
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
            className="block w-full resize-y rounded-lg border border-sand px-3 py-2 text-sm shadow-sm outline-none placeholder:text-brown-500 focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
            placeholder="Short, realistic steps for a tired cook in a small apartment kitchen."
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-brown-700 hover:bg-cream-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploadingImage}
            className="rounded-full bg-sage-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-400"
          >
            {isSubmitting || isUploadingImage ? "Saving…" : "Save recipe"}
          </button>
        </div>
      </form>
    </div>
  );
}


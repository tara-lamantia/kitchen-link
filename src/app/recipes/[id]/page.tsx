'use client';

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { id as instantId } from "@instantdb/react";
import { db } from "@/lib/db";
import { compressImageForUpload } from "@/lib/compress-image";
import { NotesList } from "@/components/NotesList";
import { SETUPS, VIBES, IMAGE_POSITION_OPTIONS, getImagePositionStyle } from "@/lib/constants";
import { getRecipeImageSrc } from "@/lib/recipe-image";

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
  imagePosition?: string | null;
  ingredients: string;
  instructions: string;
  tags?: string | null;
  author?: RecipeAuthor | null;
  notes?: Note[];
  favorites?: { id: string; user?: { id: string } | null }[];
  cooked?: { id: string; user?: { id: string } | null }[];
  shopping_list?: { id: string; user?: { id: string } | null }[];
  ratings?: { id: string; stars: number; user?: { id: string } | null }[];
};

function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  // If it looks like JSON, try to parse, otherwise fall back to comma-separated text
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const t = JSON.parse(trimmed);
      if (Array.isArray(t)) {
        return t
          .map((v) => (typeof v === "string" ? v : ""))
          .filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }
  return trimmed
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

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
            ratings: { user: {} },
          },
        }
      : null,
  );

  const recipe = (data?.recipes?.[0] ?? null) as Recipe | null;
  const notes: Note[] = recipe?.notes ?? [];
  const favorites = recipe?.favorites ?? [];
  const cooked = recipe?.cooked ?? [];
  const ratings = recipe?.ratings ?? [];
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

  const averageStars =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + (r.stars || 0), 0) / ratings.length
      : 0;

  const myStars = user
    ? ratings.find(
        (r) => r.user && String(r.user.id) === String(user.id),
      )?.stars ?? 0
    : 0;

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
  const [imagePosition, setImagePosition] = React.useState<string>("center");
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
      setImagePosition(recipe.imagePosition ?? "center");
    }
  }, [recipe, isEditing]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!id) return;
    try {
      window.localStorage.setItem(
        `kitchen-link:servings:${id}`,
        String(servingMultiplier),
      );
    } catch {
      // ignore storage errors
    }
  }, [id, servingMultiplier]);

  React.useEffect(() => {
    let active = true;

    async function requestWakeLock() {
      if (typeof navigator === "undefined") return;
      const wakeLockApi = (navigator as unknown as {
        wakeLock?: { request?: (type: "screen") => Promise<unknown> };
      }).wakeLock;
      if (!wakeLockApi || typeof wakeLockApi.request !== "function") return;
      try {
        const sentinel = await wakeLockApi.request("screen");
        if (!active) {
          // If effect was cleaned up before the promise resolved, release immediately
          // @ts-expect-error optional release
          sentinel.release?.();
          return;
        }
        wakeLockRef.current = sentinel;
      } catch {
        // Ignore wake lock failures (unsupported or denied)
      }
    }

    if (isCookMode) {
      requestWakeLock();
    } else {
      const current = wakeLockRef.current as { release?: () => Promise<void> } | null;
      if (current && typeof current.release === "function") {
        current.release().catch(() => {});
      }
      wakeLockRef.current = null;
    }

    return () => {
      active = false;
      const current = wakeLockRef.current as { release?: () => Promise<void> } | null;
      if (current && typeof current.release === "function") {
        current.release().catch(() => {});
      }
      wakeLockRef.current = null;
    };
  }, [isCookMode]);

  React.useEffect(() => {
    if (!isCookMode && recognitionRef.current) {
      try {
        recognitionRef.current.stop?.();
      } catch {
        // ignore
      } finally {
        setIsVoiceListening(false);
        setWantsVoiceListening(false);
        wantsVoiceListeningRef.current = false;
        recognitionRef.current = null;
      }
    }
  }, [isCookMode]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => {
      if (document.hidden && recognitionRef.current) {
        try {
          recognitionRef.current.stop?.();
        } catch {
          // ignore
        } finally {
          setIsVoiceListening(false);
          setWantsVoiceListening(false);
          wantsVoiceListeningRef.current = false;
          recognitionRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (!body) return;

    const previousOverflow = body.style.overflow;

    if (isCookMode) {
      body.style.overflow = "hidden";
    }

    return () => {
      body.style.overflow = previousOverflow || "";
    };
  }, [isCookMode]);

  function ensureSpeechRecognition(): any | null {
    if (typeof window === "undefined") return null;
    const AnyWindow = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const Ctor =
      AnyWindow.SpeechRecognition || AnyWindow.webkitSpeechRecognition;
    if (!Ctor) return null;
    if (!recognitionRef.current) {
      const rec = new Ctor() as any;
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";
      // continuous: true keeps listening after each result (only stop on manual Off or exit Cook Mode)
      rec.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        if (lastIndex < 0) return;
        const transcript = event.results[lastIndex][0]?.transcript ?? "";
        if (!transcript) return;
        voiceCommandHandlerRef.current(transcript);
      };
      rec.onerror = () => {
        setIsVoiceListening(false);
      };
      rec.onend = () => {
        if (wantsVoiceListeningRef.current && isCookModeRef.current) {
          try {
            rec.start();
            setIsVoiceListening(true);
            return;
          } catch {
            // fall through
          }
        }
        setIsVoiceListening(false);
        wantsVoiceListeningRef.current = false;
        setWantsVoiceListening(false);
      };
      recognitionRef.current = rec;
    }
    return recognitionRef.current;
  }

  const stopVoiceRecognition = React.useCallback(() => {
    try {
      const rec = recognitionRef.current;
      if (rec) {
        rec.stop();
      }
    } catch {
      // ignore
    } finally {
      setIsVoiceListening(false);
      setWantsVoiceListening(false);
      wantsVoiceListeningRef.current = false;
      recognitionRef.current = null;
    }
  }, []);

  const exitCookMode = React.useCallback(() => {
    stopVoiceRecognition();
    setIsCookMode(false);
  }, [stopVoiceRecognition]);

  function handleVoiceCommand(raw: string) {
    const phrase = raw.toLowerCase().trim();
    if (!phrase) return;
    if (phrase.includes("exit cook mode") || phrase.includes("exit")) {
      exitCookMode();
    }
  }

  voiceCommandHandlerRef.current = handleVoiceCommand;

  const handleToggleVoice = () => {
    if (!voiceCommandsEnabled) {
      setVoiceMessage("Enable Voice Commands in your Profile to use this.");
      setTimeout(() => setVoiceMessage(null), 2500);
      return;
    }
    if (isVoiceListening) {
      stopVoiceRecognition();
      return;
    }
    const rec = ensureSpeechRecognition();
    if (!rec) {
      setVoiceMessage("Voice recognition is not supported in this browser.");
      setTimeout(() => setVoiceMessage(null), 3000);
      return;
    }
    try {
      rec.start();
      setIsVoiceListening(true);
      setWantsVoiceListening(true);
      wantsVoiceListeningRef.current = true;
      setVoiceMessage(null);
    } catch {
      setVoiceMessage("Could not start microphone. Check browser settings.");
      setIsVoiceListening(false);
    }
  };

  function ensureAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      let ctx = audioContextRef.current;
      if (!ctx) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return null;
        ctx = new Ctx({ latencyHint: "playback" });
        audioContextRef.current = ctx;
        const masterGain = ctx.createGain();
        masterGain.gain.value = ALARM_MASTER_GAIN;
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;
      }
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      return ctx;
    } catch {
      return null;
    }
  }

  function startSilentLoop() {
    try {
      const ctx = ensureAudioContext();
      const masterGain = masterGainRef.current;
      if (!ctx || !masterGain) return;
      if (silentLoopSourceRef.current) return;

      const gain = ctx.createGain();
      gain.gain.value = 0.01;
      gain.connect(masterGain);
      silentLoopGainRef.current = gain;

      // 1 second near-silent buffer loop to keep audio “active” after user gesture
      const sampleRate = ctx.sampleRate || 44100;
      const frames = Math.max(1, Math.floor(sampleRate * 1));
      const buffer = ctx.createBuffer(1, frames, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * 0.00001;

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(gain);
      src.start();
      silentLoopSourceRef.current = src;
    } catch {
      // ignore
    }
  }

  function stopSilentLoop() {
    try {
      const src = silentLoopSourceRef.current;
      if (src) {
        src.stop();
        src.disconnect();
      }
    } catch {
      // ignore
    } finally {
      silentLoopSourceRef.current = null;
      try {
        silentLoopGainRef.current?.disconnect();
      } catch {
        // ignore
      }
      silentLoopGainRef.current = null;
    }
  }

  function playDing() {
    try {
      const ctx = audioContextRef.current ?? ensureAudioContext();
      const masterGain = masterGainRef.current;
      if (!ctx || !masterGain) return;
      const now = ctx.currentTime;
      const dingLen = 0.42;
      const gap = 0.4;
      [0, 1, 2].forEach((i) => {
        const t0 = now + i * (dingLen + gap);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.value = 1000;
        osc.type = "square";
        // Keep per-beep gain modest; master gain does the heavy lift.
        gain.gain.setValueAtTime(0.18, t0);
        gain.gain.exponentialRampToValueAtTime(0.01, t0 + dingLen);
        osc.start(t0);
        osc.stop(t0 + dingLen);
      });
    } catch {
      // ignore
    }
  }


  React.useEffect(() => {
    if (isCookMode) startSilentLoop();
    return () => {
      stopSilentLoop();
    };
  }, [isCookMode]);

  React.useEffect(() => {
    return () => {
      stopVoiceRecognition();
    };
  }, []);

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
        const fileToUpload = await compressImageForUpload(imageFile);
        formData.append("file", fileToUpload);
        try {
          const res = await fetch("/api/recipe-image", {
            method: "POST",
            body: formData,
          });
          const text = await res.text();
          let json: { url?: string; error?: string } | null = null;
          if (text) {
            try {
              json = JSON.parse(text) as { url?: string; error?: string };
            } catch {
              json = null;
            }
          }
          if (!res.ok || !json?.url) {
            const errMsg =
              json?.error ||
              (text && text.length < 200 ? text : `Upload failed (${res.status})`);
            setImageError(errMsg);
            if (typeof window !== "undefined") {
              window.alert(
                "Photo upload failed. Copy this and paste it in the chat:\n\n" + errMsg,
              );
            }
          } else {
            imageUrl = json.url;
          }
        } catch (uploadErr: unknown) {
          const msg =
            (uploadErr as { message?: string })?.message || String(uploadErr);
          setImageError(msg);
          if (typeof window !== "undefined") {
            window.alert(
              "Photo upload error. Copy this and paste it in the chat:\n\n" + msg,
            );
          }
        } finally {
          setIsUploadingImage(false);
        }
      }

      await db.transact(
        db.tx.recipes[id as string].update({
          title: title.trim(),
          vibe,
          setup,
          imageUrl,
          imagePosition: imagePosition || undefined,
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

  const parsedTags = parseTags(recipe?.tags ?? null);

  const handleRate = async (stars: number) => {
    if (!id || !user) return;
    if (stars < 1 || stars > 5) return;
    const existing = ratings.find(
      (r) => r.user && String(r.user.id) === String(user.id),
    );
    try {
      if (existing) {
        await db.transact(db.tx.ratings[existing.id].update({ stars }));
      } else {
        const ratingId = instantId();
        await db.transact(
          db.tx.ratings[ratingId]
            .create({ stars })
            .link({
              recipe: id as string,
              user: user.id,
            }),
        );
      }
    } catch {
      alert("Failed to save rating. Please try again.");
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
      {isCookMode && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "#FAF9F6",
            animation: undefined,
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: "rgba(0, 0, 0, 0.03)" }} aria-hidden />
          <div className="relative flex flex-col flex-1 min-h-0" style={{ color: "#333333" }}>
          <div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "#333333" }}>{recipe.title}</h1>
              <span className="block text-xs font-medium" style={{ color: "#333333" }}>
                Servings: {formatScaledAmount(servingMultiplier)}×
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                isVoiceListening
                  ? "border-red-500 bg-red-600 text-white shadow-[0_0_0_3px_rgba(220,38,38,0.45)]"
                  : voiceCommandsEnabled
                    ? "border-gray-500 text-gray-800"
                    : "border-gray-300 text-gray-400"
              }`}
              aria-pressed={isVoiceListening}
              aria-label="Toggle voice commands"
            >
              <span
                className={`inline-flex items-center justify-center ${
                  isVoiceListening ? "animate-pulse" : ""
                }`}
              >
                {isVoiceListening ? "●" : "◎"}
              </span>
            </button>
          </div>
          <div className="border-b border-gray-200 px-4 py-3 space-y-1.5" style={{ backgroundColor: "rgba(0,0,0,0.04)" }}>
            <p className="text-[11px] leading-snug" style={{ color: "#333333" }}>
              Tap any time in the instructions below to set the timer, or enter your own.
            </p>
            <CookModeTimer
              ref={cookModeTimerRef}
              formatTimerSeconds={formatTimerSeconds}
              ensureAudioContext={ensureAudioContext}
              startSilentLoop={startSilentLoop}
              playDing={playDing}
            />
            {isVoiceListening && (
              <div className="mt-2 rounded-xl bg-red-600 px-3 py-2 text-center text-[11px] font-semibold text-white shadow-sm">
                Voice Command: Say "Exit Cook Mode" to go back.
              </div>
            )}
            {voiceMessage && (
              <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                {voiceMessage}
              </div>
            )}
            <p className="text-[11px] leading-snug" style={{ color: "#333333" }}>
              Timer alerts only work while Cook Mode is open and your screen is on. If the screen locks or the app is closed, the ding and vibration may not fire.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#333333" }}>
                Step {instructionsLines.length ? cookStepIndex + 1 : 0} of {instructionsLines.length}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCookIngredients((prev) => !prev)}
                  className="rounded-full border border-gray-400 px-3 py-1 text-[11px] font-medium"
                  style={{ color: "#333333" }}
                >
                  {showCookIngredients ? "Hide ingredients" : "Peek ingredients"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllSteps((prev) => !prev)}
                  className="rounded-full border border-gray-400 px-3 py-1 text-[11px] font-medium"
                  style={{ color: "#333333" }}
                >
                  {showAllSteps ? "Hide all steps" : "View all steps"}
                </button>
              </div>
            </div>

            {showCookIngredients && (
              <div className="space-y-2 rounded-2xl border border-gray-200 bg-white/70 px-3 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#333333" }}>
                  Ingredients
                </h3>
                {displayIngredientsList.length > 0 ? (
                  <ul className="mt-1 space-y-1.5 text-sm" style={{ color: "#333333" }}>
                    {displayIngredientsList.map((row, index) => {
                      const scaledAmount = row.amount * servingMultiplier;
                      const amountStr =
                        row.amount === 0 && !row.unit.trim()
                          ? ""
                          : formatScaledAmount(scaledAmount);
                      const line =
                        row.amount === 0 && !row.unit.trim()
                          ? row.name.trim()
                          : [amountStr, row.unit, row.name]
                              .filter(Boolean)
                              .join(" ")
                              .trim() || "";
                      return (
                        <li key={`${row.name}-${index}`} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-500" />
                          <span>{line}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs" style={{ color: "#333333" }}>
                    No structured ingredients available.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#333333" }}>
                Instructions
              </h2>
              {currentCookLine ? (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <span className="mt-1 text-base font-semibold" style={{ color: "#333333" }}>
                      {cookStepIndex + 1}.
                    </span>
                    <div className="flex flex-wrap items-baseline gap-1 text-2xl font-semibold leading-relaxed" style={{ color: "#333333" }}>
                      {instructionSegments(currentCookLine).map((seg, i) =>
                        seg.type === "text" ? (
                          <span key={i}>{seg.value}</span>
                        ) : (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              cookModeTimerRef.current?.setTimer(seg.seconds);
                            }}
                            className="rounded bg-gray-200 px-1.5 py-0.5 text-lg font-semibold underline decoration-gray-500 underline-offset-2 hover:bg-gray-300"
                          >
                            {seg.value}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {nextCookLine && (
                    <div className="ml-7 flex gap-2 text-sm text-gray-600">
                      <span className="mt-0.5">Next:</span>
                      <span className="flex flex-wrap gap-1 opacity-80">
                        {instructionSegments(nextCookLine).map((seg, i) =>
                          seg.type === "text" ? (
                            <span key={i}>{seg.value}</span>
                          ) : (
                            <span key={i}>{seg.value}</span>
                          ),
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm" style={{ color: "#333333" }}>
                  No instructions yet.
                </p>
              )}
            </div>

            {showAllSteps && instructionsLines.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-gray-200 bg-white/70 px-3 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#333333" }}>
                  All steps
                </h3>
                <ol className="mt-1 max-h-56 space-y-2 overflow-y-auto pr-1 text-sm" style={{ color: "#333333" }}>
                  {instructionsLines.map((line, index) => (
                    <li key={`${line}-${index}`} className="flex gap-2">
                      <span className="mt-0.5 text-xs font-semibold">{index + 1}.</span>
                      <span className="flex-1 leading-snug opacity-90">
                        {line}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          <div className="sticky bottom-0 border-t border-gray-200 px-4 py-3 space-y-2" style={{ backgroundColor: "rgba(249, 247, 242, 0.95)" }}>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setCookStepIndex((prev) => (prev > 0 ? prev - 1 : prev))
                }
                disabled={cookStepIndex === 0}
                className="flex-1 rounded-full border border-gray-400 px-4 py-2 text-sm font-medium text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  setCookStepIndex((prev) =>
                    prev < Math.max(instructionsLines.length - 1, 0)
                      ? prev + 1
                      : prev,
                  )
                }
                disabled={
                  !instructionsLines.length ||
                  cookStepIndex >= instructionsLines.length - 1
                }
                className="flex-1 rounded-full bg-sage-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-sage-400"
              >
                Next
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsCookMode(false)}
              className="block w-full rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-md"
              style={{ backgroundColor: "#333333" }}
            >
              Exit Cook Mode
            </button>
          </div>
          </div>
        </div>
      )}
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
                  {parsedTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-cream-100 px-2.5 py-1 text-brown-700"
                    >
                      {tag}
                    </span>
                  ))}
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

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-brown-700">
                Rating
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => {
                  const starValue = index + 1;
                  const display =
                    myStars > 0
                      ? myStars
                      : Math.round(averageStars || 0);
                  const filled = starValue <= display;
                  const clickable = !!user;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={
                        clickable ? () => handleRate(starValue) : undefined
                      }
                      className={
                        clickable
                          ? "h-5 w-5 text-yellow-400 hover:scale-110 transition-transform"
                          : "h-5 w-5 text-yellow-300"
                      }
                      aria-label={
                        clickable
                          ? `Rate ${starValue} star${starValue === 1 ? "" : "s"}`
                          : undefined
                      }
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill={filled ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.75.75 0 0 1 1.04 0l2.262 2.26 3.185.463a.75.75 0 0 1 .416 1.279l-2.305 2.247.544 3.173a.75.75 0 0 1-1.088.791L12 13.977l-2.834 1.49a.75.75 0 0 1-1.088-.79l.544-3.174-2.305-2.247a.75.75 0 0 1 .416-1.279l3.185-.463 2.262-2.26Z"
                        />
                      </svg>
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-brown-500">
                {ratings.length
                  ? `${averageStars.toFixed(1)} · ${ratings.length} rating${
                      ratings.length === 1 ? "" : "s"
                    }`
                  : "No ratings yet"}
                {!user && " · Log in to rate"}
              </span>
            </div>

            {recipe.imageUrl ? (
              <div className="mt-5 flex justify-center">
                <img
                  src={getRecipeImageSrc(recipe.imageUrl)}
                  alt={`${recipe.title} photo`}
                  className="max-h-[500px] w-auto max-w-full object-contain object-center"
                  style={{ objectPosition: getImagePositionStyle(recipe.imagePosition) }}
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
                    <div className="flex flex-col items-start gap-2">
                      <div className="aspect-[2/3] h-24 w-20 overflow-hidden rounded-xl border border-brown-200 bg-white sm:h-28 sm:w-24">
                        <img
                          src={
                            imagePreviewUrl
                              ? imagePreviewUrl
                              : getRecipeImageSrc(recipe.imageUrl ?? "")
                          }
                          alt="Recipe photo preview"
                          className="h-full w-full object-contain object-center"
                          style={{ objectPosition: getImagePositionStyle(imagePosition) }}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-brown-700">Preview focus</span>
                        <div className="flex gap-1">
                          {IMAGE_POSITION_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setImagePosition(opt.value)}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                imagePosition === opt.value
                                  ? "border-sage-500 bg-sage-100 text-sage-700"
                                  : "border-brown-200 bg-white text-brown-600 hover:bg-brown-50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-brown-500">
                        Preview matches how it will look on the recipe.
                      </p>
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
                placeholder="Each line is a step. Numbers are added for you."
              />
              <p className="text-xs text-brown-500">
                Put one step per line and skip typing 1., 2., 3.—we&apos;ll add
                the step numbers on the recipe page.
              </p>
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


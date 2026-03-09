'use client';

import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, error } = db.useAuth();
  const [sentEmail, setSentEmail] = React.useState("");

  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace("/");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-brown-500">Checking your session…</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 rounded-2xl border border-sand bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-brown-900">
          Log in to Kitchen Link
        </h1>
        <p className="text-sm text-brown-600">
          Use a one-time 6-digit code sent to your email. No passwords, no
          friction.
        </p>
        {error && (
          <p className="text-xs text-red-600">
            Auth error: {error.message ?? "Something went wrong"}
          </p>
        )}
      </div>

      {!sentEmail ? (
        <EmailStep onSendEmail={setSentEmail} />
      ) : (
        <CodeStep sentEmail={sentEmail} />
      )}
    </div>
  );
}

function EmailStep({ onSendEmail }: { onSendEmail: (email: string) => void }) {
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const email = inputEl.value.trim();
    if (!email) return;

    setIsSending(true);
    setError(null);
    onSendEmail(email);

    try {
      await db.auth.sendMagicCode({ email });
    } catch (err: unknown) {
      const message =
        (err as { body?: { message?: string } })?.body?.message ??
        "Failed to send code. Please try again.";
      setError(message);
      onSendEmail("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-brown-700"
        >
          Email
        </label>
        <input
          ref={inputRef}
          id="email"
          type="email"
          required
          autoFocus
          className="block w-full rounded-lg border border-sand px-3 py-2 text-sm shadow-sm outline-none placeholder:text-brown-500 focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
          placeholder="you@example.com"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSending}
        className="flex w-full items-center justify-center rounded-full bg-sage-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-400"
      >
        {isSending ? "Sending code…" : "Send magic code"}
      </button>
      <p className="text-xs text-brown-500">
        We&apos;ll also create an account if you don&apos;t have one yet.
      </p>
    </form>
  );
}

function CodeStep({ sentEmail }: { sentEmail: string }) {
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const inputEl = inputRef.current;
    if (!inputEl) return;
    const code = inputEl.value.trim();
    if (!code) return;

    setIsVerifying(true);
    setError(null);
    try {
      await db.auth.signInWithMagicCode({ email: sentEmail, code });
    } catch (err: unknown) {
      const message =
        (err as { body?: { message?: string } })?.body?.message ??
        "Invalid code. Please try again.";
      setError(message);
      inputEl.value = "";
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label
          htmlFor="code"
          className="block text-sm font-medium text-brown-700"
        >
          Enter your 6-digit code
        </label>
        <p className="text-xs text-brown-500">
          We sent an email to <span className="font-medium">{sentEmail}</span>.
          Check your inbox and paste the code here.
        </p>
        <input
          ref={inputRef}
          id="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          autoFocus
          className="mt-1 block w-full rounded-lg border border-sand px-3 py-2 text-sm tracking-[0.4em] shadow-sm outline-none placeholder:text-brown-500 focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
          placeholder="123456"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isVerifying}
        className="flex w-full items-center justify-center rounded-full bg-sage-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:bg-sage-400"
      >
        {isVerifying ? "Verifying…" : "Verify code & log in"}
      </button>
    </form>
  );
}


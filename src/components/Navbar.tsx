'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { db } from "@/lib/db";

export function Navbar() {
  const { user, isLoading } = db.useAuth();
  const pathname = usePathname();

  const navLinkClasses = (href: string) => {
    const isActive = pathname === href;
    return [
      "rounded-full px-3 py-1 text-sm font-medium transition-colors",
      isActive
        ? "bg-sage-600 text-white"
        : "text-brown-700 hover:bg-sage-100",
    ].join(" ");
  };

  return (
    <header className="border-b border-sand bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded-md bg-sage-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-sage-700">
            Kitchen
          </span>
          <span className="text-lg font-semibold text-brown-900">Link</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link href="/" className={navLinkClasses("/")}>
            Community
          </Link>
          <Link href="/search" className={navLinkClasses("/search")}>
            Search
          </Link>
          {user && (
            <Link
              href="/recipes/new"
              className="hidden rounded-full bg-sage-600 px-3 py-1 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sage-700 sm:inline-flex"
            >
              Post a Recipe
            </Link>
          )}

          {!isLoading &&
            (user ? (
              <button
                type="button"
                onClick={() => db.auth.signOut()}
                className="rounded-full border border-sand px-3 py-1 text-sm font-medium text-brown-700 transition-colors hover:bg-cream-100"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-sand px-3 py-1 text-sm font-medium text-brown-700 transition-colors hover:bg-cream-100"
              >
                Log in
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}


import Link from "next/link";

type RecipeCardProps = {
  id: string;
  title: string;
  vibe: string;
  setup: string;
  imageUrl?: string | null;
  instructions: string;
  createdAt?: Date | string | null;
  canDelete?: boolean;
  onDelete?: () => void;
};

function formatDate(value: RecipeCardProps["createdAt"]) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string, maxLength = 140) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function RecipeCard({
  id,
  title,
  vibe,
  setup,
  imageUrl,
  instructions,
  createdAt,
  canDelete,
  onDelete,
}: RecipeCardProps) {
  return (
    <Link
      href={`/recipes/${id}`}
      className="group flex flex-col justify-between overflow-hidden rounded-xl border border-sand bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sage-400 hover:shadow-md"
    >
      {imageUrl ? (
        <div className="h-32 w-full bg-cream-100">
          <img
            src={imageUrl}
            alt={`${title} photo`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-brown-900 group-hover:text-sage-700">
            {title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="rounded-full bg-sage-100 px-2 py-0.5 text-sage-700">
              {vibe}
            </span>
            <span className="rounded-full bg-cream-100 px-2 py-0.5 text-brown-600">
              {setup}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {createdAt && (
            <span className="shrink-0 text-xs text-brown-500">
              {formatDate(createdAt)}
            </span>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const confirmed = window.confirm(
                  "Delete this recipe? This will also remove its Kitchen Notes, favorites, and shopping list entries.",
                );
                if (!confirmed) return;
                onDelete();
              }}
              className="shrink-0 rounded-full p-1 text-brown-400 hover:bg-red-50 hover:text-red-600"
              title="Delete recipe"
              aria-label="Delete recipe"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 4h6m-7 4h8m-7 0v8m6-8v8M5 8h14l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8Zm3-4h8a2 2 0 0 1 2 2v0H6v0a2 2 0 0 1 2-2Z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="px-4 pb-3 line-clamp-3 text-sm text-brown-600">
        {truncate(instructions)}
      </p>
      <span className="px-4 pb-4 inline-flex text-xs font-medium text-sage-700">
        Open recipe →
      </span>
    </Link>
  );
}


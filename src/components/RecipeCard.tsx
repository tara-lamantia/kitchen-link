import Link from "next/link";

type RecipeCardProps = {
  id: string;
  title: string;
  vibe: string;
  setup: string;
  imageUrl?: string | null;
  instructions: string;
  createdAt?: Date | string | null;
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
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-sage-100 px-2 py-0.5 text-sage-700">
              {vibe}
            </span>
            <span className="rounded-full bg-cream-100 px-2 py-0.5 text-brown-600">
              {setup}
            </span>
          </div>
        </div>
        {createdAt && (
          <span className="shrink-0 text-xs text-brown-500">
            {formatDate(createdAt)}
          </span>
        )}
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


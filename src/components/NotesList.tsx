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

type NotesListProps = {
  notes: Note[];
};

function formatDate(value: Note["createdAt"]) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotesList({ notes }: NotesListProps) {
  if (!notes.length) {
    return (
      <p className="text-sm text-brown-500">
        No Kitchen Notes yet. Be the first to leave a tip from your kitchen.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notes.map((note) => (
        <li
          key={note.id}
          className="rounded-lg border border-sand bg-cream-100 px-3 py-2"
        >
          <p className="text-sm text-brown-800">{note.text}</p>
          <div className="mt-1 flex items-center justify-between text-xs text-brown-500">
            <span>{note.author?.email ?? "Someone in the kitchen"}</span>
            {note.createdAt && <span>{formatDate(note.createdAt)}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}


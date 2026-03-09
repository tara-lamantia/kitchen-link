import * as React from "react";

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
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  onEditNote?: (noteId: string, newText: string) => void | Promise<void>;
  onDeleteNote?: (noteId: string) => void | Promise<void>;
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

export function NotesList({
  notes,
  currentUserId,
  currentUserEmail,
  onEditNote,
  onDeleteNote,
}: NotesListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const startEditing = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim() || !onEditNote) return;
    setIsSaving(true);
    try {
      await onEditNote(editingId, editText.trim());
      setEditingId(null);
      setEditText("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!onDeleteNote) return;
    const confirmed = window.confirm("Delete this note?");
    if (!confirmed) return;
    setIsDeleting(noteId);
    try {
      await onDeleteNote(noteId);
    } finally {
      setIsDeleting(null);
    }
  };

  const canEditOrDelete = (note: Note) => {
    if (!note.author) return false;
    const authorId = note.author.id;
    const authorEmail = note.author.email;
    if (currentUserId != null && authorId != null && String(authorId) === String(currentUserId)) return true;
    if (currentUserEmail && authorEmail && authorEmail === currentUserEmail) return true;
    return false;
  };

  if (!notes.length) {
    return (
      <p className="text-sm text-brown-500">
        No Kitchen Notes yet. Be the first to leave a tip from your kitchen.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notes.map((note) => {
        const isEditing = editingId === note.id;
        const isOwner = canEditOrDelete(note);

        return (
          <li
            key={note.id}
            className="rounded-lg border border-sand bg-cream-100 px-3 py-2"
          >
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="block w-full rounded-lg border border-brown-300 px-3 py-2 text-sm outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="rounded-full bg-sage-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sage-700 disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="rounded-full border border-brown-200 px-3 py-1 text-xs font-medium text-brown-700 hover:bg-brown-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm text-brown-800">{note.text}</p>
                  {isOwner && onEditNote && onDeleteNote && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(note)}
                        className="rounded-full border border-sage-500 bg-sage-100 px-3 py-1.5 text-xs font-semibold text-sage-700 shadow-sm hover:bg-sage-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        disabled={isDeleting === note.id}
                        className="rounded-full border border-red-300 bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-200 disabled:opacity-50"
                      >
                        {isDeleting === note.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-brown-500">
                  <span>{note.author?.email ?? "Someone in the kitchen"}</span>
                  {note.createdAt && <span>{formatDate(note.createdAt)}</span>}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

import type { InstantRules } from "@instantdb/react";

const rules = {
  recipes: {
    allow: {
      view: "true",
      create: "isAuthed",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: {
      isAuthed: "auth.id != null",
      isOwner: "auth.id != null && auth.id in data.ref('author.id')",
    },
  },
  notes: {
    allow: {
      view: "true",
      create: "isAuthed",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: {
      isAuthed: "auth.id != null",
      isOwner: "auth.id != null && auth.id in data.ref('author.id')",
    },
  },
} satisfies InstantRules;

export default rules;


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
  favorites: {
    allow: {
      view: "true",
      create: "isAuthed",
      delete: "isOwner",
    },
    bind: {
      isAuthed: "auth.id != null",
      isOwner: "auth.id != null && auth.id in data.ref('user.id')",
    },
  },
  cooked: {
    allow: {
      view: "true",
      create: "isAuthed",
      delete: "isOwner",
    },
    bind: {
      isAuthed: "auth.id != null",
      isOwner: "auth.id != null && auth.id in data.ref('user.id')",
    },
  },
} satisfies InstantRules;

export default rules;

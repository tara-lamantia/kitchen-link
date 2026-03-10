import type { InstantRules } from "@instantdb/react";

const rules = {
  recipes: {
    allow: {
      view: "true",
      create: "isAuthed",
      update: "isOwner || isAdmin",
      delete: "isOwner || isAdmin",
    },
    bind: {
      isAuthed: "auth.id != null",
      isOwner: "auth.id != null && auth.id in data.ref('author.id')",
      isAdmin: "auth.email == 'tarajadelamantia@icloud.com'",
    },
  },
  notes: {
    allow: {
      view: "true",
      create: "isAuthed",
      update: "isOwner || isAdmin",
      delete: "isOwner || isAdmin",
    },
    bind: {
      isAuthed: "auth.id != null",
      isOwner: "auth.id != null && auth.id in data.ref('author.id')",
      isAdmin: "auth.email == 'tarajadelamantia@icloud.com'",
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
  shopping_list: {
    allow: {
      view: "isOwner",
      create: "isAuthed",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: {
      isAuthed: "auth.id != null",
      isOwner: "auth.id != null && auth.id in data.ref('user.id')",
    },
  },
  $users: {
    allow: {
      view: "isOwner",
      update: "isOwner",
    },
    bind: {
      isOwner: "auth.id != null && auth.id == data.id",
    },
  },
} satisfies InstantRules;

export default rules;

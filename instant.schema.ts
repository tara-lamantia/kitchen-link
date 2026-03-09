import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    recipes: i.entity({
      title: i.string(),
      vibe: i.string(),
      setup: i.string(),
      ingredients: i.string(),
      instructions: i.string(),
      createdAt: i.date(),
    }),
    notes: i.entity({
      text: i.string(),
      createdAt: i.date(),
    }),
  },
  links: {
    recipeAuthor: {
      forward: {
        on: "recipes",
        has: "one",
        label: "author",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "recipes",
      },
    },
    noteRecipe: {
      forward: {
        on: "notes",
        has: "one",
        label: "recipe",
        onDelete: "cascade",
      },
      reverse: {
        on: "recipes",
        has: "many",
        label: "notes",
      },
    },
    noteAuthor: {
      forward: {
        on: "notes",
        has: "one",
        label: "author",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "notes",
      },
    },
  },
});

export type AppSchema = typeof _schema;

export default _schema;


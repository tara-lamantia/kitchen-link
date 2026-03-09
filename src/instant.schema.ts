import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().optional(),
    }),
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
    favorites: i.entity({}),
    cooked: i.entity({}),
    shopping_list: i.entity({
      ingredientsOverride: i.string().optional(),
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
    favoriteRecipe: {
      forward: {
        on: "favorites",
        has: "one",
        label: "recipe",
        onDelete: "cascade",
      },
      reverse: {
        on: "recipes",
        has: "many",
        label: "favorites",
      },
    },
    favoriteUser: {
      forward: {
        on: "favorites",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "favorites",
      },
    },
    cookedRecipe: {
      forward: {
        on: "cooked",
        has: "one",
        label: "recipe",
        onDelete: "cascade",
      },
      reverse: {
        on: "recipes",
        has: "many",
        label: "cooked",
      },
    },
    cookedUser: {
      forward: {
        on: "cooked",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "cooked",
      },
    },
    shoppingListRecipe: {
      forward: {
        on: "shopping_list",
        has: "one",
        label: "recipe",
        onDelete: "cascade",
      },
      reverse: {
        on: "recipes",
        has: "many",
        label: "shopping_list",
      },
    },
    shoppingListUser: {
      forward: {
        on: "shopping_list",
        has: "one",
        label: "user",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "shopping_list",
      },
    },
  },
});

export type AppSchema = typeof _schema;

export default _schema;

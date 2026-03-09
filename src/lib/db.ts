import { init } from "@instantdb/react";
import schema from "../instant.schema";

const APP_ID = "dd151d25-aee3-43df-bb32-0c0d6d4456c7";

export const db = init({
  appId: APP_ID,
  schema,
});


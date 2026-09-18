import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Used by the Prisma CLI only (db:push, db:studio). The runtime client reads
// DATABASE_URL from each app's own environment, so swapping this file's .env
// to the production branch for a push never affects a running dev server.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});

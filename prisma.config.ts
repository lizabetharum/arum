// The moment a prisma.config.ts exists, the CLI stops loading .env by itself —
// without this import, DATABASE_URL is unset and every db: script fails.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/qual_das_tres",
  },
});

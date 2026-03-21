import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import * as trpcExpress from "@trpc/server/adapters/express";
import { router } from "./trpc.js";
import { createContext } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { gameRouter } from "./routers/game.js";
import { leaderboardRouter } from "./routers/leaderboard.js";
import { userRouter } from "./routers/user.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appRouter = router({
  auth: authRouter,
  game: gameRouter,
  leaderboard: leaderboardRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? false : "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// tRPC
app.use(
  "/api/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

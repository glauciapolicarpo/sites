import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  mysqlEnum,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  email: varchar("email", { length: 100 }).unique().notNull(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  avatar_url: varchar("avatar_url", { length: 500 }),
  total_score: int("total_score").default(0).notNull(),
  games_played: int("games_played").default(0).notNull(),
  best_streak: int("best_streak").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const countries = mysqlTable("countries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 3 }).unique().notNull(),
  flag_emoji: varchar("flag_emoji", { length: 10 }),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const clues = mysqlTable("clues", {
  id: serial("id").primaryKey(),
  country_id: int("country_id").notNull(),
  category: mysqlEnum("category", [
    "geografia",
    "cultura",
    "gastronomia",
    "historia",
    "curiosidade",
    "esporte",
    "musica",
    "economia",
  ]).notNull(),
  clue_text: text("clue_text").notNull(),
  difficulty: mysqlEnum("difficulty", ["facil", "medio", "dificil"]).notNull(),
  points_value: int("points_value").default(10).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const gameSessions = mysqlTable("game_sessions", {
  id: serial("id").primaryKey(),
  user_id: int("user_id"),
  status: mysqlEnum("status", ["in_progress", "completed", "abandoned"])
    .default("in_progress")
    .notNull(),
  current_round: int("current_round").default(1).notNull(),
  total_rounds: int("total_rounds").default(10).notNull(),
  score: int("score").default(0).notNull(),
  streak: int("streak").default(0).notNull(),
  best_streak: int("best_streak").default(0).notNull(),
  started_at: timestamp("started_at").defaultNow().notNull(),
  finished_at: timestamp("finished_at"),
});

export const gameRounds = mysqlTable("game_rounds", {
  id: serial("id").primaryKey(),
  session_id: int("session_id").notNull(),
  round_number: int("round_number").notNull(),
  clue_id: int("clue_id").notNull(),
  option_countries: json("option_countries").notNull(),
  correct_country_id: int("correct_country_id").notNull(),
  selected_country_id: int("selected_country_id"),
  is_correct: boolean("is_correct"),
  points_earned: int("points_earned").default(0).notNull(),
  time_taken_ms: int("time_taken_ms"),
  answered_at: timestamp("answered_at"),
});

export const leaderboard = mysqlTable("leaderboard", {
  id: serial("id").primaryKey(),
  user_id: int("user_id").notNull(),
  score: int("score").notNull(),
  rounds_played: int("rounds_played").notNull(),
  correct_answers: int("correct_answers").notNull(),
  best_streak: int("best_streak").default(0).notNull(),
  played_at: timestamp("played_at").defaultNow().notNull(),
});

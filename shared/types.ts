export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  total_score: number;
  games_played: number;
  best_streak: number;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: number;
  username: string;
  avatar_url: string | null;
  total_score: number;
  games_played: number;
  best_streak: number;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  flag_emoji: string | null;
  description: string | null;
}

export interface Clue {
  id: number;
  country_id: number;
  category: ClueCategory;
  clue_text: string;
  difficulty: Difficulty;
  points_value: number;
}

export type ClueCategory =
  | "geografia"
  | "cultura"
  | "gastronomia"
  | "historia"
  | "curiosidade"
  | "esporte"
  | "musica"
  | "economia";

export type Difficulty = "facil" | "medio" | "dificil";

export type GameStatus = "in_progress" | "completed" | "abandoned";

export interface GameSession {
  id: number;
  user_id: number | null;
  status: GameStatus;
  current_round: number;
  total_rounds: number;
  score: number;
  streak: number;
  best_streak: number;
  started_at: Date;
  finished_at: Date | null;
}

export interface GameRound {
  id: number;
  session_id: number;
  round_number: number;
  clue_id: number;
  option_countries: number[];
  correct_country_id: number;
  selected_country_id: number | null;
  is_correct: boolean | null;
  points_earned: number;
  time_taken_ms: number | null;
  answered_at: Date | null;
}

export interface RoundInfo {
  roundNumber: number;
  totalRounds: number;
  clueText: string;
  category: ClueCategory;
  difficulty: Difficulty;
  pointsValue: number;
  countries: CountryOption[];
  timeLimit: number;
}

export interface CountryOption {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
}

export interface AnswerResult {
  isCorrect: boolean;
  correctCountryId: number;
  pointsEarned: number;
  streak: number;
  totalScore: number;
  streakBonus: number;
}

export interface GameResult {
  sessionId: number;
  score: number;
  totalRounds: number;
  correctAnswers: number;
  bestStreak: number;
  rounds: RoundResult[];
  timeTaken: number;
}

export interface RoundResult {
  roundNumber: number;
  clueText: string;
  category: ClueCategory;
  correctCountry: string;
  selectedCountry: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  timeTakenMs: number | null;
}

export interface LeaderboardEntry {
  id: number;
  username: string;
  avatar_url: string | null;
  score: number;
  rounds_played: number;
  correct_answers: number;
  best_streak: number;
  played_at: Date;
}

export interface UserStats {
  total_score: number;
  games_played: number;
  best_streak: number;
  average_score: number;
  total_correct: number;
  recent_games: LeaderboardEntry[];
}

export const CATEGORY_LABELS: Record<ClueCategory, string> = {
  geografia: "Geografia",
  cultura: "Cultura",
  gastronomia: "Gastronomia",
  historia: "Historia",
  curiosidade: "Curiosidade",
  esporte: "Esporte",
  musica: "Musica",
  economia: "Economia",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facil: "Facil",
  medio: "Medio",
  dificil: "Dificil",
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  facil: "text-green-400",
  medio: "text-yellow-400",
  dificil: "text-red-400",
};

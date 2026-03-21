import { motion } from "framer-motion";
import { trpc } from "../lib/trpc.js";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { formatDate } from "../lib/utils.js";
import { Trophy, Medal, Flame } from "lucide-react";

export default function Leaderboard() {
  const { data: scores, isLoading } = trpc.leaderboard.getTopScores.useQuery(
    { limit: 20 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm text-text-secondary font-mono w-5 text-center">{index + 1}</span>;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-extrabold mb-2">
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Ranking
          </span>
        </h1>
        <p className="text-text-secondary">As melhores pontuacoes de todos os tempos</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-warning" />
              Top Jogadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!scores || scores.length === 0 ? (
              <p className="text-center text-text-secondary py-8">
                Nenhuma pontuacao registrada ainda. Seja o primeiro a jogar!
              </p>
            ) : (
              <div className="space-y-2">
                {scores.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      index < 3
                        ? "bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20"
                        : "bg-bg-input/30 border-border/50"
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {getMedalIcon(index)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-text-primary">{entry.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-secondary">
                          {entry.correct_answers}/{entry.rounds_played} acertos
                        </span>
                        {entry.best_streak > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <Flame className="w-3 h-3 mr-0.5" />
                            {entry.best_streak}x
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        {entry.score}
                      </p>
                      <p className="text-[10px] text-text-secondary">
                        {formatDate(entry.played_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "../lib/trpc.js";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { formatTime } from "../lib/utils.js";
import { Trophy, Target, Flame, Clock, RotateCcw, Home, Check, X } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  geografia: "Geografia",
  cultura: "Cultura",
  gastronomia: "Gastronomia",
  historia: "Historia",
  curiosidade: "Curiosidade",
  esporte: "Esporte",
  musica: "Musica",
  economia: "Economia",
};

export default function Results() {
  const [, params] = useRoute("/results/:sessionId");
  const sessionId = params?.sessionId ? parseInt(params.sessionId, 10) : 0;

  const { data: result, isLoading } = trpc.game.getSessionResult.useQuery(
    { sessionId },
    { enabled: sessionId > 0 }
  );

  if (isLoading || !result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const accuracy = Math.round((result.correctAnswers / result.totalRounds) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-extrabold mb-2">
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Fim de Jogo!
          </span>
        </h1>
        <p className="text-text-secondary">Confira seu desempenho</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-3xl font-bold">{result.score}</p>
            <p className="text-xs text-text-secondary">Pontos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-3xl font-bold">{accuracy}%</p>
            <p className="text-xs text-text-secondary">Precisao</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Flame className="w-8 h-8 text-error mx-auto mb-2" />
            <p className="text-3xl font-bold">{result.bestStreak}</p>
            <p className="text-xs text-text-secondary">Melhor Combo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 text-secondary mx-auto mb-2" />
            <p className="text-3xl font-bold">{formatTime(result.timeTaken)}</p>
            <p className="text-xs text-text-secondary">Tempo Total</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Round Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Detalhes por Rodada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.rounds.map((round, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-bg-input/50 border border-border/50"
                >
                  <div className="flex-shrink-0">
                    {round.isCorrect ? (
                      <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-success" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center">
                        <X className="w-4 h-4 text-error" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {round.clueText}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {CATEGORY_LABELS[round.category] || round.category}
                      </Badge>
                      <span className="text-xs text-text-secondary">
                        Resposta: {round.correctCountry}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold">
                      {round.pointsEarned > 0 ? (
                        <span className="text-success">+{round.pointsEarned}</span>
                      ) : (
                        <span className="text-text-secondary">0</span>
                      )}
                    </p>
                    {round.timeTakenMs && (
                      <p className="text-xs text-text-secondary">
                        {(round.timeTakenMs / 1000).toFixed(1)}s
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex justify-center gap-4 mt-8"
      >
        <Link href="/game">
          <Button size="lg">
            <RotateCcw className="w-4 h-4 mr-2" />
            Jogar Novamente
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="lg">
            <Home className="w-4 h-4 mr-2" />
            Inicio
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}

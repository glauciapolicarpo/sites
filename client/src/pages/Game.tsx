import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "../lib/trpc.js";
import { useAuth } from "../hooks/useAuth.js";
import CountryCard from "../components/CountryCard.js";
import Timer from "../components/Timer.js";
import ScoreDisplay from "../components/ScoreDisplay.js";
import StreakIndicator from "../components/StreakIndicator.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent } from "../components/ui/card.js";
import { Progress } from "../components/ui/progress.js";
import { Loader2 } from "lucide-react";

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

const DIFFICULTY_VARIANTS: Record<string, "success" | "warning" | "error"> = {
  facil: "success",
  medio: "warning",
  dificil: "error",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  facil: "Facil",
  medio: "Medio",
  dificil: "Dificil",
};

export default function Game() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctCountryId: number;
    pointsEarned: number;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastPoints, setLastPoints] = useState<number | undefined>(undefined);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  const startGameMutation = trpc.game.startGame.useMutation();
  const submitAnswerMutation = trpc.game.submitAnswer.useMutation();

  const roundQuery = trpc.game.getRound.useQuery(
    { sessionId: sessionId!, roundNumber: currentRound },
    { enabled: sessionId !== null }
  );

  // Start game on mount
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    startGameMutation.mutate(undefined, {
      onSuccess: (data) => {
        setSessionId(data.sessionId);
        setCurrentRound(1);
        setScore(0);
        setStreak(0);
        setTimerRunning(true);
        startTimeRef.current = Date.now();
      },
    });
  }, [isAuthenticated, authLoading]);

  // Reset timer when round changes
  useEffect(() => {
    if (roundQuery.data && !roundQuery.data.alreadyAnswered) {
      setTimerRunning(true);
      setTimerKey((k) => k + 1);
      startTimeRef.current = Date.now();
      setSelectedCountryId(null);
      setAnswerResult(null);
    }
  }, [roundQuery.data?.roundNumber]);

  const handleTimeout = useCallback(() => {
    if (!sessionId || answerResult) return;
    setTimerRunning(false);
    // Auto-submit with no selection (use first country as dummy, will be wrong)
    const timeTaken = Date.now() - startTimeRef.current;
    const round = roundQuery.data;
    if (!round) return;

    // Submit with an intentionally wrong answer (or first option)
    const wrongId = round.countries.find(
      (c) => c.id !== selectedCountryId
    )?.id || round.countries[0].id;

    submitAnswerMutation.mutate(
      {
        sessionId,
        roundNumber: currentRound,
        selectedCountryId: selectedCountryId ?? wrongId,
        timeTakenMs: timeTaken,
      },
      {
        onSuccess: (result) => {
          setAnswerResult({
            isCorrect: result.isCorrect,
            correctCountryId: result.correctCountryId,
            pointsEarned: result.pointsEarned,
          });
          setScore(result.totalScore);
          setStreak(result.streak);
          if (result.pointsEarned > 0) setLastPoints(result.pointsEarned);

          if (result.isGameOver) {
            setTimeout(() => {
              setLocation(`/results/${sessionId}`);
            }, 2000);
          }
        },
      }
    );
  }, [sessionId, currentRound, selectedCountryId, answerResult]);

  const handleSelectCountry = (countryId: number) => {
    if (answerResult || !sessionId || !timerRunning) return;
    setSelectedCountryId(countryId);
    setTimerRunning(false);

    const timeTaken = Date.now() - startTimeRef.current;

    submitAnswerMutation.mutate(
      {
        sessionId,
        roundNumber: currentRound,
        selectedCountryId: countryId,
        timeTakenMs: timeTaken,
      },
      {
        onSuccess: (result) => {
          setAnswerResult({
            isCorrect: result.isCorrect,
            correctCountryId: result.correctCountryId,
            pointsEarned: result.pointsEarned,
          });
          setScore(result.totalScore);
          setStreak(result.streak);
          if (result.pointsEarned > 0) setLastPoints(result.pointsEarned);

          if (result.isGameOver) {
            setTimeout(() => {
              setLocation(`/results/${sessionId}`);
            }, 2000);
          }
        },
      }
    );
  };

  const handleNextRound = () => {
    setCurrentRound((r) => r + 1);
    setSelectedCountryId(null);
    setAnswerResult(null);
    setLastPoints(undefined);
  };

  if (authLoading || startGameMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-text-secondary">Preparando o jogo...</p>
        </div>
      </div>
    );
  }

  if (startGameMutation.error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <p className="text-error mb-4">Erro ao iniciar o jogo</p>
            <p className="text-text-secondary text-sm mb-4">
              {startGameMutation.error.message}
            </p>
            <Button onClick={() => setLocation("/")}>Voltar ao inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const round = roundQuery.data;

  if (!round || roundQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top bar: round, score, streak */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary font-medium">
            Rodada {currentRound}/{round.totalRounds}
          </span>
          <Progress value={(currentRound / round.totalRounds) * 100} className="w-24" />
        </div>
        <div className="flex items-center gap-3">
          <StreakIndicator streak={streak} />
          <ScoreDisplay score={score} lastPoints={lastPoints} />
        </div>
      </div>

      {/* Timer */}
      <div className="mb-6">
        <Timer
          key={timerKey}
          duration={30}
          isRunning={timerRunning}
          onTimeout={handleTimeout}
        />
      </div>

      {/* Clue Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRound}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Badge>{CATEGORY_LABELS[round.category] || round.category}</Badge>
                <Badge variant={DIFFICULTY_VARIANTS[round.difficulty] || "secondary"}>
                  {DIFFICULTY_LABELS[round.difficulty] || round.difficulty}
                </Badge>
                <Badge variant="outline">{round.pointsValue} pts</Badge>
              </div>
              <p className="text-xl md:text-2xl font-medium text-text-primary leading-relaxed">
                "{round.clueText}"
              </p>
            </CardContent>
          </Card>

          {/* Country Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {round.countries.map((country) => {
              let correct: boolean | null = null;
              if (answerResult) {
                correct = country.id === answerResult.correctCountryId;
              }

              return (
                <CountryCard
                  key={country.id}
                  id={country.id}
                  name={country.name}
                  code={country.code}
                  flagEmoji={country.flag_emoji}
                  selected={selectedCountryId === country.id}
                  correct={correct}
                  disabled={!!answerResult || submitAnswerMutation.isPending}
                  onClick={() => handleSelectCountry(country.id)}
                />
              );
            })}
          </div>

          {/* Result feedback and next button */}
          <AnimatePresence>
            {answerResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                {answerResult.isCorrect ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="mb-4"
                  >
                    <p className="text-2xl font-bold text-success mb-1">
                      Correto! +{answerResult.pointsEarned} pts
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="mb-4"
                  >
                    <p className="text-2xl font-bold text-error">
                      Errado!
                    </p>
                  </motion.div>
                )}

                {currentRound < round.totalRounds && (
                  <Button onClick={handleNextRound} size="lg">
                    Proxima Rodada
                  </Button>
                )}
                {currentRound >= round.totalRounds && (
                  <p className="text-text-secondary animate-pulse">
                    Carregando resultados...
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

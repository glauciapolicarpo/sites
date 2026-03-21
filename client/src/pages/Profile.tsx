import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "../lib/trpc.js";
import { useAuth } from "../hooks/useAuth.js";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Badge } from "../components/ui/badge.js";
import { formatDate } from "../lib/utils.js";
import { Trophy, Target, Flame, Gamepad2, Star, Save, Loader2 } from "lucide-react";

export default function Profile() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");

  const { data: stats, isLoading: statsLoading } = trpc.leaderboard.getUserStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      utils.leaderboard.getUserStats.invalidate();
      setEditing(false);
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* User Info Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="max-w-[200px]"
                      placeholder="Novo username"
                    />
                    <Button
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({ username })
                      }
                      disabled={updateMutation.isPending}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold">{user.username}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 text-xs"
                      onClick={() => {
                        setUsername(user.username);
                        setEditing(true);
                      }}
                    >
                      Editar perfil
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {updateMutation.error && (
              <div className="mt-4 bg-error/10 border border-error/30 rounded-xl p-3 text-sm text-error">
                {updateMutation.error.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Star className="w-6 h-6 text-warning mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.total_score}</p>
                  <p className="text-xs text-text-secondary">Pontos Totais</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Gamepad2 className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.games_played}</p>
                  <p className="text-xs text-text-secondary">Jogos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Trophy className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.average_score}</p>
                  <p className="text-xs text-text-secondary">Media</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Flame className="w-6 h-6 text-error mx-auto mb-2" />
                  <p className="text-2xl font-bold">{stats.best_streak}</p>
                  <p className="text-xs text-text-secondary">Melhor Combo</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Games */}
            <Card>
              <CardHeader>
                <CardTitle>Jogos Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recent_games.length === 0 ? (
                  <p className="text-center text-text-secondary py-6">
                    Voce ainda nao jogou nenhuma partida.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stats.recent_games.map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-bg-input/30 border border-border/50"
                      >
                        <div>
                          <p className="font-semibold">{game.score} pontos</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Target className="w-3 h-3 mr-0.5" />
                              {game.correct_answers}/{game.rounds_played}
                            </Badge>
                            {game.best_streak > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                <Flame className="w-3 h-3 mr-0.5" />
                                {game.best_streak}x
                              </Badge>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-text-secondary">
                          {formatDate(game.played_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}

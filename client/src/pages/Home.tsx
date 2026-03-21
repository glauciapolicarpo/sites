import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent } from "../components/ui/card.js";
import { Gamepad2, Trophy, Users } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="mb-6">
          <span className="text-7xl">🇦🇷 🇨🇱 🇵🇪</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Qual das Tres?
          </span>
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-2">
          O jogo de trivia onde voce descobre qual pais se esconde por tras de cada pista!
        </p>
        <p className="text-lg text-text-secondary/70">
          Argentina, Chile ou Peru? Teste seus conhecimentos!
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center mb-12"
      >
        {isAuthenticated ? (
          <Button size="lg" onClick={() => setLocation("/game")} className="text-xl px-12 py-6 h-auto">
            <Gamepad2 className="w-6 h-6 mr-3" />
            Jogar
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-xl px-12 py-6 h-auto">
                <Gamepad2 className="w-6 h-6 mr-3" />
                Jogar
              </Button>
            </Link>
            <p className="text-sm text-text-secondary">
              Ja tem conta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Faca login
              </Link>
            </p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="pt-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">10 Rodadas</h3>
            <p className="text-sm text-text-secondary">
              Cada jogo tem 10 rodadas com pistas de diferentes categorias e dificuldades.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-secondary/50 transition-colors">
          <CardContent className="pt-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-7 h-7 text-secondary" />
            </div>
            <h3 className="text-lg font-bold mb-2">Sistema de Pontos</h3>
            <p className="text-sm text-text-secondary">
              Acerte consecutivamente para multiplicar seus pontos com o bonus de combo!
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardContent className="pt-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-lg font-bold mb-2">Ranking Global</h3>
            <p className="text-sm text-text-secondary">
              Compare suas pontuacoes com outros jogadores e conquiste o topo!
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

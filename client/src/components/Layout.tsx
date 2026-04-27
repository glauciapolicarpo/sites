import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "./ui/button.js";
import { LogOut, Trophy, User, Home, Wand2 } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <span className="text-xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent cursor-pointer">
              Qual das Tres?
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link href="/">
              <Button
                variant={location === "/" ? "secondary" : "ghost"}
                size="sm"
              >
                <Home className="w-4 h-4 mr-1.5" />
                Inicio
              </Button>
            </Link>

            <Link href="/leaderboard">
              <Button
                variant={location === "/leaderboard" ? "secondary" : "ghost"}
                size="sm"
              >
                <Trophy className="w-4 h-4 mr-1.5" />
                Ranking
              </Button>
            </Link>

            {isAuthenticated ? (
              <>
                <Link href="/admin/statements">
                  <Button
                    variant={location === "/admin/statements" ? "secondary" : "ghost"}
                    size="sm"
                  >
                    <Wand2 className="w-4 h-4 mr-1.5" />
                    Enunciados
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button
                    variant={location === "/profile" ? "secondary" : "ghost"}
                    size="sm"
                  >
                    <User className="w-4 h-4 mr-1.5" />
                    {user?.username}
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => logout()}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Entrar
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Cadastrar</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-6 text-center text-sm text-text-secondary">
        <p>Qual das Tres? - Jogo de Trivia sobre America do Sul</p>
      </footer>
    </div>
  );
}

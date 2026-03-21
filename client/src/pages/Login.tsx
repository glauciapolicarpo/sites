import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card.js";
import { Mail, Lock, LogIn } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginError, loginLoading } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      setLocation("/");
    } catch {
      // Error is handled by useAuth
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Entrar</CardTitle>
            <CardDescription>
              Faca login para jogar e acompanhar seu progresso
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {loginError && (
                <div className="bg-error/10 border border-error/30 rounded-xl p-3 text-sm text-error">
                  {loginError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
                  <Input
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loginLoading}>
                <LogIn className="w-4 h-4 mr-2" />
                {loginLoading ? "Entrando..." : "Entrar"}
              </Button>
              <p className="text-sm text-text-secondary">
                Nao tem conta?{" "}
                <Link href="/register" className="text-primary hover:underline">
                  Cadastre-se
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

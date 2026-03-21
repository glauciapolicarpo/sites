import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card.js";
import { Mail, Lock, User, UserPlus } from "lucide-react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { register, registerError, registerLoading } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ username, email, password });
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
            <CardTitle className="text-2xl">Criar Conta</CardTitle>
            <CardDescription>
              Cadastre-se para comecar a jogar
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {registerError && (
                <div className="bg-error/10 border border-error/30 rounded-xl p-3 text-sm text-error">
                  {registerError}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Nome de usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
                  <Input
                    type="text"
                    placeholder="Seu nome de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
              </div>
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
                    placeholder="Minimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={registerLoading}>
                <UserPlus className="w-4 h-4 mr-2" />
                {registerLoading ? "Criando conta..." : "Criar Conta"}
              </Button>
              <p className="text-sm text-text-secondary">
                Ja tem conta?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Faca login
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

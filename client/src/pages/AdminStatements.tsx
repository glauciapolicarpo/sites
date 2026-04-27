import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, CheckCircle, XCircle, Loader2, Wand2 } from "lucide-react";
import { trpc } from "../lib/trpc.js";
import { useAuth } from "../hooks/useAuth.js";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";

const COUNTRIES = [
  { id: 1, name: "Argentina", flag: "🇦🇷" },
  { id: 2, name: "Chile", flag: "🇨🇱" },
  { id: 3, name: "Peru", flag: "🇵🇪" },
];

export default function AdminStatements() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Single generation state
  const [answer, setAnswer] = useState("");
  const [context, setContext] = useState("");
  const [generatedText, setGeneratedText] = useState("");

  // Batch generation state
  const [batchCountryId, setBatchCountryId] = useState<number | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    processed: number;
    errors: number;
    results: Array<{ clueId: number; clueText: string; error?: string }>;
  } | null>(null);

  const generateMutation = trpc.statements.generateClueText.useMutation({
    onSuccess: (data) => setGeneratedText(data.clueText),
  });

  const batchMutation = trpc.statements.batchGenerateByCountry.useMutation({
    onSuccess: (data) => setBatchResult(data),
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center gap-3">
          <Wand2 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gerar Enunciados</h1>
            <p className="text-text-secondary text-sm mt-1">
              Use IA para criar enunciados para as dicas do jogo
            </p>
          </div>
        </div>

        {/* ── Single generation ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Gerar enunciado avulso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Resposta (nome do país)
              </label>
              <Input
                placeholder="ex: Argentina"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Contexto adicional <span className="text-text-secondary font-normal">(opcional)</span>
              </label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
                placeholder="Cole aqui texto extra para ajudar a IA a gerar um enunciado mais preciso..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>

            <Button
              onClick={() =>
                generateMutation.mutate({ answer: answer.trim(), context: context.trim() || undefined })
              }
              disabled={!answer.trim() || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar enunciado
                </>
              )}
            </Button>

            {generateMutation.isError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {generateMutation.error.message}
              </div>
            )}

            {generatedText && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-primary/10 border border-primary/30 rounded-md p-4"
              >
                <p className="text-xs text-text-secondary mb-1 font-medium uppercase tracking-wide">
                  Enunciado gerado
                </p>
                <p className="text-base font-medium">{generatedText}</p>
                <p className="text-xs text-text-secondary mt-2">
                  {generatedText.length} caracteres
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* ── Batch generation ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="w-5 h-5 text-primary" />
              Geração em lote por país
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-secondary">
              Gera e salva enunciados para todas as dicas de um país usando a IA.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {COUNTRIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setBatchCountryId(c.id === batchCountryId ? null : c.id)}
                  className={`rounded-lg border-2 p-3 text-center transition-colors ${
                    batchCountryId === c.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-2xl mb-1">{c.flag}</div>
                  <div className="text-sm font-medium">{c.name}</div>
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="rounded"
              />
              Substituir enunciados existentes
            </label>

            <Button
              onClick={() => {
                if (batchCountryId !== null) {
                  setBatchResult(null);
                  batchMutation.mutate({ countryId: batchCountryId, overwriteExisting: overwrite });
                }
              }}
              disabled={batchCountryId === null || batchMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {batchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Gerar em lote
                </>
              )}
            </Button>

            {batchMutation.isError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {batchMutation.error.message}
              </div>
            )}

            {batchResult && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex gap-4 text-sm font-medium">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    {batchResult.processed} gerados
                  </span>
                  {batchResult.errors > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="w-4 h-4" />
                      {batchResult.errors} erros
                    </span>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {batchResult.results.map((r) => (
                    <div
                      key={r.clueId}
                      className={`text-xs rounded-md p-2 ${
                        r.error
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted"
                      }`}
                    >
                      <span className="font-mono text-text-secondary mr-2">#{r.clueId}</span>
                      {r.error ? r.error : r.clueText}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

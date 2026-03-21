import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent } from "../components/ui/card.js";
import {
  Gamepad2,
  Trophy,
  Users,
  Clock,
  Zap,
  Target,
  MapPin,
  ChefHat,
  Music,
  Landmark,
  TrendingUp,
  Star,
  ArrowRight,
  CheckCircle,
  Globe,
  Flame,
  Award,
  BookOpen,
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

const categories = [
  { icon: MapPin, label: "Geografia", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { icon: ChefHat, label: "Gastronomia", color: "text-orange-400", bg: "bg-orange-400/10" },
  { icon: Music, label: "Música", color: "text-pink-400", bg: "bg-pink-400/10" },
  { icon: Landmark, label: "História", color: "text-amber-400", bg: "bg-amber-400/10" },
  { icon: Globe, label: "Cultura", color: "text-cyan-400", bg: "bg-cyan-400/10" },
  { icon: BookOpen, label: "Curiosidades", color: "text-violet-400", bg: "bg-violet-400/10" },
];

const steps = [
  {
    number: "01",
    title: "Crie sua conta",
    description: "Cadastre-se gratuitamente em segundos e comece a jogar.",
    icon: Users,
  },
  {
    number: "02",
    title: "Leia a pista",
    description: "A cada rodada, uma pista sobre um dos três países é revelada.",
    icon: Target,
  },
  {
    number: "03",
    title: "Escolha o país",
    description: "Argentina, Chile ou Peru? Faça sua escolha antes do tempo acabar!",
    icon: Gamepad2,
  },
  {
    number: "04",
    title: "Suba no ranking",
    description: "Acumule pontos, mantenha combos e conquiste o topo do ranking.",
    icon: Trophy,
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center px-4">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Floating Flags */}
            <motion.div
              variants={fadeInUp}
              className="mb-8 flex items-center justify-center gap-6"
            >
              <motion.span
                className="text-6xl md:text-8xl"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0 }}
              >
                🇦🇷
              </motion.span>
              <motion.span
                className="text-6xl md:text-8xl"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              >
                🇨🇱
              </motion.span>
              <motion.span
                className="text-6xl md:text-8xl"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
              >
                🇵🇪
              </motion.span>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeInUp}
              className="text-5xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-tight"
            >
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Qual das Três?
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl text-text-secondary max-w-3xl mx-auto mb-3 leading-relaxed"
            >
              O jogo de trivia onde você descobre qual país se esconde por trás de cada pista!
            </motion.p>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-text-secondary/60 mb-10"
            >
              Argentina, Chile ou Peru? Teste seus conhecimentos sobre a América do Sul.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  onClick={() => setLocation("/game")}
                  className="text-xl px-12 py-7 h-auto rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                >
                  <Gamepad2 className="w-6 h-6 mr-3" />
                  Jogar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <>
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="text-xl px-12 py-7 h-auto rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                    >
                      <Gamepad2 className="w-6 h-6 mr-3" />
                      Começar a Jogar
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="text-lg px-8 py-6 h-auto rounded-2xl border-border hover:border-primary/50"
                    >
                      Já tenho conta
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              variants={fadeInUp}
              className="mt-10 flex items-center justify-center gap-8 text-text-secondary/50 text-sm"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-success/60" />
                100% Gratuito
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-warning/60" />
                Partidas Rápidas
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-accent/60" />
                Ranking Global
              </span>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-text-secondary/30 flex items-start justify-center pt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-text-secondary/50" />
          </div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.span
              variants={fadeInUp}
              className="inline-block text-sm font-semibold text-primary uppercase tracking-widest mb-4"
            >
              Como Funciona
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-5xl font-bold mb-4"
            >
              Simples de jogar,{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                difícil de parar
              </span>
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-text-secondary text-lg max-w-2xl mx-auto"
            >
              Em apenas 4 passos você já está competindo com jogadores do mundo inteiro.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {steps.map((step) => (
              <motion.div key={step.number} variants={fadeInUp}>
                <Card className="h-full hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group">
                  <CardContent className="pt-8 pb-8 text-center">
                    <span className="text-5xl font-extrabold bg-gradient-to-b from-primary/30 to-transparent bg-clip-text text-transparent">
                      {step.number}
                    </span>
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 mt-4 group-hover:bg-primary/20 transition-colors">
                      <step.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.span
              variants={fadeInUp}
              className="inline-block text-sm font-semibold text-secondary uppercase tracking-widest mb-4"
            >
              Recursos do Jogo
            </motion.span>
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-5xl font-bold mb-4"
            >
              Uma experiência{" "}
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
                completa
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Clock,
                title: "Timer de 30 segundos",
                description: "Cada rodada tem um tempo limite que torna o jogo mais emocionante e desafiador.",
                color: "text-warning",
                bg: "bg-warning/10",
              },
              {
                icon: Flame,
                title: "Sistema de Combos",
                description: "Acerte consecutivamente para ativar combos e multiplicar seus pontos.",
                color: "text-error",
                bg: "bg-error/10",
              },
              {
                icon: TrendingUp,
                title: "Dificuldade Progressiva",
                description: "As pistas variam entre fácil, médio e difícil para desafiar todos os níveis.",
                color: "text-success",
                bg: "bg-success/10",
              },
              {
                icon: Trophy,
                title: "Ranking Global",
                description: "Compita com jogadores do mundo todo e conquiste as primeiras posições.",
                color: "text-warning",
                bg: "bg-warning/10",
              },
              {
                icon: Star,
                title: "Pontuação Inteligente",
                description: "Quanto mais rápido responder, mais pontos ganha. Velocidade é tudo!",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                icon: Award,
                title: "Perfil e Estatísticas",
                description: "Acompanhe seu progresso, precisão e histórico de partidas no seu perfil.",
                color: "text-accent",
                bg: "bg-accent/10",
              },
            ].map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Card className="h-full hover:border-secondary/30 transition-all duration-300 hover:-translate-y-1 group">
                  <CardContent className="pt-8 pb-8">
                    <div
                      className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                    >
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Game Preview / Categories Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left: Game Preview Mock */}
              <motion.div variants={fadeInUp}>
                <div className="relative">
                  <Card className="border-primary/20 shadow-2xl shadow-primary/10">
                    <CardContent className="pt-6 pb-6">
                      {/* Mock game UI */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                          Rodada 3/10
                        </span>
                        <span className="text-xs font-bold text-warning flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          24s
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-bg-input mb-6">
                        <div className="w-[30%] h-full rounded-full bg-gradient-to-r from-primary to-secondary" />
                      </div>

                      <div className="bg-bg-input rounded-xl p-5 mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            Gastronomia
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                            Médio
                          </span>
                        </div>
                        <p className="text-sm text-text-primary leading-relaxed">
                          "Este país é famoso pelo seu ceviche, um prato de peixe cru marinado em limão..."
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { flag: "🇦🇷", name: "Argentina" },
                          { flag: "🇨🇱", name: "Chile" },
                          { flag: "🇵🇪", name: "Peru", selected: true },
                        ].map((country) => (
                          <div
                            key={country.name}
                            className={`rounded-xl p-3 text-center border-2 transition-all ${
                              country.selected
                                ? "border-success bg-success/10"
                                : "border-border bg-bg-card"
                            }`}
                          >
                            <span className="text-2xl block mb-1">{country.flag}</span>
                            <span className="text-xs font-semibold">{country.name}</span>
                            {country.selected && (
                              <CheckCircle className="w-4 h-4 text-success mx-auto mt-1" />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-primary" />
                          <span className="text-sm font-bold">450 pts</span>
                        </div>
                        <div className="flex items-center gap-1 text-warning text-sm font-bold">
                          <Flame className="w-4 h-4" />
                          3x combo
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Decorative glow */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-secondary/5 to-accent/10 rounded-3xl blur-2xl -z-10" />
                </div>
              </motion.div>

              {/* Right: Categories */}
              <motion.div variants={fadeInUp}>
                <span className="inline-block text-sm font-semibold text-accent uppercase tracking-widest mb-4">
                  Categorias
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Conheça a América do Sul{" "}
                  <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                    de verdade
                  </span>
                </h2>
                <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                  Explore diversas categorias de perguntas que vão desde geografia e história até
                  gastronomia e curiosidades sobre Argentina, Chile e Peru.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <motion.div
                      key={cat.label}
                      variants={scaleIn}
                      className={`flex items-center gap-3 p-4 rounded-xl ${cat.bg} border border-transparent hover:border-border transition-colors`}
                    >
                      <cat.icon className={`w-5 h-5 ${cat.color}`} />
                      <span className="font-semibold text-sm">{cat.label}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <span className="inline-block text-sm font-semibold text-primary uppercase tracking-widest mb-4">
                Por que jogar?
              </span>
              <h2 className="text-3xl md:text-5xl font-bold">
                Diversão e{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  aprendizado
                </span>
              </h2>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-6"
            >
              {[
                { value: "10", label: "Rodadas por jogo", icon: Gamepad2 },
                { value: "6+", label: "Categorias", icon: BookOpen },
                { value: "30s", label: "Por rodada", icon: Clock },
                { value: "∞", label: "Diversão", icon: Zap },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={scaleIn}
                  className="text-center"
                >
                  <Card className="hover:border-primary/30 transition-colors">
                    <CardContent className="pt-6 pb-6">
                      <stat.icon className="w-6 h-6 text-primary mx-auto mb-3 opacity-60" />
                      <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">
                        {stat.value}
                      </div>
                      <div className="text-xs text-text-secondary font-medium uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div
              variants={fadeInUp}
              className="relative"
            >
              <Card className="border-primary/20 bg-gradient-to-b from-bg-card to-primary/[0.05] overflow-hidden">
                <CardContent className="py-16 px-8 relative">
                  {/* Background decoration */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative">
                    <div className="flex justify-center gap-4 mb-6 text-5xl">
                      <span>🇦🇷</span>
                      <span>🇨🇱</span>
                      <span>🇵🇪</span>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
                      Pronto para o{" "}
                      <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                        desafio?
                      </span>
                    </h2>
                    <p className="text-lg text-text-secondary mb-8 max-w-xl mx-auto">
                      Cadastre-se agora, é rápido e gratuito. Mostre que você é o maior
                      conhecedor da América do Sul!
                    </p>

                    {isAuthenticated ? (
                      <Button
                        size="lg"
                        onClick={() => setLocation("/game")}
                        className="text-xl px-12 py-7 h-auto rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                      >
                        <Gamepad2 className="w-6 h-6 mr-3" />
                        Iniciar Partida
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/register">
                          <Button
                            size="lg"
                            className="text-xl px-12 py-7 h-auto rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                          >
                            Criar Conta Grátis
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </Button>
                        </Link>
                        <Link href="/login">
                          <Button
                            variant="ghost"
                            size="lg"
                            className="text-lg px-8 py-6 h-auto"
                          >
                            Entrar na conta
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

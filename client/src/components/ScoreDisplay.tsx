import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";

interface ScoreDisplayProps {
  score: number;
  lastPoints?: number;
}

export default function ScoreDisplay({ score, lastPoints }: ScoreDisplayProps) {
  return (
    <div className="flex items-center gap-2 bg-bg-card border border-border rounded-xl px-4 py-2">
      <Star className="w-5 h-5 text-warning fill-warning" />
      <div className="flex items-center gap-1">
        <motion.span
          key={score}
          initial={{ scale: 1.5, color: "#22c55e" }}
          animate={{ scale: 1, color: "#f1f0f5" }}
          className="text-lg font-bold tabular-nums"
        >
          {score}
        </motion.span>
        <span className="text-sm text-text-secondary">pts</span>
      </div>
      <AnimatePresence>
        {lastPoints !== undefined && lastPoints > 0 && (
          <motion.span
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -20 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="text-success font-bold text-sm absolute ml-20"
          >
            +{lastPoints}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

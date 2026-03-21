import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "../lib/utils.js";

interface StreakIndicatorProps {
  streak: number;
}

export default function StreakIndicator({ streak }: StreakIndicatorProps) {
  if (streak === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex items-center gap-1.5 bg-bg-card border border-border rounded-xl px-4 py-2",
        streak >= 5 && "border-error/50 bg-error/10",
        streak >= 3 && streak < 5 && "border-warning/50 bg-warning/10"
      )}
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 1 }}
      >
        <Flame
          className={cn(
            "w-5 h-5",
            streak >= 5 ? "text-error fill-error" : "text-warning fill-warning"
          )}
        />
      </motion.div>
      <span className="font-bold text-lg tabular-nums">
        {streak}x
      </span>
      <span className="text-xs text-text-secondary">combo</span>
    </motion.div>
  );
}

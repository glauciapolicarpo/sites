import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils.js";

interface TimerProps {
  duration: number; // in seconds
  isRunning: boolean;
  onTimeout: () => void;
  onTick?: (remaining: number) => void;
}

export default function Timer({ duration, isRunning, onTimeout, onTick }: TimerProps) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    setRemaining(duration);
  }, [duration]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onTimeout();
          return 0;
        }
        onTick?.(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onTimeout, onTick]);

  const percentage = (remaining / duration) * 100;

  const getColor = () => {
    if (remaining > 20) return "from-primary to-secondary";
    if (remaining > 10) return "from-warning to-warning";
    return "from-error to-error";
  };

  const getTextColor = () => {
    if (remaining > 20) return "text-text-primary";
    if (remaining > 10) return "text-warning";
    return "text-error";
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-secondary">Tempo</span>
        <motion.span
          key={remaining}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className={cn("text-lg font-bold tabular-nums", getTextColor())}
        >
          {remaining}s
        </motion.span>
      </div>
      <div className="h-2 bg-bg-input rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", getColor())}
          initial={{ width: "100%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

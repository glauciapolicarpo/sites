import { motion } from "framer-motion";
import { cn } from "../lib/utils.js";

interface CountryCardProps {
  id: number;
  name: string;
  code: string;
  flagEmoji: string;
  selected: boolean;
  correct: boolean | null;
  disabled: boolean;
  onClick: () => void;
}

export default function CountryCard({
  name,
  flagEmoji,
  selected,
  correct,
  disabled,
  onClick,
}: CountryCardProps) {
  const getBorderColor = () => {
    if (correct === null) {
      return selected ? "border-primary shadow-primary/30" : "border-border";
    }
    if (correct === true) return "border-success shadow-success/30";
    if (selected && correct === false) return "border-error shadow-error/30";
    return "border-border opacity-50";
  };

  const getBackground = () => {
    if (correct === null) {
      return selected ? "bg-primary/10" : "bg-bg-card hover:bg-bg-card-hover";
    }
    if (correct === true) return "bg-success/10";
    if (selected && correct === false) return "bg-error/10";
    return "bg-bg-card";
  };

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.03 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center p-6 rounded-2xl border-2 shadow-lg transition-all duration-300 cursor-pointer w-full min-h-[160px]",
        getBorderColor(),
        getBackground(),
        disabled && !selected && correct === null && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="text-6xl mb-3">{flagEmoji}</span>
      <span className="text-lg font-bold text-text-primary">{name}</span>

      {correct === true && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-2 text-success font-semibold text-sm"
        >
          Correto!
        </motion.span>
      )}
      {selected && correct === false && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-2 text-error font-semibold text-sm"
        >
          Errado!
        </motion.span>
      )}
    </motion.button>
  );
}

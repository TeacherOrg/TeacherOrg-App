import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function GlassCard({
  className,
  children,
  glow = false,
  glowColor = "blue",
  animate = true,
  ...props
}) {
  const glowColors = {
    blue: "before:from-blue-500/20 before:to-cyan-500/20",
    purple: "before:from-purple-500/20 before:to-pink-500/20",
    green: "before:from-green-500/20 before:to-emerald-500/20",
    orange: "before:from-orange-500/20 before:to-yellow-500/20"
  };

  const Component = animate ? motion.div : "div";
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.6 }
  } : {};

  return (
    <Component
      className={cn(
        "relative rounded-2xl",
        "border border-white/10",
        "bg-white/5 backdrop-blur-xl",
        "shadow-2xl shadow-black/20",
        glow && [
          "before:absolute before:inset-0 before:rounded-2xl",
          "before:bg-gradient-to-r before:blur-xl before:-z-10",
          glowColors[glowColor]
        ],
        className
      )}
      {...animationProps}
      {...props}
    >
      {children}
    </Component>
  );
}

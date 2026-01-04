import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { forwardRef } from "react";

export const GlowButton = forwardRef(({
  className,
  children,
  variant = "primary",
  size = "default",
  ...props
}, ref) => {
  const variants = {
    primary: [
      "bg-gradient-to-r from-blue-600 to-cyan-600",
      "hover:from-blue-500 hover:to-cyan-500",
      "text-white",
      "shadow-lg shadow-blue-500/30",
      "hover:shadow-xl hover:shadow-blue-500/40"
    ],
    secondary: [
      "bg-white/5 backdrop-blur-sm",
      "border border-white/20",
      "text-white",
      "hover:bg-white/10",
      "hover:border-white/30"
    ],
    ghost: [
      "bg-transparent",
      "text-slate-300",
      "hover:text-white",
      "hover:bg-white/5"
    ]
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    default: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "rounded-xl font-semibold",
        "transition-all duration-300",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-950",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});

GlowButton.displayName = "GlowButton";

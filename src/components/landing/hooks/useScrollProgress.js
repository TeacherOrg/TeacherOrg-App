import { useScroll, useSpring, useTransform } from "framer-motion";

export function useScrollProgress(containerRef, options = {}) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: options.offset || ["start start", "end end"]
  });

  // Smoothed version for fluid animations
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return {
    progress: scrollYProgress,
    smoothProgress
  };
}

// Helper hook for phase detection in story flow
export function useStoryPhase(scrollProgress) {
  // Phase 1: Yearly (0-33%)
  const yearlyOpacity = useTransform(
    scrollProgress,
    [0, 0.25, 0.35],
    [1, 1, 0]
  );
  const yearlyScale = useTransform(
    scrollProgress,
    [0, 0.35],
    [1, 0.9]
  );

  // Phase 2: Weekly (33-66%)
  const weeklyOpacity = useTransform(
    scrollProgress,
    [0.25, 0.35, 0.55, 0.65],
    [0, 1, 1, 0]
  );
  const weeklyScale = useTransform(
    scrollProgress,
    [0.25, 0.35, 0.65],
    [1.1, 1, 0.9]
  );

  // Phase 3: Daily (66-100%)
  const dailyOpacity = useTransform(
    scrollProgress,
    [0.55, 0.65, 1],
    [0, 1, 1]
  );
  const dailyScale = useTransform(
    scrollProgress,
    [0.55, 0.65, 1],
    [1.1, 1, 1]
  );

  // Current phase number (1, 2, or 3)
  const phase = useTransform(
    scrollProgress,
    [0, 0.33, 0.66, 1],
    [1, 1, 2, 3]
  );

  return {
    yearly: { opacity: yearlyOpacity, scale: yearlyScale },
    weekly: { opacity: weeklyOpacity, scale: weeklyScale },
    daily: { opacity: dailyOpacity, scale: dailyScale },
    phase
  };
}

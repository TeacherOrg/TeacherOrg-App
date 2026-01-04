import { motion } from "framer-motion";

export function BackgroundOrbs() {
  const orbs = [
    {
      size: "w-96 h-96",
      color: "bg-blue-500/20",
      position: "top-20 -left-48",
      delay: 0,
      duration: 8
    },
    {
      size: "w-72 h-72",
      color: "bg-cyan-500/15",
      position: "top-40 right-20",
      delay: 2,
      duration: 10
    },
    {
      size: "w-80 h-80",
      color: "bg-purple-500/10",
      position: "bottom-20 left-1/3",
      delay: 4,
      duration: 12
    },
    {
      size: "w-64 h-64",
      color: "bg-blue-400/15",
      position: "-bottom-32 right-1/4",
      delay: 1,
      duration: 9
    }
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, index) => (
        <motion.div
          key={index}
          className={`absolute ${orb.size} ${orb.color} ${orb.position} rounded-full blur-3xl`}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />
    </div>
  );
}

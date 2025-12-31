import React from 'react';
import { motion } from 'framer-motion';

// Schneeflocken für Weihnachtsferien
const Snowflakes = () => {
  const snowflakes = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 5,
    duration: 8 + Math.random() * 7,
    size: 8 + Math.random() * 16,
    opacity: 0.4 + Math.random() * 0.4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {snowflakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="absolute text-white"
          style={{
            left: flake.left,
            fontSize: flake.size,
            opacity: flake.opacity,
            textShadow: '0 0 3px rgba(255,255,255,0.8)',
          }}
          initial={{ top: '-5%', rotate: 0 }}
          animate={{
            top: '105%',
            rotate: 360,
          }}
          transition={{
            duration: flake.duration,
            delay: flake.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          ❄
        </motion.div>
      ))}
    </div>
  );
};

// Berg-Silhouette für Sportferien
const Mountains = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Hintere Bergkette - heller */}
      <svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 1200 300"
        preserveAspectRatio="none"
        style={{ height: '60%' }}
      >
        <defs>
          <linearGradient id="mountainBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>
        <polygon
          fill="url(#mountainBack)"
          points="0,300 100,180 200,220 350,120 450,180 550,100 700,160 850,80 950,140 1050,90 1150,150 1200,120 1200,300"
        />
      </svg>

      {/* Vordere Bergkette - dunkler */}
      <svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 1200 250"
        preserveAspectRatio="none"
        style={{ height: '45%' }}
      >
        <defs>
          <linearGradient id="mountainFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </linearGradient>
          {/* Schneekappen */}
          <linearGradient id="snowCap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <polygon
          fill="url(#mountainFront)"
          points="0,250 0,200 150,100 250,160 400,50 500,120 650,30 800,100 900,60 1050,130 1200,70 1200,250"
        />
        {/* Schneekappen auf den Gipfeln */}
        <polygon fill="url(#snowCap)" points="380,70 400,50 420,70" />
        <polygon fill="url(#snowCap)" points="630,50 650,30 670,50" />
        <polygon fill="url(#snowCap)" points="880,80 900,60 920,80" />
      </svg>

      {/* Zusätzliche Schneeflocken */}
      {Array.from({ length: 15 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute text-white/50"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 50}%`,
            fontSize: 6 + Math.random() * 10,
          }}
          animate={{
            y: [0, 100],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 6 + Math.random() * 4,
            delay: Math.random() * 5,
            repeat: Infinity,
          }}
        >
          •
        </motion.div>
      ))}
    </div>
  );
};

// Fallende Blätter für Herbstferien
const FallingLeaves = () => {
  const leaves = ['🍂', '🍁', '🍃'];
  const leafElements = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    leaf: leaves[i % leaves.length],
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 6,
    duration: 10 + Math.random() * 8,
    size: 16 + Math.random() * 20,
    swayAmount: 30 + Math.random() * 50,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {leafElements.map((leaf) => (
        <motion.div
          key={leaf.id}
          className="absolute"
          style={{
            left: leaf.left,
            fontSize: leaf.size,
            filter: 'drop-shadow(2px 2px 3px rgba(0,0,0,0.2))',
          }}
          initial={{ top: '-10%', x: 0, rotate: 0 }}
          animate={{
            top: '110%',
            x: [0, leaf.swayAmount, -leaf.swayAmount, leaf.swayAmount / 2, 0],
            rotate: [0, 180, 360, 540, 720],
          }}
          transition={{
            duration: leaf.duration,
            delay: leaf.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {leaf.leaf}
        </motion.div>
      ))}
    </div>
  );
};

// Wellen für Sommerferien
const Waves = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Wellen */}
      <svg
        className="absolute bottom-0 w-full"
        viewBox="0 0 1200 200"
        preserveAspectRatio="none"
        style={{ height: '35%' }}
      >
        <defs>
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
          </linearGradient>
          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>

        <motion.path
          fill="url(#waveGrad2)"
          d="M0,100 C150,150 350,50 600,100 C850,150 1050,50 1200,100 L1200,200 L0,200 Z"
          animate={{
            d: [
              "M0,100 C150,150 350,50 600,100 C850,150 1050,50 1200,100 L1200,200 L0,200 Z",
              "M0,100 C150,50 350,150 600,100 C850,50 1050,150 1200,100 L1200,200 L0,200 Z",
              "M0,100 C150,150 350,50 600,100 C850,150 1050,50 1200,100 L1200,200 L0,200 Z",
            ],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.path
          fill="url(#waveGrad1)"
          d="M0,120 C200,80 400,160 600,120 C800,80 1000,160 1200,120 L1200,200 L0,200 Z"
          animate={{
            d: [
              "M0,120 C200,80 400,160 600,120 C800,80 1000,160 1200,120 L1200,200 L0,200 Z",
              "M0,120 C200,160 400,80 600,120 C800,160 1000,80 1200,120 L1200,200 L0,200 Z",
              "M0,120 C200,80 400,160 600,120 C800,80 1000,160 1200,120 L1200,200 L0,200 Z",
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </svg>
    </div>
  );
};

// Schwebende Blüten für Frühlingsferien
const FloatingBlossoms = () => {
  const blossoms = ['🌸', '🌷', '🌺', '💮'];
  const elements = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    blossom: blossoms[i % blossoms.length],
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: Math.random() * 4,
    size: 14 + Math.random() * 18,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Schwebende Blüten */}
      {elements.map((el) => (
        <motion.div
          key={el.id}
          className="absolute"
          style={{
            left: el.left,
            top: el.top,
            fontSize: el.size,
          }}
          animate={{
            y: [0, -15, 0, 15, 0],
            x: [0, 10, 0, -10, 0],
            rotate: [0, 10, 0, -10, 0],
            scale: [1, 1.1, 1, 0.9, 1],
          }}
          transition={{
            duration: 6 + Math.random() * 2,
            delay: el.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {el.blossom}
        </motion.div>
      ))}

      {/* Fallende Blütenblätter */}
      {Array.from({ length: 15 }, (_, i) => (
        <motion.div
          key={`petal-${i}`}
          className="absolute text-pink-300/60"
          style={{
            left: `${Math.random() * 100}%`,
            fontSize: 10 + Math.random() * 8,
          }}
          initial={{ top: '-5%', rotate: 0 }}
          animate={{
            top: '105%',
            rotate: 360,
            x: [0, 30, -30, 20, 0],
          }}
          transition={{
            duration: 12 + Math.random() * 6,
            delay: Math.random() * 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          ✿
        </motion.div>
      ))}
    </div>
  );
};

// Konfetti für Feiertage
const Confetti = () => {
  const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171'];
  const confetti = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 3,
    duration: 4 + Math.random() * 4,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confetti.map((c) => (
        <motion.div
          key={c.id}
          className="absolute rounded-sm"
          style={{
            left: c.left,
            width: c.size,
            height: c.size * 0.6,
            backgroundColor: c.color,
            boxShadow: `0 0 3px ${c.color}`,
          }}
          initial={{ top: '-5%', rotate: c.rotation }}
          animate={{
            top: '105%',
            rotate: c.rotation + 720,
            x: [0, 50, -50, 30, 0],
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
};

// Bücher/Lernen für Weiterbildung
const StudyElements = () => {
  const items = ['📖', '📚', '✏️', '💡', '🎓'];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Floating study items */}
      {Array.from({ length: 12 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${10 + (i % 4) * 25}%`,
            top: `${15 + Math.floor(i / 4) * 30}%`,
            fontSize: 20 + Math.random() * 15,
            opacity: 0.6,
          }}
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: i * 0.3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {items[i % items.length]}
        </motion.div>
      ))}

      {/* Decorative lines like notebook paper */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        {Array.from({ length: 8 }, (_, i) => (
          <line
            key={i}
            x1="10%"
            y1={`${15 + i * 12}%`}
            x2="90%"
            y2={`${15 + i * 12}%`}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
};

// Haupt-Export-Komponente
const HolidayDecorations = ({ type, holidayName }) => {
  // Bestimme den Dekorationstyp basierend auf dem Feriennamen
  const getDecorationType = () => {
    if (!holidayName) return null;
    const name = holidayName.toLowerCase();

    if (name.includes('weihnacht')) return 'snowflakes';
    if (name.includes('sport') || name.includes('ski')) return 'mountains';
    if (name.includes('herbst')) return 'leaves';
    if (name.includes('sommer')) return 'waves';
    if (name.includes('frühling') || name.includes('fruehling') || name.includes('oster')) return 'blossoms';

    // Fallback basierend auf dem Typ
    if (type === 'vacation') return 'waves';
    if (type === 'holiday') return 'confetti';
    if (type === 'training') return 'study';

    return null;
  };

  const decorationType = getDecorationType();

  switch (decorationType) {
    case 'snowflakes':
      return <Snowflakes />;
    case 'mountains':
      return <Mountains />;
    case 'leaves':
      return <FallingLeaves />;
    case 'waves':
      return <Waves />;
    case 'blossoms':
      return <FloatingBlossoms />;
    case 'confetti':
      return <Confetti />;
    case 'study':
      return <StudyElements />;
    default:
      return null;
  }
};

export default HolidayDecorations;

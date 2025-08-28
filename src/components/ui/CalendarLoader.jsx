import React from 'react';
import { motion } from 'framer-motion';

const CalendarLoader = () => {
  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.15,
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 0.5,
      },
    },
  };

  const cellVariants = {
    initial: { opacity: 0.3 },
    animate: { 
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 1.2,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="flex items-center justify-center h-full w-full p-10">
      <motion.div 
        className="w-16 h-16 bg-blue-600 rounded-2xl grid grid-cols-2 gap-1.5 p-2 shadow-lg"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div className="bg-blue-400 rounded-md" variants={cellVariants}></motion.div>
        <motion.div className="bg-blue-400 rounded-md" variants={cellVariants}></motion.div>
        <motion.div className="bg-blue-400 rounded-md" variants={cellVariants}></motion.div>
        <motion.div className="bg-blue-400 rounded-md" variants={cellVariants}></motion.div>
      </motion.div>
    </div>
  );
};

export default CalendarLoader;
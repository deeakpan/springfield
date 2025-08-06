'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface Cube3DProps {
  isHovered: boolean;
}

const Cube3DComponent = ({ isHovered }: Cube3DProps) => {
  return (
    <motion.div
      className="relative w-full h-full"
      animate={{
        rotateX: isHovered ? 360 : 0,
        rotateY: isHovered ? 360 : 0,
      }}
      transition={{
        duration: 2,
        ease: "easeInOut",
        repeat: isHovered ? Infinity : 0,
      }}
    >
      {/* Front face */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg transform rotate-0">
        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
      </div>
      
      {/* Back face */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg transform rotate-180">
        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
      </div>
      
      {/* Left face */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-lg transform rotate-y-90">
        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
      </div>
      
      {/* Right face */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg transform -rotate-y-90">
        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
      </div>
      
      {/* Top face */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg shadow-lg transform -rotate-x-90">
        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
      </div>
      
      {/* Bottom face */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-lg transform rotate-x-90">
        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
      </div>
    </motion.div>
  );
};

const Cube3D = ({ isHovered }: Cube3DProps) => {
  return (
    <div className="w-16 h-16 sm:w-20 sm:h-20 perspective-1000">
      <Cube3DComponent isHovered={isHovered} />
    </div>
  );
};

export default Cube3D; 
'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Cube3DProps {
  isHovered: boolean;
  auctionDetails?: any; // For auction tiles
}

const Cube3DComponent = ({ isHovered, auctionDetails }: Cube3DProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Auto-rotation when not hovered
      if (!hovered) {
        meshRef.current.rotation.y += 0.01;
        meshRef.current.rotation.x += 0.005;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.1 : 1}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial 
          color="#fde047"
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>
      
      {/* QR Code texture on front face */}
      <mesh position={[0, 0, 1.01]}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Auction QR Code - shows project primary link after auction ends */}
      {auctionDetails && (
        <mesh position={[0, 0, 1.02]}>
          <planeGeometry args={[1.6, 1.6]} />
          <meshBasicMaterial color="#fde047" />
        </mesh>
      )}
      
      <OrbitControls 
        enablePan={false}
        enableZoom={false}
        enableRotate={hovered}
        autoRotate={!hovered}
        autoRotateSpeed={1}
        maxPolarAngle={Math.PI}
        minPolarAngle={0}
      />
    </>
  );
};

const Cube3D = ({ isHovered, auctionDetails }: Cube3DProps) => {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Cube3DComponent isHovered={isHovered} auctionDetails={auctionDetails} />
      </Canvas>
    </div>
  );
};

export default Cube3D; 
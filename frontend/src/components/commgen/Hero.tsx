'use client';
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// WebGL2 Holographic Pipeline
function PipelineScene() {
  const ref = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 2000; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 10;
      temp.push(x, y, z);
    }
    return new Float32Array(temp);
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={particles} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#a855f7"
          size={0.05}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

export default function Hero() {
  return (
    <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden">
      
      {/* Desktop: Cinematic Hero with WebGL Pipeline */}
      <div className="hidden md:flex absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ powerPreference: "high-performance", antialias: true }}>
          <ambientLight intensity={0.5} />
          <PipelineScene />
        </Canvas>
        
        {/* Glow behind text */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#a855f7]/10 rounded-full blur-[120px] pointer-events-none"></div>
      </div>

      <div className="hidden md:flex relative z-10 flex-col items-center text-center px-6 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
          </span>
          <span className="text-sm font-medium text-white/80">CodeComm AI Engine Online</span>
        </div>
        
        <h1 className="text-6xl lg:text-8xl font-black font-heading tracking-tighter text-white mb-6 leading-[1.05]">
          AI-Powered<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#a855f7] to-[#10b981]">
            Code Commenting
          </span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl font-light">
          The <span className="text-white font-medium">future of documentation</span>. Generate robust, standard-compliant comments at the speed of thought.
        </p>
      </div>

      {/* Mobile: Typography Hero */}
      <div className="md:hidden relative z-10 flex flex-col items-center text-center px-6 mt-12 w-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#10b981]/20 rounded-full blur-[80px] pointer-events-none"></div>
        <h1 className="text-[18vw] leading-none font-black font-heading tracking-tighter flex flex-col items-center w-full shadow-black drop-shadow-2xl">
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#10b981] to-emerald-900 w-full relative z-10" style={{WebkitTextStroke: '2px black'}}>
            <span className="text-[14vw] align-top text-white opacity-80" style={{WebkitTextStroke: '0px'}}>#</span>COMM
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#3b82f6] to-blue-900 w-full -mt-2 relative z-0" style={{WebkitTextStroke: '2px black'}}>
            GEN
          </span>
        </h1>
        <p className="mt-8 text-lg text-white/60">The future of documentation.</p>
      </div>

    </section>
  );
}

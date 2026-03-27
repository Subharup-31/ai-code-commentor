'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const chars = '!<>-_\\/[]{}—=+*^tuvwxyz?#________';

// Glitch text effect
function TextScramble({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const scramble = () => {
      setIsScrambling(true);
      let iteration = 0;
      const length = text.length;

      const interval = setInterval(() => {
        setDisplayText((old) =>
          text
            .split('')
            .map((letter, index) => {
              if (index < iteration) return text[index];
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('')
        );

        if (iteration >= length) {
          clearInterval(interval);
          setIsScrambling(false);
          setDisplayText(text);
        }

        iteration += 1 / 2;
      }, 30);
    };

    scramble();
    const timer = setInterval(scramble, 5000);
    return () => { clearInterval(timer); };
  }, [text]);

  return <span className={`transition-colors duration-300 font-mono ${isScrambling ? 'text-[#facc15]' : 'text-white'}`}>{displayText}</span>;
}

// Background shader
/* Dithering Shader for dark green hues */
const fragmentShader = `
uniform float time;
varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  
  // Ripple effect
  float dist = length(uv - 0.5);
  float ripple = sin(dist * 20.0 - time * 2.0) * 0.5 + 0.5;
  
  // Color gradient (#001a0f to #0a6e3a)
  vec3 col1 = vec3(0.0, 0.102, 0.059);
  vec3 col2 = vec3(0.039, 0.431, 0.227);
  vec3 color = mix(col1, col2, ripple);
  
  // Dithering noise
  float noise = random(uv * time) * 0.1;
  color += noise;

  gl_FragColor = vec4(color, 1.0);
}
`;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

function ShaderPlane() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh>
      <planeGeometry args={[20, 10]} />
      <shaderMaterial
        ref={materialRef}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        uniforms={{ time: { value: 0 } }}
      />
    </mesh>
  );
}

export default function Auth3D() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <section className="relative w-full h-[800px] flex flex-col items-center justify-center overflow-hidden bg-[#020617] perspective-1500" style={{ perspective: '1500px' }}>
      
      {/* Background WebGL Shader */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Canvas>
          <ShaderPlane />
        </Canvas>
      </div>
      
      <div className="relative z-10 w-full max-w-sm flex flex-col h-[500px]" style={{ transformStyle: 'preserve-3d' }}>
        
        {/* Header Scramble */}
        <div className="text-center mb-8 h-12 flex items-center justify-center translate-z-10 absolute -top-16 left-0 right-0 z-20">
          <h2 className="text-3xl font-black tracking-widest bg-black/50 px-4 py-2 rounded shadow-2xl backdrop-blur">
            <TextScramble text="COMMGEN" />
          </h2>
        </div>

        {/* 3D Container for forms */}
        <div 
          className="relative w-full h-full transition-transform duration-1000 ease-in-out"
          style={{ 
            transformStyle: 'preserve-3d', 
            transform: isLogin ? 'rotateY(0deg) scale(1)' : 'rotateY(180deg) scale(0.95)' 
          }}
        >
          {/* Login Card (Front) */}
          <div 
            className="absolute inset-0 w-full h-full rounded-2xl border border-white/20 bg-black/60 backdrop-blur-xl p-8 flex flex-col justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg) translateZ(1px)' }}
          >
             <h3 className="text-2xl font-bold text-white mb-6">Welcome Back</h3>
             <input type="email" placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white mb-4 outline-none focus:border-[#a855f7]" />
             <input type="password" placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white mb-6 outline-none focus:border-[#a855f7]" />
             <button className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors">Sign In</button>
          </div>

          {/* Signup Card (Back) */}
          <div 
            className="absolute inset-0 w-full h-full rounded-2xl border border-white/20 bg-black/60 backdrop-blur-xl p-8 flex flex-col justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)]" 
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg) translateZ(1px)' }}
          >
             <h3 className="text-2xl font-bold text-white mb-6">Create Account</h3>
             <input type="text" placeholder="Developer Name" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white mb-4 outline-none focus:border-[#10b981]" />
             <input type="email" placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white mb-4 outline-none focus:border-[#10b981]" />
             <input type="password" placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white mb-6 outline-none focus:border-[#10b981]" />
             <button className="w-full bg-gradient-to-r from-[#10b981] to-[#a855f7] text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity">Launch Engine</button>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="absolute top-1/2 -left-16 -translate-y-1/2 z-20">
          <button 
            onClick={() => setIsLogin(true)}
            className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center transition-all duration-300 ${isLogin ? 'opacity-50 scale-90' : 'opacity-100 hover:bg-white/20 animate-pulse-slow'}`}
          >
            <ChevronLeft className="text-white w-5 h-5" />
          </button>
        </div>
        <div className="absolute top-1/2 -right-16 -translate-y-1/2 z-20">
          <button 
            onClick={() => setIsLogin(false)}
            className={`w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center transition-all duration-300 ${!isLogin ? 'opacity-50 scale-90' : 'opacity-100 hover:bg-white/20 animate-pulse-slow'}`}
          >
            <ChevronRight className="text-white w-5 h-5" />
          </button>
        </div>

      </div>
    </section>
  );
}

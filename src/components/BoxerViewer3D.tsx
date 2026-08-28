import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Line } from '@react-three/drei';
import * as THREE from 'three';

function BoxerModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.3;
  });
  // Escala normalizada para el bbox del scan (alto ~1.03 unidades)
  return <primitive ref={ref} object={scene} scale={2.2} position={[0, -0.9, 0]} />;
}

/** Ring de boxeo decorativo: lona, postes y cuerdas alrededor del boxeador. */
function BoxingRing() {
  const HALF = 2.4;
  const CORNERS: [number, number][] = [
    [-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF],
  ];
  const ROPE_LEVELS = [0.65, 1.25, 1.85];
  return (
    <group>
      {/* Lona */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.98, 0]}>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
        <meshStandardMaterial color="#8f1d2c" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Marco exterior de la lona */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.975, 0]}>
        <planeGeometry args={[HALF * 2 + 0.18, HALF * 2 + 0.18]} />
        <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Linea central del ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.965, 0]}>
        <planeGeometry args={[HALF * 2 - 0.1, 0.03]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
      {/* Postes de las esquinas */}
      {CORNERS.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.0, z]}>
          <cylinderGeometry args={[0.07, 0.09, 2.6, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {/* Cuadro de acolchado en cada esquina */}
      {CORNERS.map(([x, z], i) => (
        <group key={`pad-${i}`} position={[x, 2.32, z]}>
          <mesh>
            <boxGeometry args={[0.3, 0.32, 0.3]} />
            <meshStandardMaterial color="#e11d48" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Cuerdas */}
      {ROPE_LEVELS.map((y) =>
        CORNERS.map((a, i) => {
          const b = CORNERS[(i + 1) % CORNERS.length];
          return (
            <Line
              key={`rope-${y}-${i}`}
              points={[[a[0], y, a[1]], [b[0], y, b[1]]]}
              color="#f8fafc"
              lineWidth={1.5}
              transparent
              opacity={0.95}
            />
          );
        })
      )}
    </group>
  );
}

function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 2;
  });
  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[0.8, 0.3, 100, 16]} />
      <meshStandardMaterial color="#ef4444" wireframe />
    </mesh>
  );
}

class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  private readonly children: React.ReactNode;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.children = props.children;
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div className="h-full flex items-center justify-center px-6 text-center text-sm text-slate-400">El modelo 3D no está disponible en este momento.</div>;
    }
    return this.children;
  }
}

interface Props {
  glbUrl?: string;
  height?: string;
  ring?: boolean;
}

export function BoxerViewer3D({ glbUrl, height = '400px', ring = true }: Props) {
  if (!glbUrl) return null;

  return (
    <div style={{ height, width: '100%', borderRadius: '1.5rem', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}>
      <Canvas camera={{ position: [0, 1.2, 4.2], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 6, 5]} intensity={1.1} />
        <spotLight position={[0, 6, 0]} angle={0.6} penumbra={0.8} intensity={0.9} color="#fef3c7" />
        <Suspense fallback={<LoadingFallback />}>
          <ModelErrorBoundary><BoxerModel url={glbUrl} /></ModelErrorBoundary>
          {ring && <BoxingRing />}
          <Environment preset="studio" />
        </Suspense>
        <ContactShadows position={[0, -0.99, 0]} opacity={0.45} scale={6} blur={2.2} />
        <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
      </Canvas>
    </div>
  );
}

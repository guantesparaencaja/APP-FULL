import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

function BoxerModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.3;
  });
  return <primitive ref={ref} object={scene} scale={1.5} position={[0, -1, 0]} />;
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

interface Props {
  glbUrl?: string;
  height?: string;
}

export function BoxerViewer3D({ glbUrl, height = '400px' }: Props) {
  const [hasError, setHasError] = useState(false);

  if (!glbUrl || hasError) return null;

  return (
    <div style={{ height, width: '100%', borderRadius: '1.5rem', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a, #1e1b4b)' }}>
      <Canvas camera={{ position: [0, 1, 4], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={<LoadingFallback />}>
          <BoxerModel url={glbUrl} />
          <Environment preset="studio" />
        </Suspense>
        <ContactShadows position={[0, -1, 0]} opacity={0.4} scale={5} blur={2.5} />
        <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
      </Canvas>
    </div>
  );
}

useGLTF.preload = useGLTF.preload || (() => {});

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { TreeState } from '@/types/christmas';

interface ParticleSystemProps {
  state: TreeState;
  particleCount?: number;
}

// Generate cone-shaped tree positions (more traditional Christmas tree shape)
function generateTreePosition(index: number, total: number): [number, number, number] {
  const height = 8;
  const maxRadius = 3.5;
  
  // Distribute along height with more density at bottom
  const t = Math.pow(index / total, 0.8);
  const y = t * height - height / 2;
  
  // Perfect cone shape with slight randomness for natural look
  const layerRadius = maxRadius * (1 - t * 0.95);
  const angle = Math.random() * Math.PI * 2;
  const radiusVariation = 0.7 + Math.random() * 0.3;
  const radius = layerRadius * radiusVariation;
  
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  
  return [x, y, z];
}

// Generate galaxy positions
function generateGalaxyPosition(): [number, number, number] {
  const radius = 5 + Math.random() * 10;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) * 0.5,
    radius * Math.cos(phi),
  ];
}

// Generate ornament positions on the tree
function generateOrnamentPosition(index: number, total: number): [number, number, number] {
  const height = 7;
  const maxRadius = 3.2;
  
  const t = (index + 0.5) / total;
  const y = t * height - height / 2;
  const layerRadius = maxRadius * (1 - t * 0.9);
  const angle = index * Math.PI * 2.4 + Math.random() * 0.5;
  
  return [
    Math.cos(angle) * layerRadius * 0.85,
    y,
    Math.sin(angle) * layerRadius * 0.85,
  ];
}

// Generate ribbon/garland spiral positions
function generateRibbonPosition(index: number, total: number): [number, number, number] {
  const height = 7.5;
  const maxRadius = 3.3;
  
  const t = index / total;
  const y = t * height - height / 2;
  const layerRadius = maxRadius * (1 - t * 0.92);
  const angle = t * Math.PI * 8; // 4 full spirals
  
  return [
    Math.cos(angle) * layerRadius,
    y,
    Math.sin(angle) * layerRadius,
  ];
}

// Main tree particles (green sparkles/snow effect) - OPTIMIZED
export function ParticleSystem({ state, particleCount = 4000 }: ParticleSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const colorsSetRef = useRef(false);
  const transitionRef = useRef({ progress: 0, fromState: 'tree' as TreeState });
  
  const particleData = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const treePos = generateTreePosition(i, particleCount);
      const galaxyPos = generateGalaxyPosition();
      
      // 85% green for tree body, 15% white sparkles
      const colorRand = Math.random();
      let color: THREE.Color;
      
      if (colorRand < 0.85) {
        const hue = 0.33 + Math.random() * 0.05;
        const saturation = 0.7 + Math.random() * 0.3;
        const lightness = 0.25 + Math.random() * 0.2;
        color = new THREE.Color().setHSL(hue, saturation, lightness);
      } else {
        color = new THREE.Color().setHSL(0, 0, 0.9 + Math.random() * 0.1);
      }
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        color,
        scale: 0.015 + Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        // Pre-calculated animation delay for staggered effect
        delay: Math.random(),
      };
    });
  }, [particleCount]);

  // Use single GSAP tween for overall transition instead of per-particle
  useEffect(() => {
    transitionRef.current.fromState = transitionRef.current.progress > 0.5 ? 'galaxy' : 'tree';
    
    gsap.to(transitionRef.current, {
      progress: state === 'tree' ? 0 : 1,
      duration: 1.8,
      ease: 'power2.inOut',
    });
  }, [state]);

  // Set colors once on mount
  useEffect(() => {
    if (!meshRef.current || colorsSetRef.current) return;
    
    particleData.forEach((particle, i) => {
      meshRef.current!.setColorAt(i, particle.color);
    });
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    colorsSetRef.current = true;
  }, [particleData]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    const progress = transitionRef.current.progress;
    
    // Process particles in batches for better performance
    for (let i = 0; i < particleCount; i++) {
      const particle = particleData[i];
      
      // Staggered lerp based on particle delay
      const staggeredProgress = Math.max(0, Math.min(1, 
        progress * 1.5 - particle.delay * 0.5
      ));
      const smoothProgress = staggeredProgress * staggeredProgress * (3 - 2 * staggeredProgress); // smoothstep
      
      // Interpolate position
      const x = particle.treePosition[0] + (particle.galaxyPosition[0] - particle.treePosition[0]) * smoothProgress;
      const y = particle.treePosition[1] + (particle.galaxyPosition[1] - particle.treePosition[1]) * smoothProgress;
      const z = particle.treePosition[2] + (particle.galaxyPosition[2] - particle.treePosition[2]) * smoothProgress;
      
      // Subtle breathing animation
      const breathe = Math.sin(timeRef.current * particle.speed + particle.phase) * 0.02;
      
      dummy.position.set(x, y + breathe, z);
      dummy.rotation.y = timeRef.current * 0.3 + particle.phase;
      
      const scalePulse = 1 + Math.sin(timeRef.current * 2 + particle.phase) * 0.1;
      dummy.scale.setScalar(particle.scale * scalePulse);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// Colorful ornament balls (red, gold, etc.) - OPTIMIZED
export function OrnamentBalls({ state }: { state: TreeState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorsSetRef = useRef(false);
  const transitionRef = useRef({ progress: 0 });
  const ornamentCount = 35;
  
  const ornamentData = useMemo(() => {
    const colors = [
      new THREE.Color('#C41E3A'),
      new THREE.Color('#8B0000'),
      new THREE.Color('#FFD700'),
      new THREE.Color('#FF6347'),
      new THREE.Color('#DC143C'),
      new THREE.Color('#B22222'),
      new THREE.Color('#DAA520'),
      new THREE.Color('#FF4500'),
    ];
    
    return Array.from({ length: ornamentCount }, (_, i) => ({
      treePosition: generateOrnamentPosition(i, ornamentCount),
      galaxyPosition: generateGalaxyPosition(),
      color: colors[i % colors.length],
      scale: 0.1 + Math.random() * 0.08,
      delay: Math.random(),
    }));
  }, []);

  useEffect(() => {
    gsap.to(transitionRef.current, {
      progress: state === 'tree' ? 0 : 1,
      duration: 1.5,
      ease: 'power2.inOut',
    });
  }, [state]);

  useEffect(() => {
    if (!meshRef.current || colorsSetRef.current) return;
    ornamentData.forEach((o, i) => meshRef.current!.setColorAt(i, o.color));
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    colorsSetRef.current = true;
  }, [ornamentData]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    const progress = transitionRef.current.progress;
    
    ornamentData.forEach((ornament, i) => {
      const p = Math.max(0, Math.min(1, progress * 1.3 - ornament.delay * 0.3));
      const smooth = p * p * (3 - 2 * p);
      
      const x = ornament.treePosition[0] + (ornament.galaxyPosition[0] - ornament.treePosition[0]) * smooth;
      const y = ornament.treePosition[1] + (ornament.galaxyPosition[1] - ornament.treePosition[1]) * smooth;
      const z = ornament.treePosition[2] + (ornament.galaxyPosition[2] - ornament.treePosition[2]) * smooth;
      
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(ornament.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ornamentCount]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial metalness={0.8} roughness={0.2} envMapIntensity={1} />
    </instancedMesh>
  );
}

// Gem-like cubes and icosahedrons (high reflective) - OPTIMIZED
export function GemOrnaments({ state }: { state: TreeState }) {
  const cubeRef = useRef<THREE.InstancedMesh>(null);
  const icoRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const colorsSetRef = useRef({ cube: false, ico: false });
  const transitionRef = useRef({ progress: 0 });
  const cubeCount = 25;
  const icoCount = 20;
  
  const cubeData = useMemo(() => {
    return Array.from({ length: cubeCount }, (_, i) => {
      const hue = Math.random() > 0.5 ? 0.75 + Math.random() * 0.1 : 0;
      return {
        treePosition: generateOrnamentPosition(i, cubeCount),
        galaxyPosition: generateGalaxyPosition(),
        color: new THREE.Color().setHSL(hue, hue > 0 ? 0.4 : 0, 0.85 + Math.random() * 0.15),
        scale: 0.08 + Math.random() * 0.06,
        rotSpeed: 0.3 + Math.random() * 0.5,
        delay: Math.random(),
      };
    });
  }, []);
  
  const icoData = useMemo(() => {
    return Array.from({ length: icoCount }, (_, i) => {
      const hue = Math.random() > 0.5 ? 0.78 + Math.random() * 0.05 : 0;
      return {
        treePosition: generateOrnamentPosition(i + cubeCount, icoCount + cubeCount),
        galaxyPosition: generateGalaxyPosition(),
        color: new THREE.Color().setHSL(hue, hue > 0 ? 0.5 : 0, 0.8 + Math.random() * 0.2),
        scale: 0.1 + Math.random() * 0.08,
        rotSpeed: 0.2 + Math.random() * 0.4,
        delay: Math.random(),
      };
    });
  }, []);

  useEffect(() => {
    gsap.to(transitionRef.current, { progress: state === 'tree' ? 0 : 1, duration: 1.5, ease: 'power2.inOut' });
  }, [state]);

  // Set colors once
  useEffect(() => {
    if (cubeRef.current && !colorsSetRef.current.cube) {
      cubeData.forEach((c, i) => cubeRef.current!.setColorAt(i, c.color));
      if (cubeRef.current.instanceColor) cubeRef.current.instanceColor.needsUpdate = true;
      colorsSetRef.current.cube = true;
    }
    if (icoRef.current && !colorsSetRef.current.ico) {
      icoData.forEach((c, i) => icoRef.current!.setColorAt(i, c.color));
      if (icoRef.current.instanceColor) icoRef.current.instanceColor.needsUpdate = true;
      colorsSetRef.current.ico = true;
    }
  }, [cubeData, icoData]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const progress = transitionRef.current.progress;
    
    if (cubeRef.current) {
      cubeData.forEach((cube, i) => {
        const p = Math.max(0, Math.min(1, progress * 1.3 - cube.delay * 0.3));
        const smooth = p * p * (3 - 2 * p);
        
        dummy.position.set(
          cube.treePosition[0] + (cube.galaxyPosition[0] - cube.treePosition[0]) * smooth,
          cube.treePosition[1] + (cube.galaxyPosition[1] - cube.treePosition[1]) * smooth,
          cube.treePosition[2] + (cube.galaxyPosition[2] - cube.treePosition[2]) * smooth
        );
        dummy.rotation.x = timeRef.current * cube.rotSpeed;
        dummy.rotation.y = timeRef.current * cube.rotSpeed * 1.3;
        dummy.scale.setScalar(cube.scale);
        dummy.updateMatrix();
        cubeRef.current!.setMatrixAt(i, dummy.matrix);
      });
      cubeRef.current.instanceMatrix.needsUpdate = true;
    }
    
    if (icoRef.current) {
      icoData.forEach((ico, i) => {
        const p = Math.max(0, Math.min(1, progress * 1.3 - ico.delay * 0.3));
        const smooth = p * p * (3 - 2 * p);
        
        dummy.position.set(
          ico.treePosition[0] + (ico.galaxyPosition[0] - ico.treePosition[0]) * smooth,
          ico.treePosition[1] + (ico.galaxyPosition[1] - ico.treePosition[1]) * smooth,
          ico.treePosition[2] + (ico.galaxyPosition[2] - ico.treePosition[2]) * smooth
        );
        dummy.rotation.x = timeRef.current * ico.rotSpeed * 0.7;
        dummy.rotation.z = timeRef.current * ico.rotSpeed;
        dummy.scale.setScalar(ico.scale);
        dummy.updateMatrix();
        icoRef.current!.setMatrixAt(i, dummy.matrix);
      });
      icoRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={cubeRef} args={[undefined, undefined, cubeCount]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={1} roughness={0.05} envMapIntensity={2} />
      </instancedMesh>
      <instancedMesh ref={icoRef} args={[undefined, undefined, icoCount]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial metalness={1} roughness={0.05} envMapIntensity={2} />
      </instancedMesh>
    </>
  );
}

// Tetrahedron spiral ribbon (minimalist, elegant) - OPTIMIZED
export function TetrahedronSpiral({ state }: { state: TreeState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const colorsSetRef = useRef(false);
  const transitionRef = useRef({ progress: 0 });
  const tetraCount = 180;
  const whiteColor = useMemo(() => new THREE.Color('#ffffff'), []);
  
  const tetraData = useMemo(() => {
    return Array.from({ length: tetraCount }, (_, i) => {
      const height = 7;
      const maxRadius = 3.0;
      const t = i / tetraCount;
      const y = t * height - height / 2 + 0.3;
      const layerRadius = maxRadius * (1 - t * 0.88) + 0.15;
      const angle = t * Math.PI * 6;
      
      return {
        treePosition: [Math.cos(angle) * layerRadius, y, Math.sin(angle) * layerRadius] as [number, number, number],
        galaxyPosition: generateGalaxyPosition(),
        angle,
        delay: i / tetraCount, // Sequential delay based on position
      };
    });
  }, []);

  useEffect(() => {
    gsap.to(transitionRef.current, { progress: state === 'tree' ? 0 : 1, duration: 1.5, ease: 'power2.inOut' });
  }, [state]);

  // Set colors once
  useEffect(() => {
    if (!meshRef.current || colorsSetRef.current) return;
    tetraData.forEach((_, i) => meshRef.current!.setColorAt(i, whiteColor));
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    colorsSetRef.current = true;
  }, [tetraData, whiteColor]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    const progress = transitionRef.current.progress;
    
    tetraData.forEach((tetra, i) => {
      // Wave effect: particles at top transition earlier
      const p = Math.max(0, Math.min(1, progress * 1.5 - tetra.delay * 0.5));
      const smooth = p * p * (3 - 2 * p);
      
      dummy.position.set(
        tetra.treePosition[0] + (tetra.galaxyPosition[0] - tetra.treePosition[0]) * smooth,
        tetra.treePosition[1] + (tetra.galaxyPosition[1] - tetra.treePosition[1]) * smooth,
        tetra.treePosition[2] + (tetra.galaxyPosition[2] - tetra.treePosition[2]) * smooth
      );
      dummy.rotation.y = tetra.angle + timeRef.current * 0.2;
      dummy.rotation.x = Math.PI * 0.15;
      dummy.rotation.z = tetra.angle * 0.5;
      dummy.scale.setScalar(0.06);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, tetraCount]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial 
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.3}
        metalness={0.95}
        roughness={0.05}
        envMapIntensity={2}
      />
    </instancedMesh>
  );
}

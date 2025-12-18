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

// Main tree particles (green sparkles/snow effect)
export function ParticleSystem({ state, particleCount = 4000 }: ParticleSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  
  const particleData = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const treePos = generateTreePosition(i, particleCount);
      const galaxyPos = generateGalaxyPosition();
      
      // 85% green for tree body, 15% white sparkles
      const colorRand = Math.random();
      let color: THREE.Color;
      
      if (colorRand < 0.85) {
        // Rich Christmas GREEN - varying shades
        const hue = 0.33 + Math.random() * 0.05;
        const saturation = 0.7 + Math.random() * 0.3;
        const lightness = 0.25 + Math.random() * 0.2;
        color = new THREE.Color().setHSL(hue, saturation, lightness);
      } else {
        // White/silver sparkles
        color = new THREE.Color().setHSL(0, 0, 0.9 + Math.random() * 0.1);
      }
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        currentPosition: [...treePos] as [number, number, number],
        color,
        scale: 0.015 + Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
      };
    });
  }, [particleCount]);

  const positionsRef = useRef(particleData.map(p => [...p.treePosition]));

  useEffect(() => {
    const targetPositions = state === 'tree' 
      ? particleData.map(p => p.treePosition)
      : particleData.map(p => p.galaxyPosition);

    positionsRef.current.forEach((pos, i) => {
      gsap.to(pos, {
        0: targetPositions[i][0],
        1: targetPositions[i][1],
        2: targetPositions[i][2],
        duration: 1.5 + Math.random() * 0.5,
        ease: state === 'tree' ? 'power2.inOut' : 'power2.out',
        delay: Math.random() * 0.3,
      });
    });
  }, [state, particleData]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    
    particleData.forEach((particle, i) => {
      const pos = positionsRef.current[i];
      
      const breathe = Math.sin(timeRef.current * particle.speed + particle.phase) * 0.03;
      
      dummy.position.set(pos[0], pos[1] + breathe, pos[2]);
      dummy.rotation.y = timeRef.current * 0.5 + particle.phase;
      
      const scalePulse = 1 + Math.sin(timeRef.current * 3 + particle.phase) * 0.15;
      dummy.scale.setScalar(particle.scale * scalePulse);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, particle.color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// Colorful ornament balls
export function OrnamentBalls({ state }: { state: TreeState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const ornamentCount = 40;
  
  const ornamentData = useMemo(() => {
    // Christmas ornament colors
    const colors = [
      new THREE.Color('#C41E3A'), // Red
      new THREE.Color('#1E90FF'), // Blue
      new THREE.Color('#FFD700'), // Gold
      new THREE.Color('#228B22'), // Green
      new THREE.Color('#FF69B4'), // Pink
      new THREE.Color('#9400D3'), // Purple
      new THREE.Color('#FF8C00'), // Orange
      new THREE.Color('#C0C0C0'), // Silver
      new THREE.Color('#8B0000'), // Dark red
      new THREE.Color('#4169E1'), // Royal blue
    ];
    
    return Array.from({ length: ornamentCount }, (_, i) => {
      const treePos = generateOrnamentPosition(i, ornamentCount);
      const galaxyPos = generateGalaxyPosition();
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        color: colors[i % colors.length],
        scale: 0.12 + Math.random() * 0.1,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, []);

  const positionsRef = useRef(ornamentData.map(p => [...p.treePosition]));

  useEffect(() => {
    const targetPositions = state === 'tree' 
      ? ornamentData.map(p => p.treePosition)
      : ornamentData.map(p => p.galaxyPosition);

    positionsRef.current.forEach((pos, i) => {
      gsap.to(pos, {
        0: targetPositions[i][0],
        1: targetPositions[i][1],
        2: targetPositions[i][2],
        duration: 1.2 + Math.random() * 0.4,
        ease: 'power2.inOut',
        delay: Math.random() * 0.2,
      });
    });
  }, [state, ornamentData]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    
    ornamentData.forEach((ornament, i) => {
      const pos = positionsRef.current[i];
      
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.scale.setScalar(ornament.scale);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, ornament.color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ornamentCount]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial 
        metalness={0.8}
        roughness={0.2}
        envMapIntensity={1}
      />
    </instancedMesh>
  );
}

// Golden ribbon/garland spiral
export function RibbonGarland({ state }: { state: TreeState }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const ribbonCount = 150;
  
  const ribbonData = useMemo(() => {
    return Array.from({ length: ribbonCount }, (_, i) => {
      const treePos = generateRibbonPosition(i, ribbonCount);
      const galaxyPos = generateGalaxyPosition();
      
      // Golden color with slight variation
      const hue = 0.12 + Math.random() * 0.03;
      const color = new THREE.Color().setHSL(hue, 1, 0.5 + Math.random() * 0.1);
      
      return {
        treePosition: treePos,
        galaxyPosition: galaxyPos,
        color,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, []);

  const positionsRef = useRef(ribbonData.map(p => [...p.treePosition]));

  useEffect(() => {
    const targetPositions = state === 'tree' 
      ? ribbonData.map(p => p.treePosition)
      : ribbonData.map(p => p.galaxyPosition);

    positionsRef.current.forEach((pos, i) => {
      gsap.to(pos, {
        0: targetPositions[i][0],
        1: targetPositions[i][1],
        2: targetPositions[i][2],
        duration: 1.3 + Math.random() * 0.4,
        ease: 'power2.inOut',
        delay: Math.random() * 0.2,
      });
    });
  }, [state, ribbonData]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    
    ribbonData.forEach((ribbon, i) => {
      const pos = positionsRef.current[i];
      
      // Elongated shape along the spiral
      const t = i / ribbonCount;
      const angle = t * Math.PI * 8;
      
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.rotation.y = angle;
      dummy.rotation.z = 0.3;
      dummy.scale.set(0.15, 0.03, 0.08);
      
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, ribbon.color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, ribbonCount]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

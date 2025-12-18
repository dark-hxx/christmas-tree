import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '@/types/christmas';

interface TreeStarProps {
  state: TreeState;
}

// Create a refined 5-pointed star shape
function createStarShape(outerRadius: number, innerRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const points = 5;
  
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();
  return shape;
}

export function TreeStar({ state }: TreeStarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  // Create thin extruded star geometry
  const starGeometry = useMemo(() => {
    const shape = createStarShape(0.3, 0.12);
    const extrudeSettings = {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 1,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    
    // Gentle rotation
    if (starRef.current) {
      starRef.current.rotation.z += delta * 0.2;
    }

    // Position based on state
    const targetY = state === 'tree' ? 4.4 : 10;
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.05;
    
    // Fade material
    if (starRef.current) {
      const mat = starRef.current.material as THREE.MeshStandardMaterial;
      const targetOpacity = state === 'tree' ? 1 : 0;
      mat.opacity += (targetOpacity - mat.opacity) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, 4.4, 0]}>
      {/* Glowing star */}
      <mesh 
        ref={starRef} 
        geometry={starGeometry}
        rotation={[Math.PI / 4, 0.3, 0]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          color="#ffeedd"
          emissive="#ffdd00"
          emissiveIntensity={3}
          metalness={0.95}
          roughness={0.05}
          transparent
          opacity={1}
        />
      </mesh>
      
      {/* Outer glow effect */}
      <mesh rotation={[Math.PI / 4, 0.3, 0]} scale={1.3}>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial 
          color="#ffdd44"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
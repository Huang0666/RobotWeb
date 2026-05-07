import { useMemo } from "react";
import { useRobotStore } from "../../store/robotStore";

function Leg({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, -0.28, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.16, 0.55, 0.16]} />
        <meshStandardMaterial color="#172023" metalness={0.25} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, -0.36, 0.06]}>
        <boxGeometry args={[0.28, 0.12, 0.36]} />
        <meshStandardMaterial color="#101719" metalness={0.2} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function RobotDog() {
  const pose = useRobotStore((state) => state.pose);
  const legs = useMemo(
    () => [
      [-0.45, -0.32],
      [0.45, -0.32],
      [-0.45, 0.38],
      [0.45, 0.38],
    ] as const,
    [],
  );

  return (
    <group position={[pose.x, pose.y + 0.78, pose.z]} rotation={[0, pose.yaw, 0]}>
      <mesh castShadow position={[0, 0, 0.05]}>
        <boxGeometry args={[1.2, 0.42, 1.15]} />
        <meshStandardMaterial color="#f0f4f3" metalness={0.18} roughness={0.28} />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0.78]}>
        <boxGeometry args={[0.62, 0.34, 0.45]} />
        <meshStandardMaterial color="#dfe9ea" metalness={0.18} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.09, 1.03]}>
        <boxGeometry args={[0.38, 0.18, 0.08]} />
        <meshStandardMaterial color="#1d79b8" emissive="#0a3652" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.27, 0.02]}>
        <boxGeometry args={[0.92, 0.08, 0.62]} />
        <meshStandardMaterial color="#222b2d" metalness={0.32} roughness={0.26} />
      </mesh>
      {legs.map(([x, z]) => (
        <Leg key={`${x}-${z}`} x={x} z={z} />
      ))}
    </group>
  );
}

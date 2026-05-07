import { useRobotStore } from "../../store/robotStore";

type BoxSpec = {
  id: string;
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  layer: "roads" | "buildings" | "process";
};

type TankSpec = {
  id: string;
  position: [number, number, number];
  radius: number;
  height: number;
};

const roads: BoxSpec[] = [
  { id: "road-main", position: [-6, 0.03, 4], scale: [4.2, 0.06, 32], color: "#6e7470", layer: "roads" },
  { id: "road-south", position: [1, 0.04, 18], scale: [42, 0.06, 4.2], color: "#747a76", layer: "roads" },
  { id: "road-mid", position: [0, 0.04, 4], scale: [42, 0.06, 4.2], color: "#747a76", layer: "roads" },
  { id: "road-north", position: [0, 0.04, -10], scale: [42, 0.06, 4.2], color: "#747a76", layer: "roads" },
  { id: "green-a", position: [-13, 0.05, 11], scale: [2.2, 0.08, 12], color: "#24764f", layer: "roads" },
  { id: "green-b", position: [13, 0.05, 11], scale: [2.2, 0.08, 12], color: "#24764f", layer: "roads" },
];

const buildings: BoxSpec[] = [
  { id: "control", position: [8, 0.8, 19], scale: [7.6, 1.6, 4.2], color: "#dfe8ec", layer: "buildings" },
  { id: "warehouse", position: [20, 1.15, 16], scale: [7, 2.3, 7], color: "#d8e8eb", layer: "buildings" },
  { id: "warehouse-roof", position: [20, 2.45, 16], scale: [7.7, 0.25, 7.7], color: "#3186b8", layer: "buildings" },
  { id: "substation", position: [-19, 0.7, -1.5], scale: [4.8, 1.4, 3.4], color: "#d9dee6", layer: "buildings" },
];

const processUnits: BoxSpec[] = [
  { id: "pipe-rack-a", position: [12, 1.55, -9.5], scale: [15, 0.35, 1], color: "#9fb8c8", layer: "process" },
  { id: "pipe-rack-b", position: [12, 2.5, -12.5], scale: [15, 0.35, 1], color: "#8aaac0", layer: "process" },
  { id: "deck", position: [13.5, 2.22, -10], scale: [13.5, 0.18, 7.2], color: "#dbe5e8", layer: "process" },
  { id: "upper-deck", position: [21.5, 4.62, -14.8], scale: [4.5, 0.18, 8], color: "#dae7e9", layer: "process" },
  { id: "gantry", position: [22, 3.1, 9], scale: [5, 6.2, 0.35], color: "#b26b4e", layer: "process" },
];

const tanks: TankSpec[] = [
  { id: "tank-01", position: [-21, 1.15, 9], radius: 2.2, height: 2.3 },
  { id: "tank-02", position: [-16, 1.15, 9], radius: 2.2, height: 2.3 },
  { id: "tank-03", position: [-21, 1.15, 3], radius: 2.2, height: 2.3 },
  { id: "tank-04", position: [-16, 1.15, 3], radius: 2.2, height: 2.3 },
  { id: "tank-05", position: [-10, 1.15, 8], radius: 2.3, height: 2.3 },
  { id: "tank-06", position: [-10, 1.15, 2], radius: 2.3, height: 2.3 },
  { id: "tank-07", position: [-1, 1.05, 8], radius: 2, height: 2.1 },
  { id: "tank-08", position: [3.5, 1.05, 8], radius: 2, height: 2.1 },
  { id: "tank-09", position: [3.5, 1.05, 2], radius: 2, height: 2.1 },
];

function IndustrialBox({ spec }: { spec: BoxSpec }) {
  return (
    <mesh castShadow receiveShadow position={spec.position}>
      <boxGeometry args={spec.scale} />
      <meshStandardMaterial color={spec.color} roughness={0.62} metalness={0.12} />
    </mesh>
  );
}

function Tank({ spec }: { spec: TankSpec }) {
  return (
    <group position={spec.position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[spec.radius, spec.radius, spec.height, 40]} />
        <meshStandardMaterial color="#d9d7cf" roughness={0.5} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[spec.radius + 0.03, spec.radius + 0.03, 0.24, 40]} />
        <meshStandardMaterial color="#4d77a6" roughness={0.45} metalness={0.16} />
      </mesh>
      <mesh position={[0, spec.height / 2 + 0.05, 0]}>
        <cylinderGeometry args={[spec.radius * 0.94, spec.radius * 0.94, 0.1, 40]} />
        <meshStandardMaterial color="#f3efe5" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Tower({ x, z, height, radius }: { x: number; z: number; height: number; radius: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 1.08, height, 24]} />
        <meshStandardMaterial color="#cbd8df" metalness={0.35} roughness={0.34} />
      </mesh>
      <mesh castShadow position={[0, height + 0.45, 0]}>
        <cylinderGeometry args={[radius * 0.45, radius * 0.55, 0.9, 18]} />
        <meshStandardMaterial color="#89aab7" metalness={0.35} roughness={0.35} />
      </mesh>
    </group>
  );
}

function StairsAndRamp() {
  const steps = Array.from({ length: 8 }, (_, index) => index);
  return (
    <group>
      {steps.map((step) => (
        <mesh castShadow receiveShadow key={step} position={[12.2 + step * 0.37, 0.15 + step * 0.15, -4.6 - step * 0.43]}>
          <boxGeometry args={[1.8, 0.18, 0.55]} />
          <meshStandardMaterial color="#becbd0" roughness={0.52} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[20, 3.58, -9]} rotation={[0.62, 0, -0.08]}>
        <boxGeometry args={[2.6, 0.18, 7.2]} />
        <meshStandardMaterial color="#c6d2d6" roughness={0.55} />
      </mesh>
    </group>
  );
}

export function FactoryScene() {
  const layers = useRobotStore((state) => state.layers);
  return (
    <group>
      <mesh receiveShadow position={[0, -0.02, 1]}>
        <boxGeometry args={[58, 0.08, 46]} />
        <meshStandardMaterial color="#d9ddd7" roughness={0.8} />
      </mesh>
      {layers.roads ? roads.map((road) => <IndustrialBox key={road.id} spec={road} />) : null}
      {layers.buildings ? buildings.map((building) => <IndustrialBox key={building.id} spec={building} />) : null}
      {layers.tanks ? tanks.map((tank) => <Tank key={tank.id} spec={tank} />) : null}
      {layers.process ? processUnits.map((unit) => <IndustrialBox key={unit.id} spec={unit} />) : null}
      {layers.process ? (
        <>
          <Tower height={8} radius={0.75} x={5} z={-9} />
          <Tower height={6} radius={0.55} x={17.5} z={-12} />
          <Tower height={10} radius={0.45} x={-19} z={-11} />
          <StairsAndRamp />
        </>
      ) : null}
    </group>
  );
}

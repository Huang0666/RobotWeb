import { Line } from "@react-three/drei";
import { navGraph } from "../../data/factoryMap";
import { pathToNodes } from "../../lib/pathfinding";
import { useRobotStore } from "../../store/robotStore";

function nodePoint(nodeId: string): [number, number, number] {
  const node = navGraph.nodes.find((candidate) => candidate.id === nodeId);
  return node ? [node.x, node.y + 0.09, node.z] : [0, 0, 0];
}

export function NavigationOverlay() {
  const layers = useRobotStore((state) => state.layers);
  const activePath = useRobotStore((state) => state.activePath);
  const selectedTargetId = useRobotStore((state) => state.selectedTargetId);
  const goToNode = useRobotStore((state) => state.goToNode);
  const activeNodes = pathToNodes(navGraph, activePath);

  return (
    <group>
      {layers.nav
        ? navGraph.edges.map((edge) => (
            <Line
              color={edge.type === "road" ? "#5f786f" : edge.type === "stair" ? "#e3a32b" : "#2d87c8"}
              key={`${edge.from}-${edge.to}`}
              lineWidth={edge.type === "road" ? 1.25 : 2.5}
              opacity={0.55}
              points={[nodePoint(edge.from), nodePoint(edge.to)]}
              transparent
            />
          ))
        : null}
      {layers.nav
        ? navGraph.nodes.map((node) => (
            <mesh
              castShadow
              key={node.id}
              onClick={(event) => {
                event.stopPropagation();
                goToNode(node.id);
              }}
              position={[node.x, node.y + 0.18, node.z]}
            >
              <sphereGeometry args={[node.id === selectedTargetId ? 0.32 : 0.2, 18, 12]} />
              <meshStandardMaterial
                color={node.id === selectedTargetId ? "#f2a900" : node.type === "inspection" ? "#1d79b8" : "#2f7d58"}
                emissive={node.id === selectedTargetId ? "#7a4c00" : "#000000"}
                emissiveIntensity={node.id === selectedTargetId ? 0.28 : 0}
              />
            </mesh>
          ))
        : null}
      {layers.route && activeNodes.length > 1 ? (
        <Line
          color="#f4b43a"
          lineWidth={5}
          points={activeNodes.map((node) => [node.x, node.y + 0.34, node.z])}
        />
      ) : null}
    </group>
  );
}

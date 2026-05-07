import type { NavEdge, NavGraph, NavNode, Vector3Point } from "../types";

type QueueItem = {
  nodeId: string;
  priority: number;
};

function distance(a: Vector3Point, b: Vector3Point) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function neighborsFor(graph: NavGraph, nodeId: string) {
  const neighbors: Array<{ nodeId: string; edge: NavEdge }> = [];
  for (const edge of graph.edges) {
    if (edge.from === nodeId) {
      neighbors.push({ nodeId: edge.to, edge });
    }
    if (edge.bidirectional && edge.to === nodeId) {
      neighbors.push({ nodeId: edge.from, edge });
    }
  }
  return neighbors;
}

function popLowest(queue: QueueItem[]) {
  queue.sort((a, b) => a.priority - b.priority);
  return queue.shift();
}

export function findNearestNode(graph: NavGraph, point: Vector3Point) {
  return graph.nodes.reduce<NavNode>((nearest, node) => {
    return distance(node, point) < distance(nearest, point) ? node : nearest;
  }, graph.nodes[0]);
}

export function findPath(graph: NavGraph, startId: string, targetId: string) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  if (!nodeById.has(startId) || !nodeById.has(targetId)) {
    return [];
  }

  const target = nodeById.get(targetId)!;
  const frontier: QueueItem[] = [{ nodeId: startId, priority: 0 }];
  const cameFrom = new Map<string, string | null>([[startId, null]]);
  const costSoFar = new Map<string, number>([[startId, 0]]);

  while (frontier.length > 0) {
    const current = popLowest(frontier);
    if (!current) {
      break;
    }
    if (current.nodeId === targetId) {
      break;
    }

    for (const next of neighborsFor(graph, current.nodeId)) {
      const nextCost = (costSoFar.get(current.nodeId) ?? 0) + next.edge.distance;
      const previousCost = costSoFar.get(next.nodeId);
      if (previousCost === undefined || nextCost < previousCost) {
        const nextNode = nodeById.get(next.nodeId)!;
        costSoFar.set(next.nodeId, nextCost);
        frontier.push({ nodeId: next.nodeId, priority: nextCost + distance(nextNode, target) });
        cameFrom.set(next.nodeId, current.nodeId);
      }
    }
  }

  if (!cameFrom.has(targetId)) {
    return [];
  }

  const path: string[] = [];
  let current: string | null = targetId;
  while (current !== null) {
    path.push(current);
    current = cameFrom.get(current) ?? null;
  }
  return path.reverse();
}

export function pathToNodes(graph: NavGraph, nodeIds: string[]) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  return nodeIds.map((nodeId) => nodeById.get(nodeId)).filter((node): node is NavNode => Boolean(node));
}

export function pathDistance(graph: NavGraph, nodeIds: string[]) {
  const nodes = pathToNodes(graph, nodeIds);
  return nodes.slice(1).reduce((total, node, index) => total + distance(nodes[index], node), 0);
}

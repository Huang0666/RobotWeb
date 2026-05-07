import { create } from "zustand";
import { mapManifest, navGraph, seedRoutes } from "../data/factoryMap";
import { createRoute, fetchRobotPose, fetchRoutes, resetRobotPose, runInspectionRoute, sendRobotCommand } from "../lib/api";
import { findNearestNode, findPath, pathDistance, pathToNodes } from "../lib/pathfinding";
import type { InspectionRoute, LayerVisibility, NavNode, RobotCommand, RobotPose, Vector3Point } from "../types";

const defaultLayers = Object.fromEntries(
  mapManifest.layers.map((layer) => [layer.key, layer.enabledByDefault]),
) as LayerVisibility;

const initialPose: RobotPose = {
  robotId: "robot-dog-001",
  level: "ground",
  x: -6,
  y: 0,
  z: 4,
  yaw: Math.PI / 2,
  mode: "idle",
  updatedAt: new Date().toISOString(),
};

type RouteProgress = {
  segmentIndex: number;
  distanceOnSegment: number;
};

type RobotStore = {
  pose: RobotPose;
  apiStatus: "idle" | "connected" | "offline" | "syncing";
  apiError: string;
  lastSyncedAt: string;
  selectedTargetId: string;
  activePath: string[];
  activeCommand: RobotCommand | null;
  routeProgress: RouteProgress;
  routes: InspectionRoute[];
  draftRouteName: string;
  draftWaypointIds: string[];
  selectedRouteId: string;
  layers: LayerVisibility;
  hydrateFromApi: () => Promise<void>;
  setDraftRouteName: (name: string) => void;
  addDraftWaypoint: (nodeId: string) => void;
  removeDraftWaypoint: (nodeId: string) => void;
  clearDraftRoute: () => void;
  saveDraftRoute: () => Promise<void>;
  goToNode: (nodeId: string) => void;
  runRoute: (routeId: string) => void;
  setTargetFromPoint: (point: Vector3Point) => NavNode;
  teleop: (command: "forward" | "backward" | "left" | "right") => void;
  stop: () => void;
  resetPose: () => void;
  toggleLayer: (key: keyof LayerVisibility) => void;
  advanceRoute: (deltaSeconds: number) => void;
  sendCommandToApi: (command: RobotCommand, applyPose?: boolean) => Promise<void>;
  runRouteOnApi: (routeId: string) => Promise<void>;
  resetPoseOnApi: () => Promise<void>;
};

function now() {
  return new Date().toISOString();
}

function poseFromNode(node: NavNode, yaw: number, mode: RobotPose["mode"]): RobotPose {
  return {
    robotId: "robot-dog-001",
    level: node.level,
    x: node.x,
    y: node.y,
    z: node.z,
    yaw,
    mode,
    updatedAt: now(),
  };
}

function yawTo(from: Vector3Point, to: Vector3Point) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

function routeBetweenWaypoints(waypointNodeIds: string[]) {
  let fullPath: string[] = [];
  for (let index = 0; index < waypointNodeIds.length - 1; index += 1) {
    const segment = findPath(navGraph, waypointNodeIds[index], waypointNodeIds[index + 1]);
    fullPath = index === 0 ? segment : [...fullPath, ...segment.slice(1)];
  }
  return fullPath;
}

export const useRobotStore = create<RobotStore>((set, get) => ({
  pose: initialPose,
  apiStatus: "idle",
  apiError: "",
  lastSyncedAt: "",
  selectedTargetId: "control_room",
  activePath: [],
  activeCommand: null,
  routeProgress: { segmentIndex: 0, distanceOnSegment: 0 },
  routes: seedRoutes,
  draftRouteName: "自定义巡检路线",
  draftWaypointIds: ["gate", "control_room"],
  selectedRouteId: seedRoutes[0].id,
  layers: defaultLayers,
  hydrateFromApi: async () => {
    set({ apiStatus: "syncing", apiError: "" });
    try {
      const [pose, routes] = await Promise.all([fetchRobotPose(get().pose.robotId), fetchRoutes()]);
      set({
        pose,
        routes: routes.length > 0 ? routes : get().routes,
        selectedRouteId: routes[0]?.id ?? get().selectedRouteId,
        apiStatus: "connected",
        lastSyncedAt: now(),
      });
    } catch (error) {
      set({
        apiStatus: "offline",
        apiError: error instanceof Error ? error.message : "接口同步失败",
      });
    }
  },
  setDraftRouteName: (name) => {
    set({ draftRouteName: name });
  },
  addDraftWaypoint: (nodeId) => {
    const current = get().draftWaypointIds;
    set({ draftWaypointIds: current.includes(nodeId) ? current : [...current, nodeId] });
  },
  removeDraftWaypoint: (nodeId) => {
    set({ draftWaypointIds: get().draftWaypointIds.filter((candidate) => candidate !== nodeId) });
  },
  clearDraftRoute: () => {
    set({ draftWaypointIds: [] });
  },
  saveDraftRoute: async () => {
    const state = get();
    if (state.draftWaypointIds.length < 2) {
      set({ apiError: "路线至少需要两个巡检点" });
      return;
    }
    const route: InspectionRoute = {
      id: `route-${Date.now()}`,
      name: state.draftRouteName.trim() || "自定义巡检路线",
      waypointNodeIds: state.draftWaypointIds,
      createdAt: now(),
      updatedAt: now(),
    };
    set({ apiStatus: "syncing", apiError: "" });
    try {
      const saved = await createRoute(route);
      set({
        routes: [saved, ...state.routes],
        selectedRouteId: saved.id,
        apiStatus: "connected",
        apiError: "",
        lastSyncedAt: now(),
      });
    } catch (error) {
      set({
        routes: [route, ...state.routes],
        selectedRouteId: route.id,
        apiStatus: "offline",
        apiError: error instanceof Error ? error.message : "路线仅保存在本地",
      });
    }
  },
  goToNode: (nodeId) => {
    const start = findNearestNode(navGraph, get().pose);
    const path = findPath(navGraph, start.id, nodeId);
    const command: RobotCommand = { type: "goto", targetNodeId: nodeId };
    set({
      selectedTargetId: nodeId,
      activePath: path,
      activeCommand: command,
      routeProgress: { segmentIndex: 0, distanceOnSegment: 0 },
      pose: { ...get().pose, mode: "autonomous", updatedAt: now() },
    });
    void get().sendCommandToApi(command, false);
  },
  runRoute: (routeId) => {
    const route = get().routes.find((candidate) => candidate.id === routeId);
    if (!route) {
      return;
    }
    const nearest = findNearestNode(navGraph, get().pose);
    const routePath = routeBetweenWaypoints([nearest.id, ...route.waypointNodeIds]);
    set({
      selectedRouteId: routeId,
      selectedTargetId: route.waypointNodeIds.at(-1) ?? nearest.id,
      activePath: routePath,
      activeCommand: { type: "goto", targetNodeId: route.waypointNodeIds.at(-1) ?? nearest.id },
      routeProgress: { segmentIndex: 0, distanceOnSegment: 0 },
      pose: { ...get().pose, mode: "autonomous", updatedAt: now() },
    });
    void get().runRouteOnApi(routeId);
  },
  setTargetFromPoint: (point) => {
    const nearest = findNearestNode(navGraph, point);
    get().goToNode(nearest.id);
    return nearest;
  },
  teleop: (command) => {
    const pose = get().pose;
    const step = command === "backward" ? -0.8 : 0.8;
    const turn = Math.PI / 14;
    if (command === "left" || command === "right") {
      const robotCommand: RobotCommand = { type: "teleop", linear: 0, angular: command === "left" ? 1 : -1 };
      set({
        activePath: [],
        activeCommand: robotCommand,
        pose: {
          ...pose,
          yaw: pose.yaw + (command === "left" ? turn : -turn),
          mode: "teleop",
          updatedAt: now(),
        },
      });
      void get().sendCommandToApi(robotCommand, false);
      return;
    }
    const robotCommand: RobotCommand = { type: "teleop", linear: step, angular: 0 };
    set({
      activePath: [],
      activeCommand: robotCommand,
      pose: {
        ...pose,
        x: pose.x + Math.sin(pose.yaw) * step,
        z: pose.z + Math.cos(pose.yaw) * step,
        mode: "teleop",
        updatedAt: now(),
      },
    });
    void get().sendCommandToApi(robotCommand, false);
  },
  stop: () => {
    const command: RobotCommand = { type: "stop" };
    set({
      activePath: [],
      activeCommand: command,
      routeProgress: { segmentIndex: 0, distanceOnSegment: 0 },
      pose: { ...get().pose, mode: "stopped", updatedAt: now() },
    });
    void get().sendCommandToApi(command);
  },
  resetPose: () => {
    set({
      pose: initialPose,
      activePath: [],
      activeCommand: null,
      routeProgress: { segmentIndex: 0, distanceOnSegment: 0 },
    });
    void get().resetPoseOnApi();
  },
  toggleLayer: (key) => {
    set({ layers: { ...get().layers, [key]: !get().layers[key] } });
  },
  advanceRoute: (deltaSeconds) => {
    const state = get();
    const nodes = pathToNodes(navGraph, state.activePath);
    if (nodes.length < 2 || state.pose.mode !== "autonomous") {
      return;
    }

    let segmentIndex = state.routeProgress.segmentIndex;
    let distanceOnSegment = state.routeProgress.distanceOnSegment + deltaSeconds * 2.2;

    while (segmentIndex < nodes.length - 1) {
      const start = nodes[segmentIndex];
      const end = nodes[segmentIndex + 1];
      const segmentDistance = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
      if (distanceOnSegment <= segmentDistance) {
        const t = segmentDistance === 0 ? 1 : distanceOnSegment / segmentDistance;
        const pose: RobotPose = {
          robotId: state.pose.robotId,
          level: t > 0.5 ? end.level : start.level,
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
          z: start.z + (end.z - start.z) * t,
          yaw: yawTo(start, end),
          mode: "autonomous",
          updatedAt: now(),
        };
        set({ pose, routeProgress: { segmentIndex, distanceOnSegment } });
        return;
      }
      distanceOnSegment -= segmentDistance;
      segmentIndex += 1;
    }

    const finalNode = nodes.at(-1)!;
    set({
      pose: poseFromNode(finalNode, state.pose.yaw, "arrived"),
      activePath: [],
      routeProgress: { segmentIndex: 0, distanceOnSegment: 0 },
    });
  },
  sendCommandToApi: async (command: RobotCommand, applyPose = true) => {
    try {
      const pose = await sendRobotCommand(get().pose.robotId, command);
      set({
        pose: applyPose ? pose : get().pose,
        apiStatus: "connected",
        apiError: "",
        lastSyncedAt: now(),
      });
    } catch (error) {
      set({
        apiStatus: "offline",
        apiError: error instanceof Error ? error.message : "控制命令同步失败",
      });
    }
  },
  runRouteOnApi: async (routeId: string) => {
    try {
      const pose = await runInspectionRoute(routeId);
      set({
        pose: get().pose.mode === "autonomous" ? get().pose : pose,
        apiStatus: "connected",
        apiError: "",
        lastSyncedAt: now(),
      });
    } catch (error) {
      set({
        apiStatus: "offline",
        apiError: error instanceof Error ? error.message : "巡检路线运行同步失败",
      });
    }
  },
  resetPoseOnApi: async () => {
    try {
      const pose = await resetRobotPose(get().pose.robotId);
      set({
        pose,
        apiStatus: "connected",
        apiError: "",
        lastSyncedAt: now(),
      });
    } catch (error) {
      set({
        apiStatus: "offline",
        apiError: error instanceof Error ? error.message : "复位同步失败",
      });
    }
  },
}));

export function activeRouteDistance(nodeIds: string[]) {
  return pathDistance(navGraph, nodeIds);
}

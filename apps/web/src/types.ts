export type LevelId = "ground" | "deck" | "upper";

export type Vector3Point = {
  x: number;
  y: number;
  z: number;
};

export type MapLayerKey = "roads" | "tanks" | "process" | "buildings" | "nav" | "route";

export type MapManifest = {
  mapId: string;
  name: string;
  scale: "meters";
  origin: Vector3Point;
  levels: Array<{
    id: LevelId;
    name: string;
    elevation: number;
  }>;
  defaultCamera: {
    position: Vector3Point;
    target: Vector3Point;
  };
  layers: Array<{
    key: MapLayerKey;
    label: string;
    enabledByDefault: boolean;
  }>;
};

export type NavNodeType = "road" | "inspection" | "stair" | "ramp" | "platform" | "dock";

export type NavEdgeType = "road" | "stair" | "ramp";

export type NavNode = Vector3Point & {
  id: string;
  label: string;
  level: LevelId;
  type: NavNodeType;
  zone: string;
};

export type NavEdge = {
  from: string;
  to: string;
  type: NavEdgeType;
  distance: number;
  bidirectional: boolean;
};

export type NavGraph = {
  nodes: NavNode[];
  edges: NavEdge[];
};

export type InspectionRoute = {
  id: string;
  name: string;
  waypointNodeIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type RobotMode = "idle" | "teleop" | "autonomous" | "arrived" | "stopped";

export type RobotPose = Vector3Point & {
  robotId: string;
  level: LevelId;
  yaw: number;
  mode: RobotMode;
  updatedAt: string;
};

export type RobotCommand =
  | { type: "teleop"; linear: number; angular: number }
  | { type: "goto"; targetNodeId: string }
  | { type: "stop" };

export type LayerVisibility = Record<MapLayerKey, boolean>;

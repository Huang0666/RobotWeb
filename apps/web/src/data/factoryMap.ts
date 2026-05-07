import type { InspectionRoute, MapManifest, NavEdge, NavGraph, NavNode } from "../types";

export const mapManifest: MapManifest = {
  mapId: "industrial-clean-yard-v1",
  name: "北区工艺厂区",
  scale: "meters",
  origin: { x: 0, y: 0, z: 0 },
  levels: [
    { id: "ground", name: "地面厂区", elevation: 0 },
    { id: "deck", name: "工艺平台", elevation: 2.4 },
    { id: "upper", name: "上层管廊", elevation: 4.8 },
  ],
  defaultCamera: {
    position: { x: 34, y: 28, z: 34 },
    target: { x: 0, y: 0, z: 0 },
  },
  layers: [
    { key: "roads", label: "道路", enabledByDefault: true },
    { key: "tanks", label: "罐区", enabledByDefault: true },
    { key: "process", label: "工艺装置", enabledByDefault: true },
    { key: "buildings", label: "建筑", enabledByDefault: true },
    { key: "nav", label: "导航图", enabledByDefault: true },
    { key: "route", label: "当前路线", enabledByDefault: true },
  ],
};

export const navNodes: NavNode[] = [
  { id: "gate", label: "主入口", x: -18, y: 0, z: 18, level: "ground", type: "dock", zone: "南区" },
  { id: "cross_south", label: "南侧路口", x: -6, y: 0, z: 18, level: "ground", type: "road", zone: "南区" },
  { id: "control_room", label: "控制室", x: 8, y: 0, z: 18, level: "ground", type: "inspection", zone: "南区" },
  { id: "warehouse", label: "仓库门口", x: 19, y: 0, z: 16, level: "ground", type: "inspection", zone: "南区" },
  { id: "tank_a", label: "罐区 A", x: -18, y: 0, z: 4, level: "ground", type: "inspection", zone: "罐区" },
  { id: "tank_b", label: "罐区 B", x: -8, y: 0, z: 4, level: "ground", type: "inspection", zone: "罐区" },
  { id: "tank_c", label: "罐区 C", x: 2, y: 0, z: 4, level: "ground", type: "inspection", zone: "罐区" },
  { id: "cross_mid", label: "中央道路", x: -6, y: 0, z: 4, level: "ground", type: "road", zone: "中区" },
  { id: "process_entry", label: "工艺区入口", x: 8, y: 0, z: 4, level: "ground", type: "road", zone: "中区" },
  { id: "pipe_low", label: "管廊底部", x: 18, y: 0, z: 4, level: "ground", type: "inspection", zone: "工艺区" },
  { id: "cross_north", label: "北侧路口", x: -6, y: 0, z: -10, level: "ground", type: "road", zone: "北区" },
  { id: "flare_base", label: "火炬底部", x: -19, y: 0, z: -11, level: "ground", type: "inspection", zone: "工艺区" },
  { id: "reactor_base", label: "反应器底部", x: 5, y: 0, z: -9, level: "ground", type: "inspection", zone: "工艺区" },
  { id: "stair_bottom", label: "平台楼梯底部", x: 12, y: 0, z: -4, level: "ground", type: "stair", zone: "工艺区" },
  { id: "stair_mid", label: "平台楼梯中段", x: 13.5, y: 1.2, z: -6, level: "ground", type: "stair", zone: "工艺区" },
  { id: "deck_landing", label: "平台登陆点", x: 15, y: 2.4, z: -8, level: "deck", type: "platform", zone: "工艺区" },
  { id: "deck_reactor", label: "反应器平台", x: 8, y: 2.4, z: -11, level: "deck", type: "inspection", zone: "工艺区" },
  { id: "deck_pipe", label: "管廊平台", x: 18, y: 2.4, z: -12, level: "deck", type: "inspection", zone: "工艺区" },
  { id: "ramp_start", label: "上层坡道起点", x: 18, y: 2.4, z: -6, level: "deck", type: "ramp", zone: "工艺区" },
  { id: "ramp_mid", label: "上层坡道中段", x: 20, y: 3.6, z: -9, level: "deck", type: "ramp", zone: "工艺区" },
  { id: "upper_walkway", label: "上层步道", x: 22, y: 4.8, z: -12, level: "upper", type: "platform", zone: "工艺区" },
  { id: "upper_tower", label: "塔区巡检位", x: 22, y: 4.8, z: -17, level: "upper", type: "inspection", zone: "工艺区" },
];

const nodeById = new Map(navNodes.map((node) => [node.id, node]));

function edge(from: string, to: string, type: NavEdge["type"] = "road", bidirectional = true): NavEdge {
  const start = nodeById.get(from);
  const end = nodeById.get(to);
  if (!start || !end) {
    throw new Error(`未知导航边 ${from} -> ${to}`);
  }
  const distance = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z);
  return { from, to, type, distance, bidirectional };
}

export const navEdges: NavEdge[] = [
  edge("gate", "cross_south"),
  edge("cross_south", "control_room"),
  edge("control_room", "warehouse"),
  edge("gate", "tank_a"),
  edge("cross_south", "cross_mid"),
  edge("tank_a", "tank_b"),
  edge("tank_b", "tank_c"),
  edge("tank_b", "cross_mid"),
  edge("cross_mid", "process_entry"),
  edge("process_entry", "pipe_low"),
  edge("cross_mid", "cross_north"),
  edge("cross_north", "flare_base"),
  edge("cross_north", "reactor_base"),
  edge("process_entry", "reactor_base"),
  edge("process_entry", "stair_bottom"),
  edge("stair_bottom", "stair_mid", "stair"),
  edge("stair_mid", "deck_landing", "stair"),
  edge("deck_landing", "deck_reactor"),
  edge("deck_landing", "deck_pipe"),
  edge("deck_landing", "ramp_start"),
  edge("ramp_start", "ramp_mid", "ramp"),
  edge("ramp_mid", "upper_walkway", "ramp"),
  edge("upper_walkway", "upper_tower"),
];

export const navGraph: NavGraph = {
  nodes: navNodes,
  edges: navEdges,
};

export const seedRoutes: InspectionRoute[] = [
  {
    id: "route-shift-start",
    name: "班前安全巡检路线",
    waypointNodeIds: ["gate", "tank_b", "reactor_base", "deck_reactor", "upper_tower", "control_room"],
    createdAt: "2026-05-06T00:00:00+08:00",
    updatedAt: "2026-05-06T00:00:00+08:00",
  },
];

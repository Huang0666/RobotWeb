from datetime import UTC, datetime
from math import cos, sin
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


LevelId = Literal["ground", "deck", "upper"]
NodeType = Literal["road", "inspection", "stair", "ramp", "platform", "dock"]
EdgeType = Literal["road", "stair", "ramp"]
RobotMode = Literal["idle", "teleop", "autonomous", "arrived", "stopped"]


class Vector3Point(BaseModel):
    x: float
    y: float
    z: float


class MapManifest(BaseModel):
    mapId: str
    name: str
    scale: Literal["meters"]
    origin: Vector3Point
    defaultCamera: dict
    levels: list[dict]
    layers: list[dict]


class NavNode(Vector3Point):
    id: str
    label: str
    level: LevelId
    type: NodeType
    zone: str


class NavEdge(BaseModel):
    from_node: str = Field(alias="from")
    to: str
    type: EdgeType
    distance: float
    bidirectional: bool = True


class NavGraph(BaseModel):
    nodes: list[NavNode]
    edges: list[NavEdge]


class RobotPose(Vector3Point):
    robotId: str
    level: LevelId
    yaw: float
    mode: RobotMode
    updatedAt: str


class RobotCommand(BaseModel):
    type: Literal["teleop", "goto", "stop"]
    linear: float | None = None
    angular: float | None = None
    targetNodeId: str | None = None


class InspectionRoute(BaseModel):
    id: str
    name: str
    waypointNodeIds: list[str]
    createdAt: str
    updatedAt: str


def timestamp() -> str:
    return datetime.now(UTC).isoformat()


NODES = [
    {"id": "gate", "label": "主入口", "x": -18, "y": 0, "z": 18, "level": "ground", "type": "dock", "zone": "南区"},
    {"id": "cross_south", "label": "南侧路口", "x": -6, "y": 0, "z": 18, "level": "ground", "type": "road", "zone": "南区"},
    {"id": "control_room", "label": "控制室", "x": 8, "y": 0, "z": 18, "level": "ground", "type": "inspection", "zone": "南区"},
    {"id": "warehouse", "label": "仓库门口", "x": 19, "y": 0, "z": 16, "level": "ground", "type": "inspection", "zone": "南区"},
    {"id": "tank_a", "label": "罐区 A", "x": -18, "y": 0, "z": 4, "level": "ground", "type": "inspection", "zone": "罐区"},
    {"id": "tank_b", "label": "罐区 B", "x": -8, "y": 0, "z": 4, "level": "ground", "type": "inspection", "zone": "罐区"},
    {"id": "tank_c", "label": "罐区 C", "x": 2, "y": 0, "z": 4, "level": "ground", "type": "inspection", "zone": "罐区"},
    {"id": "cross_mid", "label": "中央道路", "x": -6, "y": 0, "z": 4, "level": "ground", "type": "road", "zone": "中区"},
    {"id": "process_entry", "label": "工艺区入口", "x": 8, "y": 0, "z": 4, "level": "ground", "type": "road", "zone": "中区"},
    {"id": "pipe_low", "label": "管廊底部", "x": 18, "y": 0, "z": 4, "level": "ground", "type": "inspection", "zone": "工艺区"},
    {"id": "cross_north", "label": "北侧路口", "x": -6, "y": 0, "z": -10, "level": "ground", "type": "road", "zone": "北区"},
    {"id": "flare_base", "label": "火炬底部", "x": -19, "y": 0, "z": -11, "level": "ground", "type": "inspection", "zone": "工艺区"},
    {"id": "reactor_base", "label": "反应器底部", "x": 5, "y": 0, "z": -9, "level": "ground", "type": "inspection", "zone": "工艺区"},
    {"id": "stair_bottom", "label": "平台楼梯底部", "x": 12, "y": 0, "z": -4, "level": "ground", "type": "stair", "zone": "工艺区"},
    {"id": "stair_mid", "label": "平台楼梯中段", "x": 13.5, "y": 1.2, "z": -6, "level": "ground", "type": "stair", "zone": "工艺区"},
    {"id": "deck_landing", "label": "平台登陆点", "x": 15, "y": 2.4, "z": -8, "level": "deck", "type": "platform", "zone": "工艺区"},
    {"id": "deck_reactor", "label": "反应器平台", "x": 8, "y": 2.4, "z": -11, "level": "deck", "type": "inspection", "zone": "工艺区"},
    {"id": "deck_pipe", "label": "管廊平台", "x": 18, "y": 2.4, "z": -12, "level": "deck", "type": "inspection", "zone": "工艺区"},
    {"id": "ramp_start", "label": "上层坡道起点", "x": 18, "y": 2.4, "z": -6, "level": "deck", "type": "ramp", "zone": "工艺区"},
    {"id": "ramp_mid", "label": "上层坡道中段", "x": 20, "y": 3.6, "z": -9, "level": "deck", "type": "ramp", "zone": "工艺区"},
    {"id": "upper_walkway", "label": "上层步道", "x": 22, "y": 4.8, "z": -12, "level": "upper", "type": "platform", "zone": "工艺区"},
    {"id": "upper_tower", "label": "塔区巡检位", "x": 22, "y": 4.8, "z": -17, "level": "upper", "type": "inspection", "zone": "工艺区"},
]


def distance_between(start_id: str, end_id: str) -> float:
    start = NODE_BY_ID[start_id]
    end = NODE_BY_ID[end_id]
    return ((end["x"] - start["x"]) ** 2 + (end["y"] - start["y"]) ** 2 + (end["z"] - start["z"]) ** 2) ** 0.5


NODE_BY_ID = {node["id"]: node for node in NODES}
EDGE_PAIRS = [
    ("gate", "cross_south", "road"),
    ("cross_south", "control_room", "road"),
    ("control_room", "warehouse", "road"),
    ("gate", "tank_a", "road"),
    ("cross_south", "cross_mid", "road"),
    ("tank_a", "tank_b", "road"),
    ("tank_b", "tank_c", "road"),
    ("tank_b", "cross_mid", "road"),
    ("cross_mid", "process_entry", "road"),
    ("process_entry", "pipe_low", "road"),
    ("cross_mid", "cross_north", "road"),
    ("cross_north", "flare_base", "road"),
    ("cross_north", "reactor_base", "road"),
    ("process_entry", "reactor_base", "road"),
    ("process_entry", "stair_bottom", "road"),
    ("stair_bottom", "stair_mid", "stair"),
    ("stair_mid", "deck_landing", "stair"),
    ("deck_landing", "deck_reactor", "road"),
    ("deck_landing", "deck_pipe", "road"),
    ("deck_landing", "ramp_start", "road"),
    ("ramp_start", "ramp_mid", "ramp"),
    ("ramp_mid", "upper_walkway", "ramp"),
    ("upper_walkway", "upper_tower", "road"),
]
EDGES = [
    {"from": start, "to": end, "type": edge_type, "distance": distance_between(start, end), "bidirectional": True}
    for start, end, edge_type in EDGE_PAIRS
]

MANIFEST = {
    "mapId": "industrial-clean-yard-v1",
    "name": "北区工艺厂区",
    "scale": "meters",
    "origin": {"x": 0, "y": 0, "z": 0},
    "defaultCamera": {"position": {"x": 34, "y": 28, "z": 34}, "target": {"x": 0, "y": 0, "z": 0}},
    "levels": [
        {"id": "ground", "name": "地面厂区", "elevation": 0},
        {"id": "deck", "name": "工艺平台", "elevation": 2.4},
        {"id": "upper", "name": "上层管廊", "elevation": 4.8},
    ],
    "layers": [
        {"key": "roads", "label": "道路", "enabledByDefault": True},
        {"key": "tanks", "label": "罐区", "enabledByDefault": True},
        {"key": "process", "label": "工艺装置", "enabledByDefault": True},
        {"key": "buildings", "label": "建筑", "enabledByDefault": True},
        {"key": "nav", "label": "导航图", "enabledByDefault": True},
        {"key": "route", "label": "当前路线", "enabledByDefault": True},
    ],
}

ROUTES = [
    InspectionRoute(
        id="route-shift-start",
        name="班前安全巡检路线",
        waypointNodeIds=["gate", "tank_b", "reactor_base", "deck_reactor", "upper_tower", "control_room"],
        createdAt="2026-05-06T00:00:00+08:00",
        updatedAt="2026-05-06T00:00:00+08:00",
    )
]

ROBOT_POSE = RobotPose(
    robotId="robot-dog-001",
    level="ground",
    x=-6,
    y=0,
    z=4,
    yaw=1.5708,
    mode="idle",
    updatedAt=timestamp(),
)


def initial_robot_pose() -> RobotPose:
    return RobotPose(
        robotId="robot-dog-001",
        level="ground",
        x=-6,
        y=0,
        z=4,
        yaw=1.5708,
        mode="idle",
        updatedAt=timestamp(),
    )

app = FastAPI(title="RobotWeb API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/maps/current", response_model=MapManifest)
def current_map() -> dict:
    return MANIFEST


@app.get("/maps/current/nav-graph", response_model=NavGraph)
def current_nav_graph() -> dict:
    return {"nodes": NODES, "edges": EDGES}


@app.get("/robots/{robot_id}/pose", response_model=RobotPose)
def robot_pose(robot_id: str) -> RobotPose:
    if robot_id != ROBOT_POSE.robotId:
        raise HTTPException(status_code=404, detail="未找到机器人")
    return ROBOT_POSE


@app.post("/robots/{robot_id}/commands", response_model=RobotPose)
def command_robot(robot_id: str, command: RobotCommand) -> RobotPose:
    global ROBOT_POSE
    if robot_id != ROBOT_POSE.robotId:
        raise HTTPException(status_code=404, detail="未找到机器人")
    if command.type == "stop":
        ROBOT_POSE = ROBOT_POSE.model_copy(update={"mode": "stopped", "updatedAt": timestamp()})
        return ROBOT_POSE
    if command.type == "goto":
        if not command.targetNodeId or command.targetNodeId not in NODE_BY_ID:
            raise HTTPException(status_code=400, detail="必须提供目标点")
        ROBOT_POSE = ROBOT_POSE.model_copy(update={"mode": "autonomous", "updatedAt": timestamp()})
        return ROBOT_POSE
    linear = command.linear or 0
    angular = command.angular or 0
    next_yaw = ROBOT_POSE.yaw + angular * 0.25
    ROBOT_POSE = ROBOT_POSE.model_copy(
        update={
            "x": ROBOT_POSE.x + sin(next_yaw) * linear,
            "z": ROBOT_POSE.z + cos(next_yaw) * linear,
            "yaw": next_yaw,
            "mode": "teleop",
            "updatedAt": timestamp(),
        }
    )
    return ROBOT_POSE


@app.post("/robots/{robot_id}/reset", response_model=RobotPose)
def reset_robot(robot_id: str) -> RobotPose:
    global ROBOT_POSE
    if robot_id != ROBOT_POSE.robotId:
        raise HTTPException(status_code=404, detail="未找到机器人")
    ROBOT_POSE = initial_robot_pose()
    return ROBOT_POSE


@app.get("/routes", response_model=list[InspectionRoute])
def list_routes() -> list[InspectionRoute]:
    return ROUTES


@app.post("/routes", response_model=InspectionRoute)
def create_route(route: InspectionRoute) -> InspectionRoute:
    ROUTES.append(route)
    return route


@app.post("/routes/{route_id}/run", response_model=RobotPose)
def run_route(route_id: str) -> RobotPose:
    global ROBOT_POSE
    if not any(route.id == route_id for route in ROUTES):
        raise HTTPException(status_code=404, detail="未找到路线")
    ROBOT_POSE = ROBOT_POSE.model_copy(update={"mode": "autonomous", "updatedAt": timestamp()})
    return ROBOT_POSE

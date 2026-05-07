from datetime import UTC, datetime
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


RobotCommandType = Literal["teleop", "goto", "stop", "run_route"]
BridgeMode = Literal["dry-run", "ros2"]
LevelId = Literal["ground", "deck", "upper"]


def timestamp() -> str:
    return datetime.now(UTC).isoformat()


class RobotCommand(BaseModel):
    type: RobotCommandType
    robotId: str = "robot-dog-001"
    linear: float | None = None
    angular: float | None = None
    targetNodeId: str | None = None
    routeId: str | None = None
    issuedBy: str = "operator"
    issuedAt: str = Field(default_factory=timestamp)


class RobotPose(BaseModel):
    robotId: str
    level: LevelId
    x: float
    y: float
    z: float
    yaw: float
    frameId: str = "map"
    source: Literal["simulator", "ros2", "web"] = "web"
    updatedAt: str = Field(default_factory=timestamp)


class Ros2Envelope(BaseModel):
    mode: BridgeMode = "dry-run"
    accepted: bool
    command: RobotCommand
    ros2Topic: str
    ros2Type: str
    payload: dict
    note: str
    createdAt: str = Field(default_factory=timestamp)


TOPIC_MAP = {
    "teleop": {
        "topic": "/cmd_vel",
        "type": "geometry_msgs/msg/Twist",
        "direction": "RobotWeb -> ROS2",
        "description": "Operator velocity command for manual control. Safety timeout must be enforced by the robot.",
    },
    "stop": {
        "topic": "/cmd_vel",
        "type": "geometry_msgs/msg/Twist",
        "direction": "RobotWeb -> ROS2",
        "description": "Zero velocity command. Real bridge should publish repeatedly for a short stop window.",
    },
    "goto": {
        "topic": "/navigate_to_pose",
        "type": "nav2_msgs/action/NavigateToPose",
        "direction": "RobotWeb -> ROS2",
        "description": "High-level target. Robot performs local planning and obstacle avoidance.",
    },
    "run_route": {
        "topic": "/robotweb/inspection_route",
        "type": "robotweb_msgs/msg/InspectionRoute",
        "direction": "RobotWeb -> ROS2",
        "description": "Route-level task containing waypoint ids or mapped poses.",
    },
    "pose": {
        "topic": "/robot_pose",
        "type": "geometry_msgs/msg/PoseStamped",
        "direction": "ROS2 -> RobotWeb",
        "description": "Robot pose in map frame. This drives the visible robot in Web.",
    },
    "status": {
        "topic": "/robotweb/status",
        "type": "robotweb_msgs/msg/RobotStatus",
        "direction": "ROS2 -> RobotWeb",
        "description": "Task, autonomy, battery, safety and bridge health status.",
    },
}

COMMAND_EVENTS: list[Ros2Envelope] = []
POSES: dict[str, RobotPose] = {}

app = FastAPI(title="RobotWeb ROS2 Bridge")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "dry-run"}


@app.get("/bridge/topic-map")
def topic_map() -> dict:
    return TOPIC_MAP


def command_payload(command: RobotCommand) -> tuple[str, str, dict, str]:
    if command.type == "teleop":
      return (
          TOPIC_MAP["teleop"]["topic"],
          TOPIC_MAP["teleop"]["type"],
          {
              "linear": {"x": command.linear or 0, "y": 0, "z": 0},
              "angular": {"x": 0, "y": 0, "z": command.angular or 0},
          },
          "Dry-run accepted. Real bridge publishes Twist to /cmd_vel.",
      )
    if command.type == "stop":
      return (
          TOPIC_MAP["stop"]["topic"],
          TOPIC_MAP["stop"]["type"],
          {"linear": {"x": 0, "y": 0, "z": 0}, "angular": {"x": 0, "y": 0, "z": 0}},
          "Dry-run accepted. Real bridge publishes zero Twist.",
      )
    if command.type == "goto":
      if not command.targetNodeId:
          raise HTTPException(status_code=400, detail="targetNodeId is required for goto")
      return (
          TOPIC_MAP["goto"]["topic"],
          TOPIC_MAP["goto"]["type"],
          {"target_node_id": command.targetNodeId, "frame_id": "map"},
          "Dry-run accepted. Real bridge resolves target node to NavigateToPose goal.",
      )
    if command.type == "run_route":
      if not command.routeId:
          raise HTTPException(status_code=400, detail="routeId is required for run_route")
      return (
          TOPIC_MAP["run_route"]["topic"],
          TOPIC_MAP["run_route"]["type"],
          {"route_id": command.routeId, "frame_id": "map"},
          "Dry-run accepted. Real bridge expands route into waypoints or a task action.",
      )
    raise HTTPException(status_code=400, detail="unsupported command")


@app.post("/bridge/commands", response_model=Ros2Envelope)
def accept_command(command: RobotCommand) -> Ros2Envelope:
    topic, message_type, payload, note = command_payload(command)
    envelope = Ros2Envelope(
        accepted=True,
        command=command,
        ros2Topic=topic,
        ros2Type=message_type,
        payload=payload,
        note=note,
    )
    COMMAND_EVENTS.insert(0, envelope)
    del COMMAND_EVENTS[50:]
    return envelope


@app.get("/bridge/events", response_model=list[Ros2Envelope])
def command_events() -> list[Ros2Envelope]:
    return COMMAND_EVENTS


@app.post("/bridge/pose", response_model=RobotPose)
def update_pose(pose: RobotPose) -> RobotPose:
    POSES[pose.robotId] = pose
    return pose


@app.get("/bridge/pose/{robot_id}", response_model=RobotPose)
def get_pose(robot_id: str) -> RobotPose:
    pose = POSES.get(robot_id)
    if not pose:
        raise HTTPException(status_code=404, detail="pose not found")
    return pose

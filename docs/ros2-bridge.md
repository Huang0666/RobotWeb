# ROS2 Bridge Preparation

RobotWeb should never put low-level obstacle avoidance in the browser. The Web
application owns operator intent, target selection, route visualization, and
status display. ROS2 owns local planning, safety, and motion execution.

## Required Frames

- `map`: stable global map frame used by Web, Nav2, and stored inspection points.
- `base_link`: robot body frame.
- optional sensor frames: `lidar`, `camera_front`, `imu`.

Every pose that reaches the Web must be transformed into `map` frame, meters,
with yaw around the vertical axis.

## Command Boundary

- Teleop buttons become short-lived `/cmd_vel` commands.
- Stop becomes zero `/cmd_vel`, repeated briefly by the real bridge.
- Click-to-target becomes a Nav2 `NavigateToPose` goal after target-node lookup.
- Saved route execution becomes a route action or sequence of waypoint goals.

## Safety Defaults

- Web commands are advisory operator intent, not a safety authority.
- The robot must enforce velocity limits, e-stop, command timeout, and obstacle avoidance.
- The bridge must reject stale commands and commands for an unknown map/version.

## Current Implementation

`services/ros2-bridge` is a dry-run FastAPI service that accepts the future command
shape and reports the ROS2 topic/type it would publish. Replace its internals with
`rclpy` publishers/actions when the robot environment is ready; keep the HTTP
contract stable for the Web/API side.

# RobotWeb ROS2 Bridge

This service is a dry-run bridge contract for the future real ROS2 integration.
It does not require ROS2, `rclpy`, Nav2, or a real robot. Its job is to make the
boundary explicit and testable before hardware arrives.

## Direction

```text
Web -> API -> ros2-bridge -> ROS2
ROS2 -> ros2-bridge -> API/Web
```

The real robot remains responsible for local obstacle avoidance, safety stops,
and low-level motion control. RobotWeb sends high-level commands and renders pose
or task status returned by ROS2.

## Planned ROS2 Mapping

| RobotWeb command | ROS2 target | ROS2 type | Notes |
| --- | --- | --- | --- |
| `teleop` | `/cmd_vel` | `geometry_msgs/msg/Twist` | Manual velocity command with robot-side safety timeout. |
| `stop` | `/cmd_vel` | `geometry_msgs/msg/Twist` | Zero velocity; real bridge should publish repeatedly for a short stop window. |
| `goto` | `/navigate_to_pose` | `nav2_msgs/action/NavigateToPose` | Target node must be resolved into a map-frame pose. |
| `run_route` | `/robotweb/inspection_route` | custom message/action | Expands saved Web route into waypoints or a task action. |
| pose feedback | `/robot_pose` | `geometry_msgs/msg/PoseStamped` | Must use the same `map` frame and meter units as the Web scene. |
| status feedback | `/robotweb/status` | custom message | Task, autonomy, battery, safety and bridge health. |

## Local

```powershell
cd infra
docker compose up -d --build ros2-bridge
```

Health:

```text
http://127.0.0.1:18020/health
```

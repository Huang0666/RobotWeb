# RobotWeb

RobotWeb is an industrial digital twin control surface for robot dog inspection.

The first implementation focuses on the competitor-replacement workflow:

- clean industrial 3D plant scene
- visible robot dog model
- keyboard and panel teleoperation
- click-to-target routing
- route preview through stairs and ramps
- API contracts for maps, navigation graphs, pose, commands, and routes
- Docker foundation for FastAPI, Postgres, EMQX, and a dry-run ROS2 bridge

## Local Web

```powershell
cd apps/web
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Checks

```powershell
cd apps/web
npm test
npm run build
```

## Backend

```powershell
cd infra
docker compose up -d --build
```

API health:

```text
http://127.0.0.1:18010/health
```

ROS2 bridge dry-run health:

```text
http://127.0.0.1:18020/health
```

## Architecture Boundary

Web owns map visualization, high-level route design, teleoperation UI, and state display.
The real robot owns local obstacle avoidance and low-level motion safety. Future ROS2
integration should follow `Web -> API -> ros2-bridge -> ROS2`.

The current `services/ros2-bridge` service is intentionally a dry-run contract. It
accepts the future command shape and returns the ROS2 topic/type that a real bridge
will publish, without requiring a robot or ROS2 install.

## Supabase Readiness

Local Docker remains the default development path. The schema is also prepared for a
future Supabase deployment with organization columns, RLS enabled on public tables,
operator profiles, and map asset metadata for GLB/IFC/point-cloud objects.

See `docs/supabase-readiness.md` before connecting a hosted Supabase project. Keep
`SUPABASE_SERVICE_ROLE_KEY` server-side only; the browser should continue to call the
RobotWeb API unless a later stage explicitly adds direct Supabase reads.

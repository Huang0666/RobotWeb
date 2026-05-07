# Supabase Readiness

RobotWeb remains local-first for the current product pass. Supabase is the future hosted target for authentication, managed Postgres, object storage, and realtime fan-out.

## Current Boundary

- Frontend calls the RobotWeb API through `VITE_API_BASE_URL`.
- Frontend must not use the Supabase service role key.
- API, workers, and future bridge services are the only places allowed to use privileged database credentials.
- Robot control still follows `Web -> API -> ros2-bridge -> ROS2`.

## Supabase Placement

Postgres:

- `maps`
- `nav_nodes`
- `nav_edges`
- `robot_pose`
- `inspection_routes`
- `operator_profiles`
- `map_assets`

Storage:

- GLB and IFC map assets.
- Point cloud snapshots.
- Robot model files.
- Inspection photos, thumbnails, and captured media.

Auth:

- Operator accounts.
- Organization membership through `operator_profiles`.
- Role claims should come from trusted app metadata or database rows, not user-editable metadata.

Realtime:

- Later stage only.
- Good first channels are robot pose, command acknowledgement, route execution status, and inspection events.

## RLS Strategy

The migration enables RLS on every public table and adds Supabase-only authenticated policies when the `auth.uid()` function and `authenticated` role exist. This keeps local Docker Postgres usable while making hosted Supabase deployment safer.

Direct client access is intentionally limited:

- Operators can read rows in their organization.
- Operators can create, update, and delete only their own routes and asset metadata.
- Robot pose is read-only for authenticated clients.
- Anonymous access is not granted.

For hosted deployment, create operator profiles during signup or an admin invite flow before exposing direct Supabase client reads.

## Storage Rules To Add During Hosted Setup

Create a private bucket named `robot-assets`.

Recommended object layout:

```text
maps/{map_id}/site.glb
maps/{map_id}/source.ifc
maps/{map_id}/point-clouds/{capture_id}.ply
robots/{robot_model_id}/model.glb
inspection-media/{route_id}/{capture_id}.jpg
```

Storage policies should mirror `map_assets.organization_id`. If using upload upsert, remember that Supabase Storage upsert needs insert, select, and update policies on `storage.objects`.

## Deployment Path

1. Keep local Docker as the default development environment.
2. Initialize/link Supabase in a separate deployment step.
3. Apply `database/migrations/*.sql` to the hosted database.
4. Create the `robot-assets` Storage bucket and policies.
5. Configure API-only secrets on the server:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
6. Configure browser-safe frontend values only:
   - `VITE_API_BASE_URL`
   - future publishable Supabase key if direct client reads are introduced.

Before production, run Supabase database and security advisors against the hosted project and re-check current Supabase docs for Storage policy syntax.

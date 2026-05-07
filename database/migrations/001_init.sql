create table if not exists maps (
  id text primary key,
  name text not null,
  scale text not null default 'meters',
  origin_x double precision not null default 0,
  origin_y double precision not null default 0,
  origin_z double precision not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists nav_nodes (
  id text primary key,
  map_id text not null references maps(id),
  label text not null,
  level_id text not null,
  node_type text not null,
  zone text not null,
  x double precision not null,
  y double precision not null,
  z double precision not null
);

create table if not exists nav_edges (
  id bigserial primary key,
  map_id text not null references maps(id),
  from_node_id text not null references nav_nodes(id),
  to_node_id text not null references nav_nodes(id),
  edge_type text not null,
  distance double precision not null,
  bidirectional boolean not null default true
);

create table if not exists robot_pose (
  robot_id text primary key,
  map_id text not null references maps(id),
  level_id text not null,
  x double precision not null,
  y double precision not null,
  z double precision not null,
  yaw double precision not null,
  mode text not null,
  updated_at timestamptz not null default now()
);

create table if not exists inspection_routes (
  id text primary key,
  map_id text not null references maps(id),
  name text not null,
  waypoint_node_ids jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table maps enable row level security;
alter table nav_nodes enable row level security;
alter table nav_edges enable row level security;
alter table robot_pose enable row level security;
alter table inspection_routes enable row level security;

alter table maps
  add column if not exists organization_id text not null default 'org_demo';

alter table nav_nodes
  add column if not exists organization_id text not null default 'org_demo';

alter table nav_edges
  add column if not exists organization_id text not null default 'org_demo';

alter table robot_pose
  add column if not exists organization_id text not null default 'org_demo';

alter table inspection_routes
  add column if not exists organization_id text not null default 'org_demo',
  add column if not exists created_by uuid,
  add column if not exists description text,
  add column if not exists is_template boolean not null default false;

create table if not exists operator_profiles (
  user_id uuid primary key,
  organization_id text not null default 'org_demo',
  display_name text,
  role text not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists map_assets (
  id text primary key,
  organization_id text not null default 'org_demo',
  map_id text references maps(id) on delete cascade,
  bucket text not null default 'robot-assets',
  object_key text not null,
  display_name text not null,
  asset_type text not null check (asset_type in ('glb', 'ifc', 'point_cloud', 'texture', 'robot_model', 'inspection_media')),
  source_format text not null default 'glb',
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, object_key)
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_operator_profiles_updated_at on operator_profiles;
create trigger set_operator_profiles_updated_at
before update on operator_profiles
for each row execute function set_updated_at();

drop trigger if exists set_inspection_routes_updated_at on inspection_routes;
create trigger set_inspection_routes_updated_at
before update on inspection_routes
for each row execute function set_updated_at();

drop trigger if exists set_map_assets_updated_at on map_assets;
create trigger set_map_assets_updated_at
before update on map_assets
for each row execute function set_updated_at();

create index if not exists idx_maps_org on maps(organization_id);
create index if not exists idx_nav_nodes_map_org on nav_nodes(map_id, organization_id);
create index if not exists idx_nav_edges_map_org on nav_edges(map_id, organization_id);
create index if not exists idx_robot_pose_org on robot_pose(organization_id);
create index if not exists idx_inspection_routes_org on inspection_routes(organization_id);
create index if not exists idx_inspection_routes_created_by on inspection_routes(created_by);
create index if not exists idx_map_assets_map_org on map_assets(map_id, organization_id);
create index if not exists idx_map_assets_created_by on map_assets(created_by);

alter table operator_profiles enable row level security;
alter table map_assets enable row level security;

comment on table operator_profiles is
  'Supabase Auth user profile and organization membership for future direct client access.';
comment on table map_assets is
  'Metadata for GLB, IFC, point cloud, texture, robot model, and inspection media objects stored outside Postgres.';
comment on column map_assets.bucket is
  'Supabase Storage bucket name or compatible object-storage bucket.';
comment on column map_assets.object_key is
  'Object path inside the bucket, for example maps/industrial-clean-yard-v1/site.glb.';

do $$
begin
  if to_regprocedure('auth.uid()') is not null
     and exists (select 1 from pg_roles where rolname = 'authenticated') then

    execute 'drop policy if exists "operator_profiles_select_own" on operator_profiles';
    execute 'drop policy if exists "operator_profiles_update_own" on operator_profiles';
    execute $policy$
      create policy "operator_profiles_select_own"
      on operator_profiles
      for select
      to authenticated
      using (user_id = auth.uid())
    $policy$;
    execute $policy$
      create policy "operator_profiles_update_own"
      on operator_profiles
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $policy$;

    execute 'drop policy if exists "maps_select_org" on maps';
    execute 'drop policy if exists "nav_nodes_select_org" on nav_nodes';
    execute 'drop policy if exists "nav_edges_select_org" on nav_edges';
    execute 'drop policy if exists "robot_pose_select_org" on robot_pose';
    execute $policy$
      create policy "maps_select_org"
      on maps
      for select
      to authenticated
      using (
        organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
    execute $policy$
      create policy "nav_nodes_select_org"
      on nav_nodes
      for select
      to authenticated
      using (
        organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
    execute $policy$
      create policy "nav_edges_select_org"
      on nav_edges
      for select
      to authenticated
      using (
        organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
    execute $policy$
      create policy "robot_pose_select_org"
      on robot_pose
      for select
      to authenticated
      using (
        organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;

    execute 'drop policy if exists "inspection_routes_select_org" on inspection_routes';
    execute 'drop policy if exists "inspection_routes_insert_own_org" on inspection_routes';
    execute 'drop policy if exists "inspection_routes_update_own_org" on inspection_routes';
    execute 'drop policy if exists "inspection_routes_delete_own_org" on inspection_routes';
    execute $policy$
      create policy "inspection_routes_select_org"
      on inspection_routes
      for select
      to authenticated
      using (
        organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
    execute $policy$
      create policy "inspection_routes_insert_own_org"
      on inspection_routes
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
    execute $policy$
      create policy "inspection_routes_update_own_org"
      on inspection_routes
      for update
      to authenticated
      using (
        created_by = auth.uid()
        and organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
    execute $policy$
      create policy "inspection_routes_delete_own_org"
      on inspection_routes
      for delete
      to authenticated
      using (
        created_by = auth.uid()
        and organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;

    execute 'drop policy if exists "map_assets_select_org" on map_assets';
    execute 'drop policy if exists "map_assets_insert_own_org" on map_assets';
    execute 'drop policy if exists "map_assets_update_own_org" on map_assets';
    execute 'drop policy if exists "map_assets_delete_own_org" on map_assets';
    execute $policy$
      create policy "map_assets_select_org"
      on map_assets
      for select
      to authenticated
      using (
        organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
    execute $policy$
      create policy "map_assets_insert_own_org"
      on map_assets
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
    execute $policy$
      create policy "map_assets_update_own_org"
      on map_assets
      for update
      to authenticated
      using (
        created_by = auth.uid()
        and organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
    execute $policy$
      create policy "map_assets_delete_own_org"
      on map_assets
      for delete
      to authenticated
      using (
        created_by = auth.uid()
        and organization_id in (
          select organization_id from operator_profiles where user_id = auth.uid()
        )
      )
    $policy$;
  end if;
end
$$;

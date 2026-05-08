import {
  Bell,
  ClipboardList,
  FileText,
  Home,
  Layers,
  LocateFixed,
  MapPinned,
  Pause,
  Play,
  RotateCcw,
  Route,
  Settings,
  Square,
  Waypoints,
} from "lucide-react";
import { useEffect } from "react";
import { mapManifest, navGraph } from "../data/factoryMap";
import { activeRouteDistance, useRobotStore } from "../store/robotStore";
import type { LevelId, MapLayerKey, RobotMode } from "../types";
import { FactoryCanvas } from "./scene/FactoryCanvas";

const layerOrder: MapLayerKey[] = ["roads", "tanks", "process", "buildings", "nav", "route"];

const robotModeLabels: Record<RobotMode, string> = {
  idle: "待命",
  teleop: "手动控制",
  autonomous: "任务执行中",
  arrived: "已到达",
  stopped: "已停止",
};

const apiStatusLabels: Record<"idle" | "connected" | "offline" | "syncing", string> = {
  idle: "未同步",
  connected: "已连接",
  offline: "离线",
  syncing: "同步中",
};

const levelLabels: Record<LevelId, string> = {
  ground: "地面层",
  deck: "工艺平台",
  upper: "上层管廊",
};

const businessNavItems = [
  { label: "巡检工作台", status: "当前", Icon: Home },
  { label: "地图管理", status: "规划中", Icon: MapPinned },
  { label: "任务管理", status: "规划中", Icon: ClipboardList },
  { label: "事件管理", status: "规划中", Icon: Bell },
  { label: "报告列表", status: "规划中", Icon: FileText },
  { label: "系统设置", status: "规划中", Icon: Settings },
] as const;

export function IndustrialTwinApp() {
  const pose = useRobotStore((state) => state.pose);
  const activePath = useRobotStore((state) => state.activePath);
  const selectedTargetId = useRobotStore((state) => state.selectedTargetId);
  const layers = useRobotStore((state) => state.layers);
  const routes = useRobotStore((state) => state.routes);
  const draftRouteName = useRobotStore((state) => state.draftRouteName);
  const draftWaypointIds = useRobotStore((state) => state.draftWaypointIds);
  const apiStatus = useRobotStore((state) => state.apiStatus);
  const apiError = useRobotStore((state) => state.apiError);
  const lastSyncedAt = useRobotStore((state) => state.lastSyncedAt);
  const selectedRouteId = useRobotStore((state) => state.selectedRouteId);
  const hydrateFromApi = useRobotStore((state) => state.hydrateFromApi);
  const goToNode = useRobotStore((state) => state.goToNode);
  const runRoute = useRobotStore((state) => state.runRoute);
  const setDraftRouteName = useRobotStore((state) => state.setDraftRouteName);
  const addDraftWaypoint = useRobotStore((state) => state.addDraftWaypoint);
  const removeDraftWaypoint = useRobotStore((state) => state.removeDraftWaypoint);
  const clearDraftRoute = useRobotStore((state) => state.clearDraftRoute);
  const saveDraftRoute = useRobotStore((state) => state.saveDraftRoute);
  const teleop = useRobotStore((state) => state.teleop);
  const stop = useRobotStore((state) => state.stop);
  const resetPose = useRobotStore((state) => state.resetPose);
  const toggleLayer = useRobotStore((state) => state.toggleLayer);
  const targetNode = navGraph.nodes.find((node) => node.id === selectedTargetId) ?? navGraph.nodes[0];
  const routeDistance = activeRouteDistance(activePath);
  const visibleLayerCount = layerOrder.filter((key) => layers[key]).length;
  const activeRouteText = activePath.length > 0 ? `${activePath.length} 个节点 / ${routeDistance.toFixed(1)}m` : "暂无当前路线";
  const syncText = lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : "等待同步";

  useEffect(() => {
    void hydrateFromApi();
  }, [hydrateFromApi]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key === "w" || event.key === "ArrowUp") teleop("forward");
      if (event.key === "s" || event.key === "ArrowDown") teleop("backward");
      if (event.key === "a" || event.key === "ArrowLeft") teleop("left");
      if (event.key === "d" || event.key === "ArrowRight") teleop("right");
      if (event.key === " ") stop();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stop, teleop]);

  return (
    <main className="app-shell">
      <aside className="left-rail">
        <div className="brand-block">
          <div className="brand-mark">RW</div>
          <div>
            <strong>RobotWeb</strong>
            <span>工业巡检工作台</span>
          </div>
        </div>

        <nav className="business-nav" aria-label="业务导航">
          <span className="rail-section-label">业务导航</span>
          {businessNavItems.map(({ label, status, Icon }, index) => (
            <button className={index === 0 ? "nav-item is-active" : "nav-item"} key={label} type="button">
              <Icon size={16} />
              <span>{label}</span>
              <small>{status}</small>
            </button>
          ))}
        </nav>

        <section className="panel compact">
          <div className="panel-title">
            <LocateFixed size={16} />
            <span>机器狗状态</span>
          </div>
          <dl className="pose-grid">
            <div>
              <dt>X</dt>
              <dd>{pose.x.toFixed(1)}m</dd>
            </div>
            <div>
              <dt>Y</dt>
              <dd>{pose.y.toFixed(1)}m</dd>
            </div>
            <div>
              <dt>Z</dt>
              <dd>{pose.z.toFixed(1)}m</dd>
            </div>
            <div>
              <dt>模式</dt>
              <dd>{robotModeLabels[pose.mode]}</dd>
            </div>
          </dl>
          <div className={`api-status ${apiStatus}`}>
            <span>接口 {apiStatusLabels[apiStatus]}</span>
            {lastSyncedAt ? <span>{syncText}</span> : null}
          </div>
          {apiError ? <p className="api-error">{apiError}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-title">
            <Square size={16} />
            <span>手动遥控</span>
          </div>
          <div className="teleop-pad" aria-label="机器狗手动遥控">
            <button className="pad-button up" onClick={() => teleop("forward")} type="button">
              前进
            </button>
            <button className="pad-button left" onClick={() => teleop("left")} type="button">
              左转
            </button>
            <button className="pad-button stop" onClick={stop} type="button">
              <Pause size={18} />
            </button>
            <button className="pad-button right" onClick={() => teleop("right")} type="button">
              右转
            </button>
            <button className="pad-button down" onClick={() => teleop("backward")} type="button">
              后退
            </button>
          </div>
          <p className="hint">键盘：W/A/S/D 或方向键。空格停止。</p>
        </section>

        <section className="panel">
          <div className="panel-title">
            <Layers size={16} />
            <span>图层</span>
          </div>
          <div className="layer-list">
            {layerOrder.map((key) => (
              <label className="layer-row" key={key}>
                <input checked={layers[key]} onChange={() => toggleLayer(key)} type="checkbox" />
                <span>{mapManifest.layers.find((layer) => layer.key === key)?.label ?? key}</span>
              </label>
            ))}
          </div>
        </section>
      </aside>

      <section className="scene-stage">
        <header className="topbar">
          <div>
            <span className="kicker">{mapManifest.name}</span>
            <h1>机器狗工业巡检控制台</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={resetPose} type="button">
              <RotateCcw size={16} />
              复位机器人
            </button>
            <button className="primary-button" onClick={() => runRoute(selectedRouteId)} type="button">
              <Play size={16} />
              运行巡检
            </button>
          </div>
        </header>

        <div className="map-toolbar" aria-label="地图工具栏">
          <div className="toolbar-group">
            <span className="toolbar-label">地图工具栏</span>
            <strong>3D 厂区视图</strong>
          </div>
          <div className="toolbar-group compact">
            <span>图层 {visibleLayerCount}/{layerOrder.length}</span>
            <span>目标 {targetNode.label}</span>
            <span>楼层 {levelLabels[targetNode.level]}</span>
          </div>
        </div>

        <div className="canvas-card" data-testid="digital-twin-canvas">
          <FactoryCanvas />
          <div className="canvas-status">
            <span>点击地面或巡检点可选择目标</span>
            <span>{activeRouteText}</span>
          </div>
        </div>

        <footer className="bottom-statusbar" aria-label="系统状态">
          <span>系统状态</span>
          <span>接口 {apiStatusLabels[apiStatus]}</span>
          <span>机器狗 {robotModeLabels[pose.mode]}</span>
          <span>路线 {activeRouteText}</span>
          <span>同步 {syncText}</span>
        </footer>
      </section>

      <aside className="right-rail">
        <div className="rail-heading">
          <span>状态与任务</span>
          <strong>目标、点位、路线</strong>
        </div>

        <section className="panel">
          <div className="panel-title">
            <MapPinned size={16} />
            <span>当前目标</span>
          </div>
          <div className="target-card">
            <strong>{targetNode.label}</strong>
            <span>{targetNode.zone} / {levelLabels[targetNode.level]}</span>
            <button className="primary-button block" onClick={() => goToNode(targetNode.id)} type="button">
              前往目标
            </button>
          </div>
        </section>

        <section className="panel route-panel">
          <div className="panel-title">
            <Waypoints size={16} />
            <span>巡检点列表</span>
          </div>
          <div className="waypoint-list">
            {navGraph.nodes
              .filter((node) => node.type === "inspection" || node.type === "dock")
              .map((node) => (
                <button
                  className={node.id === selectedTargetId ? "waypoint is-selected" : "waypoint"}
                  key={node.id}
                  onClick={() => goToNode(node.id)}
                  type="button"
                >
                  <strong>{node.label}</strong>
                  <span>{node.zone} / {levelLabels[node.level]}</span>
                  <small onClick={(event) => {
                    event.stopPropagation();
                    addDraftWaypoint(node.id);
                  }}>
                    加入路线
                  </small>
                </button>
              ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <Route size={16} />
            <span>路线编辑</span>
          </div>
          <label className="route-name-field">
            <span>路线名称</span>
            <input value={draftRouteName} onChange={(event) => setDraftRouteName(event.target.value)} />
          </label>
          <div className="draft-waypoints">
            {draftWaypointIds.length === 0 ? <p className="hint">至少添加两个巡检点。</p> : null}
            {draftWaypointIds.map((nodeId, index) => {
              const node = navGraph.nodes.find((candidate) => candidate.id === nodeId);
              return node ? (
                <button className="draft-waypoint" key={`${nodeId}-${index}`} onClick={() => removeDraftWaypoint(nodeId)} type="button">
                  <span>{index + 1}</span>
                  <strong>{node.label}</strong>
                </button>
              ) : null;
            })}
          </div>
          <div className="route-builder-actions">
            <button className="ghost-button" onClick={clearDraftRoute} type="button">清空</button>
            <button className="primary-button" onClick={() => void saveDraftRoute()} type="button">保存路线</button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <Route size={16} />
            <span>已保存路线</span>
          </div>
          {routes.map((route) => (
            <button className="route-button" key={route.id} onClick={() => runRoute(route.id)} type="button">
              <strong>{route.name}</strong>
              <span>{route.waypointNodeIds.length} 个巡检点</span>
            </button>
          ))}
        </section>
      </aside>
    </main>
  );
}

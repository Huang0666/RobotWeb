import type { InspectionRoute, RobotCommand, RobotPose } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:18010";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`接口 ${path} 返回 ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchRobotPose(robotId: string) {
  return request<RobotPose>(`/robots/${robotId}/pose`);
}

export function sendRobotCommand(robotId: string, command: RobotCommand) {
  return request<RobotPose>(`/robots/${robotId}/commands`, {
    method: "POST",
    body: JSON.stringify(command),
  });
}

export function resetRobotPose(robotId: string) {
  return request<RobotPose>(`/robots/${robotId}/reset`, {
    method: "POST",
  });
}

export function fetchRoutes() {
  return request<InspectionRoute[]>("/routes");
}

export function createRoute(route: InspectionRoute) {
  return request<InspectionRoute>("/routes", {
    method: "POST",
    body: JSON.stringify(route),
  });
}

export function runInspectionRoute(routeId: string) {
  return request<RobotPose>(`/routes/${routeId}/run`, {
    method: "POST",
  });
}

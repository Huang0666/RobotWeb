import { describe, expect, it } from "vitest";
import { navGraph } from "../data/factoryMap";
import { findNearestNode, findPath, pathDistance } from "./pathfinding";

describe("navigation graph pathfinding", () => {
  it("finds a same-level route through the yard road graph", () => {
    const path = findPath(navGraph, "gate", "warehouse");

    expect(path).toEqual(["gate", "cross_south", "control_room", "warehouse"]);
    expect(pathDistance(navGraph, path)).toBeGreaterThan(30);
  });

  it("routes upper-level targets through stair and ramp connectors", () => {
    const path = findPath(navGraph, "gate", "upper_tower");

    expect(path).toContain("stair_bottom");
    expect(path).toContain("deck_landing");
    expect(path).toContain("ramp_mid");
    expect(path.at(-1)).toBe("upper_tower");
  });

  it("snaps arbitrary clicked points to the nearest navigation node", () => {
    const nearest = findNearestNode(navGraph, { x: 8.4, y: 0, z: 18.2 });

    expect(nearest.id).toBe("control_room");
  });
});

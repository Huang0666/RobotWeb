import { describe, expect, it } from "vitest";
import { useRobotStore } from "./robotStore";

describe("robot store controls", () => {
  it("creates a cross-level active route when commanded to an upper node", () => {
    useRobotStore.getState().resetPose();
    useRobotStore.getState().goToNode("upper_tower");

    const state = useRobotStore.getState();
    expect(state.activePath).toContain("deck_landing");
    expect(state.activePath).toContain("upper_tower");
    expect(state.pose.mode).toBe("autonomous");
  });

  it("teleop clears autonomous routes and changes pose", () => {
    useRobotStore.getState().resetPose();
    useRobotStore.getState().goToNode("upper_tower");
    useRobotStore.getState().teleop("forward");

    const state = useRobotStore.getState();
    expect(state.activePath).toEqual([]);
    expect(state.pose.mode).toBe("teleop");
    expect(state.pose.x).not.toBe(-6);
  });
});

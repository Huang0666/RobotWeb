import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IndustrialTwinApp } from "./IndustrialTwinApp";

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="mock-canvas" />,
  useFrame: vi.fn(),
}));

vi.mock("@react-three/drei", () => ({
  Line: () => <div data-testid="mock-line" />,
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
}));

describe("IndustrialTwinApp", () => {
  it("renders the operator shell and robot controls", () => {
    render(<IndustrialTwinApp />);

    expect(screen.getByText("RobotWeb")).toBeInTheDocument();
    expect(screen.getByText("手动遥控")).toBeInTheDocument();
    expect(screen.getByTestId("digital-twin-canvas")).toBeInTheDocument();
  });

  it("allows a competitor-grade patrol route to be launched from the UI", async () => {
    const user = userEvent.setup();
    render(<IndustrialTwinApp />);

    await user.click(screen.getByRole("button", { name: /运行巡检/ }));

    expect(screen.getByText(/个节点/)).toBeInTheDocument();
  });
});

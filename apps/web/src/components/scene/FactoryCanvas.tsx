import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { mapManifest } from "../../data/factoryMap";
import { useRobotStore } from "../../store/robotStore";
import { FactoryScene } from "./FactoryScene";
import { NavigationOverlay } from "./NavigationOverlay";
import { RobotDog } from "./RobotDog";

function RouteMotionController() {
  const advanceRoute = useRobotStore((state) => state.advanceRoute);
  useFrame((_, delta) => advanceRoute(delta));
  return null;
}

function ClickableNavigationPlane() {
  const setTargetFromPoint = useRobotStore((state) => state.setTargetFromPoint);
  return (
    <mesh
      onClick={(event) => {
        event.stopPropagation();
        setTargetFromPoint({ x: event.point.x, y: event.point.y, z: event.point.z });
      }}
      position={[0, 0.045, 1]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[58, 46]} />
      <meshBasicMaterial color="#ffffff" opacity={0} transparent />
    </mesh>
  );
}

function CameraRig() {
  const camera = useThree((state) => state.camera);
  const defaultCamera = mapManifest.defaultCamera;
  useEffect(() => {
    camera.position.set(defaultCamera.position.x, defaultCamera.position.y, defaultCamera.position.z);
    camera.lookAt(defaultCamera.target.x, defaultCamera.target.y, defaultCamera.target.z);
    camera.updateProjectionMatrix();
  }, [camera, defaultCamera]);
  return null;
}

export function FactoryCanvas() {
  const defaultCamera = mapManifest.defaultCamera;
  return (
    <Canvas dpr={[1, 1.75]} shadows>
      <PerspectiveCamera
        fov={42}
        makeDefault
        position={[defaultCamera.position.x, defaultCamera.position.y, defaultCamera.position.z]}
      />
      <color args={["#8a8c89"]} attach="background" />
      <ambientLight intensity={0.65} />
      <directionalLight castShadow intensity={1.5} position={[18, 32, 14]} shadow-mapSize={[2048, 2048]} />
      <hemisphereLight groundColor="#dfe6e4" intensity={0.55} />
      <FactoryScene />
      <NavigationOverlay />
      <RobotDog />
      <ClickableNavigationPlane />
      <CameraRig />
      <RouteMotionController />
      <OrbitControls enableDamping makeDefault maxDistance={72} minDistance={12} target={[0, 0, 2]} />
    </Canvas>
  );
}

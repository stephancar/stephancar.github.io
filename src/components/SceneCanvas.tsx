import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const FloatingShape = ({
  position,
  color,
  geometry,
}: {
  position: [number, number, number];
  color: string;
  geometry: "torus" | "sphere";
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const base = useMemo(() => new THREE.Vector3(...position), [position]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * 0.12;
    ref.current.rotation.y = t * 0.18;
    ref.current.position.y = base.y + Math.sin(t + base.x) * 0.15;
  });

  return (
    <mesh ref={ref} position={position}>
      {geometry === "torus" ? (
        <torusGeometry args={[0.7, 0.2, 32, 80]} />
      ) : (
        <sphereGeometry args={[0.6, 32, 32]} />
      )}
      <meshStandardMaterial
        color={color}
        metalness={0.6}
        roughness={0.2}
        emissive={color}
        emissiveIntensity={0.08}
      />
    </mesh>
  );
};

const CameraRig = ({ enabled }: { enabled: boolean }) => {
  const keys = useRef<Record<string, boolean>>({});
  const target = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (!enabled) return;
    const down = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true;
    };
    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enabled]);

  useFrame((state) => {
    const { camera, pointer } = state;
    const speed = enabled ? 0.05 : 0.02;
    const moveX = enabled
      ? (keys.current["d"] || keys.current["arrowright"] ? 1 : 0) -
        (keys.current["a"] || keys.current["arrowleft"] ? 1 : 0)
      : 0;
    const moveY = enabled
      ? (keys.current["w"] || keys.current["arrowup"] ? 1 : 0) -
        (keys.current["s"] || keys.current["arrowdown"] ? 1 : 0)
      : 0;

    target.current.x = THREE.MathUtils.clamp(
      target.current.x + moveX * speed,
      -1.5,
      1.5
    );
    target.current.y = THREE.MathUtils.clamp(
      target.current.y + moveY * speed,
      -1.2,
      1.2
    );

    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      target.current.x + pointer.x * 0.4,
      0.05
    );
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      0.4 + target.current.y + pointer.y * 0.25,
      0.05
    );
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 5.2, 0.04);
    camera.lookAt(0, 0, 0);
  });

  return null;
};

export const SceneCanvas = ({
  focus,
  mode,
}: {
  focus: boolean;
  mode: "light" | "dark";
}) => {
  return (
    <div className="scene-canvas">
      <Canvas camera={{ position: [0.5, 0.4, 5.4], fov: 55 }}>
        <color attach="background" args={[mode === "dark" ? "#0b1114" : "#e9eff1"]} />
        <ambientLight intensity={0.55} />
        <pointLight position={[3, 3, 4]} intensity={1.2} color="#b5d7ff" />
        <pointLight position={[-3, -2, 4]} intensity={0.6} color="#ffffff" />
        <Float speed={1.1} rotationIntensity={0.6} floatIntensity={0.8}>
          <FloatingShape
            position={[-1.4, 0.4, -0.5]}
            color="#88bfff"
            geometry="torus"
          />
        </Float>
        <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.6}>
          <FloatingShape
            position={[1.2, -0.4, 0.2]}
            color="#d3e7ff"
            geometry="sphere"
          />
        </Float>
        <CameraRig enabled={focus} />
      </Canvas>
    </div>
  );
};

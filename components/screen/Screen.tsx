"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import styles from "./screen.module.css";

import { Canvas, ThreeEvent, useLoader } from "@react-three/fiber";
import { Clone, OrbitControls, useGLTF } from "@react-three/drei";
import { Quaternion, TextureLoader, Vector3 } from "three";

type GlobePoint = [number, number, number];
type PlaneMarker = {
  position: GlobePoint;
  rotation: [number, number, number, number];
};

function Plane({ marker }: { marker: PlaneMarker }) {
  const gltf = useGLTF("/Models/Untitled.glb");
  const orientation = useMemo(
    () =>
      new Quaternion(
        marker.rotation[0],
        marker.rotation[1],
        marker.rotation[2],
        marker.rotation[3]
      ),
    [marker.rotation]
  );

  return (
    <group position={marker.position} quaternion={orientation} scale={0.0005}>
      <Clone object={gltf.scene} />
    </group>
  );
}

function Scene({
  markers,
  onMarker,
}: {
  markers: PlaneMarker[];
  onMarker: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const colorMap = useLoader(TextureLoader, "/Textures/earthmap1k.jpg");

  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[5, 5, 5]} />
      <mesh onPointerDown={onMarker}>
        <icosahedronGeometry args={[1, 12]} />
        <meshStandardMaterial map={colorMap} />
      </mesh>
      <OrbitControls enablePan={false} minDistance={1.3} maxDistance={2} />
      {markers.map((marker, i) => (
        <Plane
          key={`${i}-${marker.position.join("-")}`}
          marker={marker}
        />
      ))}
    </>
  );
}

export default function Screen() {
  const [markers, setMarkers] = useState<PlaneMarker[]>([]);
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://meowfacts.herokuapp.com?count=5")
      .then((response) => response.json())
      .then((json) => {
        console.log("Cat fact", data);
        setData(json.data);
        setLoading(false);
      });
  }, []);

  function latLngToVector3(lat: number, lng: number, radius: number) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    return {
      x: -radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    };
  }

  function Marker(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    const normal = e.point.clone().normalize();
    const position = normal.clone().multiplyScalar(1.02);
    const alignQuat = new Quaternion().setFromUnitVectors(
      new Vector3(0, 1, 0),
      normal
    );
    const heading = Math.random() * Math.PI * 2;
    const headingQuat = new Quaternion().setFromAxisAngle(normal, heading);
    alignQuat.premultiply(headingQuat);
    const marker: PlaneMarker = {
      position: [position.x, position.y, position.z],
      rotation: [alignQuat.x, alignQuat.y, alignQuat.z, alignQuat.w],
    };
    setMarkers((prev) => [...prev, marker]);
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className={styles.main}>
      <Canvas camera={{ position: [1, 1, 1] }}>
        <Suspense fallback={null}>
          <Scene markers={markers} onMarker={Marker} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/Models/Untitled.glb");

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import styles from "./screen.module.css";

import { Canvas, ThreeEvent, useLoader } from "@react-three/fiber";
import { Clone, OrbitControls, useGLTF } from "@react-three/drei";
import { Matrix4, Quaternion, TextureLoader, Vector3 } from "three";

type GlobePoint = [number, number, number];
type PlaneMarker = {
  id: string;
  position: GlobePoint;
  rotation: [number, number, number, number];
};

type OpenSkyState = {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  trueTrack: number | null;
};

type OpenSkyResponse = {
  time: number;
  states: OpenSkyState[];
};

const GLOBE_RADIUS = 1.02;
const NORTH_SAMPLE_DELTA = 0.1;
const REFRESH_INTERVAL_MS = 30000;

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function seededHeadingDegrees(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

function resolveNorth(normal: Vector3, northReference?: Vector3) {
  const reference = (northReference ?? new Vector3(0, 1, 0)).clone();
  reference.projectOnPlane(normal);
  if (reference.lengthSq() < 1e-6) {
    reference.set(0, 0, 1).projectOnPlane(normal);
  }
  return reference.normalize();
}

function createMarker({
  id,
  position,
  normal,
  headingDegrees,
  northReference,
}: {
  id: string;
  position: Vector3;
  normal: Vector3;
  headingDegrees: number;
  northReference?: Vector3;
}): PlaneMarker {
  const north = resolveNorth(normal, northReference);
  const headingRadians = (headingDegrees * Math.PI) / 180;
  const forward = north.clone().applyAxisAngle(normal, headingRadians);
  const right = new Vector3().crossVectors(forward, normal).normalize();
  const rotationMatrix = new Matrix4().makeBasis(right, normal, forward);
  const quaternion = new Quaternion().setFromRotationMatrix(rotationMatrix);

  return {
    id,
    position: [position.x, position.y, position.z],
    rotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
  };
}

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
      {markers.map((marker) => (
        <Plane key={marker.id} marker={marker} />
      ))}
    </>
  );
}

export default function Screen() {
  const [apiMarkers, setApiMarkers] = useState<PlaneMarker[]>([]);
  const [manualMarkers, setManualMarkers] = useState<PlaneMarker[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadFlights = async () => {
      try {
        const response = await fetch("/api/opensky?limit=250", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`OpenSky request failed: ${response.status}`);
        }

        const payload = (await response.json()) as OpenSkyResponse;
        const nextMarkers = payload.states
          .filter(
            (state) =>
              typeof state.latitude === "number" &&
              typeof state.longitude === "number"
          )
          .map((state) => {
            const latitude = state.latitude ?? 0;
            const longitude = state.longitude ?? 0;
            const northSampleLat = Math.max(
              -89.9,
              Math.min(89.9, latitude + NORTH_SAMPLE_DELTA)
            );
            const position = latLngToVector3(
              latitude,
              longitude,
              GLOBE_RADIUS
            );
            const normal = position.clone().normalize();
            const northReference = latLngToVector3(
              northSampleLat,
              longitude,
              1
            );
            const headingDegrees =
              typeof state.trueTrack === "number"
                ? state.trueTrack
                : seededHeadingDegrees(state.icao24);

            return createMarker({
              id: state.icao24,
              position,
              normal,
              headingDegrees,
              northReference,
            });
          });

        if (isActive) {
          setApiMarkers(nextMarkers);
        }
      } catch (error) {
        console.error("Failed to load OpenSky flights", error);
      }
    };

    loadFlights();
    const interval = setInterval(loadFlights, REFRESH_INTERVAL_MS);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  function Marker(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    const normal = e.point.clone().normalize();
    const position = normal.clone().multiplyScalar(GLOBE_RADIUS);
    const headingDegrees = Math.random() * 360;
    const marker = createMarker({
      id: `manual-${Date.now()}-${Math.round(headingDegrees)}`,
      position,
      normal,
      headingDegrees,
    });
    setManualMarkers((prev) => [...prev, marker]);
  }
  const markers = [...apiMarkers, ...manualMarkers];

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

"use client";

import { useEffect, useState } from "react";
import styles from "./screen.module.css";

import { Canvas, ThreeEvent, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TextureLoader } from "three";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'


export default function Screen() {
  const [points, setPoints] = useState<[number, number, number][]>([]);
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

  if (loading) return <p>Loading...</p>;

  const colorMap = useLoader(TextureLoader, "/textures/earthmap1k.jpg");

  function latLngToVector3(lat: number, lng: number, radius: number) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    return {
      x: -radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    };
  }


  function Marker(e: ThreeEvent<PointerEvent>){
    e.stopPropagation();
            const p = e.point;
            setPoints((prev) => [...prev, [p.x, p.y, p.z]]);

 
  }
  function Plane() {
  const gltf = useLoader(GLTFLoader, '/Models/Untitled.glb')
  return <primitive object={gltf.scene}  scale={0.0005}/>
}



  return (
    <div className={styles.main}>
      <Canvas camera={{ position: [1, 1, 1] }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} />
        <mesh
           onPointerDown={(e) => {
              Marker(e);
          }}
        >
          <icosahedronGeometry args={[1, 12]} />
          <meshStandardMaterial map={colorMap} />
        </mesh>

        <OrbitControls enablePan={false}minDistance={1.3} maxDistance={2}/>

        {points.map((pos, i) => (
          <mesh key={i} position={pos}>
             <Plane/>
            <meshStandardMaterial />
          </mesh>
        ))}

      </Canvas>
    </div>
  );
}

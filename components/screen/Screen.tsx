"use client";

import { useEffect, useState } from "react";
import styles from "./screen.module.css";

import { Canvas , useLoader} from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TextureLoader } from 'three'

export default function Screen() {
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

  const colorMap = useLoader(TextureLoader, 'Textures/world.jpg')

  function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y:  radius * Math.cos(phi),
    z:  radius * Math.sin(phi) * Math.sin(theta),
  };
}



  return (
    <div style={{ height: "100vh" }}>
      <Canvas camera={{ position: [3, 3, 3] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        <mesh onPointerDown={(e) => {
            console.log("Point:", e.point); 
          }} >
          <sphereGeometry />
          <meshStandardMaterial map={colorMap} />
        </mesh>

       
    
       
        <OrbitControls />
      </Canvas>
    </div>
  );
}

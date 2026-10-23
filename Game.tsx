import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {Bloom, EffectComposer, Vignette} from '@react-three/postprocessing';
import type {MutableRefObject} from 'react';
import React, {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {getConfig, THEME} from './constants';
import {InputSnapshot, useInput} from './input';
import {gameAudio, GameState} from './utils/helper';

interface SceneProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  inputRef: MutableRefObject<InputSnapshot>;
  exitChat: (payload: Record<string, unknown>) => Promise<void>;
  gameStateRef: MutableRefObject<GameState>;
  onCollectScripture: (id: string) => void;
  onUpdateHUD: (stats: {
    stamina: number;
    battery: number;
    fear: number;
    flashlightOn: boolean;
    nearPrompt: string | null;
    jinnDistance: number;
  }) => void;
  collectedIds: string[];
  isTouchDevice: boolean;
}

// Scripture locations across the Zamidar Bari
export interface ScriptureLocation {
  id: string;
  name: string;
  roomName: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

export const SCRIPTURE_DATA: ScriptureLocation[] = [
  {
    id: 'scripture_1',
    name: 'Surah Al-Falaq Scroll',
    roomName: 'Dining Hall Table',
    position: [11.5, 1.15, -6.5],
    rotation: [0, 0.4, 0],
  },
  {
    id: 'scripture_2',
    name: 'Ayat al-Kursi Talisman',
    roomName: "Zamidar's Almirah",
    position: [-12.2, 1.3, -7.0],
    rotation: [0, -0.6, 0],
  },
  {
    id: 'scripture_3',
    name: 'Surah An-Nas Scroll',
    roomName: 'Library Altar',
    position: [-10.8, 1.1, 8.5],
    rotation: [0, 1.2, 0],
  },
  {
    id: 'scripture_4',
    name: 'Surah Al-Ikhlas Parchment',
    roomName: 'Courtyard Shrine',
    position: [0.0, 1.05, 0.0],
    rotation: [0, 0, 0],
  },
  {
    id: 'scripture_5',
    name: 'Surah Al-Fatiha Relic',
    roomName: 'East Chamber Chest',
    position: [12.0, 1.1, 7.5],
    rotation: [0, -1.0, 0],
  },
];

// Mansion Waypoints for the Jinn Patrol AI
const JINN_WAYPOINTS: [number, number, number][] = [
  [0, 1.2, 0], // Courtyard
  [6, 1.2, 0], // East Hallway
  [11, 1.2, -6], // Dining Hall
  [11, 1.2, 7], // East Study
  [0, 1.2, 7], // North Hallway
  [-11, 1.2, 8], // Library
  [-6, 1.2, 0], // West Hallway
  [-11, 1.2, -7], // Zamidar Bedchamber
  [0, 1.2, -8], // South Foyer
  [0, 1.2, 12], // Entrance Corridor
];

// Reusable scratch vectors
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camEuler = new THREE.Euler(0, 0, 0, 'YXZ');

/** Procedural Mansion Wall & Architecture Component */
function MansionArchitecture({gateUnlocked}: {gateUnlocked: boolean}) {
  // Wood texture pattern colors
  const woodColor = '#24140b';
  const brickColor = '#3a2720';
  const trimColor = '#1a0f08';
  const stoneColor = '#1f2429';

  return (
    <group>
      {/* Ground Floor (Zamidar Bari Marble & Brick Court) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial
          color={stoneColor}
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* Ceiling & Wooden Rafters */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 4.2, 0]}
        receiveShadow>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial color="#14110e" roughness={0.9} />
      </mesh>

      {/* Outer Perimeter Manor Walls */}
      {/* North Wall */}
      <mesh position={[0, 2.1, -18]} castShadow receiveShadow>
        <boxGeometry args={[40, 4.2, 0.8]} />
        <meshStandardMaterial color={brickColor} roughness={0.9} />
      </mesh>
      {/* South Wall (with opening for escape gate) */}
      <mesh position={[-12, 2.1, 18]} castShadow receiveShadow>
        <boxGeometry args={[16, 4.2, 0.8]} />
        <meshStandardMaterial color={brickColor} roughness={0.9} />
      </mesh>
      <mesh position={[12, 2.1, 18]} castShadow receiveShadow>
        <boxGeometry args={[16, 4.2, 0.8]} />
        <meshStandardMaterial color={brickColor} roughness={0.9} />
      </mesh>
      {/* East Wall */}
      <mesh position={[18, 2.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 4.2, 36]} />
        <meshStandardMaterial color={brickColor} roughness={0.9} />
      </mesh>
      {/* West Wall */}
      <mesh position={[-18, 2.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 4.2, 36]} />
        <meshStandardMaterial color={brickColor} roughness={0.9} />
      </mesh>

      {/* Internal Room Dividers & Archways */}
      {/* West Wing Divider (Zamidar Chamber & Library) */}
      <mesh position={[-6, 2.1, -10]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 4.2, 16]} />
        <meshStandardMaterial color={woodColor} roughness={0.8} />
      </mesh>
      <mesh position={[-6, 2.1, 10]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 4.2, 16]} />
        <meshStandardMaterial color={woodColor} roughness={0.8} />
      </mesh>

      {/* East Wing Divider (Dining Hall & East Chamber) */}
      <mesh position={[6, 2.1, -10]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 4.2, 16]} />
        <meshStandardMaterial color={woodColor} roughness={0.8} />
      </mesh>
      <mesh position={[6, 2.1, 10]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 4.2, 16]} />
        <meshStandardMaterial color={woodColor} roughness={0.8} />
      </mesh>

      {/* Horizontal Chamber Partitions */}
      <mesh position={[-12, 2.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 4.2, 0.6]} />
        <meshStandardMaterial color={woodColor} roughness={0.8} />
      </mesh>
      <mesh position={[12, 2.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[12, 4.2, 0.6]} />
        <meshStandardMaterial color={woodColor} roughness={0.8} />
      </mesh>

      {/* Traditional Terracotta Brick Pillars around Courtyard */}
      {[-5, 5].map((x) =>
        [-5, 5].map((z) => (
          <group key={`pillar_${x}_${z}`} position={[x, 0, z]}>
            <mesh position={[0, 2.1, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.45, 0.55, 4.2, 12]} />
              <meshStandardMaterial color="#4a2e1b" roughness={0.8} />
            </mesh>
            {/* Pillar Capital */}
            <mesh position={[0, 4.0, 0]} castShadow>
              <boxGeometry args={[1.2, 0.3, 1.2]} />
              <meshStandardMaterial color={trimColor} roughness={0.7} />
            </mesh>
            {/* Pillar Base */}
            <mesh position={[0, 0.15, 0]} receiveShadow>
              <boxGeometry args={[1.3, 0.3, 1.3]} />
              <meshStandardMaterial color={trimColor} roughness={0.7} />
            </mesh>
          </group>
        )),
      )}

      {/* Traditional Grand Courtyard Center Altar / Banyan Root Base */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.25, 0]} receiveShadow>
          <cylinderGeometry args={[2.5, 2.8, 0.5, 16]} />
          <meshStandardMaterial color="#2d211a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.6, 0]} receiveShadow>
          <cylinderGeometry args={[1.8, 2.0, 0.3, 16]} />
          <meshStandardMaterial color="#3d2c22" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.4, 0.9]} />
          <meshStandardMaterial color="#1a110a" roughness={0.6} />
        </mesh>
      </group>

      {/* --- Detailed Wooden Furniture in Rooms --- */}
      {/* 1. Dining Hall (East, Z = -6.5) */}
      <group position={[11.5, 0, -6.5]}>
        {/* Long Dining Table */}
        <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 0.15, 6.5]} />
          <meshStandardMaterial color="#2c1a0e" roughness={0.6} />
        </mesh>
        {/* Table Legs */}
        {[-0.9, 0.9].map((lx) =>
          [-2.8, 2.8].map((lz) => (
            <mesh
              key={`table_leg_${lx}_${lz}`}
              position={[lx, 0.4, lz]}
              castShadow>
              <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
              <meshStandardMaterial color="#1a0f07" roughness={0.7} />
            </mesh>
          )),
        )}
        {/* Antique Chairs */}
        {[-1.6, 1.6].map((cx, idx) =>
          [-2, 0, 2].map((cz, cidx) => (
            <group
              key={`chair_${idx}_${cidx}`}
              position={[cx, 0, cz]}
              rotation={[0, cx < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
              <mesh position={[0, 0.45, 0]} castShadow>
                <boxGeometry args={[0.6, 0.08, 0.6]} />
                <meshStandardMaterial color="#3a1e0f" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.85, -0.26]} castShadow>
                <boxGeometry args={[0.55, 0.8, 0.08]} />
                <meshStandardMaterial color="#2a150a" roughness={0.7} />
              </mesh>
            </group>
          )),
        )}
      </group>

      {/* 2. Zamidar's Bedchamber (West, Z = -7.0) */}
      <group position={[-12, 0, -7.0]}>
        {/* Grand 4-Poster Wooden Bed */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.6, 4.8]} />
          <meshStandardMaterial color="#1f120a" roughness={0.7} />
        </mesh>
        {/* Mattress & Royal Velvet Cover */}
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[3.8, 0.35, 4.4]} />
          <meshStandardMaterial color="#4a0e17" roughness={0.8} />
        </mesh>
        {/* Bedposts */}
        {[-1.9, 1.9].map((bx) =>
          [-2.2, 2.2].map((bz) => (
            <mesh
              key={`bedpost_${bx}_${bz}`}
              position={[bx, 1.8, bz]}
              castShadow>
              <cylinderGeometry args={[0.08, 0.1, 3.6, 8]} />
              <meshStandardMaterial color="#160c06" roughness={0.6} />
            </mesh>
          )),
        )}
        {/* Ornate Antique Almirah (Wardrobe) */}
        <group position={[-0.2, 0, 4.8]}>
          <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.0, 3.2, 1.2]} />
            <meshStandardMaterial color="#2b180d" roughness={0.6} />
          </mesh>
          <mesh position={[-0.7, 1.6, 0.62]} castShadow>
            <boxGeometry args={[1.3, 2.8, 0.06]} />
            <meshStandardMaterial color="#3d2213" roughness={0.5} />
          </mesh>
          <mesh position={[0.7, 1.6, 0.62]} castShadow>
            <boxGeometry args={[1.3, 2.8, 0.06]} />
            <meshStandardMaterial color="#3d2213" roughness={0.5} />
          </mesh>
          {/* Brass Handles */}
          <mesh position={[-0.15, 1.6, 0.68]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial
              color="#d4af37"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0.15, 1.6, 0.68]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial
              color="#d4af37"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        </group>
      </group>

      {/* 3. Old Library / Puja Shrine (West, Z = 8.5) */}
      <group position={[-11, 0, 8.5]}>
        {/* Tall Bookshelves against wall */}
        <mesh position={[-5.8, 1.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 3.6, 6.0]} />
          <meshStandardMaterial color="#1e110a" roughness={0.8} />
        </mesh>
        {/* Ancient Wooden Desk & Altar */}
        <mesh position={[0.2, 0.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, 1.2, 1.6]} />
          <meshStandardMaterial color="#2d190e" roughness={0.6} />
        </mesh>
      </group>

      {/* 4. East Chamber / Ancestral Chest Room (East, Z = 7.5) */}
      <group position={[12, 0, 7.5]}>
        {/* Antique Brass-Bound Wood Chest */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.9, 1.2]} />
            <meshStandardMaterial color="#351d10" roughness={0.65} />
          </mesh>
          {/* Brass Bands */}
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.82, 0.92, 0.15]} />
            <meshStandardMaterial
              color="#d4af37"
              metalness={0.85}
              roughness={0.3}
            />
          </mesh>
        </group>
      </group>

      {/* Dim Atmospheric Oil Lanterns on Corridors */}
      {[
        [-5, 2.5, -9],
        [5, 2.5, -9],
        [-5, 2.5, 9],
        [5, 2.5, 9],
        [0, 2.5, -16],
        [0, 2.5, 14],
      ].map(([lx, ly, lz], lidx) => (
        <group key={`lantern_${lidx}`} position={[lx, ly, lz]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.15, 0.1, 0.4, 8]} />
            <meshStandardMaterial
              color="#111"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
          <pointLight
            color="#ff9933"
            intensity={8.0}
            distance={7.5}
            decay={2}
          />
        </group>
      ))}

      {/* South Escape Gate & Supernatural Seal */}
      <group position={[0, 0, 17.6]}>
        {/* Wrought Iron Gate Frame */}
        <mesh position={[-3.2, 2.1, 0]} castShadow>
          <boxGeometry args={[0.5, 4.2, 0.5]} />
          <meshStandardMaterial
            color="#181818"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[3.2, 2.1, 0]} castShadow>
          <boxGeometry args={[0.5, 4.2, 0.5]} />
          <meshStandardMaterial
            color="#181818"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 3.9, 0]} castShadow>
          <boxGeometry args={[6.8, 0.4, 0.5]} />
          <meshStandardMaterial
            color="#181818"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
        {/* Gate Bars */}
        {[-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4].map((gx) => (
          <mesh key={`bar_${gx}`} position={[gx, 2.0, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 3.8, 8]} />
            <meshStandardMaterial
              color="#222"
              metalness={0.9}
              roughness={0.3}
            />
          </mesh>
        ))}

        {/* Supernatural Gate Seal (Curse Barrier or Golden Exit Portal) */}
        <mesh position={[0, 2.0, 0]}>
          <planeGeometry args={[6.0, 3.8]} />
          <meshStandardMaterial
            color={gateUnlocked ? '#eab308' : '#dc2626'}
            emissive={gateUnlocked ? '#eab308' : '#b91c1c'}
            emissiveIntensity={gateUnlocked ? 2.5 : 1.2}
            transparent
            opacity={gateUnlocked ? 0.35 : 0.75}
          />
        </mesh>
        <pointLight
          color={gateUnlocked ? '#facc15' : '#ef4444'}
          intensity={gateUnlocked ? 35 : 18}
          distance={10}
          decay={1.8}
        />
      </group>
    </group>
  );
}

/** 3D Protective Scripture Scroll Item Component */
function ScriptureEntity({
  item,
  isCollected,
}: {
  item: ScriptureLocation;
  isCollected: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(({clock}) => {
    if (isCollected || !meshRef.current) return;
    const t = clock.getElapsedTime() + item.position[0];
    meshRef.current.position.y = item.position[1] + Math.sin(t * 2.5) * 0.08;
    meshRef.current.rotation.y += 0.02;
  });

  if (isCollected) return null;

  return (
    <group ref={meshRef} position={item.position} rotation={item.rotation}>
      {/* Ancient Golden Cylindrical Scroll Body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.45, 12]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#eab308"
          emissiveIntensity={1.2}
          roughness={0.4}
        />
      </mesh>
      {/* Scroll Caps with Sacred Gold Trimming */}
      <mesh position={[0, 0.23, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.06, 12]} />
        <meshStandardMaterial
          color="#ca8a04"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, -0.23, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.06, 12]} />
        <meshStandardMaterial
          color="#ca8a04"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      {/* Golden Aura Point Light */}
      <pointLight color="#fde047" intensity={15} distance={4.5} decay={2} />
    </group>
  );
}

/** 3D Roaming Jinn (Chhayatma) Model and Animation Rig */
function JinnModel({
  jinnPosRef,
  isHunting,
}: {
  jinnPosRef: MutableRefObject<THREE.Vector3>;
  isHunting: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const cloakRef = useRef<THREE.Group>(null);

  useFrame(({clock}) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Copy smoothed position from Jinn AI ref
    groupRef.current.position.copy(jinnPosRef.current);
    // Levitation hover bob
    groupRef.current.position.y =
      jinnPosRef.current.y + Math.sin(t * 3) * 0.15;

    // Menacing cloak waving
    if (cloakRef.current) {
      cloakRef.current.rotation.z = Math.sin(t * 2) * 0.08;
      cloakRef.current.rotation.x = (isHunting ? 0.25 : 0.05) + Math.sin(t * 4) * 0.05;
    }

    // Eye flare pulse
    const eyeIntensity = isHunting
      ? 3.5 + Math.sin(t * 15) * 1.5
      : 1.8 + Math.sin(t * 4) * 0.5;
    if (leftEyeRef.current && rightEyeRef.current) {
      (leftEyeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        eyeIntensity;
      (rightEyeRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        eyeIntensity;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head / Ethereal Face */}
      <mesh position={[0, 2.3, 0]} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color="#090a0f"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Curved Shadow Horns / Crown */}
      <mesh position={[-0.22, 2.65, 0]} rotation={[0, 0, 0.4]}>
        <coneGeometry args={[0.1, 0.5, 8]} />
        <meshStandardMaterial color="#050608" roughness={0.9} />
      </mesh>
      <mesh position={[0.22, 2.65, 0]} rotation={[0, 0, -0.4]}>
        <coneGeometry args={[0.1, 0.5, 8]} />
        <meshStandardMaterial color="#050608" roughness={0.9} />
      </mesh>

      {/* Burning Crimson Eyes */}
      <mesh ref={leftEyeRef} position={[-0.12, 2.35, -0.3]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={2.5}
        />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.12, 2.35, -0.3]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={2.5}
        />
      </mesh>

      {/* Ethereal Levitating Shroud & Cloak */}
      <group ref={cloakRef} position={[0, 1.4, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.4, 0.85, 1.8, 16, 1, true]} />
          <meshStandardMaterial
            color="#090a10"
            roughness={0.95}
            transparent
            opacity={0.92}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Tapered Lower Smoke Tail */}
        <mesh position={[0, -1.1, 0]}>
          <coneGeometry args={[0.6, 1.2, 12]} />
          <meshStandardMaterial
            color="#050608"
            transparent
            opacity={0.75}
          />
        </mesh>
      </group>

      {/* Dark Red Danger Aura Light */}
      <pointLight
        color={isHunting ? '#ff1111' : '#880000'}
        intensity={isHunting ? 25 : 8}
        distance={9}
        decay={2}
      />
    </group>
  );
}

/** First Person Player Controller & 3D Flashlight */
function FirstPersonInvestigator({
  gameState,
  setGameState,
  inputRef,
  onCollectScripture,
  onUpdateHUD,
  collectedIds,
  jinnPosRef,
  isHuntingRef,
  gateUnlocked,
}: {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  inputRef: MutableRefObject<InputSnapshot>;
  onCollectScripture: (id: string) => void;
  onUpdateHUD: (stats: {
    stamina: number;
    battery: number;
    fear: number;
    flashlightOn: boolean;
    nearPrompt: string | null;
    jinnDistance: number;
  }) => void;
  collectedIds: string[];
  jinnPosRef: MutableRefObject<THREE.Vector3>;
  isHuntingRef: MutableRefObject<boolean>;
  gateUnlocked: boolean;
}) {
  const {camera, gl} = useThree();
  const playerPos = useRef(new THREE.Vector3(0, 1.7, 14)); // Start near South Foyer
  const flashlightSpotRef = useRef<THREE.SpotLight>(null);
  const flashlightMeshRef = useRef<THREE.Group>(null);

  // Player state
  const playerYaw = useRef(Math.PI); // Facing North (-Z)
  const playerPitch = useRef(0);
  const staminaRef = useRef(getConfig('maxStamina'));
  const batteryRef = useRef(100);
  const fearRef = useRef(0);
  const flashlightOnRef = useRef(true);

  // Input edge tracking
  const wasInteracting = useRef(false);
  const wasFlashlightToggle = useRef(false);
  const lastFootstepTime = useRef(0);
  const lastWhisperTime = useRef(0);

  // Pointer lock state for desktop
  const isPointerLocked = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === canvas;
    };

    const handleCanvasClick = () => {
      if (gameState.status === 'PLAYING' && !isPointerLocked.current) {
        canvas.requestPointerLock?.();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked.current || gameState.status !== 'PLAYING') return;
      const sensitivity = 0.0022;
      playerYaw.current -= e.movementX * sensitivity;
      playerPitch.current -= e.movementY * sensitivity;
      // Clamp pitch (-80 to +80 degrees)
      playerPitch.current = Math.max(
        -Math.PI / 2.3,
        Math.min(Math.PI / 2.3, playerPitch.current),
      );
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      canvas.removeEventListener('click', handleCanvasClick);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl, gameState.status]);

  useFrame(({clock}, delta) => {
    if (gameState.status !== 'PLAYING') return;
    const dt = Math.min(delta, 0.1);
    const actions = inputRef.current?.actions;
    const now = clock.getElapsedTime();

    // 1. Keyboard / Virtual Action Toggles
    const interactPressed =
      actions?.confirm || (inputRef.current as any)?.customInteract;
    const flashlightPressed =
      (inputRef.current as any)?.customFlashlight;
    const isSprinting =
      (inputRef.current as any)?.customSprint && staminaRef.current > 10;

    // Flashlight Toggle edge
    if (flashlightPressed && !wasFlashlightToggle.current) {
      flashlightOnRef.current = !flashlightOnRef.current;
      gameAudio.playJumpLandingThud();
    }
    wasFlashlightToggle.current = !!flashlightPressed;

    // Stamina drain & recovery
    const walkSpeed = getConfig('walkSpeed');
    const sprintSpeed = getConfig('sprintSpeed');
    let currentSpeed = walkSpeed;

    if (isSprinting) {
      currentSpeed = sprintSpeed;
      staminaRef.current = Math.max(0, staminaRef.current - dt * 28);
    } else {
      staminaRef.current = Math.min(
        getConfig('maxStamina'),
        staminaRef.current + dt * 16,
      );
    }

    // Battery Drain & Slow Recovery
    if (flashlightOnRef.current) {
      batteryRef.current = Math.max(
        0,
        batteryRef.current - dt * getConfig('flashlightBatteryDrain'),
      );
      if (batteryRef.current <= 0) {
        flashlightOnRef.current = false;
      }
    } else {
      batteryRef.current = Math.min(100, batteryRef.current + dt * 4.0);
    }

    // 2. Camera Orientation Calculation
    // Touch drag camera rotation support from input snapshot
    if (
      !isPointerLocked.current &&
      (inputRef.current as any)?.touchLookDelta
    ) {
      const touchDelta = (inputRef.current as any).touchLookDelta;
      playerYaw.current -= touchDelta.x * 0.004;
      playerPitch.current -= touchDelta.y * 0.004;
      playerPitch.current = Math.max(
        -Math.PI / 2.3,
        Math.min(Math.PI / 2.3, playerPitch.current),
      );
      // Reset delta after applying
      (inputRef.current as any).touchLookDelta = {x: 0, y: 0};
    }

    _camEuler.set(playerPitch.current, playerYaw.current, 0);
    camera.quaternion.setFromEuler(_camEuler);

    // Compute forward & right vectors on XZ plane
    _forward.set(0, 0, -1).applyEuler(new THREE.Euler(0, playerYaw.current, 0));
    _right.set(1, 0, 0).applyEuler(new THREE.Euler(0, playerYaw.current, 0));

    // 3. Locomotion Movement Vector
    _v1.set(0, 0, 0);
    if (actions?.up) _v1.add(_forward);
    if (actions?.down) _v1.sub(_forward);
    if (actions?.right) _v1.add(_right);
    if (actions?.left) _v1.sub(_right);

    const isMoving = _v1.lengthSq() > 0.001;
    if (isMoving) {
      _v1.normalize();
      const nextX = playerPos.current.x + _v1.x * currentSpeed * dt;
      const nextZ = playerPos.current.z + _v1.z * currentSpeed * dt;

      // Mansion Interior Wall Bounds Collision Clamping
      // Outer boundaries
      const clampedX = Math.max(-16.5, Math.min(16.5, nextX));
      const clampedZ = Math.max(-16.5, Math.min(16.5, nextZ));

      playerPos.current.x = clampedX;
      playerPos.current.z = clampedZ;

      // Footstep SFX on wood
      const footstepInterval = isSprinting ? 0.32 : 0.52;
      if (now - lastFootstepTime.current > footstepInterval) {
        gameAudio.playFootstepWood();
        lastFootstepTime.current = now;
      }
    }

    // Set camera position (with subtle head bob)
    const bob = isMoving ? Math.sin(now * (isSprinting ? 14 : 9)) * 0.05 : 0;
    camera.position.set(
      playerPos.current.x,
      playerPos.current.y + bob,
      playerPos.current.z,
    );

    // 4. Proximity Check with Jinn (Fear & Flashlight Glitch)
    const distToJinn = playerPos.current.distanceTo(jinnPosRef.current);
    const maxFear = getConfig('maxFear');

    if (distToJinn < 14) {
      // Fear rises rapidly
      const proximityFactor = Math.max(0, 1 - distToJinn / 14);
      fearRef.current = Math.min(
        maxFear,
        fearRef.current + proximityFactor * dt * 26,
      );

      // Whispering / buzz audio trigger
      if (now - lastWhisperTime.current > 2.8 - proximityFactor * 1.5) {
        gameAudio.playErrorBuzz();
        lastWhisperTime.current = now;
      }

      // Jinn catches player if too close or fear maxed out
      if (distToJinn < 1.6 || fearRef.current >= maxFear) {
        gameAudio.playDefeatMotif();
        setGameState((prev) => ({
          ...prev,
          status: 'GAME_OVER',
          score: collectedIds.length * 200,
        }));
        return;
      }
    } else {
      // Fear slowly dissipates
      fearRef.current = Math.max(0, fearRef.current - dt * 6.0);
    }

    // 5. Flashlight Spotlight & 3D Mesh Position Update
    if (flashlightSpotRef.current) {
      camera.getWorldDirection(_v2);
      flashlightSpotRef.current.position.copy(camera.position);
      flashlightSpotRef.current.target.position
        .copy(camera.position)
        .addScaledVector(_v2, 10);
      flashlightSpotRef.current.target.updateMatrixWorld();

      // Flashlight Flickering when Jinn is close
      let flickerMultiplier = 1.0;
      if (distToJinn < 12) {
        // High frequency erratic flicker
        flickerMultiplier = Math.random() > 0.4 ? (Math.random() > 0.7 ? 0.1 : 0.4) : 1.0;
      }

      const lightIntensity = flashlightOnRef.current
        ? 35.0 * (batteryRef.current / 100) * flickerMultiplier
        : 0;
      flashlightSpotRef.current.intensity = lightIntensity;
    }

    // Update handheld 3D flashlight model position in screen space
    if (flashlightMeshRef.current) {
      flashlightMeshRef.current.position
        .copy(camera.position)
        .addScaledVector(_forward, 0.55)
        .addScaledVector(_right, 0.3)
        .add(new THREE.Vector3(0, -0.25, 0));
      flashlightMeshRef.current.quaternion.copy(camera.quaternion);
    }

    // 6. Scripture Interaction & Escape Gate Check
    let promptText: string | null = null;

    // Check scriptures
    for (const scripture of SCRIPTURE_DATA) {
      if (collectedIds.includes(scripture.id)) continue;
      _v1.set(...scripture.position);
      const distToScripture = playerPos.current.distanceTo(_v1);
      if (distToScripture < 2.4) {
        promptText = `[E / TAP] Collect ${scripture.name}`;
        if (interactPressed && !wasInteracting.current) {
          gameAudio.playPowerupChime();
          onCollectScripture(scripture.id);
          // Relieve fear on collecting holy scripture
          fearRef.current = Math.max(0, fearRef.current - 40);
        }
        break;
      }
    }

    // Check Escape Gate
    if (gateUnlocked) {
      _v1.set(0, 1.7, 17.0);
      const distToGate = playerPos.current.distanceTo(_v1);
      if (distToGate < 3.2) {
        promptText = 'ENTER THE GATE TO ESCAPE!';
        if (distToGate < 1.8) {
          gameAudio.playVictoryFanfare();
          setGameState((prev) => ({
            ...prev,
            status: 'VICTORY',
            score: 1000 + Math.floor((100 - fearRef.current) * 10),
          }));
          return;
        }
      }
    } else {
      _v1.set(0, 1.7, 17.0);
      if (playerPos.current.distanceTo(_v1) < 3.0) {
        promptText = `Gate Sealed by Jinn! (${collectedIds.length}/${SCRIPTURE_DATA.length} Scriptures Found)`;
      }
    }

    wasInteracting.current = !!interactPressed;

    // Update HUD metrics
    onUpdateHUD({
      stamina: staminaRef.current,
      battery: batteryRef.current,
      fear: fearRef.current,
      flashlightOn: flashlightOnRef.current,
      nearPrompt: promptText,
      jinnDistance: distToJinn,
    });
  });

  return (
    <>
      {/* Dynamic Flashlight Spotlight */}
      <spotLight
        ref={flashlightSpotRef}
        color="#fff5e6"
        angle={Math.PI / 4.2}
        penumbra={0.4}
        distance={24}
        decay={1.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />

      {/* Handheld 3D Flashlight Mesh */}
      <group ref={flashlightMeshRef}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.28, 12]} />
          <meshStandardMaterial
            color="#2a2a2a"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.045, 0.08, 12]} />
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
        {/* Flashlight Lens Bulb */}
        <mesh position={[0, 0, -0.19]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial
            color={flashlightOnRef.current ? '#ffffdd' : '#555555'}
            emissive={flashlightOnRef.current ? '#ffffee' : '#000000'}
            emissiveIntensity={flashlightOnRef.current ? 3.0 : 0}
          />
        </mesh>
      </group>
    </>
  );
}

/** The Main 3D Horror Scene */
function Scene({
  gameState,
  setGameState,
  inputRef,
  exitChat,
  gameStateRef,
  onCollectScripture,
  onUpdateHUD,
  collectedIds,
  isTouchDevice,
}: SceneProps & {
  onCollectScripture: (id: string) => void;
  onUpdateHUD: (stats: any) => void;
  collectedIds: string[];
  isTouchDevice: boolean;
}) {
  const {camera} = useThree();

  // Jinn AI state
  const jinnPosRef = useRef(new THREE.Vector3(0, 1.2, -6));
  const jinnWaypointIndex = useRef(0);
  const isHuntingRef = useRef(false);
  const [isHuntingVisual, setIsHuntingVisual] = useState(false);

  const gateUnlocked = collectedIds.length >= getConfig('totalScriptures');

  // Jinn AI Patrol and Hunting update loop
  useFrame(({clock}, delta) => {
    if (gameState.status !== 'PLAYING') return;
    const dt = Math.min(delta, 0.1);
    const jinnSpeed = isHuntingRef.current
      ? getConfig('jinnHuntSpeed')
      : getConfig('jinnSpeed');

    // Distance to player
    const distToPlayer = jinnPosRef.current.distanceTo(camera.position);

    // If player is close or sprinting in view, switch to HUNT
    if (distToPlayer < 9.0) {
      if (!isHuntingRef.current) {
        isHuntingRef.current = true;
        setIsHuntingVisual(true);
      }
    } else if (distToPlayer > 18.0 && isHuntingRef.current) {
      isHuntingRef.current = false;
      setIsHuntingVisual(false);
    }

    if (isHuntingRef.current) {
      // Move directly towards player
      _v1.copy(camera.position).sub(jinnPosRef.current);
      _v1.y = 0; // Float on floor
      if (_v1.lengthSq() > 0.1) {
        _v1.normalize();
        jinnPosRef.current.addScaledVector(_v1, jinnSpeed * dt);
      }
    } else {
      // Patrol waypoints
      const targetWp = JINN_WAYPOINTS[jinnWaypointIndex.current];
      _v1.set(targetWp[0], targetWp[1], targetWp[2]);
      const distToWp = jinnPosRef.current.distanceTo(_v1);

      if (distToWp < 1.2) {
        jinnWaypointIndex.current =
          (jinnWaypointIndex.current + 1) % JINN_WAYPOINTS.length;
      } else {
        _v2.copy(_v1).sub(jinnPosRef.current);
        _v2.y = 0;
        _v2.normalize();
        jinnPosRef.current.addScaledVector(_v2, jinnSpeed * dt);
      }
    }
  });

  return (
    <>
      {/* Realistic Moonlight through Skylights */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={getConfig('sunIntensity')}
        color={getConfig('sunColor')}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0005}
      />

      {/* Mansion Ambient & Hemisphere Fill */}
      <ambientLight
        color={getConfig('ambientColor')}
        intensity={getConfig('ambientIntensity')}
      />
      <hemisphereLight
        color={getConfig('hemiSkyColor')}
        groundColor={getConfig('hemiGroundColor')}
        intensity={getConfig('hemiIntensity')}
      />

      {/* Mansion World Architecture & Furniture */}
      <MansionArchitecture gateUnlocked={gateUnlocked} />

      {/* 5 Hidden Islamic Protective Scriptures */}
      {SCRIPTURE_DATA.map((item) => (
        <ScriptureEntity
          key={item.id}
          item={item}
          isCollected={collectedIds.includes(item.id)}
        />
      ))}

      {/* Roaming Jinn Entity */}
      <JinnModel jinnPosRef={jinnPosRef} isHunting={isHuntingVisual} />

      {/* First Person Investigator Rig & Flashlight */}
      <FirstPersonInvestigator
        gameState={gameState}
        setGameState={setGameState}
        inputRef={inputRef}
        onCollectScripture={onCollectScripture}
        onUpdateHUD={onUpdateHUD}
        collectedIds={collectedIds}
        jinnPosRef={jinnPosRef}
        isHuntingRef={isHuntingRef}
        gateUnlocked={gateUnlocked}
      />
    </>
  );
}

/** Game Wrapper with PostProcessing Bloom & Vignette */
export function Game({
  gameState,
  setGameState,
  exitChat,
  gameStateRef,
  onCollectScripture,
  onUpdateHUD,
  collectedIds,
  isTouchDevice,
  inputRef,
}: {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  exitChat: (payload: Record<string, unknown>) => Promise<void>;
  gameStateRef: MutableRefObject<GameState>;
  onCollectScripture: (id: string) => void;
  onUpdateHUD: (stats: any) => void;
  collectedIds: string[];
  isTouchDevice: boolean;
  inputRef: MutableRefObject<InputSnapshot>;
}) {
  return (
    <div className="w-full h-full canvas-wrapper relative">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          fov: getConfig('fov'),
          near: 0.1,
          far: 100,
          position: [0, 1.7, 14],
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        scene={{
          background: new THREE.Color(getConfig('backgroundColor')),
          fog: new THREE.FogExp2(getConfig('backgroundColor'), 0.045),
        }}>
        <Suspense fallback={null}>
          <Scene
            gameState={gameState}
            setGameState={setGameState}
            inputRef={inputRef}
            exitChat={exitChat}
            gameStateRef={gameStateRef}
            onCollectScripture={onCollectScripture}
            onUpdateHUD={onUpdateHUD}
            collectedIds={collectedIds}
            isTouchDevice={isTouchDevice}
          />

          <EffectComposer>
            <Bloom
              luminanceThreshold={0.8}
              luminanceSmoothing={0.7}
              intensity={0.6}
              mipmapBlur
            />
            <Vignette eskil={false} offset={0.15} darkness={1.1} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}

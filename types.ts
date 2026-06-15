/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';

export enum AppState {
  STABLE = 'STABLE',
  DISMANTLING = 'DISMANTLING',
  REBUILDING = 'REBUILDING'
}

export enum SymmetryMode {
  NONE = 'NONE',
  X = 'X',
  Z = 'Z'
}

export enum EditTool {
  BRUSH = 'BRUSH',
  ERASER = 'ERASER'
}

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: number;
}

export interface VoxelKeyframe {
  id: string;
  name: string;
  data: VoxelData[];
}

export interface SimulationVoxel {
  id: number;
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  // Greedy meshing dimensions (optional, default to 1)
  w?: number;
  h?: number;
  d?: number;
  // Physics state
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  rvx: number;
  rvy: number;
  rvz: number;
}

export interface RebuildTarget {
  x: number;
  y: number;
  z: number;
  delay: number;
  isRubble?: boolean;
}

export type VoxelMaterialStyle = 'matte' | 'glossy' | 'glowing';

export interface SavedModel {
  name: string;
  data: VoxelData[];
  baseModel?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text?: string;
    isToolCall?: boolean;
}

export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    aistudio?: AIStudio;
  }
}

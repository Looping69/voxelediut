/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AppState, SimulationVoxel, RebuildTarget, VoxelData, SymmetryMode, EditTool, VoxelMaterialStyle } from '../types';
import { CONFIG, COLORS } from '../utils/voxelConstants';

export class VoxelEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private instanceMesh: THREE.InstancedMesh | null = null;
  private floor: THREE.Mesh;
  private dummy = new THREE.Object3D();
  
  // Interaction
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private ghostVoxel: THREE.Mesh;
  private ghostSymmetryVoxel: THREE.Mesh;
  
  private voxels: SimulationVoxel[] = [];
  private currentVoxelData: VoxelData[] = [];
  private rebuildTargets: RebuildTarget[] = [];
  private rebuildStartTime: number = 0;
  
  private state: AppState = AppState.STABLE;
  private onStateChange: (state: AppState) => void;
  private onCountChange: (count: number) => void;
  private onVoxelEdit?: (newData: VoxelData[]) => void;
  
  private animationId: number = 0;
  
  // Edit State
  private isEditMode: boolean = false;
  private activeTool: EditTool = EditTool.BRUSH;
  private activeColor: number = COLORS.WHITE;
  private symmetryMode: SymmetryMode = SymmetryMode.NONE;
  private isWireframe: boolean = false;
  private isBaked: boolean = false;
  private isFogEnabled: boolean = true;
  private isGreedyEnabled: boolean = false;
  private materialStyle: VoxelMaterialStyle = 'matte';

  constructor(
    container: HTMLElement, 
    onStateChange: (state: AppState) => void,
    onCountChange: (count: number) => void,
    onVoxelEdit?: (newData: VoxelData[]) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;
    this.onCountChange = onCountChange;
    this.onVoxelEdit = onVoxelEdit;

    // Init Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.BG_COLOR);
    this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 60, 140);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(30, 30, 60);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.target.set(0, 5, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    this.scene.add(dirLight);

    // Floor
    const planeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 1 });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), planeMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = CONFIG.FLOOR_Y;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // Ghost Voxels
    const ghostGeom = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE);
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    this.ghostVoxel = new THREE.Mesh(ghostGeom, ghostMat);
    this.ghostVoxel.visible = false;
    this.scene.add(this.ghostVoxel);

    this.ghostSymmetryVoxel = new THREE.Mesh(ghostGeom, ghostMat.clone());
    this.ghostSymmetryVoxel.visible = false;
    this.scene.add(this.ghostSymmetryVoxel);

    // Events
    this.container.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));

    this.animate = this.animate.bind(this);
    this.animate();
  }

  public getCurrentVoxelData(): VoxelData[] {
    return this.voxels.map(v => ({
      x: v.x,
      y: v.y,
      z: v.z,
      color: v.color.getHex()
    }));
  }

  public setEditParams(isEdit: boolean, tool: EditTool, color: number, symmetry: SymmetryMode) {
    this.isEditMode = isEdit;
    this.activeTool = tool;
    this.activeColor = color;
    this.symmetryMode = symmetry;
    if (!isEdit) {
      this.ghostVoxel.visible = false;
      this.ghostSymmetryVoxel.visible = false;
    }
  }

  public setWireframe(enabled: boolean) {
    this.isWireframe = enabled;
    if (this.instanceMesh && !Array.isArray(this.instanceMesh.material)) {
        (this.instanceMesh.material as THREE.MeshStandardMaterial).wireframe = enabled;
        this.instanceMesh.material.needsUpdate = true;
    }
  }

  public setBaked(enabled: boolean) {
    if (this.isBaked === enabled) return;
    this.isBaked = enabled;
    this.loadInitialModel(this.currentVoxelData);
  }

  private onPointerMove(event: PointerEvent) {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (this.isEditMode && this.state === AppState.STABLE) {
      this.updateGhost();
    }
  }

  private onPointerDown(event: PointerEvent) {
    // If physics is active, applying force
    if (this.state === AppState.DISMANTLING) {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.instanceMesh ? [this.instanceMesh, this.floor] : [this.floor]);
        if (intersects.length > 0) {
            const point = intersects[0].point;
            // Apply explosion force at point
            const radius = 8;
            const force = 0.8;
            this.voxels.forEach(v => {
                const dx = v.x - point.x;
                const dy = v.y - point.y;
                const dz = v.z - point.z;
                const distSq = dx*dx + dy*dy + dz*dz;
                if (distSq < radius * radius) {
                    const dist = Math.sqrt(distSq);
                    const f = (1 - dist / radius) * force;
                    v.vx += (dx / dist) * f;
                    v.vy += (dy / dist) * f + 0.2; // Add some Up force
                    v.vz += (dz / dist) * f;
                }
            });
        }
        return;
    }

    if (!this.isEditMode || this.state !== AppState.STABLE) return;
    
    // Perform Raycast
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.instanceMesh ? [this.instanceMesh, this.floor] : [this.floor]);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const pos = new THREE.Vector3();

      if (this.activeTool === EditTool.BRUSH) {
        if (intersect.object === this.floor) {
          pos.copy(intersect.point).add(new THREE.Vector3(0, 0.5, 0));
        } else {
          pos.copy(intersect.point).add(intersect.face!.normal.clone().multiplyScalar(0.5));
        }
        
        const gridPos = { x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) };
        this.addVoxelAt(gridPos.x, gridPos.y, gridPos.z, true);
      } else {
        // Eraser
        if (intersect.object !== this.floor && intersect.instanceId !== undefined) {
          this.removeVoxelAt(intersect.instanceId, true);
        }
      }
    }
  }

  private addVoxelAt(x: number, y: number, z: number, withSymmetry: boolean) {
    // Prevent duplicates
    const exists = this.currentVoxelData.some(v => v.x === x && v.y === y && v.z === z);
    if (!exists) {
        const newData = [...this.currentVoxelData, { x, y, z, color: this.activeColor }];
        this.currentVoxelData = newData;
        this.loadInitialModel(newData);
        this.onVoxelEdit?.(newData);
    }

    if (withSymmetry && this.symmetryMode !== SymmetryMode.NONE) {
      const symPos = this.getSymmetryPos(x, y, z);
      if (symPos) this.addVoxelAt(symPos.x, symPos.y, symPos.z, false);
    }
  }

  private removeVoxelAt(index: number, withSymmetry: boolean) {
    const targetVoxel = this.currentVoxelData[index];
    if (!targetVoxel) return;

    const newData = this.currentVoxelData.filter((_, i) => i !== index);
    
    if (withSymmetry && this.symmetryMode !== SymmetryMode.NONE) {
      const symPos = this.getSymmetryPos(targetVoxel.x, targetVoxel.y, targetVoxel.z);
      if (symPos) {
        const symIdx = newData.findIndex(v => v.x === symPos.x && v.y === symPos.y && v.z === symPos.z);
        if (symIdx !== -1) newData.splice(symIdx, 1);
      }
    }

    this.currentVoxelData = newData;
    this.loadInitialModel(newData);
    this.onVoxelEdit?.(newData);
  }

  private getSymmetryPos(x: number, y: number, z: number) {
    if (this.symmetryMode === SymmetryMode.X) return { x: -x, y, z };
    if (this.symmetryMode === SymmetryMode.Z) return { x, y, z: -z };
    return null;
  }

  private updateGhost() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.instanceMesh ? [this.instanceMesh, this.floor] : [this.floor]);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const pos = new THREE.Vector3();
      
      if (this.activeTool === EditTool.BRUSH) {
        if (intersect.object === this.floor) {
          pos.copy(intersect.point).add(new THREE.Vector3(0, 0.5, 0));
        } else {
          pos.copy(intersect.point).add(intersect.face!.normal.clone().multiplyScalar(0.5));
        }
        
        const gridX = Math.round(pos.x);
        const gridY = Math.round(pos.y);
        const gridZ = Math.round(pos.z);
        
        this.ghostVoxel.position.set(gridX, gridY, gridZ);
        this.ghostVoxel.visible = true;
        const material = this.ghostVoxel.material as THREE.MeshStandardMaterial;
        material.color.set(this.activeColor);

        if (this.symmetryMode !== SymmetryMode.NONE) {
          const sym = this.getSymmetryPos(gridX, gridY, gridZ);
          if (sym) {
            this.ghostSymmetryVoxel.position.set(sym.x, sym.y, sym.z);
            this.ghostSymmetryVoxel.visible = true;
            const material = this.ghostSymmetryVoxel.material as THREE.MeshStandardMaterial;
            material.color.set(this.activeColor);
          }
        } else {
          this.ghostSymmetryVoxel.visible = false;
        }
      } else {
        // Eraser Ghost
        if (intersect.object !== this.floor && intersect.instanceId !== undefined) {
          const vox = this.voxels[intersect.instanceId];
          this.ghostVoxel.position.set(vox.x, vox.y, vox.z);
          this.ghostVoxel.visible = true;
          const material = this.ghostVoxel.material as THREE.MeshStandardMaterial;
          material.color.set(0xff0000);

          if (this.symmetryMode !== SymmetryMode.NONE) {
            const sym = this.getSymmetryPos(vox.x, vox.y, vox.z);
            if (sym) {
              this.ghostSymmetryVoxel.position.set(sym.x, sym.y, sym.z);
              this.ghostSymmetryVoxel.visible = true;
              const material = this.ghostSymmetryVoxel.material as THREE.MeshStandardMaterial;
              material.color.set(0xff0000);
            }
          } else {
            this.ghostSymmetryVoxel.visible = false;
          }
        } else {
          this.ghostVoxel.visible = false;
          this.ghostSymmetryVoxel.visible = false;
        }
      }
    } else {
      this.ghostVoxel.visible = false;
      this.ghostSymmetryVoxel.visible = false;
    }
  }

  public loadInitialModel(data: VoxelData[]) {
    this.currentVoxelData = data;
    this.createVoxels(data);
    this.onCountChange(this.voxels.length);
    this.state = AppState.STABLE;
    this.onStateChange(this.state);
  }
  
  public mergeVoxels(newVoxels: VoxelData[]) {
      // Create a map of existing voxels for easy lookup
      const map = new Map<string, number>();
      this.currentVoxelData.forEach((v, i) => map.set(`${v.x},${v.y},${v.z}`, i));
      
      const updatedData = [...this.currentVoxelData];
      
      newVoxels.forEach(nv => {
          const key = `${nv.x},${nv.y},${nv.z}`;
          if (map.has(key)) {
              // Update existing
              updatedData[map.get(key)!].color = nv.color;
          } else {
              // Add new
              updatedData.push(nv);
          }
      });
      
      this.loadInitialModel(updatedData);
  }

  private createVoxels(data: VoxelData[]) {
    if (this.instanceMesh) {
      this.scene.remove(this.instanceMesh);
      this.instanceMesh.geometry.dispose();
      if (Array.isArray(this.instanceMesh.material)) {
          this.instanceMesh.material.forEach(m => m.dispose());
      } else {
          this.instanceMesh.material.dispose();
      }
    }

    if (this.isGreedyEnabled && this.state === AppState.STABLE) {
      const merged = this.performGreedyMeshing(data);
      this.voxels = merged.map((box, i) => {
        const c = new THREE.Color(box.color);
        return {
          id: i,
          x: box.x, y: box.y, z: box.z,
          w: box.w, h: box.h, d: box.d,
          color: c,
          vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0,
          rvx: 0, rvy: 0, rvz: 0
        };
      });
    } else {
      this.voxels = data.map((v, i) => {
        const c = new THREE.Color(v.color);
        return {
          id: i,
          x: v.x, y: v.y, z: v.z,
          w: 1, h: 1, d: 1,
          color: c,
          vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0,
          rvx: 0, rvy: 0, rvz: 0
        };
      });
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = this.getMaterialForStyle(this.materialStyle);
    this.instanceMesh = new THREE.InstancedMesh(geometry, material, this.voxels.length);
    this.instanceMesh.castShadow = true;
    this.instanceMesh.receiveShadow = true;
    this.scene.add(this.instanceMesh);

    this.draw();
  }

  private draw() {
    if (!this.instanceMesh) return;

    // Create a voxel coordinate lookup map for Baked Ambient Occlusion calculations
    let voxelCoordMap: Set<string> | null = null;
    if (this.isBaked) {
      voxelCoordMap = new Set<string>();
      this.voxels.forEach(v => {
        const rx = Math.round(v.x);
        const ry = Math.round(v.y);
        const rz = Math.round(v.z);
        voxelCoordMap!.add(`${rx},${ry},${rz}`);
      });
    }

    this.voxels.forEach((v, i) => {
        this.dummy.position.set(v.x, v.y, v.z);
        this.dummy.rotation.set(v.rx, v.ry, v.rz);
        
        const w = v.w ?? 1;
        const h = v.h ?? 1;
        const d = v.d ?? 1;
        const shrink = this.isBaked ? 0 : 0.05;
        this.dummy.scale.set(Math.max(0.01, w - shrink), Math.max(0.01, h - shrink), Math.max(0.01, d - shrink));

        this.dummy.updateMatrix();
        this.instanceMesh!.setMatrixAt(i, this.dummy.matrix);

        if (voxelCoordMap) {
          const rx = Math.round(v.x);
          const ry = Math.round(v.y);
          const rz = Math.round(v.z);
          
          let neighbors = 0;
          const checkDirs = [
            [1, 0, 0], [-1, 0, 0],
            [0, 1, 0], [0, -1, 0],
            [0, 0, 1], [0, 0, -1]
          ];
          checkDirs.forEach(([dx, dy, dz]) => {
            if (voxelCoordMap!.has(`${rx + dx},${ry + dy},${rz + dz}`)) {
              neighbors++;
            }
          });

          // Soft ambient occlusion curve based on number of direct neighbors
          const occlusion = Math.min(0.42, neighbors * 0.07);
          const finalColor = v.color.clone().multiplyScalar(1 - occlusion);
          this.instanceMesh!.setColorAt(i, finalColor);
        } else {
          this.instanceMesh!.setColorAt(i, v.color);
        }
    });
    this.instanceMesh.instanceMatrix.needsUpdate = true;
    if (this.instanceMesh.instanceColor) this.instanceMesh.instanceColor.needsUpdate = true;
  }
  
  public drop() {
    if (this.state !== AppState.STABLE) return;
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    this.ghostVoxel.visible = false;
    this.ghostSymmetryVoxel.visible = false;
    // Tiny jitter to wake them up
    this.voxels.forEach(v => {
        v.vx = (Math.random() - 0.5) * 0.01;
        v.vz = (Math.random() - 0.5) * 0.01;
    });
  }

  public dismantle() {
    if (this.state !== AppState.STABLE) return;
    this.state = AppState.DISMANTLING;
    this.onStateChange(this.state);
    this.ghostVoxel.visible = false;
    this.ghostSymmetryVoxel.visible = false;

    // Explosion forces
    this.voxels.forEach(v => {
        v.vx = (Math.random() - 0.5) * 0.8;
        v.vy = Math.random() * 0.8;
        v.vz = (Math.random() - 0.5) * 0.8;
        v.rvx = (Math.random() - 0.5) * 0.3;
        v.rvy = (Math.random() - 0.5) * 0.3;
        v.rvz = (Math.random() - 0.5) * 0.3;
    });
  }

  public subdivide() {
      const currentData = this.getCurrentVoxelData();
      const newData: VoxelData[] = [];
      
      currentData.forEach(v => {
          const { x, y, z, color } = v;
          const nx = x * 2;
          const ny = (y - CONFIG.FLOOR_Y) * 2 + CONFIG.FLOOR_Y;
          const nz = z * 2;
          
          newData.push({ x: nx, y: ny, z: nz, color });
          newData.push({ x: nx + 1, y: ny, z: nz, color });
          newData.push({ x: nx, y: ny + 1, z: nz, color });
          newData.push({ x: nx + 1, y: ny + 1, z: nz, color });
          newData.push({ x: nx, y: ny, z: nz + 1, color });
          newData.push({ x: nx + 1, y: ny, z: nz + 1, color });
          newData.push({ x: nx, y: ny + 1, z: nz + 1, color });
          newData.push({ x: nx + 1, y: ny + 1, z: nz + 1, color });
      });
      
      this.loadInitialModel(newData);
  }

  private getColorDist(c1: THREE.Color, hex2: number): number {
    const c2 = new THREE.Color(hex2);
    const r = (c1.r - c2.r) * 0.3;
    const g = (c1.g - c2.g) * 0.59;
    const b = (c1.b - c2.b) * 0.11;
    return Math.sqrt(r * r + g * g + b * b);
  }

  public rebuild(targetModel: VoxelData[]) {
    // If we're already rebuilding, this will reset the targets
    this.currentVoxelData = targetModel;

    const available = this.voxels.map((v, i) => ({ index: i, color: v.color, taken: false }));
    const mappings: RebuildTarget[] = new Array(this.voxels.length).fill(null);

    targetModel.forEach(target => {
        let bestDist = 9999;
        let bestIdx = -1;

        for (let i = 0; i < available.length; i++) {
            if (available[i].taken) continue;
            const d = this.getColorDist(available[i].color, target.color);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
                if (d < 0.01) break;
            }
        }

        if (bestIdx !== -1) {
            available[bestIdx].taken = true;
            const h = Math.max(0, (target.y - CONFIG.FLOOR_Y) / 15);
            mappings[available[bestIdx].index] = {
                x: target.x, y: target.y, z: target.z,
                delay: h * 800
            };
        }
    });

    for (let i = 0; i < this.voxels.length; i++) {
        if (!mappings[i]) {
            mappings[i] = {
                x: this.voxels[i].x, y: this.voxels[i].y, z: this.voxels[i].z,
                isRubble: true, delay: 0
            };
        }
    }

    this.rebuildTargets = mappings;
    this.rebuildStartTime = Date.now();
    this.state = AppState.REBUILDING;
    this.onStateChange(this.state);
  }

  private updatePhysics() {
    if (this.state === AppState.DISMANTLING) {
        // 1. Integration & Boundaries
        this.voxels.forEach(v => {
            // Gravity
            v.vy -= 0.02;
            
            // Drag
            v.vx *= 0.99; v.vy *= 0.99; v.vz *= 0.99;
            v.rvx *= 0.98; v.rvy *= 0.98; v.rvz *= 0.98;

            v.x += v.vx; v.y += v.vy; v.z += v.vz;
            v.rx += v.rvx; v.ry += v.rvy; v.rz += v.rvz;

            // Floor collision
            const floorLevel = CONFIG.FLOOR_Y + 0.5;
            if (v.y < floorLevel) {
                v.y = floorLevel;
                v.vy *= -0.4; // Bounce damping
                v.vx *= 0.8; // Floor friction
                v.vz *= 0.8;
                
                // Stop small jitters
                if (Math.abs(v.vy) < 0.05) v.vy = 0;
            }
        });

        // 2. Voxel-Voxel Collisions (Spatial Grid)
        // Optimization: Create a simplified grid for O(N) neighbor lookup
        const gridSize = 1.5; // Roughly voxel size + buffer
        const grid = new Map<string, number[]>();

        this.voxels.forEach((v, i) => {
            const gx = Math.floor(v.x / gridSize);
            const gy = Math.floor(v.y / gridSize);
            const gz = Math.floor(v.z / gridSize);
            const key = `${gx},${gy},${gz}`;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key)!.push(i);
        });

        this.voxels.forEach((v, i) => {
             // Only process moving or slightly moving voxels to save cycles? 
             // For quality, we check all, but could optimize.
             const gx = Math.floor(v.x / gridSize);
             const gy = Math.floor(v.y / gridSize);
             const gz = Math.floor(v.z / gridSize);

             for (let x = gx - 1; x <= gx + 1; x++) {
                 for (let y = gy - 1; y <= gy + 1; y++) {
                     for (let z = gz - 1; z <= gz + 1; z++) {
                         const neighbors = grid.get(`${x},${y},${z}`);
                         if (!neighbors) continue;

                         for (const j of neighbors) {
                             if (i === j) continue;
                             const other = this.voxels[j];
                             
                             const dx = v.x - other.x;
                             const dy = v.y - other.y;
                             const dz = v.z - other.z;
                             const distSq = dx*dx + dy*dy + dz*dz;
                             const minDist = 0.95; // 1.0 is touching, 0.95 allows slight overlap for stability

                             if (distSq < minDist * minDist && distSq > 0.0001) {
                                 const dist = Math.sqrt(distSq);
                                 const pen = (minDist - dist) * 0.5; // Half penetration correction
                                 const nx = dx / dist;
                                 const ny = dy / dist;
                                 const nz = dz / dist;

                                 // Position Correction (Projection)
                                 v.x += nx * pen; v.y += ny * pen; v.z += nz * pen;
                                 other.x -= nx * pen; other.y -= ny * pen; other.z -= nz * pen;

                                 // Velocity Exchange (Impulse)
                                 const relVel = (v.vx - other.vx)*nx + (v.vy - other.vy)*ny + (v.vz - other.vz)*nz;
                                 if (relVel < 0) {
                                     const restitution = 0.2; // Not too bouncy
                                     const jVal = -(1 + restitution) * relVel;
                                     // Equal mass
                                     const impulse = jVal * 0.5;
                                     v.vx += impulse * nx; v.vy += impulse * ny; v.vz += impulse * nz;
                                     other.vx -= impulse * nx; other.vy -= impulse * ny; other.vz -= impulse * nz;
                                     
                                     // Friction (tangential)
                                     v.vx *= 0.95; other.vx *= 0.95;
                                     v.vz *= 0.95; other.vz *= 0.95;
                                 }
                             }
                         }
                     }
                 }
             }
        });

    } else if (this.state === AppState.REBUILDING) {
        const now = Date.now();
        const elapsed = now - this.rebuildStartTime;
        let allDone = true;

        this.voxels.forEach((v, i) => {
            const t = this.rebuildTargets[i];
            if (t.isRubble) return;
            if (elapsed < t.delay) {
                allDone = false;
                return;
            }
            const speed = 0.12;
            v.x += (t.x - v.x) * speed;
            v.y += (t.y - v.y) * speed;
            v.z += (t.z - v.z) * speed;
            v.rx += (0 - v.rx) * speed;
            v.ry += (0 - v.ry) * speed;
            v.rz += (0 - v.rz) * speed;
            if ((t.x - v.x) ** 2 + (t.y - v.y) ** 2 + (t.z - v.z) ** 2 > 0.001) {
                allDone = false;
            } else {
                v.x = t.x; v.y = t.y; v.z = t.z;
                v.rx = 0; v.ry = 0; v.rz = 0;
            }
        });

        if (allDone) {
            this.state = AppState.STABLE;
            this.onStateChange(this.state);
        }
    }
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate);
    this.controls.update();
    this.updatePhysics();
    if (this.state !== AppState.STABLE || this.controls.autoRotate || this.isEditMode) {
        this.draw();
    }
    this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  
  public setAutoRotate(enabled: boolean) {
    if (this.controls) {
        this.controls.autoRotate = enabled;
    }
  }

  public setFog(enabled: boolean) {
    this.isFogEnabled = enabled;
    if (enabled) {
      this.scene.fog = new THREE.Fog(CONFIG.BG_COLOR, 60, 140);
    } else {
      this.scene.fog = null;
    }
  }

  public getJsonData(): string {
      const voxels = this.voxels.map((v, i) => ({
          id: i,
          x: +v.x.toFixed(2),
          y: +v.y.toFixed(2),
          z: +v.z.toFixed(2),
          c: '#' + v.color.getHexString()
      }));
      return JSON.stringify({ voxels }, null, 2);
  }
  
  public async exportGLTF(): Promise<Blob> {
      return new Promise(async (resolve, reject) => {
          try {
              const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
              const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');

              const geometries: THREE.BufferGeometry[] = [];
              const baseGeom = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE);
              
              this.voxels.forEach(v => {
                  const geom = baseGeom.clone();
                  
                  const matrix = new THREE.Matrix4();
                  matrix.makeRotationFromEuler(new THREE.Euler(v.rx, v.ry, v.rz));
                  matrix.setPosition(v.x, v.y, v.z);
                  geom.applyMatrix4(matrix);
                  
                  const colors = [];
                  for (let i = 0; i < geom.attributes.position.count; i++) {
                      colors.push(v.color.r, v.color.g, v.color.b);
                  }
                  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                  
                  geometries.push(geom);
              });

              const mergedGeometry = mergeGeometries(geometries, false);
              const material = new THREE.MeshStandardMaterial({ 
                  roughness: 0.8, 
                  metalness: 0.1,
                  vertexColors: true 
              });
              const mesh = new THREE.Mesh(mergedGeometry, material);

              const exporter = new GLTFExporter();
              exporter.parse(
                  mesh,
                  (gltf) => {
                      if (gltf instanceof ArrayBuffer) {
                          resolve(new Blob([gltf], { type: 'model/gltf-binary' }));
                      } else {
                          const str = JSON.stringify(gltf);
                          resolve(new Blob([str], { type: 'text/plain' }));
                      }
                  },
                  (error) => reject(error),
                  { binary: true }
              );
          } catch (err) {
              reject(err);
          }
      });
  }

  public async exportPLY(): Promise<Blob> {
      return new Promise(async (resolve, reject) => {
          try {
              const { PLYExporter } = await import('three/examples/jsm/exporters/PLYExporter.js');
              const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');

              const geometries: THREE.BufferGeometry[] = [];
              const baseGeom = new THREE.BoxGeometry(CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE, CONFIG.VOXEL_SIZE);
              
              this.voxels.forEach(v => {
                  const geom = baseGeom.clone();
                  const matrix = new THREE.Matrix4();
                  matrix.makeRotationFromEuler(new THREE.Euler(v.rx, v.ry, v.rz));
                  matrix.setPosition(v.x, v.y, v.z);
                  geom.applyMatrix4(matrix);
                  
                  const colors = [];
                  for (let i = 0; i < geom.attributes.position.count; i++) {
                      colors.push(v.color.r, v.color.g, v.color.b);
                  }
                  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                  
                  geometries.push(geom);
              });

              const mergedGeometry = mergeGeometries(geometries, false);
              const material = new THREE.MeshStandardMaterial({ vertexColors: true });
              const mesh = new THREE.Mesh(mergedGeometry, material);

              const exporter = new PLYExporter();
              exporter.parse(
                  mesh,
                  (ply) => {
                      if (ply instanceof ArrayBuffer) {
                          resolve(new Blob([ply], { type: 'application/octet-stream' }));
                      } else {
                          resolve(new Blob([ply], { type: 'text/plain' }));
                      }
                  },
                  { binary: true }
              );
          } catch (err) {
              reject(err);
          }
      });
  }

  public getObjData(): string {
      let output = "# Voxel Architect Export\n";
      output += "o VoxelModel\n";
      
      let vertOffset = 1;
      const s = 0.5; // Half size for 1x1x1 cube
      
      // Vertices for a unit cube centered at 0,0,0
      const baseVerts = [
          {x:-s, y:-s, z: s}, {x: s, y:-s, z: s}, {x:-s, y: s, z: s}, {x: s, y: s, z: s}, // Front
          {x:-s, y:-s, z:-s}, {x: s, y:-s, z:-s}, {x:-s, y: s, z:-s}, {x: s, y: s, z:-s}  // Back
      ];
      
      // Faces (indices into baseVerts, 0-based)
      // Front, Back, Top, Bottom, Left, Right
      const faces = [
          [0, 1, 3, 2], // Front
          [5, 4, 6, 7], // Back
          [2, 3, 7, 6], // Top
          [4, 5, 1, 0], // Bottom
          [4, 0, 2, 6], // Left
          [1, 5, 7, 3]  // Right
      ];
  
      this.voxels.forEach(v => {
          // Write vertices with colors
          const { r, g, b } = v.color;
          
          for(let i=0; i<8; i++) {
              const vx = v.x + baseVerts[i].x;
              const vy = v.y + baseVerts[i].y;
              const vz = v.z + baseVerts[i].z;
              // OBJ with vertex colors: v x y z r g b
              output += `v ${vx.toFixed(4)} ${vy.toFixed(4)} ${vz.toFixed(4)} ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}\n`;
          }
          
          // Write faces
          for(let i=0; i<6; i++) {
              const f = faces[i];
              output += `f ${f[0]+vertOffset} ${f[1]+vertOffset} ${f[2]+vertOffset} ${f[3]+vertOffset}\n`;
          }
          
          vertOffset += 8;
      });
      
      return output;
  }
  
  public setTotalVoxelCount(targetCount: number) {
    if (targetCount < 0) return;
    
    const currentCount = this.voxels.length;
    const diff = targetCount - currentCount;
    
    if (diff === 0) return;
    
    if (diff > 0) {
        // Add new voxels
        const newVoxels: SimulationVoxel[] = [];
        const palette = Object.values(COLORS);
        
        for (let i = 0; i < diff; i++) {
            // Spawn in a grid/cloud above the scene
            const x = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
            const y = 20 + Math.random() * 10;
            
            const color = palette[Math.floor(Math.random() * palette.length)];
            const { r, g, b } = new THREE.Color(color);
            
            newVoxels.push({
                id: Math.floor(Math.random() * 1000000),
                x, y, z,
                vx: 0, vy: 0, vz: 0,
                color: new THREE.Color(r, g, b),
                rx: 0, ry: 0, rz: 0,
                rvx: 0, rvy: 0, rvz: 0,
            } as SimulationVoxel);
        }
        
        this.voxels = [...this.voxels, ...newVoxels];
    } else {
        // Remove voxels (remove from end)
        this.voxels = this.voxels.slice(0, targetCount);
    }
    
    // Update mesh
    this.createVoxels(this.voxels as unknown as VoxelData[]);
    this.onCountChange(this.voxels.length);
    
    // If we are in STABLE mode, we should probably let them fall or just stay there?
    // If we add them high up, they will just float until physics runs.
    // Let's wake up physics if we added blocks.
    if (diff > 0 && this.state === AppState.STABLE) {
        // Optional: Switch to DISMANTLING to let them fall?
        // Or just let them float. Floating is fine for "Toy Box".
        // But maybe users expect them to fall.
        // Let's leave state as is. If user clicks "Gravity", they fall.
    }
  }

  public getUniqueColors(): string[] {
    const colors = new Set<string>();
    this.voxels.forEach(v => {
        colors.add('#' + v.color.getHexString());
    });
    return Array.from(colors);
  }

  public setGreedyMeshing(enabled: boolean) {
    this.isGreedyEnabled = enabled;
    this.createVoxels(this.currentVoxelData);
    this.onCountChange(this.voxels.length);
  }

  public setMaterialStyle(style: VoxelMaterialStyle) {
    if (this.materialStyle === style) return;
    this.materialStyle = style;
    if (this.instanceMesh) {
      const oldMat = this.instanceMesh.material;
      this.instanceMesh.material = this.getMaterialForStyle(style);
      if (Array.isArray(oldMat)) {
        oldMat.forEach(m => m.dispose());
      } else {
        oldMat.dispose();
      }
    }
  }

  private getMaterialForStyle(style: VoxelMaterialStyle): THREE.Material {
    const wireframe = this.isWireframe;
    if (style === 'glowing') {
      const mat = new THREE.MeshStandardMaterial({
        roughness: 0.1,
        metalness: 0.1,
        wireframe,
      });
      mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vInstanceColorCustom;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           #ifdef USE_INSTANCING
             vInstanceColorCustom = instanceColor;
           #else
             vInstanceColorCustom = vec3(1.0);
           #endif`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>
           varying vec3 vInstanceColorCustom;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           #ifdef USE_INSTANCING
             totalEmissiveRadiance = vInstanceColorCustom * 0.95;
           #endif`
        );
      };
      return mat;
    } else if (style === 'glossy') {
      return new THREE.MeshStandardMaterial({
        roughness: 0.15,
        metalness: 0.85,
        wireframe,
      });
    } else { // 'matte'
      return new THREE.MeshStandardMaterial({
        roughness: 0.9,
        metalness: 0.05,
        wireframe,
      });
    }
  }

  private performGreedyMeshing(data: VoxelData[]): { x: number; y: number; z: number; w: number; h: number; d: number; color: number }[] {
    interface MergedBox {
        x: number;
        y: number;
        z: number;
        w: number;
        h: number;
        d: number;
        color: number;
    }
    const boxes: MergedBox[] = [];
    if (data.length === 0) return boxes;

    const voxelMap = new Map<string, number>();
    const unvisited = new Set<string>();
    
    data.forEach(v => {
        const key = `${v.x},${v.y},${v.z}`;
        voxelMap.set(key, v.color);
        unvisited.add(key);
    });

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    data.forEach(v => {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
        if (v.z < minZ) minZ = v.z;
        if (v.z > maxZ) maxZ = v.z;
    });

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
                const key = `${x},${y},${z}`;
                if (!unvisited.has(key)) continue;

                const color = voxelMap.get(key)!;
                
                let w = 1;
                while (true) {
                    const nextX = x + w;
                    if (nextX > maxX) break;
                    let canGrow = true;
                    const testKey = `${nextX},${y},${z}`;
                    if (!unvisited.has(testKey) || voxelMap.get(testKey) !== color) {
                        canGrow = false;
                    }
                    if (!canGrow) break;
                    w++;
                }

                let d = 1;
                while (true) {
                    const nextZ = z + d;
                    if (nextZ > maxZ) break;
                    let canGrow = true;
                    for (let dx = 0; dx < w; dx++) {
                        const testKey = `${x + dx},${y},${nextZ}`;
                        if (!unvisited.has(testKey) || voxelMap.get(testKey) !== color) {
                            canGrow = false;
                            break;
                        }
                    }
                    if (!canGrow) break;
                    d++;
                }

                let h = 1;
                while (true) {
                    const nextY = y + h;
                    if (nextY > maxY) break;
                    let canGrow = true;
                    for (let dx = 0; dx < w; dx++) {
                        for (let dz = 0; dz < d; dz++) {
                            const testKey = `${x + dx},${nextY},${z + dz}`;
                            if (!unvisited.has(testKey) || voxelMap.get(testKey) !== color) {
                                canGrow = false;
                                break;
                            }
                        }
                        if (!canGrow) break;
                    }
                    if (!canGrow) break;
                    h++;
                }

                for (let dx = 0; dx < w; dx++) {
                    for (let dy = 0; dy < h; dy++) {
                        for (let dz = 0; dz < d; dz++) {
                            unvisited.delete(`${x + dx},${y + dy},${z + dz}`);
                        }
                    }
                }

                boxes.push({
                    x: x + (w - 1) / 2,
                    y: y + (h - 1) / 2,
                    z: z + (d - 1) / 2,
                    w,
                    h,
                    d,
                    color
                });
            }
        }
    }

    return boxes;
  }

  public cleanup() {
    cancelAnimationFrame(this.animationId);
    this.container.removeChild(this.renderer.domElement);
    this.renderer.dispose();
  }
}

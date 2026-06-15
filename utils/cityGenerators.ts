import { VoxelData } from '../types';
import { COLORS, CONFIG } from './voxelConstants';

function setBlock(map: Map<string, VoxelData>, x: number, y: number, z: number, color: number) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rz = Math.round(z);
    const key = `${rx},${ry},${rz}`;
    map.set(key, { x: rx, y: ry, z: rz, color });
}

function generateBox(map: Map<string, VoxelData>, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: number | ((x:number, y:number, z:number)=>number), hollow: boolean = false) {
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
    const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
    
    for(let x=minX; x<=maxX; x++) {
        for(let y=minY; y<=maxY; y++) {
            for(let z=minZ; z<=maxZ; z++) {
                if (hollow) {
                    if (x > minX && x < maxX && y > minY && y < maxY && z > minZ && z < maxZ) continue;
                }
                const c = typeof color === 'function' ? color(x, y, z) : color;
                setBlock(map, x, y, z, c);
            }
        }
    }
}

export const CityGenerators = {
    LicensingOffice: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -10, Y, -8, 10, Y+1, 8, COLORS.GREY);
        generateBox(map, -9, Y+2, -7, 9, Y+12, 7, 0x888888, true);
        for(let x=-8; x<=8; x+=4) {
            generateBox(map, x-1, Y+2, 8, x+1, Y+12, 9, 0xAAAAAA);
        }
        generateBox(map, -11, Y+13, -9, 11, Y+14, 10, 0x555555);
        for(let y=Y+4; y<=Y+10; y+=3) {
            for(let x=-7; x<=7; x+=4) {
                generateBox(map, x, y, 7, x+1, y+1, 7, COLORS.GLASS);
            }
        }
        generateBox(map, -1, Y+2, 7, 1, Y+5, 7, COLORS.WOOD);
        return Array.from(map.values());
    },
    UnionHall: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const BRICK = 0x8B4513; // rich brown brick
        const STONE = 0xCCCCCC; // light stone trim
        const DARK_STONE = 0x555555;
        const ROOF = 0x222222;

        // Grand Foundation
        generateBox(map, -14, Y, -11, 14, Y+2, 11, DARK_STONE);
        
        // Front Steps
        for(let i=0; i<3; i++) {
            generateBox(map, -6, Y+i, 11, 6, Y+i, 13-i, DARK_STONE);
        }

        // Main Building Walls (hollow)
        // Walls from z=-10 to z=7. The front facade is at z=7.
        generateBox(map, -13, Y+3, -10, 13, Y+14, 7, BRICK, true);

        // Portico Base and Top (Stone)
        generateBox(map, -13, Y+3, 8, 13, Y+3, 10, STONE);
        generateBox(map, -13, Y+14, 8, 13, Y+15, 10, STONE);

        // Majestic Pillars
        const pillars = [-11, -7, -3, 3, 7, 11];
        for (let px of pillars) {
            // Pillar core
            generateBox(map, px-1, Y+4, 8, px+1, Y+13, 10, STONE);
            // Pillar base & capital details
            generateBox(map, px-1.5, Y+3, 7.5, px+1.5, Y+4, 10.5, STONE);
            generateBox(map, px-1.5, Y+13, 7.5, px+1.5, Y+14, 10.5, STONE);
        }

        // Front Pediment (Triangle Roof over Portico)
        for (let height = 0; height <= 6; height++) {
            const width = 13 - (height * 2);
            if (width < 0) continue;
            generateBox(map, -width, Y+16+height, 8, width, Y+16+height, 10, STONE);
            // Inset pediment background (brick)
            if (width > 2 && height < 5) {
                generateBox(map, -width+2, Y+16+height, 9, width-2, Y+16+height, 9, BRICK);
            }
        }

        // Crest in the Pediment (Gold)
        setBlock(map, 0, Y+18, 9, COLORS.GOLD);
        setBlock(map, -1, Y+17, 9, COLORS.GOLD);
        setBlock(map, 1, Y+17, 9, COLORS.GOLD);
        setBlock(map, 0, Y+17, 9, COLORS.GOLD);
        setBlock(map, 0, Y+16, 9, COLORS.GOLD);

        // Side Windows (tall, arched)
        for (let z = -6; z <= 2; z += 4) {
            generateBox(map, -13, Y+6, z-1, -13, Y+11, z+1, COLORS.GLASS);
            setBlock(map, -13, Y+12, z, COLORS.GLASS);
            generateBox(map, 13, Y+6, z-1, 13, Y+11, z+1, COLORS.GLASS);
            setBlock(map, 13, Y+12, z, COLORS.GLASS);
        }

        // Main Entrance (Grand Wooden Doors at z=7 recessed slightly)
        generateBox(map, -2, Y+3, 7, 2, Y+8, 7, COLORS.WOOD);
        generateBox(map, -1, Y+9, 7, 1, Y+9, 7, COLORS.WOOD);
        setBlock(map, -1, Y+6, 8, COLORS.GOLD); // handles
        setBlock(map, 1, Y+6, 8, COLORS.GOLD);

        // Flowing Red Banners hanging between the central pillars
        const gaps = [-9, -5, 0, 5, 9]; // Centers between pillars
        for (let gx of gaps) {
            if (gx === 0) continue; // Leave central doorway clear
            generateBox(map, gx-1, Y+8, 9, gx+1, Y+13, 9, COLORS.RED);
            generateBox(map, gx-1, Y+7, 9, gx+1, Y+7, 9, COLORS.GOLD); // trim
        }

        // Main Pitched Roof
        for (let z = -11; z <= 8; z++) {
            for (let x = -14; x <= 14; x++) {
                const distFromCenter = Math.abs(x);
                const roofHeight = Math.floor((14 - distFromCenter) * 0.6); // Peak at center
                if (roofHeight >= 0) {
                    generateBox(map, x, Y+15, z, x, Y+15+roofHeight, z, ROOF);
                }
            }
        }

        // Roof Trim along bottom edges
        generateBox(map, -14, Y+15, -11, 14, Y+15, -11, STONE);
        generateBox(map, -14, Y+15, 8, 14, Y+15, 8, STONE);

        // Central Cupola / Dome on Roof
        generateBox(map, -3, Y+23, -3, 3, Y+25, 3, STONE, true); // Base
        generateBox(map, -2, Y+26, -2, 2, Y+28, 2, COLORS.GLASS); // Lantern
        generateBox(map, -3, Y+29, -3, 3, Y+29, 3, ROOF); // Cupola roof taper
        generateBox(map, -2, Y+30, -2, 2, Y+30, 2, ROOF);
        generateBox(map, -1, Y+31, -1, 1, Y+31, 1, ROOF);
        setBlock(map, 0, Y+32, 0, COLORS.GOLD); // Spire crowning the building

        return Array.from(map.values());
    },
    InspectorHQ: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -8, Y, -8, 8, Y+20, 8, 0x222222, true);
        generateBox(map, -6, Y+20, -6, 6, Y+30, 6, 0x222222, true);
        generateBox(map, -7, Y+2, 8, 7, Y+18, 8, COLORS.GLASS);
        generateBox(map, -5, Y+21, 6, 5, Y+28, 6, COLORS.GLASS);
        generateBox(map, 0, Y+30, 0, 0, Y+40, 0, COLORS.GREY);
        return Array.from(map.values());
    },
    FixerDen: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x:number, y:number, z:number, c:number) => setBlock(map, x, y, z, c);
        
        const CONCRETE = 0x3a3a3a; 
        const DARK_CONCRETE = 0x222222;
        const RUST = 0x5c3a21;
        const NEON_PINK = 0xFF0055;
        const NEON_BLUE = 0x00F0FF;
        const NEON_YELLOW = 0xFFE600;
        const METAL = 0x555566;
        
        // Main Block (12x12)
        generateBox(map, -6, Y, -6, 6, Y+7, 6, CONCRETE, true);
        
        // Base trim (Rust/Dark)
        generateBox(map, -7, Y, -7, 7, Y+1, 7, DARK_CONCRETE);
        
        // Roof edge and surface
        generateBox(map, -7, Y+7, -7, 7, Y+7, 7, DARK_CONCRETE);
        generateBox(map, -6, Y+8, -6, 6, Y+8, 6, 0x1a1a1a);
        
        // Front Roll-up Garage Door (z=6)
        for (let cx = -3; cx <= 3; cx++) {
            for (let cy = 1; cy <= 5; cy++) {
                add(cx, Y+cy, 6, cy % 2 === 0 ? RUST : METAL);
            }
        }
        // Garage Frame
        generateBox(map, -4, Y+1, 6, -4, Y+6, 6, DARK_CONCRETE);
        generateBox(map, 4, Y+1, 6, 4, Y+6, 6, DARK_CONCRETE);
        generateBox(map, -4, Y+6, 6, 4, Y+6, 6, DARK_CONCRETE);
        
        // Holographic/Neon Sign above garage
        add(-2, Y+5, 7, NEON_PINK); add(-1, Y+6, 7, NEON_PINK); add(0, Y+5, 7, NEON_PINK);
        add(1, Y+7, 7, NEON_BLUE); add(2, Y+6, 7, NEON_BLUE);
        // Hanging cables down the front
        add(-5, Y+6, 7, DARK_CONCRETE); add(-5, Y+5, 7, DARK_CONCRETE); add(-6, Y+4, 7, NEON_YELLOW);
        
        // Side Alley Door (Security entrance) (x=6)
        generateBox(map, 6, Y+1, 0, 6, Y+4, 2, METAL);
        add(6, Y+3, 1, 0x111111); // Viewport
        add(7, Y+2, -1, NEON_BLUE); // Scanner keypad
        
        // Glowing Vending Machine outside (Left side z=7)
        generateBox(map, -6, Y+1, 7, -5, Y+4, 8, 0x111111);
        generateBox(map, -6, Y+2, 8, -5, Y+3, 8, NEON_PINK); // Screen glow
        add(-6, Y+1, 8, NEON_BLUE); // Slot
        
        // Rooftop AC/Server Box
        generateBox(map, -4, Y+8, -4, -1, Y+11, -1, METAL);
        add(-2, Y+10, 0, 0x111111); // Fan port
        
        // Radar / Comm Dish
        add(3, Y+8, 3, DARK_CONCRETE);
        add(3, Y+9, 3, METAL);
        add(3, Y+10, 4, METAL);
        add(2, Y+11, 5, METAL); add(3, Y+11, 5, METAL); add(4, Y+11, 5, METAL);
        add(3, Y+11, 4, NEON_YELLOW); // receiver node
        
        // Cooling pipes running up the back (z=-7)
        for (let y = Y+1; y <= Y+8; y++) {
            add(-2, y, -7, METAL);
            add(-1, y, -7, METAL);
            if (y > Y+3 && y < Y+7) {
                add(0, y, -7, NEON_BLUE); // glowing coolant
            }
        }
        
        // Trash / Dumpster in back
        generateBox(map, 3, Y+1, -9, 5, Y+3, -7, 0x2b452b); // Dirty green dumpster
        add(4, Y+3, -9, 0x111111); // open lid
        
        // Left side window boarded up
        generateBox(map, -6, Y+2, -2, -6, Y+4, 0, 0x111111); // Hole
        add(-7, Y+2, -1, RUST); add(-7, Y+3, -2, RUST); add(-7, Y+4, 0, RUST); // Boards

        return Array.from(map.values());
    },
    ChiefHut: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x:number, y:number, z:number, c:number) => setBlock(map, x, y, z, c);

        const WOOD_DARK = 0x5C4033;
        const BAMBOO = 0xDEB887;
        const THATCH = 0xDAA520; // Golden-brown thatch
        const BEAM = 0x3d2817;
        const STONE = 0x555555;
        const FIRE = 0xFF5500;
        const GOLD = 0xFFD700;
        const CARPET = 0x8B0000;

        // Elevated Foundation Base (Stone + Wooden Deck)
        generateBox(map, -7, Y, -7, 7, Y+1, 7, STONE);
        for(let x=-8; x<=8; x++) {
            for(let z=-8; z<=8; z++) {
                if (Math.abs(x) + Math.abs(z) <= 12) {
                    add(x, Y+2, z, WOOD_DARK);
                }
            }
        }
        
        // Stairs leading up (z=7 to 9)
        generateBox(map, -2, Y, 8, 2, Y, 10, STONE);
        generateBox(map, -2, Y+1, 8, 2, Y+1, 9, WOOD_DARK);
        
        // Red Carpet
        generateBox(map, -1, Y+2, -5, 1, Y+2, 8, CARPET);

        // --- Walls ---
        // Front (South) Wall (split for door)
        generateBox(map, -4, Y+3, 6, -2, Y+9, 6, BAMBOO);
        generateBox(map, 2, Y+3, 6, 4, Y+9, 6, BAMBOO);
        generateBox(map, -1, Y+7, 6, 1, Y+9, 6, BAMBOO); // door header

        // Back (North) Wall (with window)
        generateBox(map, -4, Y+3, -6, -2, Y+9, -6, BAMBOO);
        generateBox(map, 2, Y+3, -6, 4, Y+9, -6, BAMBOO);
        generateBox(map, -1, Y+3, -6, 1, Y+5, -6, BAMBOO);
        generateBox(map, -1, Y+8, -6, 1, Y+9, -6, BAMBOO);

        // East Wall (with window)
        generateBox(map, 6, Y+3, -4, 6, Y+9, -2, BAMBOO);
        generateBox(map, 6, Y+3, 2, 6, Y+9, 4, BAMBOO);
        generateBox(map, 6, Y+3, -1, 6, Y+5, 1, BAMBOO);
        generateBox(map, 6, Y+8, -1, 6, Y+9, 1, BAMBOO);

        // West Wall (with window)
        generateBox(map, -6, Y+3, -4, -6, Y+9, -2, BAMBOO);
        generateBox(map, -6, Y+3, 2, -6, Y+9, 4, BAMBOO);
        generateBox(map, -6, Y+3, -1, -6, Y+5, 1, BAMBOO);
        generateBox(map, -6, Y+8, -1, -6, Y+9, 1, BAMBOO);
        
        // Diagonal corners & reinforcement beams
        for(let y=3; y<=9; y++) {
            add(-5, Y+y, -5, BAMBOO); add(-5, Y+y, 5, BAMBOO);
            add(5, Y+y, -5, BAMBOO);  add(5, Y+y, 5, BAMBOO);
            
            // Beams on the 8 inner corners
            add(-5, Y+y, -4, BEAM); add(5, Y+y, -4, BEAM);
            add(-5, Y+y, 4, BEAM);  add(5, Y+y, 4, BEAM);
            add(-4, Y+y, -5, BEAM); add(4, Y+y, -5, BEAM);
            add(-4, Y+y, 5, BEAM);  add(4, Y+y, 5, BEAM);
        }

        // Entrance framing
        generateBox(map, -2, Y+3, 6, -2, Y+7, 6, BEAM);
        generateBox(map, 2, Y+3, 6, 2, Y+7, 6, BEAM);
        generateBox(map, -2, Y+7, 6, 2, Y+7, 6, BEAM);
        
        // Golden Emblem over door
        add(0, Y+8, 6, GOLD); add(-1, Y+8, 6, GOLD); add(1, Y+8, 6, GOLD);
        add(0, Y+9, 6, GOLD);

        // Huge Thatched Roof (Layered Cone)
        for (let r = 9; r >= 0; r--) {
            const h = 9 - r; // Height tier
            const yLevel1 = Y + 9 + (h * 2);
            const yLevel2 = yLevel1 + 1;
            
            for(let x=-r; x<=r; x++) {
                for(let z=-r; z<=r; z++) {
                    // Make it circular/octagonal
                    if (Math.abs(x) + Math.abs(z) <= Math.floor(r * 1.5) + 1) {
                        add(x, yLevel1, z, THATCH);
                        add(x, yLevel2, z, THATCH);
                    }
                }
            }
        }
        
        // Roof Spiky Wooden Crown
        generateBox(map, -1, Y+29, -1, 1, Y+31, 1, BEAM);
        add(0, Y+32, 0, BEAM); add(0, Y+33, 0, BEAM);
        add(0, Y+34, 0, GOLD); // Golden tip
        
        // Ritual Fire Columns flanking the entrance
        const firePillar = (px: number, pz: number) => {
            generateBox(map, px-1, Y+2, pz-1, px+1, Y+4, pz+1, STONE);
            add(px, Y+5, pz, FIRE);
            add(px, Y+6, pz, COLORS.YELLOW);
            // Small ember
            if (Math.random() > 0.5) add(px, Y+7, pz, COLORS.ORANGE);
        };
        firePillar(-4, 9);
        firePillar(4, 9);

        // Decorative Tusks / Horns protruding from the sides
        for (let i = 1; i <= 5; i++) {
            add(-6 - i, Y+6 + Math.floor(i/2), 0, COLORS.WHITE); // Left
            add(6 + i, Y+6 + Math.floor(i/2), 0, COLORS.WHITE); // Right
            // Angled up
            if (i === 5) {
                add(-6 - i, Y+7 + Math.floor(i/2), 0, COLORS.WHITE);
                add(6 + i, Y+7 + Math.floor(i/2), 0, COLORS.WHITE);
            }
        }

        return Array.from(map.values());
    },
    HotlineBooth: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -2, Y, -2, 2, Y+1, 2, COLORS.GREY);
        generateBox(map, -2, Y+2, -2, 2, Y+8, 2, COLORS.RED, true);
        generateBox(map, -1, Y+3, -2, 1, Y+7, -2, COLORS.GLASS);
        generateBox(map, -1, Y+3, 2, 1, Y+7, 2, COLORS.GLASS);
        generateBox(map, -2, Y+3, -1, -2, Y+7, 1, COLORS.GLASS);
        generateBox(map, 2, Y+3, -1, 2, Y+7, 1, COLORS.GLASS);
        generateBox(map, -2, Y+9, -2, 2, Y+9, 2, COLORS.RED);
        setBlock(map, 0, Y+5, 1, COLORS.BLACK);
        return Array.from(map.values());
    },
    Park: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -15, Y, -15, 15, Y, 15, COLORS.GREEN);
        generateBox(map, -2, Y+1, -15, 2, Y+1, 15, 0xDDDDDD);
        generateBox(map, -15, Y+1, -2, 15, Y+1, 2, 0xDDDDDD);
        generateBox(map, -4, Y+1, -4, 4, Y+2, 4, COLORS.GREY);
        generateBox(map, -3, Y+2, -3, 3, Y+2, 3, COLORS.BLUE);
        generateBox(map, -1, Y+2, -1, 1, Y+5, 1, COLORS.GREY);
        generateBox(map, 0, Y+6, 0, 0, Y+8, 0, COLORS.BLUE);
        generateBox(map, -6, Y+1, 3, -4, Y+2, 3, COLORS.WOOD);
        generateBox(map, 4, Y+1, 3, 6, Y+2, 3, COLORS.WOOD);
        for(let tx of [-10, 10]) {
            for(let tz of [-10, 10]) {
                generateBox(map, tx, Y+1, tz, tx, Y+5, tz, COLORS.WOOD);
                generateBox(map, tx-2, Y+4, tz-2, tx+2, Y+8, tz+2, 0x228B22);
            }
        }
        return Array.from(map.values());
    },
    RoadNS: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -10, Y, -15, 10, Y, 15, 0x333333);
        generateBox(map, -10, Y+1, -15, -9, Y+1, 15, 0xAAAAAA);
        generateBox(map, 9, Y+1, -15, 10, Y+1, 15, 0xAAAAAA);
        for(let z=-14; z<=14; z+=4) {
            generateBox(map, -1, Y+1, z, 1, Y+1, z+2, COLORS.GOLD);
        }
        return Array.from(map.values());
    },
    RoadEW: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -15, Y, -10, 15, Y, 10, 0x333333);
        generateBox(map, -15, Y+1, -10, 15, Y+1, -9, 0xAAAAAA);
        generateBox(map, -15, Y+1, 9, 15, Y+1, 10, 0xAAAAAA);
        for(let x=-14; x<=14; x+=4) {
            generateBox(map, x, Y+1, -1, x+2, Y+1, 1, COLORS.GOLD);
        }
        return Array.from(map.values());
    },
    RoadCross: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -15, Y, -15, 15, Y, 15, 0x333333);
        generateBox(map, -15, Y+1, -15, -9, Y+1, -9, 0xAAAAAA);
        generateBox(map, 9, Y+1, -15, 15, Y+1, -9, 0xAAAAAA);
        generateBox(map, -15, Y+1, 9, -9, Y+1, 15, 0xAAAAAA);
        generateBox(map, 9, Y+1, 9, 15, Y+1, 15, 0xAAAAAA);
        for(let i=-6; i<=6; i+=2) {
            generateBox(map, i, Y+1, -8, i, Y+1, -5, COLORS.WHITE);
            generateBox(map, i, Y+1, 5, i, Y+1, 8, COLORS.WHITE);
            generateBox(map, -8, Y+1, i, -5, Y+1, i, COLORS.WHITE);
            generateBox(map, 5, Y+1, i, 8, Y+1, i, COLORS.WHITE);
        }
        return Array.from(map.values());
    },
    GenericHouseA: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x:number, y:number, z:number, c:number) => setBlock(map, x, y, z, c);
        
        const WALL = 0xADD8E6; // Light Blue
        const ROOF = 0x444444;
        const FRAME = 0xFFFFFF; // White trim
        const PATH = 0xAAAAAA;
        
        generateBox(map, -6, Y, -6, 6, Y+1, 8, COLORS.GREY); // Base
        generateBox(map, -5, Y+2, -5, 5, Y+8, 5, WALL, true); // Walls
        
        // Roof
        for(let i=0; i<=6; i++) {
            generateBox(map, -6+i, Y+9+i, -6, 6-i, Y+9+i, 6, ROOF);
        }
        
        // Chimney
        generateBox(map, -4, Y+8, 2, -2, Y+15, 4, 0x8B4513);
        add(-3, Y+16, 3, 0x333333); // smoke/top
        
        // Porch
        generateBox(map, -3, Y+2, 5, 3, Y+2, 7, COLORS.WOOD); // Porch floor
        generateBox(map, -3, Y+3, 7, -3, Y+6, 7, FRAME); // Pillars
        generateBox(map, 3, Y+3, 7, 3, Y+6, 7, FRAME);
        generateBox(map, -4, Y+7, 5, 4, Y+7, 8, ROOF); // Porch roof
        
        // Path
        generateBox(map, -1, Y+1, 8, 1, Y+1, 9, PATH);
        
        // Door
        generateBox(map, -1, Y+2, 5, 1, Y+6, 5, COLORS.WOOD);
        add(1, Y+4, 6, COLORS.GOLD); // Knob
        
        // Window Frames & Windows
        const makeWindow = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
            generateBox(map, x1-1, y1-1, z1, x2+1, y2+1, z2, FRAME); // Frame
            generateBox(map, x1, y1, z1, x2, y2, z2, COLORS.GLASS);  // Glass
        };
        makeWindow(-4, Y+4, 5, -2, Y+5, 5); // Front left
        makeWindow(2, Y+4, 5, 4, Y+5, 5); // Front right
        makeWindow(-5, Y+4, -2, -5, Y+5, 2); // Side left
        makeWindow(5, Y+4, -2, 5, Y+5, 2); // Side right
        
        // Flower boxes
        generateBox(map, -4, Y+3, 6, -2, Y+3, 6, 0x8B4513); // Left box
        add(-3, Y+4, 6, 0x228B22); add(-4, Y+4, 6, 0xFF00FF); // Flowers
        generateBox(map, 2, Y+3, 6, 4, Y+3, 6, 0x8B4513); // Right box
        add(3, Y+4, 6, 0x228B22); add(4, Y+4, 6, 0xFFFF00); // Flowers

        return Array.from(map.values());
    },
    GenericHouseB: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x:number, y:number, z:number, c:number) => setBlock(map, x, y, z, c);

        const WALL = 0xF5F5DC; // Beige
        const ROOF = 0x8B0000; // Dark Red
        const WOOD = COLORS.WOOD;

        generateBox(map, -7, Y, -5, 7, Y+1, 6, COLORS.GREY); // Base
        generateBox(map, -6, Y+2, -4, 6, Y+10, 4, WALL, true); // Wall

        // Roof
        for(let i=0; i<=5; i++) {
            generateBox(map, -7, Y+11+i, -5+i, 7, Y+11+i, 5-i, ROOF);
        }

        // Dormer windows on roof
        generateBox(map, -4, Y+12, 3, -2, Y+14, 3, WALL);
        generateBox(map, -3, Y+13, 4, -3, Y+14, 4, COLORS.GLASS);
        generateBox(map, -4, Y+15, 3, -2, Y+15, 4, ROOF); // dormer roof

        generateBox(map, 2, Y+12, 3, 4, Y+14, 3, WALL);
        generateBox(map, 3, Y+13, 4, 3, Y+14, 4, COLORS.GLASS);
        generateBox(map, 2, Y+15, 3, 4, Y+15, 4, ROOF);

        // Small Balcony front center
        generateBox(map, -2, Y+6, 5, 2, Y+6, 6, WOOD); // Floor
        generateBox(map, -2, Y+7, 6, 2, Y+8, 6, WOOD); // Railing
        generateBox(map, -2, Y+7, 5, -2, Y+8, 5, WOOD);
        generateBox(map, 2, Y+7, 5, 2, Y+8, 5, WOOD);

        // Doors
        generateBox(map, -1, Y+2, 4, 1, Y+5, 4, WOOD); // Ground door
        generateBox(map, -1, Y+7, 4, 1, Y+9, 4, COLORS.GLASS); // Balcony door
        add(1, Y+4, 5, COLORS.GOLD);

        // Ground windows framed
        generateBox(map, -5, Y+3, 4, -3, Y+6, 4, 0x555555); // Frame
        generateBox(map, -4, Y+4, 4, -4, Y+5, 4, COLORS.GLASS);
        generateBox(map, 3, Y+3, 4, 5, Y+6, 4, 0x555555);
        generateBox(map, 4, Y+4, 4, 4, Y+5, 4, COLORS.GLASS);

        // Side Chimney
        generateBox(map, 6, Y+2, -1, 7, Y+18, 1, COLORS.GREY);
        add(6.5, Y+19, 0, 0x333333); // Smoke

        return Array.from(map.values());
    },
    GenericHouseC: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x:number, y:number, z:number, c:number) => setBlock(map, x, y, z, c);

        const WALL = 0xEEEEEE; // Clean white/grey modern wall
        const DARK_ACCENT = 0x222222; // Dark trim
        const WOOD_SLAT = 0xA0522D; // Warm wood

        generateBox(map, -6, Y, -7, 6, Y+1, 8, COLORS.GREY); // Base
        
        // Main block (White)
        generateBox(map, -5, Y+2, -6, 5, Y+13, 6, WALL, true);
        
        // Cantilevered second floor block (Dark)
        generateBox(map, 0, Y+7, -7, 7, Y+13, 1, DARK_ACCENT);
        generateBox(map, 1, Y+8, -6, 6, Y+12, 0, WALL); // Inner fill

        // Roof caps
        generateBox(map, -6, Y+14, -7, 6, Y+14, 7, DARK_ACCENT);

        // Ground Floor - Large glass panels
        generateBox(map, -4, Y+3, 6, -1, Y+6, 6, COLORS.GLASS);
        generateBox(map, 1, Y+3, 6, 4, Y+6, 6, COLORS.GLASS);

        // Slatted wood detail on left side
        for(let x=-6; x<=-4; x+=2) {
            generateBox(map, x, Y+2, 7, x, Y+13, 7, WOOD_SLAT);
        }

        // Modern offset timber door
        generateBox(map, -1, Y+2, 6, 1, Y+6, 6, WOOD_SLAT);
        add(0, Y+4, 7, COLORS.BLACK); // Handle

        // Top floor wrap-around corner glass (Left)
        generateBox(map, -5, Y+8, 6, -1, Y+12, 6, COLORS.GLASS);
        generateBox(map, -5, Y+8, 2, -5, Y+12, 5, COLORS.GLASS);

        // Top floor glass (Right cantilever)
        generateBox(map, 1, Y+8, 1, 6, Y+12, 1, COLORS.GLASS);

        // Small modern patio garden
        generateBox(map, 2, Y+2, 7, 5, Y+2, 7, DARK_ACCENT);
        add(3, Y+3, 7, 0x32CD32); add(4, Y+3, 7, 0x32CD32);

        return Array.from(map.values());
    },
    GenericHouseD: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const add = (x:number, y:number, z:number, c:number) => setBlock(map, x, y, z, c);

        const WALL = 0xFFB6C1; // Light Pink
        const ROOF = 0x555555;
        const TRIM = 0xFFFFFF; // White trim
        const WOOD = COLORS.WOOD;

        generateBox(map, -8, Y, -8, 8, Y+1, 8, COLORS.GREY); // Base
        generateBox(map, -6, Y+2, -6, 6, Y+7, 6, WALL, true); // Wall

        // Wrap around porch (white pillars and dark roof)
        generateBox(map, -7, Y+2, -7, 7, Y+2, 7, WOOD); // Porch floor
        for(let px of [-7, -3, 3, 7]) {
            generateBox(map, px, Y+3, 7, px, Y+5, 7, TRIM); // Front pillars
            generateBox(map, px, Y+3, -7, px, Y+5, -7, TRIM); // Back pillars
            generateBox(map, -7, Y+3, px, -7, Y+5, px, TRIM); // Left pillars
            generateBox(map, 7, Y+3, px, 7, Y+5, px, TRIM); // Right pillars
        }
        generateBox(map, -8, Y+6, -8, 8, Y+6, 8, ROOF); // Porch roof overhang

        // Main Pyramid Roof
        for(let i=0; i<=7; i++) {
            generateBox(map, -7+i, Y+7+i, -7+i, 7-i, Y+7+i, 7-i, ROOF);
        }

        // Top Floor Dormers
        // Front
        generateBox(map, -2, Y+7, 4, 2, Y+9, 5, WALL);
        generateBox(map, -1, Y+8, 5, 1, Y+9, 5, COLORS.GLASS);
        generateBox(map, -3, Y+10, 4, 3, Y+10, 6, ROOF);
        // Back
        generateBox(map, -2, Y+7, -5, 2, Y+9, -4, WALL);
        generateBox(map, -1, Y+8, -5, 1, Y+9, -5, COLORS.GLASS);
        generateBox(map, -3, Y+10, -6, 3, Y+10, -4, ROOF);

        // Ground Floor Details
        // Front Door
        generateBox(map, -1, Y+3, 6, 1, Y+5, 6, WOOD);
        add(1, Y+4, 7, COLORS.GOLD);

        // Big framed windows
        generateBox(map, -5, Y+3, 6, -3, Y+5, 6, TRIM);
        generateBox(map, -4, Y+4, 6, -4, Y+4, 6, COLORS.GLASS);

        generateBox(map, 3, Y+3, 6, 5, Y+5, 6, TRIM);
        generateBox(map, 4, Y+4, 6, 4, Y+4, 6, COLORS.GLASS);

        return Array.from(map.values());
    },
    GenericOffice: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -10, Y, -10, 10, Y+1, 10, COLORS.GREY);
        generateBox(map, -9, Y+2, -9, 9, Y+25, 9, 0xCCCCCC, true);
        for(let y=Y+4; y<=Y+22; y+=4) {
            generateBox(map, -8, y, 9, 8, y+2, 9, COLORS.GLASS);
            generateBox(map, -8, y, -9, 8, y+2, -9, COLORS.GLASS);
            generateBox(map, 9, y, -8, 9, y+2, 8, COLORS.GLASS);
            generateBox(map, -9, y, -8, -9, y+2, 8, COLORS.GLASS);
        }
        generateBox(map, -2, Y+2, 9, 2, Y+5, 9, COLORS.GLASS);
        return Array.from(map.values());
    },
    Factory: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -15, Y, -10, 15, Y+1, 10, COLORS.GREY);
        generateBox(map, -14, Y+2, -9, 14, Y+12, 9, 0x8B4513, true);
        for(let x=-14; x<=10; x+=6) {
            for(let i=0; i<=3; i++) {
                generateBox(map, x+i, Y+13+i, -9, x+i, Y+13+i, 9, 0x555555);
            }
            generateBox(map, x+4, Y+13, -9, x+4, Y+16, 9, COLORS.GLASS);
        }
        generateBox(map, 10, Y+13, -6, 12, Y+30, -4, 0x555555);
        generateBox(map, 10, Y+30, -6, 12, Y+32, -4, COLORS.RED);
        generateBox(map, -4, Y+2, 9, 4, Y+8, 9, 0x333333);
        return Array.from(map.values());
    },
    TreeA: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -1, Y, -1, 1, Y+8, 1, COLORS.WOOD);
        for(let dy=6; dy<=12; dy++) {
            const r = 12 - dy;
            generateBox(map, -r, Y+dy, -r, r, Y+dy, r, 0x228B22);
        }
        return Array.from(map.values());
    },
    TreeB: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -1, Y, -1, 1, Y+10, 1, COLORS.WOOD);
        const cx=0, cy=Y+12, cz=0, r=5;
        for(let x=-r; x<=r; x++) {
            for(let y=-r; y<=r; y++) {
                for(let z=-r; z<=r; z++) {
                    if (x*x + y*y + z*z <= r*r) {
                        setBlock(map, cx+x, cy+y, cz+z, 0x32CD32);
                    }
                }
            }
        }
        return Array.from(map.values());
    },
    Bush: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        const r=3;
        for(let x=-r; x<=r; x++) {
            for(let y=0; y<=r*1.5; y++) {
                for(let z=-r; z<=r; z++) {
                    if (x*x + (y-r)*(y-r) + z*z <= r*r) {
                        setBlock(map, x, Y+y, z, 0x228B22);
                    }
                }
            }
        }
        return Array.from(map.values());
    },
    Garden: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        generateBox(map, -8, Y, -8, 8, Y+1, 8, 0x8B4513);
        generateBox(map, -8, Y+2, -8, 8, Y+3, -8, COLORS.WOOD);
        generateBox(map, -8, Y+2, 8, 8, Y+3, 8, COLORS.WOOD);
        generateBox(map, -8, Y+2, -8, -8, Y+3, 8, COLORS.WOOD);
        generateBox(map, 8, Y+2, -8, 8, Y+3, 8, COLORS.WOOD);
        for(let x=-6; x<=6; x+=3) {
            for(let z=-6; z<=6; z+=3) {
                setBlock(map, x, Y+2, z, 0x32CD32);
                setBlock(map, x, Y+3, z, Math.random() > 0.5 ? COLORS.RED : COLORS.GOLD);
            }
        }
        return Array.from(map.values());
    },
    
    CityWorld: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const addVoxel = (x:number, y:number, z:number, color:number) => {
            map.set(`${x},${y},${z}`, {x, y, z, color});
        };
        const placeModel = (modelArr: VoxelData[], dx: number, dz: number) => {
            for (const v of modelArr) {
                addVoxel(Math.round(v.x + dx), Math.round(v.y), Math.round(v.z + dz), v.color);
            }
        };
        
        // Massive expanding ground (size: ~380x380)
        const EXTENT = 190;
        for(let x=-EXTENT; x<=EXTENT; x++) {
            for(let z=-EXTENT; z<=EXTENT; z++) {
                addVoxel(x, CONFIG.FLOOR_Y-1, z, 0x228B22); // Green grass base
            }
        }

        // Cache road components for performance
        const roadCross = CityGenerators.RoadCross();
        const roadEW = CityGenerators.RoadEW();
        const roadNS = CityGenerators.RoadNS();

        // Generate extensive city grid
        // Start at -150 to 150 with a spacing of 60 
        const grid = [-150, -90, -30, 30, 90, 150];

        // 1. Draw Road Network
        for (let i = 0; i < grid.length; i++) {
            for (let j = 0; j < grid.length; j++) {
                const gx = grid[i];
                const gz = grid[j];
                
                placeModel(roadCross, gx, gz);
                
                // Paint EW roads
                if (i < grid.length - 1) {
                    placeModel(roadEW, gx + 30, gz);
                }
                
                // Paint NS roads
                if (j < grid.length - 1) {
                    placeModel(roadNS, gx, gz + 30);
                }
            }
        }

        // 2. Fill the City Blocks (the regions between roads)
        const houseGenerators = [
            CityGenerators.GenericHouseA, 
            CityGenerators.GenericHouseB, 
            CityGenerators.GenericHouseC, 
            CityGenerators.GenericHouseD
        ];

        for (let i = 0; i < grid.length - 1; i++) {
            for (let j = 0; j < grid.length - 1; j++) {
                const cx = grid[i] + 30; // Block Center X
                const cz = grid[j] + 30; // Block Center Z
                
                // Distance from city center
                const dist = Math.abs(cx) + Math.abs(cz);

                if (dist === 0) {
                    // Absolute center is a large park
                    placeModel(CityGenerators.Park(), cx, cz);
                    // Scatter some extras
                    placeModel(CityGenerators.HotlineBooth(), cx - 12, cz - 12);
                } else if (dist <= 60) {
                    // DOWNTOWN / INDUSTRIAL CORDONE (inner blocks)
                    const r = Math.random();
                    if (r < 0.2) placeModel(CityGenerators.InspectorHQ(), cx, cz);
                    else if (r < 0.4) placeModel(CityGenerators.GenericOffice(), cx, cz);
                    else if (r < 0.6) placeModel(CityGenerators.LicensingOffice(), cx, cz);
                    else if (r < 0.8) placeModel(CityGenerators.UnionHall(), cx, cz);
                    else placeModel(CityGenerators.Factory(), cx, cz);

                    // Alleyway extras
                    if (Math.random() < 0.4) {
                        placeModel(CityGenerators.FixerDen(), cx + 8, cz - 8);
                    }
                } else {
                    // SUBURBS / RESIDENTIAL (outer blocks)
                    const hg = houseGenerators[Math.floor(Math.random() * houseGenerators.length)];
                    placeModel(hg(), cx, cz);
                    
                    // Add lively yard elements to homes
                    if (Math.random() < 0.6) placeModel(CityGenerators.TreeA(), cx - 9, cz - 9);
                    if (Math.random() < 0.6) placeModel(CityGenerators.TreeB(), cx + 9, cz + 9);
                    if (Math.random() < 0.6) placeModel(CityGenerators.Bush(), cx + 9, cz - 9);
                    if (Math.random() < 0.6) placeModel(CityGenerators.Garden(), cx - 9, cz + 9);

                    // Occasional Chief Hut in a quiet suburb
                    if (Math.random() < 0.05) placeModel(CityGenerators.ChiefHut(), cx + 12, cz);
                }
            }
        }
        
        return Array.from(map.values());
    }
};

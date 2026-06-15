/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useRef } from 'react';
import { AppState, SavedModel, VoxelData, EditTool, SymmetryMode, VoxelKeyframe, VoxelMaterialStyle } from '../types';
import { Box, Bird, Cat, Rabbit, Users, Code2, Wand2, Hammer, FolderOpen, ChevronUp, FileJson, History, Play, Pause, Info, Wrench, Loader2, Paintbrush, Eraser, Layers, RotateCcw, Film, Plus, Trash2, Repeat, SkipForward, Sparkles, Grid, Apple, MessageSquare, Factory, Home, Fan, Sun, Shield, Gem, Trees, Droplets, Building2, Download, Sword, CloudFog, Settings } from 'lucide-react';
import { COLORS } from '../utils/voxelConstants';

interface UIOverlayProps {
  voxelCount: number;
  appState: AppState;
  currentBaseModel: string;
  customBuilds: SavedModel[];
  customRebuilds: SavedModel[];
  isAutoRotate: boolean;
  isInfoVisible: boolean;
  isGenerating: boolean;
  isWireframe: boolean;
  isBaked: boolean;
  isFogEnabled: boolean;
  isGreedyEnabled: boolean;
  materialStyle: VoxelMaterialStyle;

  // Edit Mode Props
  isEditMode: boolean;
  activeTool: EditTool;
  activeColor: number;
  symmetryMode: SymmetryMode;
  onSetEditMode: (val: boolean) => void;
  onSetTool: (tool: EditTool) => void;
  onSetColor: (color: number) => void;
  onSetSymmetry: (mode: SymmetryMode) => void;

  // Animation Props
  keyframes: VoxelKeyframe[];
  currentFrameIndex: number;
  isAnimating: boolean;
  isLooping: boolean;
  onCaptureKeyframe: () => void;
  onDeleteKeyframe: (id: string) => void;
  onJumpToKeyframe: (index: number) => void;
  onTogglePlayback: () => void;
  onToggleLoop: () => void;
  onPromptAnimate: () => void;

  onDismantle: () => void;
  onDrop: () => void;
  onSubdivide: () => void;
  onRebuild: (type: 'Eagle' | 'Cat' | 'Rabbit' | 'Twins') => void;
  onNewScene: (type: string) => void;
  onSelectCustomBuild: (model: SavedModel) => void;
  onSelectCustomRebuild: (model: SavedModel) => void;
  onPromptCreate: () => void;
  onPromptMorph: () => void;
  onExport: (format: 'obj' | 'gltf' | 'ply' | 'json') => void;
  onViewJson: () => void;
  onImportJson: () => void;
  onToggleRotation: () => void;
  onToggleWireframe: () => void;
  onToggleBaked: () => void;
  onToggleFog: () => void;
  onToggleGreedy: () => void;
  onChangeMaterialStyle: (style: VoxelMaterialStyle) => void;
  onToggleInfo: () => void;
  
  onToggleChat: () => void;
  isChatOpen: boolean;
  onSetVoxelCount: (count: number) => void;
}

const LOADING_MESSAGES = [
    "Crafting voxels...",
    "Designing structure...",
    "Calculating physics...",
    "Mixing colors...",
    "Assembling geometry...",
    "Applying polish..."
];

const PALETTE = [
    COLORS.DARK, COLORS.LIGHT, COLORS.WHITE, COLORS.GOLD,
    COLORS.BLACK, COLORS.WOOD, COLORS.GREEN, COLORS.TALON,
    COLORS.BLUE, COLORS.RED, COLORS.GLASS, COLORS.GREY
];

export const UIOverlay: React.FC<UIOverlayProps> = ({
  voxelCount,
  appState,
  currentBaseModel,
  customBuilds,
  customRebuilds,
  isAutoRotate,
  isInfoVisible,
  isGenerating,
  isWireframe,
  isFogEnabled,
  isGreedyEnabled,
  materialStyle,
  
  isEditMode,
  activeTool,
  activeColor,
  symmetryMode,
  onSetEditMode,
  onSetTool,
  onSetColor,
  onSetSymmetry,

  keyframes,
  currentFrameIndex,
  isAnimating,
  isLooping,
  onCaptureKeyframe,
  onDeleteKeyframe,
  onJumpToKeyframe,
  onTogglePlayback,
  onToggleLoop,
  onPromptAnimate,

  onDismantle,
  onDrop,
  onSubdivide,
  onRebuild,
  onNewScene,
  onSelectCustomBuild,
  onSelectCustomRebuild,
  onPromptCreate,
  onPromptMorph,
  onExport,
  onViewJson,
  onImportJson,
  onToggleRotation,
  onToggleWireframe,
  onToggleBaked,
  onToggleFog,
  onToggleGreedy,
  onChangeMaterialStyle,
  isBaked,
  onToggleInfo,
  
  onToggleChat,
  isChatOpen,
  onSetVoxelCount
}) => {
  const isStable = appState === AppState.STABLE;
  const isDismantling = appState === AppState.DISMANTLING;
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    if (isGenerating) {
        const interval = setInterval(() => {
            setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    } else {
        setLoadingMsgIndex(0);
    }
  }, [isGenerating]);
  
  const isEagle = currentBaseModel === 'Eagle';

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none">
      
      {/* --- Top Bar --- */}
      <div className="absolute top-4 left-4 right-4 flex flex-col md:flex-row gap-3 md:gap-2 justify-between items-stretch md:items-start pointer-events-none">
        
        {/* Left Side: Builds list & Voxel Counter */}
        <div className="pointer-events-auto flex flex-row md:flex-col items-center md:items-start gap-2 justify-between md:justify-start w-full md:w-auto">
            <DropdownMenu 
                icon={<FolderOpen size={20} />}
                label="Builds"
                color="indigo"
            >
                <CollapsibleCategory title="Characters">
                    <DropdownItem onClick={() => onNewScene('Cat')} icon={<Cat size={16}/>} label="Cat" />
                    <DropdownItem onClick={() => onNewScene('Rabbit')} icon={<Rabbit size={16}/>} label="Rabbit" />
                    <DropdownItem onClick={() => onNewScene('Robot')} icon={<Box size={16}/>} label="Robot" />
                    <DropdownItem onClick={() => onNewScene('Dragon')} icon={<Sparkles size={16}/>} label="Dragon" />
                    <DropdownItem onClick={() => onNewScene('Knight')} icon={<Sword size={16}/>} label="Knight" />
                    
                    <CollapsibleCategory title="Steve">
                        <DropdownItem onClick={() => onNewScene('Steve')} icon={<Users size={16}/>} label="Blue" />
                        <DropdownItem onClick={() => onNewScene('SteveRed')} icon={<Users size={16}/>} label="Red" />
                        <DropdownItem onClick={() => onNewScene('SteveGreen')} icon={<Users size={16}/>} label="Green" />
                    </CollapsibleCategory>
                    <CollapsibleCategory title="Gary">
                        <DropdownItem onClick={() => onNewScene('GaryBlue')} icon={<Users size={16}/>} label="Blue" />
                        <DropdownItem onClick={() => onNewScene('GaryRed')} icon={<Users size={16}/>} label="Red" />
                    </CollapsibleCategory>
                    <CollapsibleCategory title="Eve">
                        <DropdownItem onClick={() => onNewScene('EveBlue')} icon={<Users size={16}/>} label="Blue" />
                        <DropdownItem onClick={() => onNewScene('EveGreen')} icon={<Users size={16}/>} label="Green" />
                    </CollapsibleCategory>
                    <CollapsibleCategory title="Samantha">
                        <DropdownItem onClick={() => onNewScene('SamanthaBlue')} icon={<Users size={16}/>} label="Blue" />
                        <DropdownItem onClick={() => onNewScene('SamanthaRed')} icon={<Users size={16}/>} label="Red" />
                    </CollapsibleCategory>
                </CollapsibleCategory>

                <CollapsibleCategory title="Presets" defaultOpen={true}>
                    <DropdownItem onClick={() => onNewScene('Eagle')} icon={<Bird size={16}/>} label="Eagle" />
                    <DropdownItem onClick={() => onNewScene('HeavyPlant')} icon={<Factory size={16}/>} label="Heavy Plant" />
                    <DropdownItem onClick={() => onNewScene('GoldPlant')} icon={<Factory size={16}/>} label="Gold Plant" />
                    <DropdownItem onClick={() => onNewScene('GoldOre')} icon={<Gem size={16}/>} label="Gold Ore" />
                    <DropdownItem onClick={() => onNewScene('StaffQuarters')} icon={<Home size={16}/>} label="Staff Quarters" />
                </CollapsibleCategory>
                
                <CollapsibleCategory title="Houses">
                    <DropdownItem onClick={() => onNewScene('AverageHouse')} icon={<Home size={16}/>} label="Average House" />
                    <DropdownItem onClick={() => onNewScene('ModernHouse')} icon={<Home size={16}/>} label="Modern House" />
                    <DropdownItem onClick={() => onNewScene('AFrameCabin')} icon={<Home size={16}/>} label="A-Frame Cabin" />
                    <DropdownItem onClick={() => onNewScene('CozyCottage')} icon={<Home size={16}/>} label="Cozy Cottage" />
                    <DropdownItem onClick={() => onNewScene('BeachHouse')} icon={<Home size={16}/>} label="Beach House" />
                    <DropdownItem onClick={() => onNewScene('DesertVilla')} icon={<Home size={16}/>} label="Desert Villa" />
                    <DropdownItem onClick={() => onNewScene('TinyHouse')} icon={<Home size={16}/>} label="Tiny House" />
                    <DropdownItem onClick={() => onNewScene('SuburbanHome')} icon={<Home size={16}/>} label="Suburban Home" />
                    <DropdownItem onClick={() => onNewScene('TreeHouse')} icon={<Home size={16}/>} label="Tree House" />
                    <DropdownItem onClick={() => onNewScene('VictorianHouse')} icon={<Home size={16}/>} label="Victorian House" />
                    <DropdownItem onClick={() => onNewScene('CyberpunkHouse')} icon={<Home size={16}/>} label="Cyberpunk House" />
                </CollapsibleCategory>
                
                <CollapsibleCategory title="Worlds">
                    <DropdownItem onClick={() => onNewScene('MegaWorld')} icon={<Shield size={16}/>} label="Mega World" />
                    <DropdownItem onClick={() => onNewScene('CityWorld')} icon={<Shield size={16}/>} label="City World" />
                </CollapsibleCategory>
                
                <CollapsibleCategory title="Buildings">
                    <DropdownItem onClick={() => onNewScene('LicensingOffice')} icon={<Building2 size={16}/>} label="Licensing Office" />
                    <DropdownItem onClick={() => onNewScene('UnionHall')} icon={<Building2 size={16}/>} label="Union Hall" />
                    <DropdownItem onClick={() => onNewScene('InspectorHQ')} icon={<Building2 size={16}/>} label="Inspector HQ" />
                    <DropdownItem onClick={() => onNewScene('FixerDen')} icon={<Building2 size={16}/>} label="Fixer Den" />
                    <DropdownItem onClick={() => onNewScene('ChiefHut')} icon={<Building2 size={16}/>} label="Chief Hut" />
                    <DropdownItem onClick={() => onNewScene('GenericHouseA')} icon={<Home size={16}/>} label="Generic House A" />
                    <DropdownItem onClick={() => onNewScene('GenericHouseB')} icon={<Home size={16}/>} label="Generic House B" />
                    <DropdownItem onClick={() => onNewScene('GenericHouseC')} icon={<Home size={16}/>} label="Generic House C" />
                    <DropdownItem onClick={() => onNewScene('GenericHouseD')} icon={<Home size={16}/>} label="Generic House D" />
                    <DropdownItem onClick={() => onNewScene('GenericOffice')} icon={<Building2 size={16}/>} label="Generic Office" />
                    <DropdownItem onClick={() => onNewScene('Factory')} icon={<Factory size={16}/>} label="Factory" />
                </CollapsibleCategory>

                <CollapsibleCategory title="Stuff">
                    <DropdownItem onClick={() => onNewScene('HotlineBooth')} icon={<Box size={16}/>} label="Hotline Booth" />
                    <DropdownItem onClick={() => onNewScene('Park')} icon={<Trees size={16}/>} label="Park" />
                    <DropdownItem onClick={() => onNewScene('RoadNS')} icon={<Box size={16}/>} label="Road N-S" />
                    <DropdownItem onClick={() => onNewScene('RoadEW')} icon={<Box size={16}/>} label="Road E-W" />
                    <DropdownItem onClick={() => onNewScene('RoadCross')} icon={<Box size={16}/>} label="Road Intersection" />
                    <DropdownItem onClick={() => onNewScene('TreeA')} icon={<Trees size={16}/>} label="Tree A" />
                    <DropdownItem onClick={() => onNewScene('TreeB')} icon={<Trees size={16}/>} label="Tree B" />
                    <DropdownItem onClick={() => onNewScene('Bush')} icon={<Trees size={16}/>} label="Bush" />
                    <DropdownItem onClick={() => onNewScene('Garden')} icon={<Trees size={16}/>} label="Garden" />
                </CollapsibleCategory>

                <CollapsibleCategory title="Civic Buildings">
                    <DropdownItem onClick={() => onNewScene('CityHall')} icon={<Building2 size={16}/>} label="City Hall" />
                    <DropdownItem onClick={() => onNewScene('Library')} icon={<Building2 size={16}/>} label="Library" />
                    <DropdownItem onClick={() => onNewScene('FireStation')} icon={<Building2 size={16}/>} label="Fire Station" />
                    <DropdownItem onClick={() => onNewScene('PoliceStation')} icon={<Shield size={16}/>} label="Police Station" />
                    <DropdownItem onClick={() => onNewScene('Hospital')} icon={<Building2 size={16}/>} label="Hospital" />
                    <DropdownItem onClick={() => onNewScene('School')} icon={<Building2 size={16}/>} label="School" />
                    <DropdownItem onClick={() => onNewScene('Museum')} icon={<Building2 size={16}/>} label="Museum" />
                    <DropdownItem onClick={() => onNewScene('PostOffice')} icon={<Building2 size={16}/>} label="Post Office" />
                    <DropdownItem onClick={() => onNewScene('Courthouse')} icon={<Building2 size={16}/>} label="Courthouse" />
                    <DropdownItem onClick={() => onNewScene('TrainStation')} icon={<Building2 size={16}/>} label="Train Station" />
                </CollapsibleCategory>
                
                <CollapsibleCategory title="Trees & Nature">
                    <DropdownItem onClick={() => onNewScene('Trees')} icon={<Trees size={16}/>} label="Forest Variants" />
                    <DropdownItem onClick={() => onNewScene('PineTree')} icon={<Trees size={16}/>} label="Pine Tree" />
                    <DropdownItem onClick={() => onNewScene('OakTree')} icon={<Trees size={16}/>} label="Oak Tree" />
                    <DropdownItem onClick={() => onNewScene('WillowTree')} icon={<Trees size={16}/>} label="Willow Tree" />
                    <DropdownItem onClick={() => onNewScene('PalmTree')} icon={<Trees size={16}/>} label="Palm Tree" />
                    <DropdownItem onClick={() => onNewScene('BirchTree')} icon={<Trees size={16}/>} label="Birch Tree" />
                    <DropdownItem onClick={() => onNewScene('DeadTree')} icon={<Trees size={16}/>} label="Dead Tree" />
                    <DropdownItem onClick={() => onNewScene('Grassland')} icon={<Trees size={16}/>} label="Grassland" />
                    <DropdownItem onClick={() => onNewScene('SavannaPlains')} icon={<Trees size={16}/>} label="Savanna Plains" />
                    <DropdownItem onClick={() => onNewScene('WaterBlock')} icon={<Droplets size={16}/>} label="Water Block" />
                </CollapsibleCategory>
                
                <CollapsibleCategory title="Other">
                    <DropdownItem onClick={() => onNewScene('GrandKhalifa')} icon={<Building2 size={16}/>} label="Grand Khalifa" />
                    <DropdownItem onClick={() => onNewScene('WindTurbine')} icon={<Fan size={16}/>} label="Wind Turbine" />
                    <DropdownItem onClick={() => onNewScene('SolarArrays')} icon={<Sun size={16}/>} label="Solar Arrays" />
                    <DropdownItem onClick={() => onNewScene('SecurityHQ')} icon={<Shield size={16}/>} label="Security HQ" />
                    <DropdownItem onClick={() => onNewScene('City')} icon={<Building2 size={16}/>} label="Metropolis" />
                </CollapsibleCategory>
                
                <div className="h-px bg-slate-100 my-1" />
                <DropdownItem onClick={onPromptCreate} icon={<Wand2 size={16}/>} label="Generate AI" highlight />
                <div className="h-px bg-slate-100 my-1" />
                
                {customBuilds.length > 0 && (
                    <CollapsibleCategory title="Your Creations">
                        {customBuilds.map((model, idx) => (
                            <DropdownItem key={`build-${idx}`} onClick={() => onSelectCustomBuild(model)} icon={<History size={16}/>} label={model.name} truncate />
                        ))}
                    </CollapsibleCategory>
                )}
                <DropdownItem onClick={onViewJson} icon={<Code2 size={16}/>} label="View JSON" />
                <DropdownItem onClick={onImportJson} icon={<FileJson size={16}/>} label="Import JSON" />
            </DropdownMenu>

            {/* Voxel Gauge and Slider bar */}
            <div className="flex items-center gap-3 px-3.5 py-1.5 md:px-4 md:py-2 bg-white/90 backdrop-blur-sm shadow-sm rounded-xl border border-slate-200 text-slate-500 font-bold w-fit md:mt-2 h-[42px] md:h-auto">
                <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600 shrink-0">
                    <Box size={15} strokeWidth={3} />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] uppercase tracking-wider opacity-60">Voxels</span>
                    <span className="text-base md:text-lg text-slate-800 font-extrabold font-mono">{voxelCount}</span>
                </div>
                
                {/* Voxel Slider - Muted on smaller smartphones to preserve space */}
                <div className="hidden sm:flex flex-col gap-1 ml-2 w-20 md:w-24">
                    <input 
                        type="range" 
                        min="10" 
                        max="5000" 
                        step="10"
                        value={voxelCount} 
                        onChange={(e) => onSetVoxelCount(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>
        </div>

        {/* Right Side: Control Panels */}
        <div className="pointer-events-auto flex flex-row gap-1.5 md:gap-2 items-center justify-between md:justify-end w-full md:w-auto overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-none">
            
            {/* Primary Action Group: Edit mode, Physics breaks, Gravity drops and chat */}
            <div className="flex gap-1.5 md:gap-2 shrink-0">
                <TactileButton
                    onClick={() => onSetEditMode(!isEditMode)}
                    color={isEditMode ? 'emerald' : 'slate'}
                    icon={<Paintbrush size={18} strokeWidth={2.5} />}
                    label="Edit"
                    compact
                />
                {isStable && !isEditMode && (
                    <TactileButton
                        onClick={onDismantle}
                        color="rose"
                        icon={<Hammer size={18} strokeWidth={2.5} />}
                        label="Break"
                        compact
                    />
                )}
                {isStable ? (
                    <TactileButton
                        onClick={onDrop}
                        color="rose"
                        icon={<Apple size={18} strokeWidth={2.5} />}
                        label="Gravity"
                        compact
                    />
                ) : (
                    <TactileButton
                        onClick={() => {}} 
                        color="slate"
                        icon={<Apple size={18} strokeWidth={2.5} className="opacity-30" />}
                        label="Gravity"
                        compact
                        className="opacity-50 cursor-not-allowed"
                    />
                )}
                <TactileButton
                    onClick={onToggleChat}
                    color={isChatOpen ? 'indigo' : 'slate'}
                    icon={<MessageSquare size={18} strokeWidth={2.5} />}
                    label="Chat"
                    compact
                />
            </div>

            {/* Desktop View options & drop lists (shown only on large containers >= 1024px) */}
            <div className="hidden lg:flex gap-1.5 md:gap-2 shrink-0 items-center">
                <TactileButton
                    onClick={onToggleWireframe}
                    color={isWireframe ? 'amber' : 'slate'}
                    icon={<Grid size={18} strokeWidth={2.5} />}
                    label="Wireframe"
                    compact
                />
                <TactileButton
                    onClick={onToggleBaked}
                    color={isBaked ? 'amber' : 'slate'}
                    icon={<Box size={18} strokeWidth={2.5} />}
                    label="Baked"
                    compact
                />
                <TactileButton
                    onClick={onToggleFog}
                    color={isFogEnabled ? 'sky' : 'slate'}
                    icon={<CloudFog size={18} strokeWidth={2.5} />}
                    label="Fog"
                    compact
                />
                <TactileButton
                    onClick={onToggleGreedy}
                    color={isGreedyEnabled ? 'emerald' : 'slate'}
                    icon={<Layers size={18} strokeWidth={2.5} />}
                    label="Greedy"
                    compact
                />
                <TactileButton
                    onClick={onToggleInfo}
                    color={isInfoVisible ? 'indigo' : 'slate'}
                    icon={<Info size={18} strokeWidth={2.5} />}
                    label="Info"
                    compact
                />
                <TactileButton
                    onClick={onToggleRotation}
                    color={isAutoRotate ? 'sky' : 'slate'}
                    icon={isAutoRotate ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    label={isAutoRotate ? "Pause" : "Play"}
                    compact
                />
                <DropdownMenu 
                    icon={<Gem size={18} strokeWidth={2.5} />} 
                    label={materialStyle.charAt(0).toUpperCase() + materialStyle.slice(1)} 
                    color="slate" 
                    align="right"
                >
                    <DropdownItem onClick={() => onChangeMaterialStyle('matte')} icon={<Box size={16} className="text-slate-500" />} label="Matte" highlight={materialStyle === 'matte'} />
                    <DropdownItem onClick={() => onChangeMaterialStyle('glossy')} icon={<Gem size={16} className="text-amber-500" />} label="Glossy" highlight={materialStyle === 'glossy'} />
                    <DropdownItem onClick={() => onChangeMaterialStyle('glowing')} icon={<Sparkles size={16} className="text-yellow-500 animate-pulse" />} label="Glowing" highlight={materialStyle === 'glowing'} />
                </DropdownMenu>
                <DropdownMenu icon={<Download size={18} strokeWidth={2.5} />} label="Export" color="slate" align="right">
                    <DropdownItem onClick={() => onExport('obj')} icon={<Box size={16}/>} label="Export OBJ" />
                    <DropdownItem onClick={() => onExport('gltf')} icon={<Box size={16}/>} label="Export GLB (Colors)" />
                    <DropdownItem onClick={() => onExport('ply')} icon={<Box size={16}/>} label="Export PLY (Colors)" />
                    <DropdownItem onClick={() => onExport('json')} icon={<FileJson size={16}/>} label="Export JSON" />
                </DropdownMenu>
            </div>

            {/* Mobile/Tablet Toggles Menu list (unified for layout safety on viewports < 1024px) */}
            <div className="flex lg:hidden shrink-0">
                <DropdownMenu 
                    icon={<Settings size={18} strokeWidth={2.5} />} 
                    label="Options" 
                    color="slate" 
                    align="right"
                >
                    <div className="px-2 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">Display Options</div>
                    <DropdownItem onClick={onToggleWireframe} icon={<Grid size={16} className={isWireframe ? "text-amber-500" : "text-slate-400"} />} label="Wireframe Mode" highlight={isWireframe} />
                    <DropdownItem onClick={onToggleBaked} icon={<Box size={16} className={isBaked ? "text-amber-500" : "text-slate-400"} />} label="Ambient Occlusion" highlight={isBaked} />
                    <DropdownItem onClick={onToggleFog} icon={<CloudFog size={16} className={isFogEnabled ? "text-sky-500" : "text-slate-400"} />} label="Atmospheric Fog" highlight={isFogEnabled} />
                    <DropdownItem onClick={onToggleGreedy} icon={<Layers size={16} className={isGreedyEnabled ? "text-emerald-500" : "text-slate-400"} />} label="Greedy Meshing" highlight={isGreedyEnabled} />
                    <DropdownItem onClick={onToggleRotation} icon={isAutoRotate ? <Pause size={16} className="text-sky-500" fill="currentColor" /> : <Play size={16} className="text-slate-400" />} label={isAutoRotate ? "Pause Rotation" : "Auto Rotate"} highlight={isAutoRotate} />
                    <DropdownItem onClick={onToggleInfo} icon={<Info size={16} className={isInfoVisible ? "text-indigo-500" : "text-slate-400"} />} label="Help Info Card" highlight={isInfoVisible} />

                    <div className="h-px bg-slate-100 my-1 font-bold" />
                    
                    <CollapsibleCategory title="Material Selector">
                        <DropdownItem onClick={() => onChangeMaterialStyle('matte')} icon={<Box size={14} className="text-slate-500" />} label="Matte Style" highlight={materialStyle === 'matte'} />
                        <DropdownItem onClick={() => onChangeMaterialStyle('glossy')} icon={<Gem size={14} className="text-amber-500" />} label="Glossy Style" highlight={materialStyle === 'glossy'} />
                        <DropdownItem onClick={() => onChangeMaterialStyle('glowing')} icon={<Sparkles size={14} className="text-yellow-500" />} label="Glowing Style" highlight={materialStyle === 'glowing'} />
                    </CollapsibleCategory>

                    <div className="h-px bg-slate-100 my-1 font-bold" />

                    <CollapsibleCategory title="Export File">
                        <DropdownItem onClick={() => onExport('obj')} icon={<Box size={14}/>} label="Export OBJ mesh" />
                        <DropdownItem onClick={() => onExport('gltf')} icon={<Box size={14}/>} label="Export GLB model" />
                        <DropdownItem onClick={() => onExport('ply')} icon={<Box size={14}/>} label="Export PLY point" />
                        <DropdownItem onClick={() => onExport('json')} icon={<FileJson size={14}/>} label="Export JSON data" />
                    </CollapsibleCategory>
                </DropdownMenu>
            </div>

        </div>
      </div>

      {/* --- Edit Sidebar (Desktop and Mobile layout) --- */}
      {isEditMode && isStable && (
        <>
          {/* Desktop Left Sidebar: shown on md viewports and up */}
          <div className="hidden md:flex absolute left-4 top-40 pointer-events-auto flex-col gap-4 animate-in slide-in-from-left-10 duration-300">
              {/* Tool Selection */}
              <div className="bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-2">
                  <IconButton 
                      active={activeTool === EditTool.BRUSH} 
                      onClick={() => onSetTool(EditTool.BRUSH)} 
                      icon={<Paintbrush size={20} />} 
                      color="sky" 
                  />
                  <IconButton 
                      active={activeTool === EditTool.ERASER} 
                      onClick={() => onSetTool(EditTool.ERASER)} 
                      icon={<Eraser size={20} />} 
                      color="rose" 
                  />
              </div>

              {/* Symmetry Toggle */}
              <div className="bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-2">
                  <div className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter mb-1">Mirror</div>
                  <IconButton 
                      active={symmetryMode === SymmetryMode.NONE} 
                      onClick={() => onSetSymmetry(SymmetryMode.NONE)} 
                      icon={<div className="text-xs font-bold">OFF</div>} 
                      color="slate" 
                  />
                  <IconButton 
                      active={symmetryMode === SymmetryMode.X} 
                      onClick={() => onSetSymmetry(SymmetryMode.X)} 
                      icon={<div className="text-sm font-black">X</div>} 
                      color="indigo" 
                  />
                  <IconButton 
                      active={symmetryMode === SymmetryMode.Z} 
                      onClick={() => onSetSymmetry(SymmetryMode.Z)} 
                      icon={<div className="text-sm font-black">Z</div>} 
                      color="indigo" 
                  />
              </div>

              {/* Color Palette */}
              <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-slate-200 grid grid-cols-2 gap-2">
                  {PALETTE.map((color) => (
                      <button
                          key={color}
                          onClick={() => onSetColor(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-95 ${activeColor === color ? 'border-indigo-500 scale-110 shadow-lg' : 'border-black/5'}`}
                          style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
                      />
                  ))}
              </div>

              {/* Subdivide Button */}
              <div className="bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-2">
                  <div className="text-[10px] font-black text-slate-400 text-center uppercase tracking-tighter mb-1">Detail</div>
                  <IconButton 
                      active={false} 
                      onClick={onSubdivide} 
                      icon={<Grid size={20} />} 
                      color="sky" 
                  />
              </div>
          </div>

          {/* Mobile bottom-center horizontal panel: shown on viewports below md */}
          <div className="flex md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto flex-col items-center gap-1.5 w-[calc(100vw-32px)] max-w-md animate-in slide-in-from-bottom-5 duration-300">
              <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-2xl shadow-2xl border border-slate-200 flex flex-row items-center justify-between w-full gap-2 overflow-x-auto scrollbar-none">
                  
                  {/* Tool Selection (Brush/Eraser) */}
                  <div className="flex gap-1 shrink-0 pr-1.5 border-r border-slate-100">
                      <IconButton 
                          active={activeTool === EditTool.BRUSH} 
                          onClick={() => onSetTool(EditTool.BRUSH)} 
                          icon={<Paintbrush size={18} />} 
                          color="sky" 
                      />
                      <IconButton 
                          active={activeTool === EditTool.ERASER} 
                          onClick={() => onSetTool(EditTool.ERASER)} 
                          icon={<Eraser size={18} />} 
                          color="rose" 
                      />
                  </div>

                  {/* Symmetry Mirror Toggle */}
                  <div className="flex items-center gap-1 shrink-0 pr-1.5 border-r border-slate-100 text-[10px] font-black text-slate-400">
                      <button 
                          onClick={() => onSetSymmetry(SymmetryMode.NONE)}
                          className={`px-1 rounded ${symmetryMode === SymmetryMode.NONE ? 'bg-slate-200 text-slate-700' : 'text-slate-400'}`}
                      >
                          OFF
                      </button>
                      <button 
                          onClick={() => onSetSymmetry(SymmetryMode.X)}
                          className={`w-5 h-5 flex items-center justify-center rounded font-extrabold ${symmetryMode === SymmetryMode.X ? 'bg-indigo-500 text-white shadow' : 'text-slate-400'}`}
                      >
                          X
                      </button>
                      <button 
                          onClick={() => onSetSymmetry(SymmetryMode.Z)}
                          className={`w-5 h-5 flex items-center justify-center rounded font-extrabold ${symmetryMode === SymmetryMode.Z ? 'bg-indigo-500 text-white shadow' : 'text-slate-400'}`}
                      >
                          Z
                      </button>
                  </div>

                  {/* Color selector palette list */}
                  <div className="flex-1 flex gap-1.5 overflow-x-auto min-w-0 px-1 scrollbar-none items-center h-8">
                      {PALETTE.map((color) => (
                          <button
                              key={color}
                              onClick={() => onSetColor(color)}
                              className={`w-6 h-6 rounded-full border shrink-0 transition-transform ${activeColor === color ? 'border-indigo-500 scale-110 ring-2 ring-indigo-200 shadow' : 'border-black/5'}`}
                              style={{ backgroundColor: `#${color.toString(16).padStart(6, '0')}` }}
                          />
                      ))}
                  </div>

                  {/* Partition subdivisions button */}
                  <div className="pl-1.5 border-l border-slate-100 shrink-0">
                      <IconButton 
                          active={false} 
                          onClick={onSubdivide} 
                          icon={<Grid size={18} />} 
                          color="sky" 
                      />
                  </div>
              </div>
              
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm select-none leading-none">
                  Edit Palette Controls
              </div>
          </div>
        </>
      )}

      {/* --- Choreographer Timeline --- */}
      {isStable && !isEditMode && (
          <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-auto pointer-events-auto flex flex-col items-start gap-2.5 sm:gap-3 animate-in slide-in-from-left-5 duration-500">
              <div className="bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl md:rounded-[2rem] p-2 md:p-3 flex items-center gap-2 md:gap-4 w-full md:w-auto min-w-0">
                  {/* Playback Controls */}
                  <div className="flex items-center gap-1.5 md:gap-2 pr-2 md:pr-4 border-r border-slate-100 shrink-0">
                      <button 
                        onClick={onTogglePlayback}
                        disabled={keyframes.length === 0}
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 ${isAnimating ? 'bg-amber-100 text-amber-600 shadow-inner' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'}`}
                      >
                        {isAnimating ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-0.5" fill="currentColor" />}
                      </button>
                      <button 
                        onClick={onToggleLoop}
                        className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-colors ${isLooping ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300'}`}
                        title="Loop Animation"
                      >
                        <Repeat size={16} strokeWidth={3} />
                      </button>
                  </div>

                  {/* Timeline Strip */}
                  <div className="flex-1 flex items-center gap-1.5 md:gap-2 overflow-x-auto max-w-[170px] xs:max-w-[240px] sm:max-w-[320px] md:max-w-[400px] py-1 px-1 scrollbar-hide">
                      {keyframes.length === 0 ? (
                          <div className="text-slate-400 font-bold text-xs md:text-sm px-2 md:px-4 flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                              <Film size={15} />
                              Empty Timeline
                          </div>
                      ) : (
                        keyframes.map((kf, idx) => (
                            <div key={kf.id} className="relative group shrink-0">
                                <button 
                                    onClick={() => onJumpToKeyframe(idx)}
                                    className={`w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl border-2 transition-all overflow-hidden flex flex-col items-center justify-center gap-0.5 md:gap-1 ${currentFrameIndex === idx ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                                >
                                    <span className={`text-[9px] md:text-[10px] font-black ${currentFrameIndex === idx ? 'text-indigo-600' : 'text-slate-400'}`}>F{idx+1}</span>
                                    <div className="w-4 h-1 md:w-6 md:h-1.5 bg-slate-300 rounded-full" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteKeyframe(kf.id); }}
                                    className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-sm"
                                >
                                    <Trash2 size={10} strokeWidth={3} />
                                </button>
                            </div>
                        ))
                      )}
                  </div>

                  {/* Add Frame / Generate */}
                  <div className="pl-2 md:pl-4 border-l border-slate-100 flex gap-1.5 md:gap-2 shrink-0">
                      <button 
                        onClick={onCaptureKeyframe}
                        title="Capture current pose"
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-all active:scale-95 group"
                      >
                        <Plus size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                      </button>
                      
                      <button 
                        onClick={onPromptAnimate}
                        title="Generate AI Animation"
                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center transition-all active:scale-95 hover:brightness-110 group"
                      >
                        <Sparkles size={16} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                      </button>
                  </div>
              </div>
              <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/60 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full backdrop-blur-sm shadow-sm select-none leading-none">
                  Choreographer Sequence
              </div>
          </div>
      )}

      {/* --- Loading Indicator --- */}
      {isGenerating && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
              <div className="bg-white/90 backdrop-blur-md border-2 border-indigo-100 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
                  <Loader2 size={48} className="text-indigo-500 animate-spin" />
                  <div className="text-center">
                      <h3 className="text-lg font-extrabold text-slate-800">Gemini is Building...</h3>
                      <p className="text-slate-500 font-bold text-sm">{LOADING_MESSAGES[loadingMsgIndex]}</p>
                  </div>
              </div>
          </div>
      )}

      {/* --- Bottom Controls --- */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center items-end pointer-events-none">
        <div className="pointer-events-auto transition-all duration-500">
            {isDismantling && !isGenerating && (
                <div className="flex items-end gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
                     <DropdownMenu icon={<Wrench size={24} />} label="Rebuild" color="emerald" direction="up" big>
                        <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">REBUILD</div>
                        {isEagle && (
                            <>
                                <DropdownItem onClick={() => onRebuild('Cat')} icon={<Cat size={18}/>} label="Cat" />
                                <DropdownItem onClick={() => onRebuild('Rabbit')} icon={<Rabbit size={18}/>} label="Rabbit" />
                                <DropdownItem onClick={() => onRebuild('Twins')} icon={<Users size={18}/>} label="Eagles x2" />
                                <div className="h-px bg-slate-100 my-1" />
                            </>
                        )}
                        {customRebuilds.map((model, idx) => (
                            <DropdownItem key={`rebuild-${idx}`} onClick={() => onSelectCustomRebuild(model)} icon={<History size={18}/>} label={model.name} truncate />
                        ))}
                        <DropdownItem onClick={onPromptMorph} icon={<Wand2 size={18}/>} label="New rebuild" highlight />
                     </DropdownMenu>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const IconButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, color: string}> = ({ active, onClick, icon, color }) => {
    const colorClasses: any = {
        sky: 'bg-sky-500 shadow-sky-700',
        rose: 'bg-rose-500 shadow-rose-700',
        indigo: 'bg-indigo-500 shadow-indigo-700',
        slate: 'bg-slate-400 shadow-slate-600'
    };
    return (
        <button 
            onClick={onClick}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-b-[4px] active:border-b-0 active:translate-y-[4px] ${active ? `${colorClasses[color]} text-white border-black/20` : 'bg-slate-100 text-slate-400 border-slate-200 shadow-none'}`}
        >
            {icon}
        </button>
    );
};

interface TactileButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: 'slate' | 'rose' | 'sky' | 'emerald' | 'amber' | 'indigo';
  compact?: boolean;
  className?: string;
}

const TactileButton: React.FC<TactileButtonProps> = ({ onClick, icon, label, color, compact, className }) => {
  const colorStyles = {
    slate:   'bg-slate-200 text-slate-600 shadow-slate-300 hover:bg-slate-300',
    rose:    'bg-rose-500 text-white shadow-rose-700 hover:bg-rose-600',
    sky:     'bg-sky-500 text-white shadow-sky-700 hover:bg-sky-600',
    emerald: 'bg-emerald-500 text-white shadow-emerald-700 hover:bg-emerald-600',
    amber:   'bg-amber-400 text-amber-900 shadow-amber-600 hover:bg-amber-500',
    indigo:  'bg-indigo-500 text-white shadow-indigo-700 hover:bg-indigo-600',
  };

  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all border-b-[4px] active:border-b-0 active:translate-y-[4px] ${compact ? 'p-2.5' : 'px-4 py-3'} ${colorStyles[color]} border-black/20 shadow-lg ${className || ''}`}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </button>
  );
};

interface DropdownProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
    color: 'indigo' | 'emerald' | 'slate';
    direction?: 'up' | 'down';
    big?: boolean;
    align?: 'left' | 'right';
}

const DropdownMenu: React.FC<DropdownProps> = ({ icon, label, children, color, direction = 'down', big, align = 'left' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    let bgClass = '';
    if (color === 'indigo') bgClass = 'bg-indigo-500 hover:bg-indigo-600 border-indigo-800 text-white';
    else if (color === 'emerald') bgClass = 'bg-emerald-500 hover:bg-emerald-600 border-emerald-800 text-white';
    else if (color === 'slate') bgClass = 'bg-slate-200 hover:bg-slate-300 border-slate-400 text-slate-600 shadow-slate-300';

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 font-bold shadow-lg rounded-xl transition-all active:scale-95 ${bgClass} ${big ? 'px-8 py-4 text-lg border-b-[6px] active:border-b-0 active:translate-y-[6px]' : 'px-4 py-3 text-sm border-b-[4px] active:border-b-0 active:translate-y-[4px]'}`}>
                {icon} {label}
                <ChevronUp size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${direction === 'down' ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${direction === 'up' ? 'bottom-full mb-3' : 'top-full mt-3'} w-64 max-h-[60vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-slate-100 p-2 flex flex-col gap-1 animate-in fade-in zoom-in duration-200 z-50`}>
                    {children}
                </div>
            )}
        </div>
    );
};

const DropdownItem: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, highlight?: boolean, truncate?: boolean }> = ({ onClick, icon, label, highlight, truncate }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors text-left ${highlight ? 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-600 hover:from-sky-100 hover:to-blue-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <div className="shrink-0">{icon}</div>
        <span className={truncate ? "truncate w-full" : ""}>{label}</span>
    </button>
);

const CollapsibleCategory: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="flex flex-col mb-1">
            <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center justify-between w-full px-2 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-50 rounded-lg transition-colors"
            >
                {title}
                <ChevronUp size={14} className={`transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
            </button>
            {isOpen && (
                <div className="flex flex-col gap-1 pl-2 mt-1 border-l-2 border-slate-100 ml-2">
                    {children}
                </div>
            )}
        </div>
    );
};

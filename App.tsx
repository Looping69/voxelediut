/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VoxelEngine } from './services/VoxelEngine';
import { UIOverlay } from './components/UIOverlay';
import { JsonModal } from './components/JsonModal';
import { PromptModal } from './components/PromptModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatSidebar } from './components/ChatSidebar';
import { Generators } from './utils/voxelGenerators';
import { AppState, VoxelData, SavedModel, SymmetryMode, EditTool, VoxelKeyframe, ChatMessage, VoxelMaterialStyle } from './types';
import { GoogleGenAI, Type, FunctionDeclaration, Chat } from "@google/genai";
import { COLORS } from './utils/voxelConstants';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.STABLE);
  const [voxelCount, setVoxelCount] = useState<number>(0);
  
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonModalMode, setJsonModalMode] = useState<'view' | 'import'>('view');
  
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptMode, setPromptMode] = useState<'create' | 'morph' | 'animate'>('create');
  
  const [showWelcome, setShowWelcome] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [jsonData, setJsonData] = useState('');
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [isWireframe, setIsWireframe] = useState(false);
  const [isBaked, setIsBaked] = useState(false);
  const [isFogEnabled, setIsFogEnabled] = useState(true);
  const [isGreedyEnabled, setIsGreedyEnabled] = useState(false);
  const [materialStyle, setMaterialStyle] = useState<VoxelMaterialStyle>('matte');

  // --- Edit Mode State ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTool, setActiveTool] = useState<EditTool>(EditTool.BRUSH);
  const [activeColor, setActiveColor] = useState<number>(COLORS.DARK);
  const [symmetryMode, setSymmetryMode] = useState<SymmetryMode>(SymmetryMode.NONE);

  // --- Animation / Choreographer State ---
  const [keyframes, setKeyframes] = useState<VoxelKeyframe[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLooping, setIsLooping] = useState(true);

  // --- State for Custom Models ---
  const [currentBaseModel, setCurrentBaseModel] = useState<string>('Eagle');
  const [customBuilds, setCustomBuilds] = useState<SavedModel[]>([]);
  const [customRebuilds, setCustomRebuilds] = useState<SavedModel[]>([]);

  // --- Chat State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new VoxelEngine(
      containerRef.current,
      (newState) => setAppState(newState),
      (count) => setVoxelCount(count)
    );

    engineRef.current = engine;
    engine.loadInitialModel(Generators.Eagle());

    const handleResize = () => engine.handleResize();
    window.addEventListener('resize', handleResize);

    const timer = setTimeout(() => setShowWelcome(false), 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      engine.cleanup();
    };
  }, []);

  // Sync edit params to engine
  useEffect(() => {
    engineRef.current?.setEditParams(isEditMode, activeTool, activeColor, symmetryMode);
  }, [isEditMode, activeTool, activeColor, symmetryMode]);

  // Handle Animation Playback Logic
  useEffect(() => {
    if (isAnimating && appState === AppState.STABLE && keyframes.length > 0) {
      const nextIndex = (currentFrameIndex + 1) % keyframes.length;
      
      // If we finished the loop and aren't looping, stop
      if (nextIndex === 0 && !isLooping && currentFrameIndex !== -1) {
        setIsAnimating(false);
        return;
      }

      // Delay slightly before next morph for visual breathing room
      const timeout = setTimeout(() => {
        if (engineRef.current) {
          engineRef.current.rebuild(keyframes[nextIndex].data);
          setCurrentFrameIndex(nextIndex);
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [isAnimating, appState, currentFrameIndex, keyframes, isLooping]);

  const handleCaptureKeyframe = () => {
    if (engineRef.current) {
      const data = engineRef.current.getCurrentVoxelData();
      const newKeyframe: VoxelKeyframe = {
        id: Math.random().toString(36).substring(7),
        name: `Pose ${keyframes.length + 1}`,
        data
      };
      setKeyframes(prev => [...prev, newKeyframe]);
    }
  };

  const handleDeleteKeyframe = (id: string) => {
    setKeyframes(prev => prev.filter(k => k.id !== id));
    if (isAnimating) setIsAnimating(false);
  };

  const handleJumpToKeyframe = (index: number) => {
    if (engineRef.current && keyframes[index]) {
      setIsAnimating(false);
      engineRef.current.rebuild(keyframes[index].data);
      setCurrentFrameIndex(index);
    }
  };

  const handleTogglePlayback = () => {
    if (keyframes.length === 0) return;
    setIsAnimating(!isAnimating);
  };

  const handleDismantle = () => {
    setIsAnimating(false);
    engineRef.current?.dismantle();
  };
  
  const handleDrop = () => {
      setIsAnimating(false);
      engineRef.current?.drop();
  };

  const handleSubdivide = () => {
      setIsAnimating(false);
      engineRef.current?.subdivide();
  };

  const handleNewScene = (type: string) => {
    // @ts-ignore
    const generator = Generators[type];
    if (generator && engineRef.current) {
      setIsAnimating(false);
      engineRef.current.loadInitialModel(generator());
      setCurrentBaseModel(type);
    }
  };

  const handleSelectCustomBuild = (model: SavedModel) => {
      if (engineRef.current) {
          setIsAnimating(false);
          engineRef.current.loadInitialModel(model.data);
          setCurrentBaseModel(model.name);
      }
  };

  const handleRebuild = (type: 'Eagle' | 'Cat' | 'Rabbit' | 'Twins') => {
    const generator = Generators[type];
    if (generator && engineRef.current) {
      setIsAnimating(false);
      engineRef.current.rebuild(generator());
    }
  };

  const handleSelectCustomRebuild = (model: SavedModel) => {
      if (engineRef.current) {
          setIsAnimating(false);
          engineRef.current.rebuild(model.data);
      }
  };

  const handleShowJson = () => {
    if (engineRef.current) {
      setJsonData(engineRef.current.getJsonData());
      setJsonModalMode('view');
      setIsJsonModalOpen(true);
    }
  };

  const handleExport = async (format: 'obj' | 'gltf' | 'ply' | 'json') => {
    if (!engineRef.current) return;
    
    try {
      if (format === 'obj') {
        const objData = engineRef.current.getObjData();
        const blob = new Blob([objData], { type: 'text/plain' });
        downloadBlob(blob, `voxel-model-${Date.now()}.obj`);
      } else if (format === 'gltf') {
        const blob = await engineRef.current.exportGLTF();
        downloadBlob(blob, `voxel-model-${Date.now()}.glb`);
      } else if (format === 'ply') {
        const blob = await engineRef.current.exportPLY();
        downloadBlob(blob, `voxel-model-${Date.now()}.ply`);
      } else if (format === 'json') {
        const jsonData = engineRef.current.getJsonData();
        const blob = new Blob([jsonData], { type: 'application/json' });
        downloadBlob(blob, `voxel-model-${Date.now()}.json`);
      }
    } catch (e) {
      console.error("Export failed", e);
      alert("Export failed. See console for details.");
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      setJsonModalMode('import');
      setIsJsonModalOpen(true);
  };

  const handleJsonImport = (jsonStr: string) => {
      try {
          // 1. Strip Markdown code blocks if present (common when copying from AI)
          const cleanStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

          // 2. Parse
          let rawData = JSON.parse(cleanStr);

          // 3. Handle Object Wrappers (e.g. { data: [...] } or { voxels: [...] })
          if (!Array.isArray(rawData)) {
              if (rawData.data && Array.isArray(rawData.data)) {
                  rawData = rawData.data;
              } else if (rawData.voxels && Array.isArray(rawData.voxels)) {
                  rawData = rawData.voxels;
              } else {
                  throw new Error("JSON structure invalid: Root must be an array or contain a 'data' array.");
              }
          }

          // 4. Validate Content
          const voxelData: VoxelData[] = rawData.map((v: any) => {
              let colorVal = v.c || v.color;
              let colorInt = 0xCCCCCC;

              if (typeof colorVal === 'string') {
                  if (colorVal.startsWith('#')) colorVal = colorVal.substring(1);
                  colorInt = parseInt(colorVal, 16);
              } else if (typeof colorVal === 'number') {
                  colorInt = colorVal;
              }

              return {
                  x: Number(v.x) || 0,
                  y: Number(v.y) || 0,
                  z: Number(v.z) || 0,
                  color: isNaN(colorInt) ? 0xCCCCCC : colorInt
              };
          });
          
          if (engineRef.current) {
              setIsAnimating(false);
              engineRef.current.loadInitialModel(voxelData);
              setCurrentBaseModel('Imported Build');
          }
      } catch (e: any) {
          console.error("Failed to import JSON", e);
          alert(`Failed to import JSON: ${e.message}`);
      }
  };

  const openPrompt = (mode: 'create' | 'morph' | 'animate') => {
      setPromptMode(mode);
      setIsPromptModalOpen(true);
  }
  
  const handleToggleRotation = () => {
      const newState = !isAutoRotate;
      setIsAutoRotate(newState);
      if (engineRef.current) {
          engineRef.current.setAutoRotate(newState);
      }
  }

  const handleToggleWireframe = () => {
      const newState = !isWireframe;
      setIsWireframe(newState);
      engineRef.current?.setWireframe(newState);
  }

  const handleToggleBaked = () => {
      const newState = !isBaked;
      setIsBaked(newState);
      engineRef.current?.setBaked(newState);
  }

  const handleToggleFog = () => {
      const newState = !isFogEnabled;
      setIsFogEnabled(newState);
      engineRef.current?.setFog(newState);
  }

  const handleToggleGreedy = () => {
      const newState = !isGreedyEnabled;
      setIsGreedyEnabled(newState);
      engineRef.current?.setGreedyMeshing(newState);
  }

  const handleChangeMaterialStyle = (style: VoxelMaterialStyle) => {
      setMaterialStyle(style);
      engineRef.current?.setMaterialStyle(style);
  }

  const handlePromptSubmit = async (prompt: string, imageBase64?: string) => {
    setIsGenerating(true);
    setIsPromptModalOpen(false);

    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey) {
            throw new Error("API Key not found");
        }
        const ai = new GoogleGenAI({ apiKey });
        const model = 'gemini-3-flash-preview';
        
        let systemContext = "";
        
        if (promptMode === 'animate') {
            const currentVoxels = engineRef.current?.getCurrentVoxelData() || [];
            // Optimize context: Only send if not too huge, otherwise send a summary or empty.
            // 2000 voxels is ~10KB JSON, perfectly fine for context.
            const modelJson = JSON.stringify(currentVoxels);
            
            systemContext = `
              CONTEXT: You are an expert voxel animator.
              CURRENT_MODEL: ${modelJson}
              TASK: Create a 3 to 5 frame animation sequence based on the current model and the user's instruction.
              INSTRUCTION: "${prompt}"
              OUTPUT: Return a JSON Array of Arrays. Each inner Array is a full Voxel Model (frame).
              IMPORTANT: Maintain the general shape/colors of the CURRENT_MODEL, only moving parts required for the animation.
            `;
            
            const response = await ai.models.generateContent({
                model,
                contents: systemContext,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    x: { type: Type.INTEGER },
                                    y: { type: Type.INTEGER },
                                    z: { type: Type.INTEGER },
                                    color: { type: Type.STRING }
                                },
                                required: ["x", "y", "z", "color"]
                            }
                        }
                    }
                }
            });

            const text = response.text;
            if (text) {
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                if (cleanText) {
                    const rawFrames = JSON.parse(cleanText);
                    if (Array.isArray(rawFrames)) {
                         const newKeyframes: VoxelKeyframe[] = rawFrames.map((frameData: any, idx: number) => {
                             const vData: VoxelData[] = frameData.map((v: any) => {
                                let colorStr = v.color;
                                if (colorStr.startsWith('#')) colorStr = colorStr.substring(1);
                                const colorInt = parseInt(colorStr, 16);
                                return { x: v.x, y: v.y, z: v.z, color: isNaN(colorInt) ? 0xCCCCCC : colorInt };
                             });
                             return {
                                 id: Math.random().toString(36).substring(7),
                                 name: `Anim F${keyframes.length + idx + 1}`,
                                 data: vData
                             };
                         });
                         
                         setKeyframes(prev => [...prev, ...newKeyframes]);
                         // Auto-play the first new frame if idle
                         if (!isAnimating && newKeyframes.length > 0 && engineRef.current) {
                            engineRef.current.rebuild(newKeyframes[0].data);
                            setCurrentFrameIndex(keyframes.length); // Start at the new block
                         }
                    }
                }
            }

        } else {
            // Create or Morph Logic
            if (promptMode === 'morph' && engineRef.current) {
                const availableColors = engineRef.current.getUniqueColors().join(', ');
                systemContext = `
                    CONTEXT: You are re-assembling an existing pile of lego-like voxels.
                    The current pile consists of these colors: [${availableColors}].
                    TRY TO USE THESE COLORS if they fit the requested shape.
                `;
            }

            let contentsPayload: any = `${systemContext} Task: Generate a 3D voxel art model of: "${prompt}". Return ONLY a JSON array.`;

            if (imageBase64) {
                const mimeType = imageBase64.split(';')[0].split(':')[1];
                const base64Data = imageBase64.split(',')[1];
                contentsPayload = {
                    parts: [
                        { text: `${systemContext} Task: Generate a 3D voxel art model based on the provided image and prompt: "${prompt}". Return ONLY a JSON array.` },
                        { inlineData: { data: base64Data, mimeType } }
                    ]
                };
            }

            const response = await ai.models.generateContent({
                model,
                contents: contentsPayload,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                x: { type: Type.INTEGER },
                                y: { type: Type.INTEGER },
                                z: { type: Type.INTEGER },
                                color: { type: Type.STRING }
                            },
                            required: ["x", "y", "z", "color"]
                        }
                    }
                }
            });

            const text = response.text;
            if (text) {
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                if (cleanText) {
                    const rawData = JSON.parse(cleanText);
                    const voxelData: VoxelData[] = rawData.map((v: any) => {
                        let colorStr = v.color;
                        if (colorStr.startsWith('#')) colorStr = colorStr.substring(1);
                        const colorInt = parseInt(colorStr, 16);
                        return { x: v.x, y: v.y, z: v.z, color: isNaN(colorInt) ? 0xCCCCCC : colorInt };
                    });

                    if (engineRef.current) {
                        if (promptMode === 'create') {
                            setIsAnimating(false);
                            setKeyframes([]); // Clear animation on new create
                            engineRef.current.loadInitialModel(voxelData);
                            setCustomBuilds(prev => [...prev, { name: prompt || 'Image Build', data: voxelData }]);
                            setCurrentBaseModel(prompt || 'Image Build');
                        } else {
                            setIsAnimating(false);
                            engineRef.current.rebuild(voxelData);
                            setCustomRebuilds(prev => [...prev, { name: prompt || 'Image Rebuild', data: voxelData, baseModel: currentBaseModel }]);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("Generation failed", err);
    } finally {
        setIsGenerating(false);
    }
  };

  // --- Chat Logic ---
  const handleChatSend = async (text: string) => {
      if (!process.env.GEMINI_API_KEY && !process.env.API_KEY) {
          setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "API Key not configured." }]);
          return;
      }
      
      const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
      setChatMessages(prev => [...prev, userMsg]);
      setIsChatLoading(true);

      try {
          const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
          if (!apiKey) {
              setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "API Key not configured." }]);
              setIsChatLoading(false);
              return;
          }
          const ai = new GoogleGenAI({ apiKey });
          
          if (!chatSessionRef.current) {
              const modifySceneTool: FunctionDeclaration = {
                  name: "modify_scene",
                  description: "Add, replace, or clear voxels in the scene.",
                  parameters: {
                      type: Type.OBJECT,
                      properties: {
                          action: { 
                              type: Type.STRING, 
                              description: "'add' (adds/updates voxels), 'replace' (clears and sets new voxels), 'clear' (removes all)" 
                          },
                          voxels: {
                              type: Type.ARRAY,
                              description: "List of voxels to add/set. Required for 'add' and 'replace'.",
                              items: {
                                  type: Type.OBJECT,
                                  properties: {
                                      x: { type: Type.INTEGER },
                                      y: { type: Type.INTEGER },
                                      z: { type: Type.INTEGER },
                                      color: { type: Type.STRING, description: "Hex color e.g. '#FF0000'" }
                                  },
                                  required: ['x', 'y', 'z', 'color']
                              }
                          },
                          comment: { type: Type.STRING, description: "Short description of what was done." }
                      },
                      required: ['action']
                  }
              };

              chatSessionRef.current = ai.chats.create({
                  model: 'gemini-3-flash-preview',
                  config: {
                      systemInstruction: "You are a Voxel Architect Assistant. Help the user build models piece by piece. Use the `modify_scene` tool to update the model. Coordinate System: Y is Up. Center is 0,0,0. Keep responses concise.",
                      tools: [{ functionDeclarations: [modifySceneTool] }],
                  }
              });
          }

          const response = await chatSessionRef.current.sendMessage({ message: text });
          
          let toolExecuted = false;

          // Handle Function Calls
          if (response.functionCalls && response.functionCalls.length > 0) {
              const call = response.functionCalls[0];
              if (call.name === 'modify_scene') {
                  toolExecuted = true;
                  const args = call.args as any;
                  
                  // Convert color strings to numbers
                  const voxels: VoxelData[] = (args.voxels || []).map((v: any) => ({
                      x: v.x, y: v.y, z: v.z,
                      color: parseInt(v.color.replace('#', ''), 16) || 0xCCCCCC
                  }));

                  if (engineRef.current) {
                      if (args.action === 'add') {
                          engineRef.current.mergeVoxels(voxels);
                      } else if (args.action === 'replace') {
                          engineRef.current.loadInitialModel(voxels);
                      } else if (args.action === 'clear') {
                          engineRef.current.loadInitialModel([]);
                      }
                  }

                  // Inform model of success
                  const funcResponse = await chatSessionRef.current.sendMessage({
                      message: [{
                          functionResponse: {
                              name: 'modify_scene',
                              id: call.id,
                              response: { result: "success", voxelCount: voxels.length }
                          }
                      }]
                  });
                  
                  // Add tool message to chat
                  setChatMessages(prev => [...prev, { 
                      id: Date.now().toString(), 
                      role: 'model', 
                      text: funcResponse.text || args.comment || "Done!",
                      isToolCall: true 
                  }]);
              }
          }
          
          // Handle Text Response (if any, or if no tool called)
          if (!toolExecuted && response.text) {
              setChatMessages(prev => [...prev, { 
                  id: Date.now().toString(), 
                  role: 'model', 
                  text: response.text 
              }]);
          }

      } catch (err) {
          console.error("Chat Error", err);
          setChatMessages(prev => [...prev, { 
              id: Date.now().toString(), 
              role: 'model', 
              text: "I encountered an error trying to process that." 
          }]);
      } finally {
          setIsChatLoading(false);
      }
  };

  const handleSetVoxelCount = (count: number) => {
      if (engineRef.current) {
          engineRef.current.setTotalVoxelCount(count);
      }
  };

  const relevantRebuilds = customRebuilds.filter(r => r.baseModel === currentBaseModel);

  return (
    <div className="relative w-full h-screen bg-[#f0f2f5] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      <UIOverlay 
        voxelCount={voxelCount}
        appState={appState}
        currentBaseModel={currentBaseModel}
        customBuilds={customBuilds}
        customRebuilds={relevantRebuilds} 
        isAutoRotate={isAutoRotate}
        isInfoVisible={showWelcome}
        isGenerating={isGenerating}
        isWireframe={isWireframe}
        isFogEnabled={isFogEnabled}
        isGreedyEnabled={isGreedyEnabled}
        materialStyle={materialStyle}
        
        // Edit Mode States
        isEditMode={isEditMode}
        activeTool={activeTool}
        activeColor={activeColor}
        symmetryMode={symmetryMode}
        onSetEditMode={setIsEditMode}
        onSetTool={setActiveTool}
        onSetColor={setActiveColor}
        onSetSymmetry={setSymmetryMode}

        // Animation States
        keyframes={keyframes}
        currentFrameIndex={currentFrameIndex}
        isAnimating={isAnimating}
        isLooping={isLooping}
        onCaptureKeyframe={handleCaptureKeyframe}
        onDeleteKeyframe={handleDeleteKeyframe}
        onJumpToKeyframe={handleJumpToKeyframe}
        onTogglePlayback={handleTogglePlayback}
        onToggleLoop={() => setIsLooping(!isLooping)}
        onPromptAnimate={() => openPrompt('animate')}

        onDismantle={handleDismantle}
        onDrop={handleDrop}
        onSubdivide={handleSubdivide}
        onRebuild={handleRebuild}
        onNewScene={handleNewScene}
        onSelectCustomBuild={handleSelectCustomBuild}
        onSelectCustomRebuild={handleSelectCustomRebuild}
        onPromptCreate={() => openPrompt('create')}
        onPromptMorph={() => openPrompt('morph')}
        onExport={handleExport}
        onViewJson={handleShowJson}
        onImportJson={handleImportClick}
        onToggleRotation={handleToggleRotation}
        onToggleWireframe={handleToggleWireframe}
        onToggleBaked={handleToggleBaked}
        onToggleFog={handleToggleFog}
        onToggleGreedy={handleToggleGreedy}
        onChangeMaterialStyle={handleChangeMaterialStyle}
        isBaked={isBaked}
        onToggleInfo={() => setShowWelcome(!showWelcome)}
        
        // Chat
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        onSetVoxelCount={handleSetVoxelCount}
      />

      <ChatSidebar 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          messages={chatMessages} 
          onSendMessage={handleChatSend} 
          isLoading={isChatLoading} 
      />

      <WelcomeScreen visible={showWelcome} />
      <JsonModal isOpen={isJsonModalOpen} onClose={() => setIsJsonModalOpen(false)} data={jsonData} isImport={jsonModalMode === 'import'} onImport={handleJsonImport} />
      <PromptModal isOpen={isPromptModalOpen} mode={promptMode} onClose={() => setIsPromptModalOpen(false)} onSubmit={handlePromptSubmit} />
    </div>
  );
};

export default App;
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Sparkles, X, Loader2, Wand2, Hammer, Clapperboard, ImagePlus } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  mode: 'create' | 'morph' | 'animate';
  onClose: () => void;
  onSubmit: (prompt: string, imageBase64?: string) => Promise<void>;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, mode, onClose, onSubmit }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setError('');
      setIsLoading(false);
      setImageBase64(undefined);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!prompt.trim() && !imageBase64) || isLoading) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      await onSubmit(prompt, imageBase64);
      setPrompt('');
      setImageBase64(undefined);
      onClose();
    } catch (err) {
      console.error(err);
      setError('The magic failed! Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTheme = () => {
      switch (mode) {
          case 'create': return { 
              color: 'sky', bg: 'bg-sky-500', hover: 'hover:bg-sky-600', 
              light: 'bg-sky-100', text: 'text-sky-600', border: 'border-sky-100',
              gradient: 'from-sky-50 to-blue-50', icon: <Wand2 size={24} strokeWidth={2.5} />
          };
          case 'morph': return { 
              color: 'amber', bg: 'bg-amber-500', hover: 'hover:bg-amber-600', 
              light: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-100',
              gradient: 'from-amber-50 to-orange-50', icon: <Hammer size={24} strokeWidth={2.5} />
          };
          case 'animate': return { 
              color: 'violet', bg: 'bg-violet-500', hover: 'hover:bg-violet-600', 
              light: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-100',
              gradient: 'from-violet-50 to-fuchsia-50', icon: <Clapperboard size={24} strokeWidth={2.5} />
          };
      }
  };

  const theme = getTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 font-sans">
      <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col border-4 ${theme.border} animate-in fade-in zoom-in duration-200 scale-95 sm:scale-100 overflow-hidden`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r ${theme.gradient}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${theme.light} ${theme.text}`}>
                {theme.icon}
            </div>
            <div>
                <h2 className="text-xl font-extrabold text-slate-800">
                    {mode === 'create' && 'New Build'}
                    {mode === 'morph' && 'Rebuild Blocks'}
                    {mode === 'animate' && 'Generate Animation'}
                </h2>
                <p className={`text-xs font-bold uppercase tracking-wide opacity-60 ${theme.text}`}>
                    POWERED BY GEMINI 3 FLASH
                </p>
            </div>
          </div>
          <button 
            onClick={!isLoading ? onClose : undefined}
            className="p-2 rounded-xl bg-white/50 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-white">
          <p className="text-slate-600 font-semibold mb-4">
            {mode === 'create' && "Describe your idea or upload an image for the AI to build from."}
            {mode === 'morph' && "How should the AI rebuild the current voxels?"}
            {mode === 'animate' && "Describe the movement for the AI to animate (e.g. 'Flap wings', 'Run forward')"}
          </p>
          
          <form onSubmit={handleSubmit}>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === 'animate' ? "e.g., Make it spin and jump..." : "Describe your idea or upload an image..."}
              disabled={isLoading}
              className={`w-full h-32 resize-none bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-medium text-slate-700 focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400 mb-4 focus:${theme.border} focus:ring-${theme.color}-100`}
              autoFocus
            />

            {mode === 'create' && (
              <div className="mb-4">
                <label className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-xl appearance-none cursor-pointer hover:border-slate-400 focus:outline-none overflow-hidden relative">
                  {imageBase64 ? (
                    <img src={imageBase64} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <span className="flex items-center space-x-2">
                      <ImagePlus className="w-6 h-6 text-slate-400" />
                      <span className="font-medium text-slate-600">
                        Drop an image to build from, or browse
                      </span>
                    </span>
                  )}
                  <input type="file" name="file_upload" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isLoading} />
                </label>
                {imageBase64 && (
                  <button
                    type="button"
                    onClick={() => setImageBase64(undefined)}
                    className="mt-2 text-sm text-rose-500 hover:text-rose-600 font-bold"
                  >
                    Remove Image
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-600 text-sm font-bold flex items-center gap-2">
                <X size={16} /> {error}
              </div>
            )}

            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={(!prompt.trim() && !imageBase64) || isLoading}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm transition-all
                  ${isLoading 
                    ? 'bg-slate-200 text-slate-400 cursor-wait' 
                    : `${theme.bg} ${theme.hover} shadow-lg active:scale-95`}
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {mode === 'animate' ? 'Animating...' : 'Thinking...'}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} fill="currentColor" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

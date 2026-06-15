/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';

interface WelcomeScreenProps {
  visible: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ visible }) => {
  return (
    <div className={`
        absolute top-24 left-0 w-full pointer-events-none flex justify-center z-10 select-none
        transition-all duration-500 ease-out transform font-sans
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}
    `}>
      <div className="text-center flex flex-col items-center gap-3 sm:gap-4 bg-slate-50/85 backdrop-blur-md p-5 sm:p-8 rounded-3xl border border-slate-200 shadow-lg max-w-[90%] sm:max-w-md">
        <div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-800 uppercase tracking-widest mb-1 sm:mb-2">
                Voxel Toy Box
            </h1>
            <div className="text-xs sm:text-sm font-extrabold text-indigo-600 uppercase tracking-[0.3em]">
                Powered by Gemini 
            </div>
        </div>
        
        <div className="space-y-1.5 sm:space-y-3 mt-1 sm:mt-2">
            <p className="text-sm sm:text-lg font-bold text-slate-700">Build amazing voxel models</p>
            <p className="text-sm sm:text-lg font-bold text-slate-700">Break them down and rebuild them</p>
            <p className="text-sm sm:text-lg font-bold text-slate-700">Share your creations with friends</p>
        </div>
      </div>
    </div>
  );
};

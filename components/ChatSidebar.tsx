/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, X, Sparkles, Wrench } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (text: string) => Promise<void>;
    isLoading: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, messages, onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const text = input;
        setInput('');
        await onSendMessage(text);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute top-0 right-0 h-full w-full sm:w-96 bg-white/95 backdrop-blur-xl shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/50">
                <div className="flex items-center gap-2 text-indigo-600">
                    <Sparkles size={20} fill="currentColor" />
                    <h2 className="font-extrabold text-slate-800 tracking-tight">Voxel Architect</h2>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
                {messages.length === 0 && (
                     <div className="text-center mt-10 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                         <Bot size={32} className="mx-auto text-indigo-400 mb-3" />
                         <p className="text-sm font-bold text-indigo-800">Hello! I'm your Architect.</p>
                         <p className="text-xs text-indigo-600 mt-1">
                             Tell me what to build, and I'll add it piece by piece.
                             <br/>
                             Try: <i>"Add a red hat"</i> or <i>"Put a blue sword in the hand"</i>.
                         </p>
                     </div>
                )}
                
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200">
                                <Bot size={16} />
                            </div>
                        )}
                        
                        <div className={`
                            max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm
                            ${msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'}
                        `}>
                            {msg.isToolCall ? (
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-75">
                                    <Wrench size={12} />
                                    Building...
                                </div>
                            ) : (
                                msg.text
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex gap-3 justify-start animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                            <Bot size={16} className="text-indigo-300" />
                        </div>
                        <div className="bg-slate-50 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                            <span className="text-xs font-bold text-slate-400">Architecting...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-100">
                <div className="relative flex items-center">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Describe what to add..."
                        disabled={isLoading}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pl-4 pr-12 text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all disabled:opacity-50"
                    />
                    <button 
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-200"
                    >
                        <Send size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </form>
        </div>
    );
};

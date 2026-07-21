"use client";

import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-[var(--color-surface-1)] z-[100] flex flex-col items-center justify-center overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <div className="relative flex flex-col items-center">
        {/* Animated Logo Container */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-brand-500 rounded-[2.5rem] blur-2xl opacity-20 animate-pulse" />
          <div className="relative w-full h-full rounded-[2.5rem] gradient-brand flex items-center justify-center shadow-2xl shadow-brand-500/40 animate-bounce-slow">
             <div className="w-12 h-12 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center border border-white/30">
                <span className="text-3xl font-black text-white select-none">Z</span>
             </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-black tracking-tight text-gradient animate-fade-in" style={{ fontFamily: "var(--font-display)" }}>
            ZAKUPSY
          </h2>
          <div className="flex gap-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-brand-500/20 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-brand-500/40 animate-pulse delay-150" />
            <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse delay-300" />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .text-gradient {
          background: linear-gradient(135deg, var(--color-brand-400) 0%, var(--color-brand-600) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

"use client";

import React from 'react';

export default function ListsLoading() {
  return (
    <div className="min-h-dvh flex flex-col w-full pb-48 animate-fade-in" style={{ background: "var(--color-surface)" }}>
      {/* Header Skeleton */}
      <header className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-surface-3 animate-pulse" />
          <div className="h-8 w-32 bg-surface-3 rounded-lg animate-pulse" />
        </div>
        <div className="flex items-center gap-2 pl-1">
          <div className="w-6 h-1 rounded-full bg-surface-3 animate-pulse" />
          <div className="h-2 w-48 bg-surface-3 rounded-full animate-pulse opacity-50" />
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="flex-1 px-5">
        <div className="h-4 w-40 bg-surface-3 rounded-full mb-6 animate-pulse opacity-40" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-[var(--radius-card)] bg-surface-2 border border-border animate-pulse flex items-center px-4 gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-3" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 bg-surface-3 rounded-full" />
                <div className="h-2 w-1/4 bg-surface-3 rounded-full opacity-50" />
              </div>
              <div className="w-4 h-4 rounded-full bg-surface-3 opacity-20" />
            </div>
          ))}
        </div>
      </main>

      {/* Floating Action Button Skeleton */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-5">
        <div className="w-full h-14 rounded-2xl bg-surface-3 animate-pulse border border-border/10" />
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

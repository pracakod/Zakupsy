"use client";

import React from 'react';

export default function FriendsLoading() {
  return (
    <div className="min-h-dvh flex flex-col w-full animate-fade-in" style={{ background: "var(--color-surface)" }}>
      {/* Header Skeleton */}
      <header className="px-6 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-surface-3 animate-pulse" />
          <div className="h-8 w-40 bg-surface-3 rounded-lg animate-pulse" />
        </div>
        
        {/* Tab Skeleton */}
        <div className="flex p-1 gap-1 bg-surface-2 rounded-2xl border border-border/30">
          <div className="flex-1 h-10 bg-surface-3 rounded-xl animate-pulse" />
          <div className="flex-1 h-10 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </header>

      {/* Friends List Skeleton */}
      <main className="flex-1 px-6 pt-2">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-[1.2rem] bg-surface-3" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-surface-3 rounded-full" />
                <div className="h-3 w-1/2 bg-surface-3 rounded-full opacity-40" />
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-3 opacity-20" />
            </div>
          ))}
        </div>
      </main>

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

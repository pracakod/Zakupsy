"use client";

import { useEffect, useState } from "react";
import { WifiOff, Download, X, RefreshCw } from "lucide-react";
import { useOnlineStatus, usePWAInstall } from "@/lib/usePWA";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { install, dismiss, showBanner } = usePWAInstall();
  const [justCameBack, setJustCameBack] = useState(false);

  // Show "You're back online!" briefly after reconnecting
  useEffect(() => {
    if (isOnline && justCameBack === false) return;
    if (isOnline) {
      setJustCameBack(true);
      const t = setTimeout(() => setJustCameBack(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  return (
    <>
      {/* ── Offline Toast ── */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center px-4 pt-safe-or-3 pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-500/95 backdrop-blur-xl text-white shadow-2xl shadow-red-900/40 border border-red-400/30 animate-slide-down pointer-events-auto">
            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <WifiOff size={14} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Brak połączenia</p>
              <p className="text-[10px] opacity-80 mt-0.5">Zmiany zostaną zsynchronizowane po powrocie do sieci</p>
            </div>
          </div>
        </div>
      )}

      {/* ── "Back Online" Toast ── */}
      {isOnline && justCameBack && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center px-4 pt-safe-or-3 pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-brand-500/95 backdrop-blur-xl text-white shadow-2xl shadow-brand-900/40 border border-brand-400/30 animate-slide-down pointer-events-auto">
            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <RefreshCw size={14} className="animate-spin" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Połączono!</p>
              <p className="text-[10px] opacity-80 mt-0.5">Synchronizuję Twoje zmiany…</p>
            </div>
          </div>
        </div>
      )}

      {/* ── PWA Install Banner ── */}
      {showBanner && isOnline && (
        <div className="fixed bottom-[6.5rem] left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[9000] pointer-events-none">
          <div className="flex items-center gap-3 p-3 pr-4 rounded-2xl bg-surface-2/95 backdrop-blur-xl border border-brand-500/20 shadow-2xl shadow-black/40 animate-slide-up pointer-events-auto">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-500/30">
              <span className="text-white font-black text-xl">Z</span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-text-primary">Zainstaluj Zakupsy</p>
              <p className="text-[10px] text-text-muted mt-0.5 truncate">
                Działa offline • Szybszy start
              </p>
            </div>

            {/* Actions */}
            <button
              onClick={dismiss}
              className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-text-muted flex-shrink-0"
            >
              <X size={13} />
            </button>
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-brand text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-500/20 active:scale-95 transition-all flex-shrink-0"
            >
              <Download size={12} />
              Dodaj
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-down {
          from { transform: translateY(-120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </>
  );
}

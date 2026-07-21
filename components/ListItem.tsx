"use client";

import { useState } from "react";
import type { Item } from "@/types";
import { Trash2, Check, CircleOff } from "lucide-react";

export default function ListItem({
  item,
  onToggle,
  onDelete,
  onLongPress,
}: {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
  onLongPress?: () => void;
}) {
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      setStartX(e.touches[0].clientX);
      setStartY(e.touches[0].clientY);
    }
    const t = setTimeout(() => {
      onLongPress?.();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 600);
    setTimer(t);
  };

  const handleMove = (e: React.TouchEvent) => {
    if (startX !== null && startY !== null) {
      const diffX = e.touches[0].clientX - startX;
      const diffY = e.touches[0].clientY - startY;

      // Kasuj Long Press, jeśli palec przesunął się o więcej niż 10px w dowolnym kierunku
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        if (timer) {
          clearTimeout(timer);
          setTimer(null);
        }
      }

      // Obsługa swipe w lewo (usuwanie)
      if (diffX < 0) {
        setOffsetX(Math.max(diffX, -120));
      }
    }
  };

  const handleEnd = () => {
    if (timer) clearTimeout(timer);
    if (offsetX < -80) {
      setIsDeleting(true);
      setTimeout(() => {
        onDelete();
        setOffsetX(0);
        setIsDeleting(false);
      }, 300);
    } else {
      setOffsetX(0);
    }
    setStartX(null);
    setStartY(null);
  };

  return (
    <div className="relative overflow-hidden rounded-xl group">
      {/* Background Trash Icon */}
      <div 
        className="absolute inset-0 flex items-center justify-end px-6 bg-red-500 text-white transition-opacity duration-200"
        style={{ opacity: Math.abs(offsetX) / 100 }}
      >
        <Trash2 size={20} className={offsetX < -80 ? "scale-110" : "scale-100"} />
      </div>

      {/* Item Body */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-transform duration-200 select-none active:scale-[0.99] ${isDeleting ? 'translate-x-[-100%]' : ''}`}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleStart}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          transform: !isDeleting ? `translateX(${offsetX}px)` : undefined,
          background: item.status === 'completed' ? "var(--color-surface-2)" : item.status === 'missing' ? "rgba(249, 115, 22, 0.05)" : "var(--color-surface-3)",
          border: `1px solid ${item.status === 'completed' ? "var(--color-border)" : item.status === 'missing' ? "rgba(249, 115, 22, 0.2)" : "var(--color-surface-4)"}`,
          transition: startX === null ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
        }}
      >
        {/* Checkbox / Status Icon */}
        <button
          onClick={onToggle}
          className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{
            borderColor: item.status === 'completed' ? "var(--color-brand-500)" : item.status === 'missing' ? "#f97316" : "var(--color-border)",
            background: item.status === 'completed' ? "var(--color-brand-600)" : "transparent",
          }}
          aria-label={item.status === 'completed' ? "Odznacz" : "Zaznacz"}
        >
          {item.status === 'completed' ? (
            <Check size={10} className="text-white" strokeWidth={4} />
          ) : item.status === 'missing' ? (
            <CircleOff size={10} className="text-orange-500" />
          ) : null}
        </button>

        {/* Name and Icon */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0 transition-all duration-200">
          {item.icon && <span className="text-sm grayscale-0">{item.icon}</span>}
          <span
            className="truncate text-xs font-medium"
            style={{
              color: item.status === 'completed' ? "var(--color-text-muted)" : item.status === 'missing' ? "#f97316" : "var(--color-text-primary)",
              textDecoration: item.status === 'completed' ? "line-through" : "none",
              opacity: item.status === 'missing' ? 0.7 : 1,
            }}
          >
            {item.name}
          </span>
          {item.author?.username && (
            <span className="text-[10px] text-muted opacity-40 italic shrink-0">• {item.author.username}</span>
          )}
        </div>

        {/* Status indicator for missing */}
        {item.status === 'missing' && (
          <span className="text-[9px] font-bold uppercase tracking-tighter text-orange-500/50 mr-1">Brak</span>
        )}

        {/* Delete - smaller, hidden on mobile usually but good to keep */}
        <button
          onClick={onDelete}
          className="flex-shrink-0 p-1 rounded-lg transition-all duration-150 cursor-pointer opacity-0 group-hover:opacity-100 hover:!opacity-100 hidden md:flex"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Usuń produkt"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

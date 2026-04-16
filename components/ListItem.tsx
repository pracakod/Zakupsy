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

  const handleStart = () => {
    const t = setTimeout(() => {
      onLongPress?.();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 600);
    setTimer(t);
  };

  const handleEnd = () => {
    if (timer) clearTimeout(timer);
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 select-none active:scale-[0.99]"
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      style={{
        background: item.status === 'completed' ? "var(--color-surface-2)" : item.status === 'missing' ? "rgba(249, 115, 22, 0.05)" : "var(--color-surface-3)",
        border: `1px solid ${item.status === 'completed' ? "var(--color-border)" : item.status === 'missing' ? "rgba(249, 115, 22, 0.2)" : "var(--color-surface-4)"}`,
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
      </div>

      {/* Status indicator for missing */}
      {item.status === 'missing' && (
        <span className="text-[9px] font-bold uppercase tracking-tighter text-orange-500/50 mr-1">Brak</span>
      )}

      {/* Delete - smaller */}
      <button
        onClick={onDelete}
        className="flex-shrink-0 p-1 rounded-lg transition-all duration-150 cursor-pointer opacity-0 group-hover:opacity-100 hover:!opacity-100"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Usuń produkt"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

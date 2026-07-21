"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import ListIcon from "./ListIcon";

interface ListPickerProps {
  lists: { id: string; name: string; icon?: string }[];
  activeId: string | null;
  onChange: (id: string) => void;
  className?: string;
}

export default function ListPicker({ lists, activeId, onChange, className = "" }: ListPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const activeList = lists.find(l => l.id === activeId);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-surface-2/60 backdrop-blur-md border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3 active:scale-[0.98] transition-all cursor-pointer shadow-lg hover:border-brand-500/30"
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="scale-75 origin-left">
            <ListIcon icon={activeList?.icon} name={activeList?.name || ""} />
          </div>
          <span className="font-bold text-sm text-text-primary truncate">
            {activeList?.name || "Wybierz listę..."}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Glassmorphism Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[200] bg-surface-2/95 backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-2xl animate-pop-in max-h-60 overflow-y-auto custom-scrollbar">
          <div className="py-2">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => {
                  onChange(list.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-brand-500/10 transition-colors group ${activeId === list.id ? 'bg-brand-500/5' : ''}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="scale-75 origin-left opacity-80 group-hover:opacity-100 transition-opacity">
                    <ListIcon icon={list.icon} name={list.name} />
                  </div>
                  <span className={`text-sm font-semibold truncate ${activeId === list.id ? 'text-brand-400' : 'text-text-primary'}`}>
                    {list.name}
                  </span>
                </div>
                {activeId === list.id && (
                  <Check size={14} className="text-brand-500 flex-shrink-0" />
                )}
              </button>
            ))}
            
            {lists.length === 0 && (
              <div className="px-4 py-3 text-xs text-text-muted text-center italic">
                Brak aktywnych list
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

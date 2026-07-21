"use client";

import { ShoppingCart, Users } from "lucide-react";

interface ListIconProps {
  icon?: string | null;
  name: string;
  isShared?: boolean;
  className?: string;
}

export default function ListIcon({ icon, name, isShared, className = "w-10 h-10" }: ListIconProps) {
  const lowerName = name.toLowerCase();
  
  // LIDL: Blue bg, Yellow L
  if (icon === "brand:lidl" || (lowerName.includes("lidl") && !icon)) return (
    <div className={`${className} rounded-xl bg-[#0050aa] flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className="text-[#ffde00] font-black text-lg italic tracking-tighter">L</span>
    </div>
  );
  
  // ZABKA: Green bg, White Z
  if (icon === "brand:zabka" || ((lowerName.includes("żabka") || lowerName.includes("zabka")) && !icon)) return (
    <div className={`${className} rounded-xl bg-[#009141] flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className="text-white font-black text-lg">Ż</span>
    </div>
  );

  // BIEDRONKA: Yellow bg, Beetle
  if (icon === "🐞" || (lowerName.includes("biedronka") && !icon)) return (
    <div className={`${className} rounded-xl bg-[#ffde00] flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className="text-xl">🐞</span>
    </div>
  );
  
  // TRAVEL
  if (lowerName.includes("podróż") || lowerName.includes("podroz") || lowerName.includes("paryż") || lowerName.includes("paryz") || lowerName.includes("lot") || lowerName.includes("wakacje")) return (
    <div className={`${className} rounded-xl bg-sky-400 flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className="text-white text-lg">✈️</span>
    </div>
  );
  
  // ROSSMANN
  if (lowerName.includes("rossmann")) return (
    <div className={`${className} rounded-xl bg-[#e30613] flex items-center justify-center flex-shrink-0 shadow-sm`}>
      <span className="text-white font-black text-lg italic">R</span>
    </div>
  );

  // AUCHAN
  if (lowerName.includes("auchan")) return (
    <div className={`${className} rounded-xl bg-[#e30613] flex items-center justify-center border-b-2 border-green-600 flex-shrink-0 shadow-sm`}>
      <span className="text-white font-black text-lg">A</span>
    </div>
  );

  if (icon && !icon.startsWith("brand:")) return (
    <div className={`${className} rounded-xl bg-surface-3 flex items-center justify-center flex-shrink-0`}>
      <span className="text-xl">{icon}</span>
    </div>
  );
  
  // Default icons
  return (
    <div className={`${className} rounded-xl flex items-center justify-center flex-shrink-0`} style={{ background: "var(--color-surface-3)" }}>
      {isShared ? (
        <Users size={18} className="text-brand-400" />
      ) : (
        <ShoppingCart size={18} className="text-brand-400" />
      )}
    </div>
  );
}

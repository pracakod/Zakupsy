"use client";

import React from "react";

export type AnimalType = "panda" | "fox" | "cat" | "frog" | "bear" | "pig" | "rabbit" | "dog" | "koala" | "tiger" | "chick" | "lion" | null;

interface AnimalAvatarProps {
  type?: AnimalType;
  seed?: string;
  variant?: number; 
  colorIndex?: number;
  size?: number;
  className?: string;
  noBackground?: boolean;
}

export default function AnimalAvatar({ 
  type: forcedType, 
  seed, 
  variant: forcedVariant, 
  colorIndex: forcedColor, 
  size = 48, 
  className = "",
  noBackground = false
}: AnimalAvatarProps) {
  
  const colors = [
    "from-slate-100 to-slate-200",
    "from-emerald-300 to-emerald-400",
    "from-orange-300 to-orange-400",
    "from-blue-300 to-blue-400",
    "from-rose-300 to-rose-400",
    "from-amber-300 to-amber-400",
    "from-teal-300 to-teal-400",
    "from-indigo-300 to-indigo-400",
    "from-brand-300 to-brand-400",
    "from-purple-300 to-purple-400",
    "from-slate-800 to-slate-900",
    "from-brand-600 to-brand-800",
    "from-rose-800 to-rose-950",
    "from-indigo-800 to-indigo-950",
    "from-emerald-800 to-emerald-950",
    "from-amber-700 to-amber-900",
    "from-violet-500 to-purple-700",
    "from-cyan-400 to-blue-600",
    "from-lime-400 to-green-600",
    "from-fuchsia-500 to-pink-700"
  ];
  
  const seedNum = seed ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  
  const animalTypes: AnimalType[] = ["panda", "fox", "cat", "frog", "bear", "pig", "rabbit", "dog", "koala", "tiger", "chick", "lion"];
  const type = forcedType === null ? null : (forcedType || (animalTypes[seedNum % animalTypes.length] as AnimalType));
  const colorIndex = forcedColor !== undefined ? forcedColor : (seedNum % colors.length);
  const variant = forcedVariant !== undefined ? forcedVariant : (seedNum % 12); 
  
  const gradientClass = colors[colorIndex % colors.length];

  const getAnimalColors = () => {
    switch (type) {
      case "fox": return { primary: "#FB923C", accent: "#FDBA74", dark: "#9A3412" };
      case "cat": return { primary: "#94A3B8", accent: "#E2E8F0", dark: "#1E293B" };
      case "frog": return { primary: "#4ADE80", accent: "#BBF7D0", dark: "#166534" };
      case "bear": return { primary: "#A16207", accent: "#CA8A04", dark: "#422006" };
      case "pig": return { primary: "#F472B6", accent: "#FBCFE8", dark: "#9D174D" };
      case "rabbit": return { primary: "#E2E8F0", accent: "#F8FAFC", dark: "#475569" };
      case "dog": return { primary: "#D97706", accent: "#FCD34D", dark: "#78350F" };
      case "koala": return { primary: "#94A3B8", accent: "#CBD5E1", dark: "#334155" };
      case "tiger": return { primary: "#F97316", accent: "#FED7AA", dark: "#431407" };
      case "chick": return { primary: "#FDE047", accent: "#FEF9C3", dark: "#854D0E" };
      case "lion": return { primary: "#FBBF24", accent: "#92400E", dark: "#78350F" };
      default: return { primary: "white", accent: "#F1F5F9", dark: "#0F172A" }; // Panda
    }
  };

  const c = getAnimalColors();

  return (
    <div 
      className={`relative flex items-center justify-center overflow-hidden rounded-3xl ${!noBackground ? `bg-gradient-to-br ${gradientClass}` : ''} ${className} transition-all duration-300 shadow-inner`}
      style={{ width: size, height: size }}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="pattern-dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#pattern-dots)" />
        </svg>
      </div>

      {type && (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="fade-in duration-500 drop-shadow-md" style={{ width: '85%', height: '85%' }}>
          {/* Background elements (like Mane) */}
          {type === "lion" && (
            <path 
              d="M50 5C50 5 10 10 5 50C0 90 50 95 50 95C50 95 100 90 95 50C90 10 50 5 50 5Z" 
              fill={c.accent} 
              stroke={c.dark} 
              strokeWidth="2" 
            />
          )}

          {/* Body Peek (Moved to back) */}
          <path d="M10 92C10 84 35 82 50 82C65 82 90 84 90 92V100H10V92Z" fill={c.dark} opacity="0.6" />

          {/* Ears */}
          {type === "panda" && (
            <g>
              <circle cx="22" cy="22" r="14" fill={c.dark} />
              <circle cx="78" cy="22" r="14" fill={c.dark} />
            </g>
          )}
          {type === "lion" && (
            <g>
              <circle cx="25" cy="25" r="10" fill={c.primary} stroke={c.dark} strokeWidth="2" />
              <circle cx="75" cy="25" r="10" fill={c.primary} stroke={c.dark} strokeWidth="2" />
            </g>
          )}
          {type === "fox" && (
            <g>
              {/* Pointy Fox Ears */}
              <circle cx="25" cy="30" r="15" fill={c.dark} />
              <circle cx="75" cy="30" r="15" fill={c.dark} />
              <path d="M10 35L25 5L40 35Z" fill={c.dark} />
              <path d="M60 35L75 5L90 35Z" fill={c.dark} />
              <path d="M20 32L25 15L30 32Z" fill={c.accent} opacity="0.3" />
              <path d="M70 32L75 15L80 32Z" fill={c.accent} opacity="0.3" />
            </g>
          )}
          {type === "cat" && (
            <g>
              <path d="M15 30L30 10L45 35Z" fill={c.primary} />
              <path d="M55 35L70 10L85 30Z" fill={c.primary} />
            </g>
          )}
          {type === "frog" && (
            <g>
              <circle cx="30" cy="30" r="15" fill={c.primary} />
              <circle cx="70" cy="30" r="15" fill={c.primary} />
            </g>
          )}
          {type === "bear" && (
            <g>
              <circle cx="25" cy="25" r="12" fill={c.dark} />
              <circle cx="75" cy="25" r="12" fill={c.dark} />
            </g>
          )}
          {type === "pig" && (
            <g>
              <rect x="22" y="15" width="14" height="18" rx="7" fill={c.accent} />
              <rect x="64" y="15" width="14" height="18" rx="7" fill={c.accent} />
            </g>
          )}
          {type === "rabbit" && (
            <g>
              <rect x="25" y="0" width="12" height="40" rx="6" fill={c.primary} />
              <rect x="63" y="0" width="12" height="40" rx="6" fill={c.primary} />
              <rect x="28" y="5" width="6" height="30" rx="3" fill="#FDA4AF" opacity="0.4" />
              <rect x="66" y="5" width="6" height="30" rx="3" fill="#FDA4AF" opacity="0.4" />
            </g>
          )}
          {type === "dog" && (
            <g>
              <rect x="10" y="25" width="16" height="35" rx="8" fill={c.dark} />
              <rect x="74" y="25" width="16" height="35" rx="8" fill={c.dark} />
            </g>
          )}
          {type === "koala" && (
            <g>
              <circle cx="20" cy="35" r="18" fill={c.accent} stroke={c.primary} strokeWidth="2" />
              <circle cx="80" cy="35" r="18" fill={c.accent} stroke={c.primary} strokeWidth="2" />
            </g>
          )}
          {type === "tiger" && (
            <g>
              <circle cx="25" cy="25" r="12" fill={c.primary} />
              <circle cx="75" cy="25" r="12" fill={c.primary} />
            </g>
          )}
          {type === "chick" && (
            <g>
              <path d="M20 30C15 25 10 35 20 40" stroke={c.dark} strokeWidth="2" fill="none" />
              <path d="M80 30C85 25 90 35 80 40" stroke={c.dark} strokeWidth="2" fill="none" />
            </g>
          )}

          {/* Face Base */}
          <rect x="12" y="24" width="76" height="66" rx="36" fill={c.primary} />
          
          {/* Inner Light Reveal */}
          <rect x="18" y="30" width="64" height="54" rx="30" fill="white" opacity="0.1" />

          {/* Specific markings */}
          {type === "panda" && (
            <g>
              <ellipse cx="32" cy="50" rx="14" ry="16" fill={c.dark} />
              <ellipse cx="68" cy="50" rx="14" ry="16" fill={c.dark} />
            </g>
          )}
          {type === "fox" && (
            <g>
              {/* Fox White Muzzle/Cheeks */}
              <path d="M12 65C12 65 20 55 50 55C80 55 88 65 88 65V90H12V65Z" fill="white" />
              <path d="M50 55L42 65H58L50 55Z" fill={c.dark} />
            </g>
          )}
          {type === "tiger" && (
            <g fill={c.dark} opacity="0.8">
              <path d="M50 24L46 34L54 34Z" />
              <path d="M12 45L22 48L12 51Z" />
              <path d="M88 45L78 48L88 51Z" />
            </g>
          )}
          {type === "koala" && (
            <rect x="42" y="45" width="16" height="22" rx="8" fill={c.dark} />
          )}

          {/* Eyes */}
          <g>
            {variant === 3 ? ( // Surprised
              <>
                <circle cx="34" cy="50" r="6" fill={type === "panda" ? "white" : c.dark} />
                <circle cx="66" cy="50" r="6" fill={type === "panda" ? "white" : c.dark} />
                <circle cx="34" cy="50" r="2" fill="black" opacity={type === "panda" ? 1 : 0} />
                <circle cx="66" cy="50" r="2" fill="black" opacity={type === "panda" ? 1 : 0} />
              </>
            ) : variant === 4 ? ( // Winking
              <>
                <path d="M28 48C28 48 31 45 34 48C37 51 40 48 40 48" stroke={type === "panda" ? "white" : c.dark} strokeWidth="3" strokeLinecap="round" />
                <circle cx="66" cy="48" r="4" fill={type === "panda" ? "white" : c.dark} />
              </>
            ) : variant === 5 ? ( // Sleepy
              <>
                <path d="M28 50C28 50 31 53 34 50C37 47 40 50 40 50" stroke={type === "panda" ? "white" : c.dark} strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M60 50C60 50 63 53 66 50C69 47 72 50 72 50" stroke={type === "panda" ? "white" : c.dark} strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </>
            ) : variant === 7 ? ( // Angry
              <>
                <circle cx="34" cy="50" r="4" fill={type === "panda" ? "white" : c.dark} />
                <circle cx="66" cy="50" r="4" fill={type === "panda" ? "white" : c.dark} />
                <path d="M25 42L38 48" stroke={type === "panda" ? "white" : c.dark} strokeWidth="3" strokeLinecap="round" />
                <path d="M75 42L62 48" stroke={type === "panda" ? "white" : c.dark} strokeWidth="3" strokeLinecap="round" />
              </>
            ) : ( // Normal
              <>
                <circle cx="34" cy="48" r="4" fill={type === "panda" ? "white" : c.dark} />
                <circle cx="66" cy="48" r="4" fill={type === "panda" ? "white" : c.dark} />
                <circle cx="35" cy="47" r="1" fill="white" opacity="0.6" />
                <circle cx="67" cy="47" r="1" fill="white" opacity="0.6" />
              </>
            )}
          </g>

          {/* Snout / Nose */}
          <g>
            {type === "pig" ? (
              <rect x="40" y="60" width="20" height="12" rx="6" fill={c.accent} stroke={c.dark} strokeWidth="1" />
            ) : type === "chick" ? (
              <path d="M45 60L55 60L50 70Z" fill="#F97316" />
            ) : type === "koala" ? (
              null // Already added above
            ) : (
              <path d="M44 64C44 61 46.5 59 50 59C53.5 59 56 61 56 64C56 67 53.5 69 50 69C46.5 69 44 67 44 64Z" fill={c.dark} />
            )}
          </g>

          {/* Mouth */}
          {variant === 1 ? ( // Smile
            <path d="M40 75C40 75 45 82 50 82C55 82 60 75 60 75" stroke={c.dark} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          ) : variant === 3 ? ( // Shocked
            <circle cx="50" cy="78" r="5" fill={c.dark} />
          ) : variant === 6 ? ( // Leaf
            <>
              <path d="M46 76C46 76 48 78 50 78C52 78 54 76 54 76" stroke={c.dark} strokeWidth="1.5" strokeLinecap="round" />
              <path d="M54 75L68 70C68 70 72 78 62 78" fill="#22C55E" stroke="#166534" strokeWidth="0.5" />
            </>
          ) : variant === 7 ? ( // Frown
            <path d="M44 80C44 80 47 76 50 76C53 76 56 80 56 80" stroke={c.dark} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          ) : (
            <path d="M46 76C46 76 48 78 50 78C52 78 54 76 54 76" stroke={c.dark} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          )}

          {/* Accessories by Variant */}
          {variant === 2 && ( // Cool Glasses
            <g>
              <rect x="18" y="44" width="28" height="16" rx="4" fill={c.dark} opacity="0.9" />
              <rect x="54" y="44" width="28" height="16" rx="4" fill={c.dark} opacity="0.9" />
              <line x1="46" y1="52" x2="54" y2="52" stroke={c.dark} strokeWidth="3" />
              <path d="M22 48L32 48" stroke="white" strokeWidth="1" opacity="0.3" />
              <path d="M58 48L68 48" stroke="white" strokeWidth="1" opacity="0.3" />
            </g>
          )}

          {variant === 8 && ( // King Crown
            <g transform="translate(30, 2) scale(0.4)">
              <path d="M0 40L15 10L30 35L50 0L70 35L85 10L100 40V80H0V40Z" fill="#FACC15" stroke="#854D0E" strokeWidth="4" />
              <circle cx="50" cy="20" r="8" fill="#EF4444" stroke="#854D0E" strokeWidth="2" />
              <circle cx="15" cy="25" r="5" fill="#3B82F6" stroke="#854D0E" strokeWidth="2" />
              <circle cx="85" cy="25" r="5" fill="#3B82F6" stroke="#854D0E" strokeWidth="2" />
            </g>
          )}

          {variant === 9 && ( // Improved Chef Hat
            <g transform="translate(26, 8) scale(0.48)">
              {/* The "puff" part */}
              <path 
                d="M15 40C15 20 30 15 50 15C70 15 85 20 85 40C85 45 75 45 75 50H25C25 45 15 45 15 40Z" 
                fill="white" 
                stroke={c.dark} 
                strokeWidth="4" 
              />
              <circle cx="35" cy="25" r="15" fill="white" />
              <circle cx="50" cy="18" r="18" fill="white" />
              <circle cx="65" cy="25" r="15" fill="white" />
              
              {/* The base band */}
              <rect x="25" y="50" width="50" height="15" rx="2" fill="white" stroke={c.dark} strokeWidth="4" />
              
              {/* Detail lines on the band */}
              <line x1="35" y1="50" x2="35" y2="65" stroke="#E2E8F0" strokeWidth="2" />
              <line x1="50" y1="50" x2="50" y2="65" stroke="#E2E8F0" strokeWidth="2" />
              <line x1="65" y1="50" x2="65" y2="65" stroke="#E2E8F0" strokeWidth="2" />
            </g>
          )}

          {variant === 10 && ( // Party Hat
            <g transform="translate(40, -10) scale(0.6)">
              <path d="M30 80L0 80L15 0L30 80Z" fill="#F472B6" stroke="#9D174D" strokeWidth="4" />
              <circle cx="5" cy="70" r="3" fill="yellow" />
              <circle cx="25" cy="50" r="3" fill="white" />
              <circle cx="10" cy="30" r="3" fill="cyan" />
              <circle cx="15" cy="-5" r="8" fill="#F472B6" />
            </g>
          )}

          {variant === 11 && ( // Nerd / Scientist
            <g>
              {/* Glasses */}
              <circle cx="34" cy="48" r="10" stroke={c.dark} strokeWidth="2" />
              <circle cx="66" cy="48" r="10" stroke={c.dark} strokeWidth="2" />
              <line x1="44" y1="48" x2="56" y2="48" stroke={c.dark} strokeWidth="2" />
              {/* Bowtie */}
              <g transform="translate(35, 82) scale(0.3)">
                <path d="M0 0L40 25L0 50V0Z" fill="#EF4444" />
                <path d="M100 0L60 25L100 50V0Z" fill="#EF4444" />
                <rect x="40" y="15" width="20" height="20" rx="5" fill="#991B1B" />
              </g>
            </g>
          )}

          {/* Whiskers for cat */}
          {type === "cat" && (
            <g stroke={c.dark} strokeWidth="1" opacity="0.3">
              <line x1="10" y1="60" x2="30" y2="62" />
              <line x1="10" y1="65" x2="30" y2="65" />
              <line x1="90" y1="60" x2="70" y2="62" />
              <line x1="90" y1="65" x2="70" y2="65" />
            </g>
          )}

          {/* Blush */}
          <circle cx="24" cy="66" r="6" fill="#FDA4AF" opacity="0.3" />
          <circle cx="76" cy="66" r="6" fill="#FDA4AF" opacity="0.3" />
        </svg>
      )}
    </div>
  );
}

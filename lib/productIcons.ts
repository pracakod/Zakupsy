/**
 * Comprehensive mapping of product keywords to icons/emojis.
 * Supports Polish keywords.
 */
export const PRODUCT_ICON_MAP: Record<string, string> = {
  // Owoce (Fruits)
  "jabłko": "🍎",
  "jabłka": "🍎",
  "banan": "🍌",
  "banany": "🍌",
  "winogrona": "🍇",
  "truskawki": "🍓",
  "borówki": "🫐",
  "cytryna": "🍋",
  "pomarańcza": "🍊",
  "arbuz": "🍉",
  "ananas": "🍍",
  "mango": "🥭",
  "brzoskwinia": "🍑",
  "wiśnie": "🍒",
  "gruszka": "🍐",
  "kiwi": "🥝",
  "śliwki": "🫐",

  // Warzywa (Vegetables)
  "ziemniaki": "🥔",
  "pomidor": "🍅",
  "pomidory": "🍅",
  "ogórek": "🥒",
  "ogórki": "🥒",
  "marchew": "🥕",
  "marchewka": "🥕",
  "cebula": "🧅",
  "czosnek": "🧄",
  "brokuł": "🥦",
  "kalafior": "🥦",
  "sałata": "🥬",
  "szpinak": "🍃",
  "kukurydza": "🌽",
  "bakłażan": "🍆",
  "papryka": "🫑",
  "cukinia": "🥒",
  "batat": "🍠",
  "dynia": "🎃",
  "grzyby": "🍄",
  "pieczarki": "🍄",
  "awokado": "🥑",

  // Nabiał i Jaja (Dairy & Eggs)
  "mleko": "🥛",
  "jajka": "🥚",
  "jaja": "🥚",
  "ser": "🧀",
  "twaróg": "🧀",
  "jogurt": "🍦",
  "masło": "🧈",
  "śmietana": "🥛",
  "kefir": "🥛",
  "maślanka": "🥛",

  // Mięso i Ryby (Meat & Fish)
  "mięso": "🥩",
  "kurczak": "🍗",
  "indyk": "🍗",
  "wołowina": "🥩",
  "wieprzowina": "🥩",
  "szynka": "🍖",
  "parówki": "🌭",
  "ryba": "🐟",
  "łosoś": "🍣",
  "dorsz": "🐟",
  "krewetki": "🍤",
  "tuńczyk": "🐟",

  // Pieczywo (Bakery)
  "chleb": "🍞",
  "bułki": "🥖",
  "bułka": "🥖",
  "bagietka": "🥖",
  "rogalik": "🥐",
  "ciastka": "🍪",
  "pączek": "🍩",
  "ciasto": "🍰",
  "tortilla": "🫓",

  // Spiżarnia (Pantry)
  "makaron": "🍝",
  "ryż": "🍚",
  "kasza": "🥣",
  "mąka": "🥡",
  "cukier": "🧂",
  "sól": "🧂",
  "olej": "🧴",
  "oliwa": "🫒",
  "ocet": "🧴",
  "miód": "🍯",
  " dżem": "🍯",
  "płatki": "🥣",
  "kawa": "☕",
  "herbata": "🍵",
  "kakao": "☕",
  "orzechy": "🥜",
  "chipsy": "🍟",
  "czekolada": "🍫",

  // Napoje (Drinks)
  "woda": "💧",
  "sok": "🧃",
  "cola": "🥤",
  "pepsi": "🥤",
  "piwo": "🍺",
  "wino": "🍷",
  "szampan": "🍾",
  "wódka": "🍸",
  "whisky": "🥃",
  "energetyk": "⚡",

  // Higiena i Dom (Home & Hygiene)
  "papier": "🧻",
  "mydło": "🧼",
  "szampon": "🧴",
  "pasta": "🪥",
  "proszek": "🧺",
  "płyn": "🧴",
  "worki": "🗑️",
  "baterie": "🔋",
  "żarówka": "💡",
  "karma": "🐾",
  "pieluchy": "👶",

  // Mrożonki (Frozen)
  "lody": "🍦",
  "mrożonka": "🧊",
  "frytki": "🍟",
  "pizza": "🍕"
};

export function getProductIcon(name: string): string | undefined {
  const normalized = name.toLowerCase().trim();
  
  // 1. Exact match
  if (PRODUCT_ICON_MAP[normalized]) return PRODUCT_ICON_MAP[normalized];
  
  // 2. Keyword check
  for (const [key, icon] of Object.entries(PRODUCT_ICON_MAP)) {
    if (normalized.includes(key)) return icon;
  }
  
  return undefined;
}

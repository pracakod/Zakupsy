"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "emerald" | "ocean" | "sunset" | "purple";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  city: string;
  setCity: (city: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("emerald");
  const [isDarkMode, setIsDarkModeState] = useState(true);
  const [city, setCityState] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") as Theme;
    const savedMode = localStorage.getItem("app-mode");
    const savedCity = localStorage.getItem("app-city");
    
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
    
    if (savedMode === "light") {
      setIsDarkModeState(false);
      document.documentElement.setAttribute("data-mode", "light");
    } else {
      document.documentElement.setAttribute("data-mode", "dark");
    }

    if (savedCity) {
      setCityState(savedCity);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const setIsDarkMode = (isDark: boolean) => {
    setIsDarkModeState(isDark);
    localStorage.setItem("app-mode", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-mode", isDark ? "dark" : "light");
  };

  const setCity = (newCity: string) => {
    setCityState(newCity);
    localStorage.setItem("app-city", newCity);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDarkMode, setIsDarkMode, city, setCity }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

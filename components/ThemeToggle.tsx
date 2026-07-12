"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    if (!mounted) return;
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const activeTheme = mounted ? theme : "system";
  const label =
    activeTheme === "light" ? "Light mode" : activeTheme === "dark" ? "Dark mode" : "System theme";

  return (
    <button
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all duration-150 cursor-pointer"
    >
      {activeTheme === "light" && <Sun className="w-4 h-4" />}
      {activeTheme === "dark" && <Moon className="w-4 h-4" />}
      {activeTheme === "system" && <Monitor className="w-4 h-4" />}
    </button>
  );
}

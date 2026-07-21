"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Nieprawidłowy e-mail lub hasło.");
      } else {
        router.push("/lists");
        router.refresh();
      }
    } else {
      if (!acceptedTerms) {
        setError("Musisz zaakceptować regulamin i politykę prywatności aby założyć konto.");
        setLoading(false);
        return;
      }
      
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message === "User already registered"
          ? "Ten e-mail jest już zarejestrowany."
          : "Błąd rejestracji. Spróbuj ponownie.");
      } else {
        setMessage("Sprawdź skrzynkę mailową i potwierdź konto.");
      }
    }
    setLoading(false);
  }

  return (
    <div
      className="rounded-[var(--radius-card)] p-7 glass shadow-2xl"
      style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
    >
      {/* Mode tabs */}
      <div
        className="flex rounded-xl p-1 mb-7"
        style={{ background: "var(--color-surface-3)" }}
      >
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(null); setMessage(null); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
            style={{
              background: mode === m ? "var(--color-brand-600)" : "transparent",
              color: mode === m ? "white" : "var(--color-text-secondary)",
              fontFamily: "var(--font-display)",
            }}
          >
            {m === "login" ? "Logowanie" : "Rejestracja"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="relative">
          <Mail
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            type="email"
            placeholder="Adres e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-green-500/40"
            style={{
              background: "var(--color-surface-3)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-green-500/40"
            style={{
              background: "var(--color-surface-3)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Terms Checkbox - Only for registration */}
        {mode === "register" && (
          <div className="flex items-start gap-3 mt-4">
            <div className="flex items-center h-5 mt-0.5">
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 rounded border border-border bg-surface-3 checked:bg-brand-500 checked:border-brand-500 transition-colors cursor-pointer accent-brand-500"
              />
            </div>
            <label htmlFor="terms" className="text-[11px] text-text-muted leading-relaxed">
              Akceptuję <a href="/regulamin" className="text-brand-500 hover:text-brand-400 font-bold underline cursor-pointer" target="_blank" rel="noopener noreferrer">Regulamin</a> oraz <a href="/polityka" className="text-brand-500 hover:text-brand-400 font-bold underline cursor-pointer" target="_blank" rel="noopener noreferrer">Politykę Prywatności</a>. Rozumiem, że moje dane będą przetwarzane w celu świadczenia usług w oparciu o bezpieczną chmurę Supabase.
            </label>
          </div>
        )}

        {/* Error / Message */}
        {error && (
          <p className="text-sm text-red-400 animate-fade-in px-1">{error}</p>
        )}
        {message && (
          <p className="text-sm text-green-400 animate-fade-in px-1">{message}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm text-white gradient-brand transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 cursor-pointer mt-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              {mode === "login" ? "Logowanie..." : "Rejestracja..."}
            </span>
          ) : mode === "login" ? (
            "Zaloguj się"
          ) : (
            "Zarejestruj się"
          )}
        </button>
      </form>
    </div>
  );
}

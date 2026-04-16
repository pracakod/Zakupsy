import AuthForm from "@/components/AuthForm";

export default function AuthPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,197,94,0.12) 0%, transparent 70%)",
        }}
      />
      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand mb-5 shadow-lg shadow-green-500/25">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 10h16M8 16h10M8 22h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="24" cy="22" r="5" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2"/>
              <path d="M22 22l1.5 1.5 2.5-2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1
            className="text-3xl font-bold text-gradient mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Zakupsy
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Twoje listy zakupów w jednym miejscu
          </p>
        </div>

        <AuthForm />
      </div>
    </main>
  );
}

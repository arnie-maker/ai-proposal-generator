"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Generate", icon: SparklesIcon },
  { href: "/proposals", label: "History", icon: ClockIcon },
  { href: "/game", label: "Dino Crush", icon: DinoIcon },
];

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function DinoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20v-3a4 4 0 0 1-4-4V9a5 5 0 0 1 5-5c3 0 5 2 6 4h2a2 2 0 0 1 2 2 3 3 0 0 1-3 3v3" />
      <path d="M13 20v-2" />
      <circle cx="12" cy="9" r="0.5" fill="currentColor" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navContent = (
    <>
      <Link href="/" className="flex items-center gap-3 px-4 mb-10" onClick={() => setIsOpen(false)}>
        <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center text-sm font-bold">
          P
        </div>
        <h1 className="text-lg font-semibold gradient-text">Proposal AI</h1>
      </Link>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? "bg-white/5 text-white border-l-2 border-accent-blue"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.02]"
                }`}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4">
        <div className="glass rounded-xl p-4 text-xs text-text-secondary">
          <p className="gradient-text font-medium text-sm mb-1">Proposal AI</p>
          <p>AI-powered proposal generator</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass-sidebar px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg btn-gradient flex items-center justify-center text-xs font-bold">
            P
          </div>
          <span className="text-sm font-semibold gradient-text">Proposal AI</span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-text-secondary hover:text-text-primary p-1 cursor-pointer"
        >
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-60 glass-sidebar flex flex-col py-8 px-4 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex glass-sidebar w-60 min-h-screen flex-col py-8 px-4 shrink-0">
        {navContent}
      </aside>
    </>
  );
}

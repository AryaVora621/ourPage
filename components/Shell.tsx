"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "./Store";
import { NAMES, PEOPLE } from "@/lib/types";

const icons = {
  heart: "M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z",
  cal: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
  note: "M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8 13h8M8 17h6",
  sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const NAV = [
  { href: "/", label: "ourPage", icon: icons.heart },
  { href: "/arya", label: "Arya", icon: icons.cal },
  { href: "/teju", label: "Teju", icon: icons.cal },
  { href: "/notes", label: "Notes", icon: icons.note },
  { href: "/miss-you", label: "Miss You", icon: icons.heart },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { me, setMe, backend, signOut } = useStore();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem("ourpage:theme");
      const isDark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(isDark);
      document.documentElement.dataset.theme = isDark ? "dark" : "light";
    } catch {}
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("ourpage:theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <div className="min-h-screen">
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-card/95 backdrop-blur md:inset-y-0 md:right-auto md:w-20 md:flex-col md:border-r md:border-t-0 lg:w-60"
      >
        <div className="sky hidden h-28 items-end p-4 md:flex lg:h-32">
          <span className="font-display text-xl text-white drop-shadow lg:text-3xl">
            <span className="lg:hidden">oP</span>
            <span className="hidden lg:inline">ourPage 🌅</span>
          </span>
        </div>
        <div className="wave hidden md:block" />
        <ul className="flex flex-1 justify-around md:flex-none md:flex-col md:gap-1 md:p-2 lg:p-3">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <li key={n.href} className="flex-1 md:flex-none">
                <Link
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  title={n.label}
                  aria-label={n.label}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition md:min-h-[48px] md:flex-row md:justify-center md:gap-3 md:rounded-2xl md:text-sm lg:justify-start lg:px-4 ${
                    active ? "text-sun md:bg-sun/15" : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon d={n.icon} />
                  <span className="md:hidden lg:inline">{n.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden flex-1 md:block" />
        <div className="hidden flex-col gap-2 p-2 md:flex lg:p-3">
          {(
            <div className="flex gap-1 rounded-full border border-line p-1" role="group" aria-label="I am">
              {PEOPLE.map((p) => (
                <button key={p} onClick={() => setMe(p)} title={`I'm ${NAMES[p]}`}
                  className={`flex-1 rounded-full px-2 py-1 text-xs font-semibold ${me === p ? "bg-sun text-white" : "text-muted"}`}>
                  {NAMES[p][0]}<span className="hidden lg:inline">{NAMES[p].slice(1)}</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={toggleTheme} className="btn btn-ghost flex items-center justify-center gap-2" aria-label="Toggle theme">
            <Icon d={dark ? icons.sun : icons.moon} /><span className="hidden lg:inline">{dark ? "Day" : "Night"}</span>
          </button>
          {signOut && <button onClick={signOut} className="btn btn-ghost flex items-center justify-center gap-2" aria-label="Lock"><span aria-hidden>🔒</span><span className="hidden lg:inline">Lock</span></button>}
        </div>
      </nav>

      <main className="pb-24 md:pb-0 md:pl-20 lg:pl-60">
        {backend.mode === "local" && (
          <div className="bg-sun/15 px-4 py-1.5 text-center text-xs text-muted">
            Demo mode — saved on this device only. Connect Supabase to share between you two.
          </div>
        )}
        <div className="mx-auto max-w-6xl p-3 sm:p-5 lg:p-8">{children}</div>
        <div className="fixed right-3 top-3 z-20 flex gap-2 md:hidden">
          {signOut && <button onClick={signOut} className="grid h-10 w-10 place-items-center rounded-full bg-card/90 shadow" aria-label="Lock">🔒</button>}
          <button onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-full bg-card/90 text-sun shadow" aria-label="Toggle theme">
            <Icon d={dark ? icons.sun : icons.moon} />
          </button>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useStore } from "./Store";
import DayPanel from "./DayPanel";
import { MONTHS, WEEKDAYS, fmtTime, monthGrid, ymd } from "@/lib/dates";
import type { CalEvent, Owner } from "@/lib/types";
import { NAMES } from "@/lib/types";

export const ownerBg: Record<Owner, string> = { arya: "bg-arya", teju: "bg-teju", both: "bg-both" };

type Scope = "both" | "arya" | "teju";

export default function CalendarView({ scope }: { scope: Scope }) {
  const { data } = useStore();
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of data.events) {
      if (scope !== "both" && e.owner !== scope && e.owner !== "both") continue;
      (map.get(e.date) ?? map.set(e.date, []).get(e.date)!).push(e);
    }
    for (const list of map.values()) list.sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
    return map;
  }, [data.events, scope]);

  const cells = monthGrid(cursor.y, cursor.m);
  const todayKey = ymd(today);
  const step = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const title = scope === "both" ? "ourPage" : `${NAMES[scope]}'s calendar`;

  return (
    <section aria-label={title}>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted">{MONTHS[cursor.m]} {cursor.y}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost" onClick={() => step(-1)} aria-label="Previous month">‹</button>
          <button className="btn btn-ghost" onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}>Today</button>
          <button className="btn btn-ghost" onClick={() => step(1)} aria-label="Next month">›</button>
        </div>
      </header>

      {scope === "both" && (
        <ul className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
          {(["arya", "teju", "both"] as const).map((o) => (
            <li key={o} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${ownerBg[o]}`} />{o === "both" ? "Both of us" : NAMES[o]}
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
        <div className="sky grid grid-cols-7 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white sm:text-xs">
          {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const key = ymd(d);
            const evs = byDay.get(key) ?? [];
            const inMonth = d.getMonth() === cursor.m;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                aria-label={`${d.toDateString()}, ${evs.length} events`}
                className={`flex min-h-[64px] flex-col items-stretch border-line p-1 text-left transition hover:bg-sun/10 sm:min-h-[96px] sm:p-1.5 lg:min-h-[120px] ${
                  i % 7 !== 6 ? "border-r" : ""
                } ${i < 35 ? "border-b" : ""} ${inMonth ? "" : "opacity-40"}`}
              >
                <span className={`mb-0.5 grid h-6 w-6 place-items-center self-start rounded-full text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm ${isToday ? "bg-sun text-white" : ""}`}>
                  {d.getDate()}
                </span>
                {/* phone: dots */}
                <span className="flex flex-wrap gap-0.5 sm:hidden">
                  {evs.slice(0, 4).map((e) => <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${ownerBg[e.owner]}`} />)}
                </span>
                {/* tablet/desktop: chips */}
                <span className="hidden flex-col gap-0.5 sm:flex">
                  {evs.slice(0, 3).map((e) => (
                    <span key={e.id} className={`truncate rounded px-1 py-0.5 text-[11px] font-medium text-white lg:text-xs ${ownerBg[e.owner]}`}>
                      {!e.allDay && e.startTime ? `${fmtTime(e.startTime)} ` : ""}{e.title}
                    </span>
                  ))}
                  {evs.length > 3 && <span className="text-[11px] text-muted">+{evs.length - 3} more</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <DayPanel date={selected} events={byDay.get(selected) ?? []} defaultOwner={scope} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

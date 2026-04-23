"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ArchiveDayItem } from "@/lib/trivia";

type Props = {
  archiveDays: ArchiveDayItem[];
  basePath: string;
  copy: {
    archiveTitle: string;
    archiveDescription: string;
    archiveCompleted: string;
    archiveIncompleteOnly: string;
    archiveEmpty: string;
  };
};

function getCompletedDaysKey() {
  return "daily-trivia:completed-days";
}

function getCompletedDaysChangedEventName() {
  return "daily-trivia:completed-days-changed";
}

function readCompletedDays() {
  try {
    const raw = window.localStorage.getItem(getCompletedDaysKey());
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function trackGaEvent(eventName: string, params: Record<string, string | number | boolean>) {
  const gtag = (window as Window & { gtag?: (...args: any[]) => void }).gtag;
  if (typeof window === "undefined" || typeof gtag !== "function") {
    if (process.env.NODE_ENV !== "production") {
      console.log("[ga]", eventName, params);
    }
    return;
  }

  gtag("event", eventName, params);
}

export function DailyQuizArchive({ archiveDays, basePath, copy }: Props) {
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const normalizedBasePath = basePath === "/" ? "" : basePath.replace(/\/+$/, "");

  useEffect(() => {
    function syncCompletedDays() {
      setCompletedDays(readCompletedDays());
    }

    Promise.resolve().then(syncCompletedDays);
    window.addEventListener(getCompletedDaysChangedEventName(), syncCompletedDays);
    return () => window.removeEventListener(getCompletedDaysChangedEventName(), syncCompletedDays);
  }, []);

  const visibleArchiveDays = useMemo(
    () => archiveDays.filter((item) => (showIncompleteOnly ? !completedDays.includes(item.date) : true)),
    [archiveDays, completedDays, showIncompleteOnly],
  );

  function handleArchiveClick(date: string, dayNumber: number) {
    trackGaEvent("archive_card_clicked", {
      date,
      day_number: dayNumber,
      completed: completedDays.includes(date),
    });
  }

  return (
    <section className="relative overflow-hidden rounded-4xl border border-white/70 bg-[linear-gradient(135deg,#fff8ec_0%,#f5fbff_50%,#fffaf6_100%)] p-5 shadow-[0_30px_120px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_45%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.18),transparent_35%)] lg:block" />
      <div className="relative mb-4 space-y-3 rounded-[1.4rem] border border-white/70 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{copy.archiveTitle}</h2>
          <button
            type="button"
            onClick={() => setShowIncompleteOnly((value) => !value)}
            aria-pressed={showIncompleteOnly}
            className={`inline-flex items-center gap-3 self-start whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
              showIncompleteOnly
                ? "border-slate-900 bg-slate-950 text-white"
                : "border-slate-300 bg-white/85 text-slate-700 hover:border-slate-400 hover:bg-white"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                showIncompleteOnly
                  ? "border-white/70 bg-white/15 text-white"
                  : "border-slate-300 bg-white text-transparent"
              }`}
            >
              ✓
            </span>
            <span>{copy.archiveIncompleteOnly}</span>
          </button>
        </div>
        <p className="text-sm leading-7 text-slate-600 sm:text-base">{copy.archiveDescription}</p>
      </div>

      <div className="relative grid gap-3">
        {visibleArchiveDays.length ? (
          visibleArchiveDays.map((item) => {
            const href = `${normalizedBasePath}/archive/${item.date}`;
            const completed = completedDays.includes(item.date);
            return (
              <Link
                key={item.date}
                id={`archive-${item.date}`}
                href={href}
                scroll
                onClick={() => handleArchiveClick(item.date, item.dayNumber)}
                className="group scroll-mt-24 rounded-[1.75rem] border border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.14))] p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-white/70 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.2))] sm:p-5 sm:scroll-mt-28"
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="text-sm font-medium tracking-tight text-slate-500/90 sm:text-base">
                      Daily Trivia - Day {item.dayNumber}
                      <span className="ml-2 text-xs font-medium tracking-[0.08em] text-slate-400 sm:text-sm">
                        {item.date}
                      </span>
                    </p>
                    {completed ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                          {copy.archiveCompleted}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-base leading-7 font-medium tracking-tight text-slate-900 transition-colors group-hover:text-slate-950 sm:text-lg sm:leading-8">
                    {item.firstQuestion}
                  </p>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-3xl border border-white/70 bg-white/40 p-5 text-sm leading-7 text-slate-600 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:text-base">
            {copy.archiveEmpty}
          </div>
        )}
      </div>
    </section>
  );
}

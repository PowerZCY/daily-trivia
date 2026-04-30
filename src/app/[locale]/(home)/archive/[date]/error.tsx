"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { RotateCw } from "lucide-react";
import { getAsNeededLocalizedUrl } from "@windrun-huaiin/lib/utils";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ArchiveQuizError({ reset }: ErrorPageProps) {
  const params = useParams();
  const locale = getParamValue(params.locale) ?? "en";
  const date = getParamValue(params.date) ?? "";
  const homeHref = getAsNeededLocalizedUrl(locale, "/");
  const homeArchiveHref = `${homeHref === "/" ? "/" : homeHref}#archive-${date}`;

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.08)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Loading issue
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          We could not load this trivia set.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
          This archive page exists, but the questions are temporarily unavailable. Please try again, or refresh
          the page in a moment.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <RotateCw className="h-4 w-4" />
            <span>Try again</span>
          </button>
          <Link
            href={homeArchiveHref}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Back to archive
          </Link>
        </div>
      </section>
    </main>
  );
}

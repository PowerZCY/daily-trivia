import Link from "next/link";
import { ArrowUpRight, CalendarDays, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAsNeededLocalizedUrl } from "@windrun-huaiin/lib";
import { DailyQuizClient } from "@/components/daily-quiz-client";
import { getArchiveDays, getTodayDailyQuiz } from "@/lib/trivia";

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "trivia" });
  const [quiz, archiveDays] = await Promise.all([getTodayDailyQuiz(), getArchiveDays()]);
  const basePath = getAsNeededLocalizedUrl(locale, "");

  return (
    <section className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:mt-10 sm:px-6 lg:gap-10 lg:px-8">
      <div className="relative overflow-hidden rounded-4xl border border-white/70 bg-[linear-gradient(135deg,#fff8ec_0%,#f5fbff_50%,#fffaf6_100%)] px-5 py-6 shadow-[0_30px_120px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_45%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.18),transparent_35%)] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t("eyebrow")}</span>
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {t("title")}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                {t("description")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="#today-quiz"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <span>{t("primaryCta")}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4" />
                <span>{t("subtleNote")}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {t("previewEyebrow")}
                </div>
                {quiz ? (
                  <>
                    <div className="text-2xl font-semibold text-slate-950">Day {quiz.dayNumber}</div>
                    <div className="text-sm text-slate-500">{quiz.date}</div>
                  </>
                ) : (
                  <div className="text-lg font-semibold text-slate-950">{t("emptyTitle")}</div>
                )}
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t("previewQuestionLabel")}
                </div>
                <p className="text-sm leading-7 text-slate-700 sm:text-base">
                  {quiz?.questions[0]?.question ?? t("emptyDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {quiz ? (
        <div id="today-quiz">
          <DailyQuizClient
            quiz={quiz}
            archiveDays={archiveDays}
            basePath={basePath}
            copy={{
              progressLabel: t("quiz.progressLabel"),
              questionLabel: t("quiz.questionLabel"),
              correctLabel: t("quiz.correctLabel"),
              categoryLabel: t("quiz.categoryLabel"),
              explanationLabel: t("quiz.explanationLabel"),
              correctState: t("quiz.correctState"),
              incorrectState: t("quiz.incorrectState"),
              nextQuestion: t("quiz.nextQuestion"),
              viewReport: t("quiz.viewReport"),
              reportEyebrow: t("report.eyebrow"),
              reportTitlePerfect: t("report.titlePerfect"),
              reportTitleStrong: t("report.titleStrong"),
              reportTitleNice: t("report.titleNice"),
              reportCopyPerfect: t("report.copyPerfect", { score: "{score}" }),
              reportCopyStrong: t("report.copyStrong", { score: "{score}" }),
              reportCopyNice: t("report.copyNice", { score: "{score}" }),
              reviewTitle: t("report.reviewTitle"),
              showWrongOnly: t("report.showWrongOnly"),
              showAll: t("report.showAll"),
              share: t("report.share"),
              copied: t("report.copied"),
              retry: t("report.retry"),
              archiveTitle: t("archive.title"),
              archiveDescription: t("archive.description"),
              archiveCompleted: t("archive.completed"),
              archiveOpen: t("archive.open"),
              openQuiz: t("archive.openQuiz"),
            }}
          />
        </div>
      ) : (
        <div className="rounded-4xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-slate-600">
          <div className="mx-auto max-w-2xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{t("emptyTitle")}</h2>
            <p className="text-sm leading-7 sm:text-base">{t("emptyDescription")}</p>
          </div>
        </div>
      )}
    </section>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAsNeededLocalizedUrl } from "@windrun-huaiin/lib";
import { DailyQuizClient } from "@/components/daily-quiz-client";
import { ScrollToTop } from "@/components/scroll-to-top";
import { getArchiveDays, getDailyQuizByDate, isFutureTriviaDate, isValidTriviaDate } from "@/lib/trivia";

type PageProps = {
  params: Promise<{
    locale: string;
    date: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, date } = await params;
  if (!isValidTriviaDate(date) || isFutureTriviaDate(date)) {
    return {};
  }

  const quiz = await getDailyQuizByDate(date);
  if (!quiz) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "trivia.metadata" });
  const firstQuestion = quiz.questions[0]?.question ?? "";

  return {
    title: t("archiveTitle", { day: quiz.dayNumber, date }),
    description: t("archiveDescription", { date, question: firstQuestion }),
  };
}

export default async function ArchiveQuizPage({ params }: PageProps) {
  const { locale, date } = await params;
  if (!isValidTriviaDate(date) || isFutureTriviaDate(date)) {
    notFound();
  }

  const [quiz, archiveDays, t] = await Promise.all([
    getDailyQuizByDate(date),
    getArchiveDays(),
    getTranslations({ locale, namespace: "trivia" }),
  ]);

  if (!quiz) {
    notFound();
  }

  const homeHref = getAsNeededLocalizedUrl(locale, "/");
  const homeArchiveHref = `${homeHref === "/" ? "/" : homeHref}#archive-${quiz.date}`;
  const normalizedBasePath = getAsNeededLocalizedUrl(locale, "/") === "/"
    ? ""
    : getAsNeededLocalizedUrl(locale, "/");
  const currentIndex = archiveDays.findIndex((item) => item.date === quiz.date);
  const newerDay = currentIndex > 0 ? archiveDays[currentIndex - 1] : null;
  const olderDay =
    currentIndex >= 0 && currentIndex < archiveDays.length - 1 ? archiveDays[currentIndex + 1] : null;

  return (
    <section className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:mt-10 sm:px-6 lg:px-8">
      <ScrollToTop />
      <div>
        <Link
          href={homeArchiveHref}
          scroll
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("detail.backToArchive")}</span>
        </Link>
      </div>

      <DailyQuizClient
        quiz={quiz}
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
          reportTitle: t("report.title"),
          reportCopyPerfect: t("report.copyPerfect", { score: "{score}" }),
          reportCopyStrong: t("report.copyStrong", { score: "{score}" }),
          reportCopyNice: t("report.copyNice", { score: "{score}" }),
          reviewTitle: t("report.reviewTitle"),
          showWrongOnly: t("report.showWrongOnly"),
          showAll: t("report.showAll"),
          share: t("report.share"),
          copied: t("report.copied"),
          retry: t("report.retry"),
        }}
      />

      <section className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-2">
        {olderDay ? (
          <Link
            href={`${normalizedBasePath}/archive/${olderDay.date}`}
            scroll
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("detail.previousDayShort", { day: olderDay.dayNumber })}</span>
          </Link>
        ) : (
          <span className="text-sm text-slate-400">{t("detail.noPreviousDay")}</span>
        )}

        {newerDay ? (
          <Link
            href={`${normalizedBasePath}/archive/${newerDay.date}`}
            scroll
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span>{t("detail.nextDayShort", { day: newerDay.dayNumber })}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </section>
    </section>
  );
}

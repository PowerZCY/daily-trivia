import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAsNeededLocalizedUrl } from "@windrun-huaiin/lib/utils";
import { DailyQuizClient } from "@/components/daily-quiz-client";
import { ScrollToTop } from "@/components/scroll-to-top";
import { appConfig } from "@/lib/appConfig";
import {
  getArchiveDays,
  getDailyQuizByDate,
  hasDailyQuizScheduleByDate,
  isFutureTriviaDate,
  isValidTriviaDate,
} from "@/lib/trivia";

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

  const hasSchedule = await hasDailyQuizScheduleByDate(date);
  if (!hasSchedule) {
    return {};
  }

  const quiz = await getDailyQuizByDate(date);
  if (!quiz) {
    throw new Error(`Published archive quiz is unavailable while generating metadata: ${date}`);
  }

  const t = await getTranslations({ locale, namespace: "archive.metadata" });
  const firstQuestion = quiz.questions[0]?.question ?? "";

  return {
    title: t("archiveTitle", { day: quiz.dayNumber, date }),
    description: t("archiveDescription", { date, question: firstQuestion }),
    alternates: {
      canonical: `${appConfig.baseUrl}${getAsNeededLocalizedUrl(locale, `/archive/${date}`)}`,
      languages: {
        en: `${appConfig.baseUrl}${getAsNeededLocalizedUrl("en", `/archive/${date}`)}`,
      },
    },
  };
}

export default async function ArchiveQuizPage({ params }: PageProps) {
  const { locale, date } = await params;
  if (!isValidTriviaDate(date) || isFutureTriviaDate(date)) {
    notFound();
  }

  const hasSchedule = await hasDailyQuizScheduleByDate(date);
  if (!hasSchedule) {
    notFound();
  }

  const [quiz, archiveDays, t, quizT] = await Promise.all([
    getDailyQuizByDate(date),
    getArchiveDays(),
    getTranslations({ locale, namespace: "archive" }),
    getTranslations({ locale, namespace: "quiz" }),
  ]);

  if (!quiz) {
    throw new Error(`Published archive quiz is unavailable: ${date}`);
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
          progressLabel: quizT("session.progressLabel"),
          questionLabel: quizT("session.questionLabel"),
          correctLabel: quizT("session.correctLabel"),
          categoryLabel: quizT("session.categoryLabel"),
          explanationLabel: quizT("session.explanationLabel"),
          correctState: quizT("session.correctState"),
          incorrectState: quizT("session.incorrectState"),
          nextQuestion: quizT("session.nextQuestion"),
          viewReport: quizT("session.viewReport"),
          reportEyebrow: quizT("report.eyebrow"),
          reportTitle: quizT("report.title"),
          reportCopyPerfect: quizT("report.copyPerfect", { score: "{score}" }),
          reportCopyStrong: quizT("report.copyStrong", { score: "{score}" }),
          reportCopyNice: quizT("report.copyNice", { score: "{score}" }),
          reviewTitle: quizT("report.reviewTitle"),
          showWrongOnly: quizT("report.showWrongOnly"),
          showAll: quizT("report.showAll"),
          share: quizT("report.share"),
          copied: quizT("report.copied"),
          retry: quizT("report.retry"),
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

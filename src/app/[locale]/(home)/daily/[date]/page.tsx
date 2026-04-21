import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAsNeededLocalizedUrl } from "@windrun-huaiin/lib";
import { DailyQuizClient } from "@/components/daily-quiz-client";
import { getArchiveDays, getDailyQuizByDate, isValidTriviaDate } from "@/lib/trivia";

type PageProps = {
  params: Promise<{
    locale: string;
    date: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, date } = await params;
  if (!isValidTriviaDate(date)) {
    return {};
  }

  const quiz = await getDailyQuizByDate(date);
  if (!quiz) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: "trivia.metadata" });
  const firstQuestion = quiz.questions[0]?.question ?? "";

  return {
    title: t("dailyTitle", { day: quiz.dayNumber, date }),
    description: t("dailyDescription", { question: firstQuestion }),
  };
}

export default async function DailyQuizPage({ params }: PageProps) {
  const { locale, date } = await params;
  if (!isValidTriviaDate(date)) {
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
  const basePath = getAsNeededLocalizedUrl(locale, "");

  return (
    <section className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:mt-10 sm:px-6 lg:px-8">
      <div className="rounded-4xl border border-white/70 bg-[linear-gradient(135deg,#f6fbff_0%,#fff9ef_100%)] px-5 py-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:px-8">
        <div className="grid gap-5">
          <div>
            <Link
              href={homeHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("detail.backHome")}</span>
            </Link>
          </div>
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              {t("detail.pageEyebrow")}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {t("detail.pageTitle", { day: quiz.dayNumber })}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600">
              {t("detail.pageDescription", { date: quiz.date })}
            </p>
          </div>
        </div>
      </div>

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
          archiveIncompleteOnly: t("archive.incompleteOnly"),
          archiveEmpty: t("archive.empty"),
        }}
      />
    </section>
  );
}

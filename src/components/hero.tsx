import { getTranslations } from "next-intl/server";
import { getAsNeededLocalizedUrl } from "@windrun-huaiin/lib/utils";
import { DailyQuizArchive } from "@/components/daily-quiz-archive";
import { DailyQuizClient } from "@/components/daily-quiz-client";
import { getHomeTriviaData } from "@/lib/home-trivia";

export async function Hero({ locale }: { locale: string }) {
  const [t, quizT] = await Promise.all([
    getTranslations({ locale, namespace: "hero" }),
    getTranslations({ locale, namespace: "quiz" }),
  ]);
  const { latestQuiz, archiveDays } = await getHomeTriviaData();
  const basePath = getAsNeededLocalizedUrl(locale, "");

  return (
    <section className="mx-auto mt-15 flex w-full max-w-6xl flex-col gap-5 px-4 py-3 sm:mt-15 sm:px-6 sm:py-4 lg:gap-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-2 py-1 text-center sm:py-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-gray-100 sm:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-3xl text-base leading-7 text-slate-600 dark:text-gray-400 sm:text-lg sm:leading-8">
          {t("description")}
        </p>
      </div>

      {latestQuiz ? (
        <div id="today-quiz">
          <DailyQuizClient
            quiz={latestQuiz}
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
        </div>
      ) : (
        <div className="rounded-4xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center text-slate-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
          <div className="mx-auto max-w-2xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-gray-100">
              {t("emptyTitle")}
            </h2>
            <p className="text-sm leading-7 sm:text-base">{t("emptyDescription")}</p>
          </div>
        </div>
      )}

      <DailyQuizArchive
        archiveDays={archiveDays}
        basePath={basePath}
        copy={{
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

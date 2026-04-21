import { getTranslations } from "next-intl/server";
import { getAsNeededLocalizedUrl } from "@windrun-huaiin/lib";
import { DailyQuizClient } from "@/components/daily-quiz-client";
import { getArchiveDays, getTodayDailyQuiz } from "@/lib/trivia";

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "trivia" });
  const [quiz, archiveDays] = await Promise.all([getTodayDailyQuiz(), getArchiveDays()]);
  const basePath = getAsNeededLocalizedUrl(locale, "");

  return (
    <section className="mx-auto mt-15 flex w-full max-w-6xl flex-col gap-5 px-4 py-3 sm:mt-15 sm:px-6 sm:py-4 lg:gap-6 lg:px-8">
      <div className="max-w-3xl space-y-2 py-1 sm:py-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
          {t("description")}
        </p>
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
              archiveIncompleteOnly: t("archive.incompleteOnly"),
              archiveEmpty: t("archive.empty"),
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

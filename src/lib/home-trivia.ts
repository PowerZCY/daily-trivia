import "server-only";

import {
  getArchiveDaySummaries,
  getLatestAvailableQuizDetails,
  type ArchiveDayItem,
  type DailyQuizPayload,
} from "@/lib/trivia";

export type HomeTriviaData = {
  latestQuiz: DailyQuizPayload | null;
  archiveDays: ArchiveDayItem[];
};

export async function getHomeTriviaData(): Promise<HomeTriviaData> {
  const [latestQuiz, archiveDays] = await Promise.all([
    getLatestAvailableQuizDetails(),
    getArchiveDaySummaries(),
  ]);

  return {
    latestQuiz,
    archiveDays,
  };
}

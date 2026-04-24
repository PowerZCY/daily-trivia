import "server-only";

import { prisma as rawPrisma } from "@windrun-huaiin/backend-core/prisma";
import { createAnswersUniverseClientFromEnv } from "@windrun-huaiin/faq-sdk";
import type { OuterQuestionBaseItemDto } from "@windrun-huaiin/faq-sdk";
import type { Prisma } from "@prisma/client";

const DAY_ONE = "2026-04-01";

const faqClient = createAnswersUniverseClientFromEnv();
const dailyQuestionSchedule = (rawPrisma as typeof rawPrisma & {
  dailyQuestionSchedule: Prisma.DailyQuestionScheduleDelegate;
}).dailyQuestionSchedule;

export type DailyQuizQuestion = {
  id: string;
  uuid: string;
  question: string;
  questionImageUrl?: string | null;
  correctAnswer: string;
  incorrectAnswers: string[];
  explanation?: string | null;
  category?: string | null;
  sortOrder: number;
};

export type DailyQuizPayload = {
  date: string;
  dayNumber: number;
  questions: DailyQuizQuestion[];
};

export type ArchiveDayItem = {
  date: string;
  dayNumber: number;
  firstQuestion: string;
};

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toUtcDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function getQuestionId(item: OuterQuestionBaseItemDto): string {
  return String(item.id ?? "");
}

function normalizeQuestion(
  item: OuterQuestionBaseItemDto,
  sortOrder: number,
): DailyQuizQuestion {
  return {
    id: String(item.id),
    uuid: item.uuid,
    question: item.question,
    questionImageUrl: item.questionImageUrl ?? null,
    correctAnswer: item.correctAnswer,
    incorrectAnswers: item.incorrectAnswers ?? [],
    explanation: item.explanation ?? null,
    category: item.category ?? null,
    sortOrder,
  };
}

async function getQuestionMap(ids: string[]) {
  const result = await faqClient.v1.questionsBase.getByIds(ids);
  return new Map(
    result.items
      .filter((item) => item?.id != null)
      .map((item) => [getQuestionId(item), item]),
  );
}

async function getScheduledQuestionsByDate(date: string) {
  return dailyQuestionSchedule.findMany({
    where: {
      showDate: toUtcDateOnly(date),
    },
    orderBy: {
      sortOrder: "asc",
    },
  });
}

async function getPublishedFirstQuestionSchedules(options: {
  beforeTodayOnly?: boolean;
  limit?: number;
  order: "asc" | "desc";
}) {
  const today = toUtcDateOnly(getTodayUtcDate());

  return dailyQuestionSchedule.findMany({
    where: {
      asFirst: 1,
      showDate: options.beforeTodayOnly
        ? {
            lt: today,
          }
        : {
            lte: today,
          },
    },
    orderBy: {
      showDate: options.order,
    },
    ...(options.limit ? { take: options.limit } : {}),
  });
}

export function getTodayUtcDate() {
  return formatUtcDate(new Date());
}

export function getDayNumberFromDate(date: string) {
  const diffMs = toUtcDateOnly(date).getTime() - toUtcDateOnly(DAY_ONE).getTime();
  return Math.floor(diffMs / 86_400_000) + 1;
}

export function isValidTriviaDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = toUtcDateOnly(date);
  return !Number.isNaN(parsed.getTime()) && formatUtcDate(parsed) === date;
}

export function isFutureTriviaDate(date: string) {
  if (!isValidTriviaDate(date)) {
    return false;
  }

  return date > getTodayUtcDate();
}

export async function getQuizDetailsByDate(date: string): Promise<DailyQuizPayload | null> {
  const schedule = await getScheduledQuestionsByDate(date);

  if (schedule.length === 0) {
    return null;
  }

  const ids = schedule.map((item) => item.questionId.toString());
  const questionMap = await getQuestionMap(ids);
  const questions = schedule
    .map((item) => {
      const question = questionMap.get(item.questionId.toString());
      if (!question) {
        return null;
      }

      return normalizeQuestion(question, item.sortOrder);
    })
    .filter((item): item is DailyQuizQuestion => item !== null);

  if (questions.length === 0) {
    return null;
  }

  return {
    date,
    dayNumber: getDayNumberFromDate(date),
    questions,
  };
}

export async function getDailyQuizByDate(date: string) {
  return getQuizDetailsByDate(date);
}

export async function getTodayDailyQuiz() {
  return getQuizDetailsByDate(getTodayUtcDate());
}

export async function getLatestAvailableQuizDetails(): Promise<DailyQuizPayload | null> {
  const candidates = await getPublishedFirstQuestionSchedules({
    order: "desc",
    limit: 30,
  });

  for (const candidate of candidates) {
    const quiz = await getQuizDetailsByDate(formatUtcDate(candidate.showDate));
    if (quiz) {
      return quiz;
    }
  }

  return null;
}

export async function getArchiveDaySummaries(): Promise<ArchiveDayItem[]> {
  const schedule = await getPublishedFirstQuestionSchedules({
    beforeTodayOnly: true,
    order: "desc",
  });

  if (schedule.length === 0) {
    return [];
  }

  const ids = schedule.map((item) => item.questionId.toString());
  const questionMap = await getQuestionMap(ids);

  return schedule
    .map((item) => {
      const question = questionMap.get(item.questionId.toString());
      if (!question?.question) {
        return null;
      }

      const date = formatUtcDate(item.showDate);
      return {
        date,
        dayNumber: getDayNumberFromDate(date),
        firstQuestion: question.question,
      };
    })
    .filter((item): item is ArchiveDayItem => item !== null);
}

export async function getPublishedQuizDates(): Promise<string[]> {
  const schedule = await getPublishedFirstQuestionSchedules({
    order: "asc",
  });

  return Array.from(new Set(schedule.map((item) => formatUtcDate(item.showDate))));
}

export async function getLatestAvailableDailyQuiz() {
  return getLatestAvailableQuizDetails();
}

export async function getArchiveDays() {
  return getArchiveDaySummaries();
}

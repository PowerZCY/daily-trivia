"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, ChevronRight, RotateCcw, Share2, X } from "lucide-react";
import type { ArchiveDayItem, DailyQuizPayload } from "@/lib/trivia";

type Props = {
  quiz: DailyQuizPayload;
  archiveDays: ArchiveDayItem[];
  basePath: string;
  copy: {
    progressLabel: string;
    questionLabel: string;
    correctLabel: string;
    categoryLabel: string;
    explanationLabel: string;
    correctState: string;
    incorrectState: string;
    nextQuestion: string;
    viewReport: string;
    reportEyebrow: string;
    reportTitlePerfect: string;
    reportTitleStrong: string;
    reportTitleNice: string;
    reportCopyPerfect: string;
    reportCopyStrong: string;
    reportCopyNice: string;
    reviewTitle: string;
    showWrongOnly: string;
    showAll: string;
    share: string;
    copied: string;
    retry: string;
    archiveTitle: string;
    archiveDescription: string;
    archiveCompleted: string;
    archiveOpen: string;
    openQuiz: string;
  };
};

type CompletionRecord = {
  completed: true;
  date: string;
  correctCount: number;
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
  }>;
};

type AnswerState = {
  questionId: string;
  isCorrect: boolean;
};

function getQuizStorageKey(date: string) {
  return `daily-trivia:quiz:${date}`;
}

function getCompletedDaysKey() {
  return "daily-trivia:completed-days";
}

function createSeededRandom(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return function next() {
    hash += 0x6d2b79f5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleAnswers(seed: string, correctAnswer: string, incorrectAnswers: string[]) {
  const answers = [correctAnswer, ...incorrectAnswers];
  const random = createSeededRandom(seed);
  for (let i = answers.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return answers;
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

function readCompletion(date: string): CompletionRecord | null {
  try {
    const raw = window.localStorage.getItem(getQuizStorageKey(date));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CompletionRecord;
    if (!parsed?.completed || parsed.date !== date || !Array.isArray(parsed.answers)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCompletion(record: CompletionRecord) {
  window.localStorage.setItem(getQuizStorageKey(record.date), JSON.stringify(record));
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

function writeCompletedDay(date: string) {
  const current = readCompletedDays();
  if (current.includes(date)) {
    return;
  }
  window.localStorage.setItem(getCompletedDaysKey(), JSON.stringify([...current, date]));
}

function removeCompletedDay(date: string) {
  const current = readCompletedDays().filter((item) => item !== date);
  window.localStorage.setItem(getCompletedDaysKey(), JSON.stringify(current));
}

function getScoreTitle(score: number, total: number, copy: Props["copy"]) {
  if (score === total) {
    return {
      title: copy.reportTitlePerfect,
      body: copy.reportCopyPerfect.replace("{score}", `${score}/${total}`),
    };
  }

  if (score >= Math.ceil(total * 0.7)) {
    return {
      title: copy.reportTitleStrong,
      body: copy.reportCopyStrong.replace("{score}", `${score}/${total}`),
    };
  }

  return {
    title: copy.reportTitleNice,
    body: copy.reportCopyNice.replace("{score}", `${score}/${total}`),
  };
}

export function DailyQuizClient({ quiz, archiveDays, basePath, copy }: Props) {
  const totalQuestions = quiz.questions.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong">("all");
  const [completedDays, setCompletedDays] = useState<string[]>([]);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentQuestion = quiz.questions[currentIndex];

  const options = useMemo(() => {
    if (!currentQuestion) {
      return [];
    }
    return shuffleAnswers(
      `${quiz.date}:${currentQuestion.id}`,
      currentQuestion.correctAnswer,
      currentQuestion.incorrectAnswers,
    );
  }, [currentQuestion, quiz.date]);

  useEffect(() => {
    const saved = readCompletion(quiz.date);
    Promise.resolve().then(() => {
      setCompletedDays(readCompletedDays());
      if (!saved) {
        return;
      }

      setCorrectCount(saved.correctCount);
      setAnswers(saved.answers);
      setCurrentIndex(quiz.questions.length);
      setShowReport(true);
      setHasTrackedStart(true);
    });
  }, [quiz.date, quiz.questions.length]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const reviewItems = quiz.questions.map((question) => {
    const answer = answers.find((item) => item.questionId === question.id);
    return {
      question,
      isCorrect: answer?.isCorrect ?? false,
    };
  });

  const wrongCount = reviewItems.filter((item) => !item.isCorrect).length;
  const scoreTitle = getScoreTitle(correctCount, totalQuestions, copy);

  function saveFinishedQuiz(nextAnswers: AnswerState[], nextCorrectCount: number) {
    writeCompletion({
      completed: true,
      date: quiz.date,
      correctCount: nextCorrectCount,
      answers: nextAnswers,
    });
    writeCompletedDay(quiz.date);
    setCompletedDays(readCompletedDays());
  }

  function handleAnswer(answer: string) {
    if (!currentQuestion || selectedAnswer) {
      return;
    }

    if (!hasTrackedStart) {
      trackGaEvent("daily_quiz_started", {
        date: quiz.date,
        day_number: quiz.dayNumber,
      });
      setHasTrackedStart(true);
    }

    const isCorrect = answer === currentQuestion.correctAnswer;
    const nextCorrectCount = correctCount + (isCorrect ? 1 : 0);
    const nextAnswers = [
      ...answers,
      {
        questionId: currentQuestion.id,
        isCorrect,
      },
    ];

    setSelectedAnswer(answer);
    setAnswers(nextAnswers);
    setCorrectCount(nextCorrectCount);

    if (currentIndex === totalQuestions - 1) {
      saveFinishedQuiz(nextAnswers, nextCorrectCount);
      setShowReport(true);
      setCurrentIndex(totalQuestions);
      trackGaEvent("daily_quiz_completed", {
        date: quiz.date,
        day_number: quiz.dayNumber,
        score: nextCorrectCount,
      });
    }
  }

  function goNext() {
    if (!selectedAnswer) {
      return;
    }

    if (currentIndex >= totalQuestions - 1) {
      return;
    }

    setCurrentIndex((value) => value + 1);
    setSelectedAnswer(null);
  }

  async function handleShare() {
    const text = `I scored ${correctCount}/${totalQuestions} on Day ${quiz.dayNumber} (${quiz.date}).`;
    trackGaEvent("report_share_clicked", {
      date: quiz.date,
      day_number: quiz.dayNumber,
      score: correctCount,
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.alert(text);
    }
  }

  function handleRetry() {
    trackGaEvent("report_retry_clicked", {
      date: quiz.date,
      day_number: quiz.dayNumber,
      score: correctCount,
    });
    window.localStorage.removeItem(getQuizStorageKey(quiz.date));
    removeCompletedDay(quiz.date);
    setCompletedDays(readCompletedDays());
    setCurrentIndex(0);
    setCorrectCount(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowReport(false);
    setReviewFilter("all");
    setCopied(false);
    setHasTrackedStart(false);
  }

  function handleArchiveClick(date: string, dayNumber: number) {
    trackGaEvent("archive_card_clicked", {
      date,
      day_number: dayNumber,
      completed: completedDays.includes(date),
    });
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-[2rem] border border-white/60 bg-white/70 p-4 shadow-[0_25px_90px_rgba(15,23,42,0.10)] backdrop-blur xl:p-6">
        <div className="rounded-[1.6rem] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(243,244,246,0.82))] p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                Day {quiz.dayNumber}
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {quiz.date}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{copy.progressLabel}</p>
              </div>
            </div>

            <div className="inline-flex items-center gap-3 self-start rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              <span>
                {copy.correctLabel}: {correctCount}/{totalQuestions}
              </span>
            </div>
          </div>

          {!showReport && currentQuestion ? (
            <div className="grid gap-6">
              <div className="grid gap-3">
                <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {copy.questionLabel} {currentIndex + 1}/{totalQuestions}
                  </span>
                  {currentQuestion.category ? (
                    <span className="inline-flex w-fit items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                      {copy.categoryLabel}: {currentQuestion.category}
                    </span>
                  ) : null}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#ec4899)] transition-all"
                    style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold leading-8 text-slate-950 sm:text-2xl">
                  {currentQuestion.question}
                </h3>
                {currentQuestion.questionImageUrl ? (
                  <Image
                    src={currentQuestion.questionImageUrl}
                    alt={currentQuestion.question}
                    width={1200}
                    height={675}
                    className="mt-4 h-auto w-full rounded-2xl border border-slate-200 object-cover"
                  />
                ) : null}

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {options.map((answer, index) => {
                    const hasAnswered = selectedAnswer !== null;
                    const isCorrect = answer === currentQuestion.correctAnswer;
                    const isSelected = answer === selectedAnswer;
                    const baseClass = "flex min-h-14 items-start rounded-2xl border px-4 py-3 text-left text-sm font-medium leading-6 transition sm:text-base";
                    const stateClass = hasAnswered
                      ? isCorrect
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : isSelected
                          ? "border-rose-300 bg-rose-50 text-rose-900"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50";

                    return (
                      <button
                        key={answer}
                        type="button"
                        disabled={hasAnswered}
                        onClick={() => handleAnswer(answer)}
                        className={`${baseClass} ${stateClass}`}
                      >
                        <span className="mr-3 font-semibold text-slate-400">{String.fromCharCode(65 + index)}.</span>
                        <span>{answer}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedAnswer ? (
                  <div
                    className={`mt-6 rounded-2xl border p-4 ${
                      selectedAnswer === currentQuestion.correctAnswer
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-950">
                      {selectedAnswer === currentQuestion.correctAnswer
                        ? copy.correctState
                        : `${copy.incorrectState} ${currentQuestion.correctAnswer}`}
                    </div>
                    {currentQuestion.explanation ? (
                      <div className="mt-2 text-sm leading-6 text-slate-700">
                        <span className="font-semibold">{copy.explanationLabel}: </span>
                        <span>{currentQuestion.explanation}</span>
                      </div>
                    ) : null}
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={goNext}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <span>{currentIndex === totalQuestions - 1 ? copy.viewReport : copy.nextQuestion}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="rounded-[1.5rem] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.20),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-6 text-center">
                <div className="inline-flex rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                  {copy.reportEyebrow}
                </div>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{scoreTitle.title}</h3>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  {scoreTitle.body}
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{copied ? copy.copied : copy.share}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>{copy.retry}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-lg font-semibold text-slate-950">{copy.reviewTitle}</h4>
                  <button
                    type="button"
                    onClick={() => setReviewFilter((value) => (value === "all" ? "wrong" : "all"))}
                    className="inline-flex w-fit items-center rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                  >
                    {reviewFilter === "all"
                      ? `${copy.showWrongOnly} (${wrongCount})`
                      : copy.showAll}
                  </button>
                </div>

                <div className="grid gap-3">
                  {reviewItems
                    .filter((item) => (reviewFilter === "wrong" ? !item.isCorrect : true))
                    .map(({ question, isCorrect }, index) => (
                      <details
                        key={question.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <summary className="flex cursor-pointer list-none items-start gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full ${
                              isCorrect
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          </span>
                          <span className="flex-1 text-sm font-medium leading-6 text-slate-900 sm:text-base">
                            Q{index + 1}. {question.question}
                          </span>
                        </summary>
                        <div className="mt-4 grid gap-3 pl-9">
                          {question.category ? (
                            <div className="inline-flex w-fit items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                              {question.category}
                            </div>
                          ) : null}
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-slate-800">
                            <span className="font-semibold">{copy.correctLabel}: </span>
                            <span>{question.correctAnswer}</span>
                          </div>
                          {question.explanation ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                              <span className="font-semibold">{copy.explanationLabel}: </span>
                              <span>{question.explanation}</span>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{copy.archiveTitle}</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{copy.archiveDescription}</p>
        </div>

        <div className="grid gap-3">
          {archiveDays.map((item) => {
            const href = `${basePath}/daily/${item.date}`;
            const completed = completedDays.includes(item.date);
            return (
              <Link
                key={item.date}
                href={href}
                onClick={() => handleArchiveClick(item.date, item.dayNumber)}
                className="group rounded-[1.5rem] border border-white/70 bg-white/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                        Day {item.dayNumber}
                      </span>
                      <span className="text-sm text-slate-500">{item.date}</span>
                    </div>
                    <p className="text-sm leading-7 text-slate-700 sm:text-base">{item.firstQuestion}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        completed
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {completed ? copy.archiveCompleted : copy.archiveOpen}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {copy.openQuiz}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import confetti from "canvas-confetti";
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
    archiveIncompleteOnly: string;
    archiveEmpty: string;
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
      body: copy.reportCopyPerfect,
    };
  }

  if (score >= Math.ceil(total * 0.7)) {
    return {
      title: copy.reportTitleStrong,
      body: copy.reportCopyStrong,
    };
  }

  return {
    title: copy.reportTitleNice,
    body: copy.reportCopyNice,
  };
}

function buildShareLink() {
  const url = new URL(window.location.href);
  url.protocol = "https:";
  url.searchParams.set("ref", "share");
  return url.toString();
}

function buildShareText(score: number, total: number, dayNumber: number, date: string, shareLink: string) {
  return [
    `💡 Daily Trivia Challenge - Day ${dayNumber}`,
    `🗓️ ${date}`,
    `🎯 I got ${score}/${total}. The questions are surprisingly fun. Come play:`,
    `${shareLink}`,
  ].join("\n");
}

function formatReportCopy(body: string, score: string) {
  if (body.includes("{score}")) {
    return body.replace("{score}", score);
  }

  const trimmedBody = body.trim();
  const normalizedBody = trimmedBody.replace(/^you made it through all five\.?\s*/i, "");

  return `You got ${score}. ${normalizedBody}`;
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
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [copied, setCopied] = useState(false);
  const confettiTimerRef = useRef<number | null>(null);
  const confettiFrameRef = useRef<number | null>(null);

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

  useEffect(() => {
    return () => {
      if (confettiTimerRef.current !== null) {
        window.clearTimeout(confettiTimerRef.current);
      }

      if (confettiFrameRef.current !== null) {
        window.cancelAnimationFrame(confettiFrameRef.current);
      }
    };
  }, []);

  const reviewItems = quiz.questions.map((question) => {
    const answer = answers.find((item) => item.questionId === question.id);
    return {
      question,
      isCorrect: answer?.isCorrect ?? false,
    };
  });

  const wrongCount = reviewItems.filter((item) => !item.isCorrect).length;
  const scoreTitle = getScoreTitle(correctCount, totalQuestions, copy);
  const reportScore = `${correctCount}/${totalQuestions}`;
  const reportBody = formatReportCopy(scoreTitle.body, reportScore);
  const reportBodyRest = reportBody.startsWith(`You got ${reportScore}. `)
    ? reportBody.slice(`You got ${reportScore}. `.length)
    : reportBody;
  const visibleArchiveDays = useMemo(
    () => archiveDays.filter((item) => (showIncompleteOnly ? !completedDays.includes(item.date) : true)),
    [archiveDays, completedDays, showIncompleteOnly],
  );

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

  function triggerQuizConfetti() {
    if (typeof window === "undefined") {
      return;
    }

    if (confettiTimerRef.current !== null) {
      window.clearTimeout(confettiTimerRef.current);
    }

    if (confettiFrameRef.current !== null) {
      window.cancelAnimationFrame(confettiFrameRef.current);
    }

    confettiTimerRef.current = window.setTimeout(() => {
      const duration = 2000;
      const end = Date.now() + duration;
      const isMobile = window.innerWidth < 640;

      const frame = () => {
        if (isMobile) {
          confetti({
            particleCount: 3,
            angle: 55,
            spread: 58,
            startVelocity: 34,
            decay: 0.92,
            scalar: 0.75,
            ticks: 170,
            origin: { x: 0, y: 0.7 },
            colors: ["#F59E0B", "#FBBF24", "#FB7185", "#38BDF8", "#34D399"],
            zIndex: 2147483647,
          });
        } else {
          confetti({
            particleCount: 4,
            angle: 60,
            spread: 58,
            startVelocity: 46,
            decay: 0.91,
            scalar: 0.9,
            ticks: 180,
            origin: { x: 0, y: 0.62 },
            colors: ["#F59E0B", "#FBBF24", "#FB7185", "#38BDF8", "#34D399"],
            zIndex: 2147483647,
          });
          confetti({
            particleCount: 4,
            angle: 120,
            spread: 58,
            startVelocity: 46,
            decay: 0.91,
            scalar: 0.9,
            ticks: 180,
            origin: { x: 1, y: 0.62 },
            colors: ["#F97316", "#FDE68A", "#EC4899", "#0EA5E9", "#2DD4BF"],
            zIndex: 2147483647,
          });
        }

        if (Date.now() < end) {
          confettiFrameRef.current = window.requestAnimationFrame(frame);
        } else {
          confettiFrameRef.current = null;
        }
      };

      frame();
      confettiTimerRef.current = null;
    }, 300);
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
      triggerQuizConfetti();
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
    const shareLink = buildShareLink();
    const text = buildShareText(correctCount, totalQuestions, quiz.dayNumber, quiz.date, shareLink);
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
    <div className="grid gap-6 sm:gap-8">
      <section className="relative overflow-hidden rounded-4xl border border-white/70 bg-[linear-gradient(135deg,#fff8ec_0%,#f5fbff_50%,#fffaf6_100%)] p-3 sm:p-4 shadow-[0_30px_120px_rgba(15,23,42,0.08)] xl:p-6">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_45%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.18),transparent_35%)] lg:block" />
        <div className="relative p-1">
          <div
            className={`flex flex-col gap-2 border-b border-white/45 sm:flex-row sm:items-start sm:justify-between sm:gap-3 ${
              showReport ? "mb-2.5 pb-2.5 sm:mb-3 sm:pb-3" : "mb-3 pb-3 sm:mb-4 sm:pb-4"
            }`}
          >
            <div className="space-y-1.5 sm:space-y-2">
              <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
                Day {quiz.dayNumber}
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {quiz.date}
                </h2>
              </div>
            </div>

            {!showReport ? (
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 sm:gap-3 sm:px-4 sm:py-2">
                <Check className="h-4 w-4" />
                <span>
                  {copy.correctLabel}: {correctCount}/{totalQuestions}
                </span>
              </div>
            ) : null}
          </div>

          {!showReport && currentQuestion ? (
            <div className="grid gap-3 sm:gap-4">
              <div className="grid gap-1.5 sm:gap-2">
                <div className="flex flex-col gap-1.5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
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

              <div className="rounded-3xl border border-white/65 bg-white/42 p-4 sm:p-5 shadow-sm backdrop-blur-md">
                <h3 className="text-[17px] font-semibold leading-7 text-slate-950 sm:text-2xl sm:leading-8">
                  {currentQuestion.question}
                </h3>
                {currentQuestion.questionImageUrl ? (
                  <Image
                    src={currentQuestion.questionImageUrl}
                    alt={currentQuestion.question}
                    width={1200}
                    height={675}
                    className="mt-3 h-auto w-full rounded-2xl border border-slate-200 object-cover sm:mt-4"
                  />
                ) : null}

                <div className="mt-4 grid gap-2.5 sm:mt-6 sm:gap-3 md:grid-cols-2">
                  {options.map((answer, index) => {
                    const hasAnswered = selectedAnswer !== null;
                    const isCorrect = answer === currentQuestion.correctAnswer;
                    const isSelected = answer === selectedAnswer;
                    const baseClass =
                      "flex min-h-12 items-start rounded-2xl border px-3.5 py-2.5 text-left text-sm font-medium leading-5 transition sm:min-h-14 sm:px-4 sm:py-3 sm:text-base sm:leading-6";
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
                    className={`mt-4 rounded-2xl border p-3 sm:mt-6 sm:p-4 ${
                      selectedAnswer === currentQuestion.correctAnswer
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <div className="mb-3 flex flex-col items-start gap-3 sm:mb-4 sm:flex-row sm:justify-between sm:gap-4">
                      <div className="text-base font-semibold text-slate-950">
                        {selectedAnswer === currentQuestion.correctAnswer
                          ? copy.correctState
                          : `${copy.incorrectState} ${currentQuestion.correctAnswer}`}
                      </div>
                      <button
                        type="button"
                        onClick={goNext}
                        className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-900 bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                      >
                        <span>{currentIndex === totalQuestions - 1 ? copy.viewReport : copy.nextQuestion}</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    {currentQuestion.explanation ? (
                      <div className="mt-1 text-[15px] leading-6 text-slate-700 sm:mt-2 sm:text-[16px] sm:leading-7">
                        <span className="font-semibold">{copy.explanationLabel}: </span>
                        <span>{currentQuestion.explanation}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/35 p-4 text-center shadow-sm backdrop-blur">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  {scoreTitle.title}
                </h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  <span className="font-semibold text-slate-900">You got {reportScore}.</span>
                  <span>{` ${reportBodyRest}`}</span>
                </p>
                <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

              <div className="rounded-3xl border border-white/75 bg-white/70 p-5 shadow-sm backdrop-blur">
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
                          <span className="flex-1 text-[18px] font-medium leading-7 text-slate-900">
                            Q{index + 1}. {question.question}
                          </span>
                        </summary>
                        <div className="mt-4 grid gap-3 pl-9">
                          {question.category ? (
                            <div className="inline-flex w-fit items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                              {question.category}
                            </div>
                          ) : null}
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[16px] leading-7 text-slate-800">
                            <span className="font-semibold text-slate-900">{copy.correctLabel}: </span>
                            <span>{question.correctAnswer}</span>
                          </div>
                          {question.explanation ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[16px] leading-7 text-slate-700">
                              <span className="font-semibold text-slate-900">{copy.explanationLabel}: </span>
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

      <section className="relative overflow-hidden rounded-4xl border border-white/70 bg-[linear-gradient(135deg,#fff8ec_0%,#f5fbff_50%,#fffaf6_100%)] p-5 shadow-[0_30px_120px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_45%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.18),transparent_35%)] lg:block" />
        <div className="relative mb-4 flex flex-col gap-3 rounded-[1.4rem] border border-white/70 bg-white/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{copy.archiveTitle}</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{copy.archiveDescription}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowIncompleteOnly((value) => !value)}
            aria-pressed={showIncompleteOnly}
            className={`inline-flex items-center gap-3 self-start rounded-full border px-4 py-2 text-sm font-semibold transition ${
              showIncompleteOnly
                ? "border-slate-900 bg-slate-950 text-white"
                : "border-slate-300 bg-white/85 text-slate-700 hover:border-slate-400 hover:bg-white"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                showIncompleteOnly
                  ? "border-white/70 bg-white/15 text-white"
                  : "border-slate-300 bg-white text-transparent"
              }`}
            >
              ✓
            </span>
            <span>{copy.archiveIncompleteOnly}</span>
          </button>
        </div>

        <div className="relative grid gap-3">
          {visibleArchiveDays.length ? (
            visibleArchiveDays.map((item) => {
            const href = `${basePath}/daily/${item.date}`;
            const completed = completedDays.includes(item.date);
            return (
              <Link
                key={item.date}
                href={href}
                onClick={() => handleArchiveClick(item.date, item.dayNumber)}
                className="group rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.34))] p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/90 hover:bg-white/72 sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium tracking-tight text-slate-500/90 sm:text-base">
                        Daily Trivia - Day {item.dayNumber}
                      </p>
                      <p className="text-xs font-medium tracking-[0.08em] text-slate-400 sm:text-sm">
                        {item.date}
                      </p>
                    </div>
                    <p className="max-w-4xl text-base leading-7 font-medium tracking-tight text-slate-900 transition-colors group-hover:text-slate-950 sm:text-lg sm:leading-8">
                      {item.firstQuestion}
                    </p>
                  </div>
                  {completed ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-emerald-300/70 bg-emerald-50/70 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                        {copy.archiveCompleted}
                      </span>
                    </div>
                  ) : null}
                </div>
              </Link>
            );
            })
          ) : (
            <div className="rounded-3xl border border-white/70 bg-white/40 p-5 text-sm leading-7 text-slate-600 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:text-base">
              {copy.archiveEmpty}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

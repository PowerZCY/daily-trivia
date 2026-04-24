"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import { Check, ChevronRight, RotateCcw, Share2, X } from "lucide-react";
import type { DailyQuizPayload } from "@/lib/trivia";

type Props = {
  quiz: DailyQuizPayload;
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
    reportTitle: string;
    reportCopyPerfect: string;
    reportCopyStrong: string;
    reportCopyNice: string;
    reviewTitle: string;
    showWrongOnly: string;
    showAll: string;
    share: string;
    copied: string;
    retry: string;
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

function getCompletedDaysChangedEventName() {
  return "daily-trivia:completed-days-changed";
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
  window.dispatchEvent(new Event(getCompletedDaysChangedEventName()));
}

function removeCompletedDay(date: string) {
  const current = readCompletedDays().filter((item) => item !== date);
  window.localStorage.setItem(getCompletedDaysKey(), JSON.stringify(current));
  window.dispatchEvent(new Event(getCompletedDaysChangedEventName()));
}

function getScoreTitle(score: number, total: number, copy: Props["copy"]) {
  if (score === total) {
    return {
      title: copy.reportTitle,
      body: copy.reportCopyPerfect,
    };
  }

  if (score >= Math.ceil(total * 0.7)) {
    return {
      title: copy.reportTitle,
      body: copy.reportCopyStrong,
    };
  }

  return {
    title: copy.reportTitle,
    body: copy.reportCopyNice,
  };
}

function buildShareLink() {
  const url = new URL(window.location.href);
  url.protocol = "https:";
  url.searchParams.set("ref", "share");
  url.hash = "";
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

export function DailyQuizClient({ quiz, copy }: Props) {
  const finalRevealDurationMs = 1500;
  const totalQuestions = quiz.questions.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isFinishingQuiz, setIsFinishingQuiz] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong">("all");
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [copied, setCopied] = useState(false);
  const confettiTimerRef = useRef<number | null>(null);
  const confettiFrameRef = useRef<number | null>(null);
  const finalRevealTimerRef = useRef<number | null>(null);

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
      if (finalRevealTimerRef.current !== null) {
        window.clearTimeout(finalRevealTimerRef.current);
      }

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

  function saveFinishedQuiz(nextAnswers: AnswerState[], nextCorrectCount: number) {
    writeCompletion({
      completed: true,
      date: quiz.date,
      correctCount: nextCorrectCount,
      answers: nextAnswers,
    });
    writeCompletedDay(quiz.date);
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
            colors: [
              "#F59E0B",
              "#FBBF24",
              "#FB7185",
              "#38BDF8",
              "#34D399",
              "#F97316",
              "#FDE68A",
              "#EC4899",
              "#0EA5E9",
              "#2DD4BF",
            ],
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
      setIsFinishingQuiz(true);
      if (finalRevealTimerRef.current !== null) {
        window.clearTimeout(finalRevealTimerRef.current);
      }
      finalRevealTimerRef.current = window.setTimeout(() => {
        setShowReport(true);
        setCurrentIndex(totalQuestions);
        setIsFinishingQuiz(false);
        triggerQuizConfetti();
        finalRevealTimerRef.current = null;
      }, finalRevealDurationMs);
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
    if (finalRevealTimerRef.current !== null) {
      window.clearTimeout(finalRevealTimerRef.current);
      finalRevealTimerRef.current = null;
    }
    window.localStorage.removeItem(getQuizStorageKey(quiz.date));
    removeCompletedDay(quiz.date);
    setCurrentIndex(0);
    setCorrectCount(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowReport(false);
    setIsFinishingQuiz(false);
    setReviewFilter("all");
    setCopied(false);
    setHasTrackedStart(false);
  }

  return (
    <section className="relative overflow-hidden rounded-4xl border border-white/70 bg-[linear-gradient(135deg,#fff8ec_0%,#f5fbff_50%,#fffaf6_100%)] p-3 shadow-[0_30px_120px_rgba(15,23,42,0.08)] sm:p-4 xl:p-6">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.18),transparent_45%),radial-gradient(circle_at_bottom,rgba(56,189,248,0.18),transparent_35%)] lg:block" />
        <div className="relative">
          {!showReport && currentQuestion ? (
            <div className="grid gap-3 sm:gap-4">
              <div className="grid gap-2 sm:gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[22px] font-semibold leading-none tracking-tight text-slate-950 sm:text-[30px]">
                      Day {quiz.dayNumber}
                    </div>
                    <h2 className="mt-1 text-[15px] font-medium tracking-tight text-slate-950/75 sm:mt-1.5 sm:text-[16px]">
                      {quiz.date}
                    </h2>
                  </div>

                  <div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[16px]">
                    <Check className="h-4 w-4 sm:h-4 sm:w-4" />
                    <span>
                      {copy.correctLabel}: {correctCount}/{totalQuestions}
                    </span>
                  </div>
                </div>

                <div className="grid gap-1 sm:gap-1.5">
                  <div className="flex items-end justify-between gap-3 text-xs text-slate-600 sm:text-[16px]">
                    <span className="font-medium text-slate-700">
                      {copy.questionLabel} {currentIndex + 1}/{totalQuestions}
                    </span>
                    {currentQuestion.category ? (
                      <span className="text-right">
                        {copy.categoryLabel}: <span className="text-inherit">{currentQuestion.category}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70 sm:h-2.5">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#ec4899)] transition-all"
                      style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/65 bg-white/42 p-3.5 shadow-sm backdrop-blur-md sm:p-5">
                <h3 className="text-base font-semibold leading-6 text-slate-950 sm:text-2xl sm:leading-8">
                  {currentQuestion.question}
                </h3>

                <div className="mt-3 grid gap-2.5 sm:mt-5 sm:gap-3 md:grid-cols-2">
                  <div
                    className="contents"
                  >
                    {options.map((answer, index) => {
                      const hasAnswered = selectedAnswer !== null;
                      const isCorrect = answer === currentQuestion.correctAnswer;
                      const isSelected = answer === selectedAnswer;
                      const baseClass =
                        "flex min-h-11 items-start rounded-2xl border px-3 py-2.5 text-left text-sm font-medium leading-5 transition sm:min-h-14 sm:px-4 sm:py-3 sm:text-base sm:leading-6";
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
                </div>

                {currentQuestion.questionImageUrl ? (
                  <Image
                    src={currentQuestion.questionImageUrl}
                    alt={currentQuestion.question}
                    width={1200}
                    height={675}
                    className="mt-3 h-44 w-full rounded-2xl border border-slate-200 object-cover sm:mt-5 sm:h-64 lg:h-72"
                  />
                ) : null}

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
                        disabled={isFinishingQuiz}
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
              <div className="relative overflow-hidden rounded-3xl border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.26),rgba(255,255,255,0.14))] p-4 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-md">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  {scoreTitle.title}
                </h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  <span className="font-semibold text-slate-900">You got {reportScore}.</span>
                  <span>{` ${reportBodyRest}`}</span>
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{copied ? copy.copied : copy.share}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-full border border-white/70 bg-white/65 px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-white/90 hover:bg-white/80"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>{copy.retry}</span>
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.16))] p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-lg font-semibold text-slate-950">{copy.reviewTitle}</h4>
                  <button
                    type="button"
                    onClick={() => setReviewFilter((value) => (value === "all" ? "wrong" : "all"))}
                    className="inline-flex w-fit items-center rounded-full border border-white/70 bg-white/55 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-white/90 hover:bg-white/72"
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
                        className="rounded-2xl border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.42))] p-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur-md transition hover:border-white/90 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(255,255,255,0.5))] sm:p-4"
                      >
                        <summary className="flex cursor-pointer list-none items-start gap-2 sm:gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full sm:h-6 sm:w-6 ${
                              isCorrect
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {isCorrect ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                          </span>
                          <span className="flex-1 text-[15px] font-medium leading-6 text-slate-900 sm:text-[18px] sm:leading-7">
                            Q{index + 1}. {question.question}
                          </span>
                        </summary>
                        <div className="mt-3 grid gap-2.5 pl-0 sm:mt-4 sm:gap-3 sm:pl-9">
                          {question.category ? (
                            <div className="inline-flex w-fit items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                              {question.category}
                            </div>
                          ) : null}
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[15px] leading-6 text-slate-800 sm:px-4 sm:py-3 sm:text-[16px] sm:leading-7">
                            <span className="font-semibold text-slate-900">{copy.correctLabel}: </span>
                            <span>{question.correctAnswer}</span>
                          </div>
                          {question.explanation ? (
                            <div className="rounded-xl border border-white/70 bg-white/55 px-3 py-2.5 text-[15px] leading-6 text-slate-700 backdrop-blur-sm sm:px-4 sm:py-3 sm:text-[16px] sm:leading-7">
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
  );
}

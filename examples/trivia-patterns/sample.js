const sampleDay = {
  id: "daily-quiz-2026-04-18",
  dayNumber: 181,
  date: "2026-04-18",
  questions: [
    {
      category: "Science & Nature",
      question: "Why do fingerprints often look sharper after your hands have been in water for a while?",
      correct_answer: "The skin wrinkles due to a nerve-controlled response",
      incorrect_answers: [
        "Water permanently enlarges the ridges",
        "The outer skin layer dissolves slightly",
        "Tiny muscles in the fingers push the ridges outward"
      ],
      explanation: "Finger wrinkling is not just passive swelling. It is largely a nerve-mediated response that may improve grip on wet surfaces."
    },
    {
      category: "History",
      question: "Why did some ancient libraries attach scroll labels to the outside rather than writing only on the inside?",
      correct_answer: "So the contents could be identified while stored",
      incorrect_answers: [
        "To prevent copying by visitors",
        "To improve ink durability in sunlight",
        "Because inner text was considered sacred"
      ],
      explanation: "External tags or labels helped librarians identify works quickly while scrolls were shelved."
    },
    {
      category: "Psychology",
      question: "When people value an item more simply because they own it, what effect is being demonstrated?",
      correct_answer: "The endowment effect",
      incorrect_answers: [
        "The framing effect",
        "The halo effect",
        "The recency effect"
      ],
      explanation: "The endowment effect describes how ownership alone can increase perceived value."
    },
    {
      category: "Geography",
      question: "Why do many major cities develop near river mouths or natural harbors?",
      correct_answer: "They provide efficient trade and transport access",
      incorrect_answers: [
        "They are always at the highest elevation nearby",
        "They have fewer weather changes than inland areas",
        "They eliminate the need for roads"
      ],
      explanation: "Natural access to shipping routes has historically made river mouths and harbors strong locations for commerce."
    },
    {
      category: "Technology",
      question: "Why is caching commonly used in web applications?",
      correct_answer: "To reduce repeated expensive work and improve response times",
      incorrect_answers: [
        "To encrypt data before it reaches the browser",
        "To increase the size of network requests",
        "To replace databases entirely"
      ],
      explanation: "Caching avoids recomputing or refetching the same information on every request."
    },
    {
      category: "Biology",
      question: "Why can desert plants survive with much less water than many garden plants?",
      correct_answer: "They have adaptations that reduce water loss",
      incorrect_answers: [
        "Their cells do not require water",
        "They store only air in their stems",
        "They photosynthesize only at night without gas exchange"
      ],
      explanation: "Many desert plants use thick tissues, waxy surfaces, and specialized gas exchange timing to conserve water."
    },
    {
      category: "Literature",
      question: "What is the main reason a narrator might be called unreliable?",
      correct_answer: "Their account may be incomplete, biased, or misleading",
      incorrect_answers: [
        "They never appear in the first chapter",
        "They speak in short sentences",
        "They describe multiple locations"
      ],
      explanation: "An unreliable narrator cannot be fully trusted to present events accurately."
    },
    {
      category: "Economics",
      question: "What problem is diversification mainly intended to reduce in investing?",
      correct_answer: "Exposure to any single asset or sector",
      incorrect_answers: [
        "All market risk of every kind",
        "Inflation permanently",
        "The need to track performance"
      ],
      explanation: "Diversification spreads exposure, which can reduce concentration risk even though it cannot remove all risk."
    },
    {
      category: "Physics",
      question: "Why does a metal spoon feel colder than a wooden spoon in the same room?",
      correct_answer: "Metal transfers heat away from your hand faster",
      incorrect_answers: [
        "Metal is always actually at a lower temperature",
        "Wood produces its own heat",
        "Metal attracts cold from the air"
      ],
      explanation: "The sensation comes from thermal conductivity, not from one object being magically colder."
    },
    {
      category: "Art",
      question: "Why do painters often make a focal point stand out using contrast?",
      correct_answer: "Contrast guides the viewer's attention",
      incorrect_answers: [
        "Contrast prevents color mixing",
        "It makes every area equally important",
        "It removes the need for composition"
      ],
      explanation: "Contrast in value, color, or detail is a basic tool for directing the eye."
    }
  ]
};

const archiveDays = [
  {
    dayNumber: 181,
    date: "2026-04-18",
    estimatedTime: "2-3 min",
    theme: "mixed knowledge",
    firstQuestion: sampleDay.questions[0].question
  },
  {
    dayNumber: 180,
    date: "2026-04-17",
    estimatedTime: "2-3 min",
    theme: "science-heavy",
    firstQuestion: "Sometimes a rainbow appears in fog, but instead of bright bands it looks like a pale ghostly arc. What usually makes a fogbow look nearly white?"
  },
  {
    dayNumber: 179,
    date: "2026-04-16",
    estimatedTime: "2-3 min",
    theme: "cold places",
    firstQuestion: "Some Arctic hills slowly rise in permafrost regions as pressure builds from below. What is typically found inside a pingo?"
  },
  {
    dayNumber: 178,
    date: "2026-04-15",
    estimatedTime: "2-3 min",
    theme: "engineering",
    firstQuestion: "How can workers build a bridge support in the middle of a river without the whole site staying underwater?"
  }
];

const STORAGE_KEYS = {
  sampleCompletion: "trivia-patterns-sample-completion",
  archiveCompleted: "trivia-patterns-archive-completed"
};

const analytics = {
  track(eventName, payload) {
    console.log("[trivia-patterns]", eventName, payload);
  }
};

const state = {
  currentIndex: 0,
  correctCount: 0,
  answerHistory: [],
  hideCompleted: false,
  pendingAdvance: false
};

function shuffleAnswers(question) {
  const answers = [question.correct_answer, ...question.incorrect_answers];
  for (let i = answers.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return answers;
}

function restoreQuizIfCompleted() {
  const raw = localStorage.getItem(STORAGE_KEYS.sampleCompletion);
  if (!raw) {
    return false;
  }

  try {
    const saved = JSON.parse(raw);
    if (!saved || !saved.completed) {
      return false;
    }

    state.currentIndex = sampleDay.questions.length;
    state.correctCount = saved.correctCount || 0;
    state.answerHistory = saved.answerHistory || [];
    renderReport();
    return true;
  } catch (error) {
    console.error("Failed to restore sample completion", error);
    return false;
  }
}

function renderQuiz() {
  const question = sampleDay.questions[state.currentIndex];
  if (!question) {
    renderReport();
    return;
  }

  document.getElementById("quiz-active-view").classList.remove("hidden");
  document.getElementById("quiz-report-view").classList.add("hidden");
  document.getElementById("quiz-day-number").textContent = String(sampleDay.dayNumber);
  document.getElementById("quiz-date-chip").textContent = sampleDay.date;
  document.getElementById("question-index").textContent = String(state.currentIndex + 1);
  document.getElementById("question-category").textContent = question.category;
  document.getElementById("question-text").textContent = question.question;
  document.getElementById("correct-count").textContent = String(state.correctCount);
  document.getElementById("quiz-progress-fill").style.width = `${((state.currentIndex + 1) / sampleDay.questions.length) * 100}%`;
  state.pendingAdvance = false;

  const feedback = document.getElementById("answer-feedback");
  feedback.className = "daily-explanation-box-clone hidden";
  feedback.innerHTML = "";

  const options = document.getElementById("question-options");
  options.innerHTML = "";

  shuffleAnswers(question).forEach((answer, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "daily-option-button-clone";
    button.innerHTML = `<strong>${String.fromCharCode(65 + index)}.</strong> ${answer}`;
    button.addEventListener("click", () => handleAnswer(answer, button));
    options.appendChild(button);
  });
}

function handleAnswer(selectedAnswer, selectedButton) {
  if (state.pendingAdvance) {
    return;
  }

  if (state.currentIndex === 0) {
    analytics.track("daily_quiz_started", {
      dayId: sampleDay.id,
      date: sampleDay.date,
      questionCount: sampleDay.questions.length
    });
  }

  const question = sampleDay.questions[state.currentIndex];
  const isCorrect = selectedAnswer === question.correct_answer;
  const optionButtons = Array.from(document.querySelectorAll(".daily-option-button-clone"));
  optionButtons.forEach((button) => {
    button.disabled = true;
  });

  if (isCorrect) {
    state.correctCount += 1;
    selectedButton.classList.add("correct");
  } else {
    selectedButton.classList.add("incorrect");
    optionButtons.forEach((button) => {
      if (button.textContent.includes(question.correct_answer)) {
        button.classList.add("correct");
      }
    });
  }

  state.answerHistory.push({
    questionNumber: state.currentIndex + 1,
    category: question.category,
    question: question.question,
    selectedAnswer,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    isCorrect
  });

  analytics.track("daily_quiz_answered", {
    dayId: sampleDay.id,
    questionNumber: state.currentIndex + 1,
    category: question.category,
    isCorrect
  });

  state.pendingAdvance = true;
  document.getElementById("correct-count").textContent = String(state.correctCount);
  showFeedback(isCorrect, question);
}

function showFeedback(isCorrect, question) {
  const feedback = document.getElementById("answer-feedback");
  const isLastQuestion = state.currentIndex === sampleDay.questions.length - 1;
  const buttonText = isLastQuestion ? "View Report" : "Next Question";
  feedback.className = `daily-explanation-box-clone ${isCorrect ? "correct" : "incorrect"}`;
  feedback.innerHTML = `
    <div class="feedback-title">${isCorrect ? "Correct" : `Incorrect. Correct answer: ${question.correct_answer}`}</div>
    <div>${question.explanation}</div>
    <div class="next-question-row-clone">
      <button id="next-question-button" type="button" class="next-question-button-clone">${buttonText}</button>
    </div>
  `;

  const nextButton = document.getElementById("next-question-button");
  if (nextButton) {
    nextButton.addEventListener("click", advanceToNextQuestion);
  }
}

function advanceToNextQuestion() {
  if (!state.pendingAdvance) {
    return;
  }

  state.currentIndex += 1;
  state.pendingAdvance = false;

  if (state.currentIndex >= sampleDay.questions.length) {
    saveCompletion();
    analytics.track("daily_quiz_completed", {
      dayId: sampleDay.id,
      date: sampleDay.date,
      correctAnswers: state.correctCount,
      totalQuestions: sampleDay.questions.length
    });
    markArchiveDayCompleted(sampleDay.dayNumber);
    renderReport();
    renderArchive();
    return;
  }

  renderQuiz();
}

function saveCompletion() {
  localStorage.setItem(STORAGE_KEYS.sampleCompletion, JSON.stringify({
    completed: true,
    correctCount: state.correctCount,
    answerHistory: state.answerHistory
  }));
}

function clearCompletion() {
  localStorage.removeItem(STORAGE_KEYS.sampleCompletion);
  state.currentIndex = 0;
  state.correctCount = 0;
  state.answerHistory = [];
  renderQuiz();
}

function groupCategoryStats(history) {
  const stats = {};
  history.forEach((record) => {
    if (!stats[record.category]) {
      stats[record.category] = { correct: 0, total: 0 };
    }

    stats[record.category].total += 1;
    if (record.isCorrect) {
      stats[record.category].correct += 1;
    }
  });
  return stats;
}

function getCompletedDays() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.archiveCompleted) || "[]");
  } catch (error) {
    console.error("Failed to read completed archive days", error);
    return [];
  }
}

function markArchiveDayCompleted(dayNumber) {
  const completed = getCompletedDays();
  if (!completed.includes(dayNumber)) {
    completed.push(dayNumber);
    localStorage.setItem(STORAGE_KEYS.archiveCompleted, JSON.stringify(completed));
  }
}

function renderArchive() {
  const completedDays = getCompletedDays();
  const archiveGrid = document.getElementById("archive-grid");
  archiveGrid.innerHTML = "";

  archiveDays.forEach((day) => {
    const completed = completedDays.includes(day.dayNumber);
    const hidden = state.hideCompleted && completed;
    const card = document.createElement("a");
    card.href = "#";
    card.className = `archive-card-clone${hidden ? " hidden-card" : ""}`;
    card.innerHTML = `
      <div class="archive-card-inner-clone">
        <div class="archive-card-top-clone">
          <div>
            <span class="archive-day-title-clone">Daily Trivia Quiz - Day ${day.dayNumber}</span>
            <span class="archive-date-clone">${day.date}</span>
          </div>
          <div class="status-badge-wrap-clone">
            <span class="status-badge-clone${completed ? " completed" : ""}">
              ${completed ? "Completed" : "⭐ Not Played"}
            </span>
          </div>
        </div>
        <div>
          <div class="archive-question-wrap-clone">
            <h2 class="archive-question-clone">${day.firstQuestion}</h2>
          </div>
        </div>
      </div>
    `;

    card.addEventListener("click", (event) => {
      event.preventDefault();
      analytics.track("archive_card_clicked", {
        dayNumber: day.dayNumber,
        date: day.date,
        completed
      });
    });

    archiveGrid.appendChild(card);
  });
}

function renderReport() {
  document.getElementById("quiz-active-view").classList.add("hidden");
  const reportView = document.getElementById("quiz-report-view");
  reportView.classList.remove("hidden");

  const total = sampleDay.questions.length;
  const ratio = `${state.correctCount}/${total}`;
  const wrongAnswersCount = state.answerHistory.filter((record) => !record.isCorrect).length;
  const titleData = getEncouragementContent(state.correctCount, total);

  const reviewItems = state.answerHistory.map((record) => `
    <details class="review-item-clone question-review-item" data-correct="${record.isCorrect}">
      <summary>
        <span class="review-item-icon-clone ${record.isCorrect ? "correct" : "incorrect"}">${record.isCorrect ? "✓" : "✗"}</span>
        <span class="review-item-question-clone">Q${record.questionNumber}: ${record.question}</span>
        <span class="review-item-chevron-clone">▾</span>
      </summary>
      <div class="review-item-body-clone">
        <div>
          <span class="review-category-tag-clone">${record.category}</span>
        </div>
        <div class="review-answer-card-clone">
          <div class="review-answer-label-clone">Correct Answer</div>
          <div class="review-answer-text-clone">${record.correctAnswer}</div>
        </div>
        <div class="review-explanation-card-clone">
          <div class="review-explanation-label-clone">Explanation</div>
          <div class="review-explanation-text-clone">${record.explanation}</div>
        </div>
      </div>
    </details>
  `).join("");

  reportView.innerHTML = `
    <div class="report-shell">
      <div class="report-title-card-clone">
        <div class="report-title-kicker-clone">${titleData.icon}</div>
        <h3 class="report-title-heading-clone">${titleData.title}</h3>
        <p class="report-title-copy-clone">${titleData.copy.replace("{score}", ratio)}</p>
      </div>
      <div class="report-share-row-clone">
        <button id="share-report" class="report-share-button-clone" type="button">Share</button>
      </div>
      <div class="report-block-clone">
        <div class="report-block-heading-clone">
          <div class="report-block-title-clone">Question Review</div>
          <button id="toggle-review-filter" class="report-filter-button-clone" data-filter="all" type="button">Show Wrong Only (${wrongAnswersCount})</button>
        </div>
        <div id="question-review-list" class="review-list-clone">${reviewItems}</div>
      </div>
      <div class="report-restart-row-clone">
        <button id="restart-quiz" class="report-restart-button-clone" type="button">Restart Sample</button>
      </div>
    </div>
  `;

  document.getElementById("share-report").addEventListener("click", shareReport);
  const toggleBtn = document.getElementById("toggle-review-filter");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const currentFilter = toggleBtn.dataset.filter;

      if (currentFilter === "all") {
        document.querySelectorAll(".question-review-item").forEach((item) => {
          const isCorrect = item.dataset.correct === "true";
          item.style.display = isCorrect ? "none" : "block";
        });
        toggleBtn.dataset.filter = "wrong";
        toggleBtn.textContent = "Show All";
      } else {
        document.querySelectorAll(".question-review-item").forEach((item) => {
          item.style.display = "block";
        });
        toggleBtn.dataset.filter = "all";
        toggleBtn.textContent = `Show Wrong Only (${wrongAnswersCount})`;
      }
    });
  }

  document.getElementById("restart-quiz").addEventListener("click", () => {
    analytics.track("report_restart_clicked", { dayId: sampleDay.id });
    clearCompletion();
  });
}

function getEncouragementContent(correctCount, totalCount) {
  if (correctCount === totalCount) {
    return {
      icon: "🏆",
      title: "Perfect Score!",
      copy: "You nailed all {score} questions. This is the same celebratory report pattern used to turn completion into a satisfying result moment."
    };
  }

  if (correctCount >= Math.ceil(totalCount * 0.7)) {
    return {
      icon: "🔥",
      title: "Strong Finish",
      copy: "You scored {score}. The report now mirrors the production pattern more closely with review and knowledge blocks below."
    };
  }

  return {
    icon: "🧠",
    title: "Nice Run",
    copy: "You scored {score}. Review the questions below and use the knowledge summary to spot the categories that need another pass."
  };
}

function shareReport() {
  const text = `Daily Trivia sample: scored ${state.correctCount}/${sampleDay.questions.length} on ${sampleDay.date}.`;
  analytics.track("report_share_clicked", {
    dayId: sampleDay.id,
    score: state.correctCount,
    total: sampleDay.questions.length
  });

  navigator.clipboard.writeText(text).then(() => {
    const button = document.getElementById("share-report");
    if (!button) {
      return;
    }

    const original = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1200);
  }).catch(() => {
    window.alert(text);
  });
}

function bindArchiveToggle() {
  const button = document.getElementById("toggle-completed");
  button.addEventListener("click", () => {
    state.hideCompleted = !state.hideCompleted;
    button.textContent = state.hideCompleted ? "Show completed cards" : "Hide completed cards";
    analytics.track("archive_visibility_toggled", { hideCompleted: state.hideCompleted });
    renderArchive();
  });
}

function init() {
  bindArchiveToggle();
  renderArchive();
  if (!restoreQuizIfCompleted()) {
    renderQuiz();
  }
}

init();

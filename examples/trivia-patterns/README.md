# Trivia Patterns Reference

This folder is a standalone reference sample. It does not modify the production site and does not depend on the existing daily trivia pages.

## Included patterns

1. `Daily 10 Questions`
   A compact quiz module with:
   - progress bar
   - answer feedback
   - completion persistence
   - analytics hook examples

2. `Archive Card With First-Question Teaser`
   A discovery pattern where each archive card previews the first question instead of just showing metadata.

3. `Answer Report`
   A post-completion report with:
   - score summary
   - category breakdown
   - per-question review
   - share action

## Files

- `index.html`
  Standalone reference page.
- `styles.css`
  Visual tokens and glass-style component examples.
- `sample.js`
  Minimal state, rendering, persistence, and analytics contract examples.

## LocalStorage in this sample

The sample already uses `localStorage` in code. It is meant to show a practical persistence pattern that other sites can copy.

### Keys

- `trivia-patterns-sample-completion`
  Stores the finished daily sample state:
  - `completed`
  - `correctCount`
  - `answerHistory`

- `trivia-patterns-archive-completed`
  Stores an array of completed archive day numbers.

### Read/write flow

1. On page load, `restoreQuizIfCompleted()` reads `trivia-patterns-sample-completion`.
2. On quiz completion, `saveCompletion()` writes the final score and answer history.
3. When the daily sample is completed, `markArchiveDayCompleted()` updates the completed archive list.
4. When the user clicks restart, the sample removes the completion record and starts over.

### Relevant functions

- `restoreQuizIfCompleted()`
- `saveCompletion()`
- `clearCompletion()`
- `getCompletedDays()`
- `markArchiveDayCompleted()`

## How other sites should use this

Copy the pattern, not the page.

What to preserve:
- the separation between data, rendering, and analytics
- the first-question teaser concept for archive discovery
- the report structure that turns score into review
- the glass tokens and spacing rhythm if the target site wants the same feel
- the persistence boundary: quiz result storage and completed-day storage should stay separate

What to replace:
- colors and fonts
- route structure
- question source
- analytics destination
- report copy tone

## Suggested integration contract

Use a site-specific analytics adapter instead of hardcoding `gtag` into components:

```js
analytics.track("daily_quiz_started", payload);
analytics.track("daily_quiz_answered", payload);
analytics.track("daily_quiz_completed", payload);
analytics.track("archive_card_clicked", payload);
analytics.track("report_share_clicked", payload);
```

## Open locally

Open this file directly in a browser:

- `examples/trivia-patterns/index.html`

Or serve the repo locally with any static file server.

(() => {
  "use strict";

  const questions = {
    "assignment-print": {
      answers: ["2"],
      correctFeedback: "正解です。x に代入された 2 が表示されます。"
    },
    "reassignment-print": {
      answers: ["3"],
      correctFeedback: "正解です。再代入後の x の値は 3 です。"
    },
    "rectangle-area": {
      answers: ["12"],
      correctFeedback: "正解です。4 × 3 なので、出力は 12 です。"
    },
    "rectangle-area-changed": {
      answers: ["18"],
      correctFeedback: "正解です。width を 6 に変えると、出力は 18 です。"
    },
    "trace-multiplier-changed": {
      answers: ["15"],
      correctFeedback: "正解です。y = 5 なので、x = y * 3 の結果は 15 です。"
    },
    "practice-trace": {
      answers: ["6"],
      correctFeedback: "正解です。最後に表示される値は 6 です。"
    },
    "practice-total": {
      answers: ["360"],
      correctFeedback: "正解です。120 × 3 なので、出力は 360 です。"
    },
    "practice-total-changed": {
      answers: ["450"],
      correctFeedback: "正解です。150 × 3 なので、出力は 450 です。"
    }
  };

  let widgetCount = 0;

  function normalize(value) {
    return value
      .trim()
      .replace(/[０-９]/g, (character) =>
        String.fromCharCode(character.charCodeAt(0) - 0xfee0)
      );
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function buildWidget(root, question) {
    widgetCount += 1;
    const inputId = `answer-check-widget-${widgetCount}`;
    const form = createElement("form", "answer-check-widget__form");
    const label = createElement("label", "answer-check-widget__label", "答え");
    label.htmlFor = inputId;

    const input = createElement("input", "answer-check-widget__input");
    input.id = inputId;
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("aria-describedby", `${inputId}-feedback`);

    const button = createElement("button", "answer-check-widget__button", "確認");
    button.type = "submit";

    const feedback = createElement("p", "answer-check-widget__feedback");
    feedback.id = `${inputId}-feedback`;
    feedback.setAttribute("aria-live", "polite");
    feedback.setAttribute("aria-atomic", "true");

    form.append(label, input, button, feedback);
    root.append(form);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const answer = normalize(input.value);
      const isCorrect = question.answers.includes(answer);

      if (isCorrect) {
        feedback.textContent = question.correctFeedback;
        feedback.className =
          "answer-check-widget__feedback answer-check-widget__feedback--correct";
      } else {
        feedback.textContent =
          answer === ""
            ? "答えを入力してから確認してください。"
            : "もう一度考えてみましょう。変数の値を1行ずつ追ってください。";
        feedback.className =
          "answer-check-widget__feedback answer-check-widget__feedback--incorrect";
      }
    });
  }

  function initialize() {
    document.querySelectorAll("[data-answer-check]").forEach((root) => {
      if (root.dataset.answerCheckReady === "true") return;
      const question = questions[root.dataset.answerCheck];
      if (!question) return;
      root.dataset.answerCheckReady = "true";
      buildWidget(root, question);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

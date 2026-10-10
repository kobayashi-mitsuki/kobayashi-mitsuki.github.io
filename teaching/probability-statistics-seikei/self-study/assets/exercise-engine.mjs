const NUMBER_PATTERN = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d{1,3}))?$/;

function pow10(exponent) {
  return 10n ** BigInt(exponent);
}

function parseDecimal(value) {
  const match = NUMBER_PATTERN.exec(value);
  if (!match) return null;

  const sign = match[1] === "-" ? -1n : 1n;
  const integerPart = match[2] || "0";
  const fractionalPart = match[2] !== undefined ? (match[3] || "") : match[4];
  const exponent = Number(match[5] || "0");
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) return null;

  let numerator = sign * BigInt(`${integerPart}${fractionalPart}` || "0");
  let denominator = pow10(fractionalPart.length);
  if (exponent > 0) numerator *= pow10(exponent);
  if (exponent < 0) denominator *= pow10(-exponent);
  return { numerator, denominator };
}

export function parseRational(rawValue) {
  if (typeof rawValue !== "string") return null;
  const value = rawValue.normalize("NFKC").trim();
  if (!value || value.length > 100) return null;

  const parts = value.split("/");
  if (parts.length > 2) return null;
  const left = parseDecimal(parts[0].trim());
  if (!left) return null;
  if (parts.length === 1) return left;

  const right = parseDecimal(parts[1].trim());
  if (!right || right.numerator === 0n) return null;
  let numerator = left.numerator * right.denominator;
  let denominator = left.denominator * right.numerator;
  if (denominator < 0n) {
    numerator *= -1n;
    denominator *= -1n;
  }
  return { numerator, denominator };
}

export function numericEquivalent(leftValue, rightValue) {
  const left = parseRational(leftValue);
  const right = parseRational(rightValue);
  return Boolean(
    left &&
      right &&
      left.numerator * right.denominator === right.numerator * left.denominator,
  );
}

export function normalizeText(value) {
  return String(value).normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function equalChoiceSets(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (new Set(left).size !== left.length || new Set(right).size !== right.length) return false;
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

export function responseIsEmpty(item, response) {
  if (item.type === "multiple_choice") return !Array.isArray(response) || response.length === 0;
  return typeof response !== "string" || response.trim() === "";
}

export function gradeItem(item, response) {
  if (responseIsEmpty(item, response)) return { answered: false, correct: false };

  if (item.type === "single_choice") {
    return { answered: true, correct: response === item.answer };
  }
  if (item.type === "multiple_choice") {
    return { answered: true, correct: equalChoiceSets(response, item.answer) };
  }
  if (item.type === "numeric") {
    const accepted = [item.answer, ...(item.accepted_answers || [])];
    return {
      answered: true,
      correct: accepted.some((answer) => numericEquivalent(response, answer)),
    };
  }
  if (item.type === "text") {
    const normalizedResponse = normalizeText(response);
    const accepted = [item.answer, ...(item.accepted_answers || [])];
    return {
      answered: true,
      correct: accepted.some((answer) => normalizedResponse === normalizeText(answer)),
    };
  }
  return { answered: true, correct: false };
}

function appendRichText(parent, value) {
  const lines = String(value).replace(/\r\n/g, "\n").split("\n");
  let list = null;
  let paragraphLines = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const paragraph = document.createElement("p");
    appendMathText(paragraph, paragraphLines.join(" "));
    parent.append(paragraph);
    paragraphLines = [];
  };

  for (const line of lines) {
    if (line.startsWith("- ")) {
      flushParagraph();
      if (!list) {
        list = document.createElement("ul");
        parent.append(list);
      }
      const item = document.createElement("li");
      appendMathText(item, line.slice(2));
      list.append(item);
    } else if (line.trim() === "") {
      flushParagraph();
      list = null;
    } else {
      list = null;
      paragraphLines.push(line.trim());
    }
  }
  flushParagraph();
}

function appendMathText(parent, value) {
  const text = String(value);
  const pattern = /\$\$([\s\S]*?)\$\$|\$([^$\n]+?)\$/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) parent.append(document.createTextNode(text.slice(cursor, match.index)));
    const math = document.createElement(match[1] === undefined ? "span" : "div");
    math.className = match[1] === undefined ? "math inline" : "math display";
    math.textContent = match[1] === undefined ? `\\(${match[2]}\\)` : `\\[${match[1]}\\]`;
    parent.append(math);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
}

function optionText(item, optionId) {
  const option = (item.options || []).find((candidate) => candidate.id === optionId);
  return option ? `${option.id}. ${option.text}` : String(optionId);
}

function correctAnswerLabel(item) {
  if (item.type === "single_choice") return optionText(item, item.answer);
  if (item.type === "multiple_choice") {
    return item.answer.map((answer) => optionText(item, answer)).join("／");
  }
  return item.answer;
}

class ExerciseApp {
  constructor(root, data) {
    this.root = root;
    this.data = data;
    this.items = data.sections.flatMap((section) => section.items);
    this.results = new Map();
  }

  render() {
    this.root.replaceChildren();
    this.root.classList.add("exercise-app");

    if (this.data.status !== "published") {
      const draftNotice = document.createElement("div");
      draftNotice.className = "exercise-draft-notice";
      draftNotice.setAttribute("role", "status");
      draftNotice.textContent = "公開前レビュー用：問題データは現在 draft です。";
      this.root.append(draftNotice);
    }

    const introduction = document.createElement("div");
    introduction.className = "exercise-introduction";
    appendRichText(introduction, this.data.student_note);
    this.root.append(introduction);

    this.summary = document.createElement("div");
    this.summary.className = "exercise-summary";
    this.summary.setAttribute("aria-live", "polite");
    this.root.append(this.summary);

    for (const section of this.data.sections) this.renderSection(section);

    const actions = document.createElement("div");
    actions.className = "exercise-global-actions";
    const gradeAllButton = document.createElement("button");
    gradeAllButton.type = "button";
    gradeAllButton.className = "exercise-button exercise-button-primary";
    gradeAllButton.textContent = "すべての解答を確認";
    gradeAllButton.addEventListener("click", () => this.gradeAll());
    const resetAllButton = document.createElement("button");
    resetAllButton.type = "button";
    resetAllButton.className = "exercise-button";
    resetAllButton.textContent = "すべて解き直す";
    resetAllButton.addEventListener("click", () => this.resetAll());
    actions.append(gradeAllButton, resetAllButton);
    this.root.append(actions);

    this.updateSummary();
    this.typeset(this.root);
  }

  renderSection(section) {
    const sectionElement = document.createElement("section");
    sectionElement.className = "exercise-section";
    sectionElement.id = `section-${section.id}`;
    const heading = document.createElement("h2");
    heading.textContent = section.title;
    sectionElement.append(heading);

    if (section.context) {
      const context = document.createElement("div");
      context.className = "exercise-context";
      const contextHeading = document.createElement("p");
      contextHeading.className = "exercise-context-heading";
      contextHeading.textContent = "共通の前提";
      context.append(contextHeading);
      appendRichText(context, section.context);
      sectionElement.append(context);
    }

    for (const item of section.items) {
      const number = this.items.findIndex((candidate) => candidate.id === item.id) + 1;
      sectionElement.append(this.renderItem(item, number));
    }
    this.root.append(sectionElement);
  }

  renderItem(item, number) {
    const article = document.createElement("article");
    article.className = "exercise-item";
    article.dataset.itemId = item.id;

    const header = document.createElement("div");
    header.className = "exercise-item-header";
    const heading = document.createElement("h3");
    heading.textContent = `問題 ${number}`;
    const position = document.createElement("span");
    position.className = "exercise-position";
    position.textContent = `${number} / ${this.items.length}`;
    header.append(heading, position);
    article.append(header);

    const prompt = document.createElement("div");
    prompt.className = "exercise-prompt";
    appendRichText(prompt, item.prompt);
    article.append(prompt);

    const answerArea = document.createElement("div");
    answerArea.className = "exercise-answer-area";
    answerArea.dataset.answerFor = item.id;
    if (item.type === "single_choice" || item.type === "multiple_choice") {
      answerArea.append(this.renderChoices(item));
    } else {
      const label = document.createElement("label");
      label.className = "exercise-input-label";
      label.htmlFor = `answer-${item.id}`;
      label.textContent = item.type === "numeric" ? "数値を入力" : "解答を入力";
      const input = document.createElement("input");
      input.id = `answer-${item.id}`;
      input.className = "exercise-text-input";
      input.type = "text";
      input.autocomplete = "off";
      input.inputMode = item.type === "numeric" ? "decimal" : "text";
      input.addEventListener("input", () => this.markChanged(item.id));
      answerArea.append(label, input);
    }
    article.append(answerArea);

    const actions = document.createElement("div");
    actions.className = "exercise-item-actions";
    const checkButton = document.createElement("button");
    checkButton.type = "button";
    checkButton.className = "exercise-button exercise-button-primary";
    checkButton.textContent = "解答を確認";
    checkButton.addEventListener("click", () => this.gradeOne(item, article));
    const retryButton = document.createElement("button");
    retryButton.type = "button";
    retryButton.className = "exercise-button";
    retryButton.textContent = "解き直す";
    retryButton.addEventListener("click", () => this.resetOne(item, article));
    actions.append(checkButton, retryButton);
    article.append(actions);

    const feedback = document.createElement("div");
    feedback.className = "exercise-feedback";
    feedback.dataset.feedbackFor = item.id;
    feedback.setAttribute("aria-live", "polite");
    feedback.hidden = true;
    article.append(feedback);
    return article;
  }

  renderChoices(item) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "exercise-choices";
    const legend = document.createElement("legend");
    legend.textContent = item.type === "multiple_choice" ? "当てはまるものをすべて選択" : "1つ選択";
    fieldset.append(legend);
    for (const option of item.options) {
      const label = document.createElement("label");
      label.className = "exercise-choice";
      const input = document.createElement("input");
      input.type = item.type === "multiple_choice" ? "checkbox" : "radio";
      input.name = `answer-${item.id}`;
      input.value = option.id;
      input.addEventListener("change", () => this.markChanged(item.id));
      const text = document.createElement("span");
      appendMathText(text, `${option.id}. ${option.text}`);
      label.append(input, text);
      fieldset.append(label);
    }
    return fieldset;
  }

  readResponse(item, article) {
    if (item.type === "single_choice") {
      return article.querySelector(`input[name="answer-${item.id}"]:checked`)?.value || "";
    }
    if (item.type === "multiple_choice") {
      return [...article.querySelectorAll(`input[name="answer-${item.id}"]:checked`)].map(
        (input) => input.value,
      );
    }
    return article.querySelector(".exercise-text-input").value;
  }

  gradeOne(item, article, { focusOnEmpty = true } = {}) {
    const result = gradeItem(item, this.readResponse(item, article));
    const feedback = article.querySelector(".exercise-feedback");
    if (!result.answered) {
      feedback.className = "exercise-feedback exercise-feedback-unanswered";
      feedback.textContent = "解答を入力または選択してください。";
      feedback.hidden = false;
      if (focusOnEmpty) article.querySelector("input")?.focus();
      return result;
    }

    this.results.set(item.id, result.correct);
    feedback.replaceChildren();
    feedback.className = result.correct
      ? "exercise-feedback exercise-feedback-correct"
      : "exercise-feedback exercise-feedback-incorrect";
    const verdict = document.createElement("p");
    verdict.className = "exercise-verdict";
    verdict.textContent = result.correct ? "正解です。" : "不正解です。";
    const answer = document.createElement("div");
    answer.className = "exercise-correct-answer";
    const answerLabel = document.createElement("strong");
    answerLabel.textContent = "正解：";
    answer.append(answerLabel);
    appendMathText(answer, correctAnswerLabel(item));
    const explanation = document.createElement("div");
    explanation.className = "exercise-explanation";
    const explanationLabel = document.createElement("strong");
    explanationLabel.textContent = "解説";
    explanation.append(explanationLabel);
    appendRichText(explanation, item.explanation);
    feedback.append(verdict, answer, explanation);
    feedback.hidden = false;
    this.updateSummary();
    this.typeset(feedback);
    return result;
  }

  gradeAll() {
    let firstUnanswered = null;
    for (const item of this.items) {
      const article = this.root.querySelector(`[data-item-id="${item.id}"]`);
      const result = this.gradeOne(item, article, { focusOnEmpty: false });
      if (!result.answered && !firstUnanswered) firstUnanswered = article;
    }
    this.updateSummary();
    firstUnanswered?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  resetOne(item, article) {
    for (const input of article.querySelectorAll("input")) {
      if (input.type === "checkbox" || input.type === "radio") input.checked = false;
      else input.value = "";
    }
    this.results.delete(item.id);
    const feedback = article.querySelector(".exercise-feedback");
    feedback.hidden = true;
    feedback.replaceChildren();
    this.updateSummary();
  }

  resetAll() {
    for (const item of this.items) {
      const article = this.root.querySelector(`[data-item-id="${item.id}"]`);
      this.resetOne(item, article);
    }
    this.root.querySelector("input")?.focus();
  }

  markChanged(itemId) {
    if (!this.results.has(itemId)) return;
    this.results.delete(itemId);
    const feedback = this.root.querySelector(`[data-feedback-for="${itemId}"]`);
    feedback.hidden = true;
    feedback.replaceChildren();
    this.updateSummary();
  }

  updateSummary() {
    const answered = this.items.filter((item) => {
      const article = this.root.querySelector(`[data-item-id="${item.id}"]`);
      return article && !responseIsEmpty(item, this.readResponse(item, article));
    }).length;
    const correct = [...this.results.values()].filter(Boolean).length;
    this.summary.textContent = `回答済み ${answered} / ${this.items.length}　採点済み ${this.results.size} / ${this.items.length}　正解 ${correct}`;
  }

  typeset(element) {
    const mathJax = window.MathJax;
    if (!mathJax) return;
    const render = () => {
      if (mathJax.typesetPromise) {
        mathJax.typesetPromise([element]).catch((error) => console.error(error));
      }
    };
    if (mathJax.startup?.promise) mathJax.startup.promise.then(render).catch(console.error);
    else render();
  }
}

async function initializeExercise(root) {
  try {
    const response = await fetch(root.dataset.exerciseSrc, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    new ExerciseApp(root, data).render();
  } catch (error) {
    root.classList.add("exercise-load-error");
    root.textContent = "練習問題を読み込めませんでした。時間を置いて再度お試しください。";
    console.error("Exercise data could not be loaded", error);
  }
}

if (typeof document !== "undefined") {
  const start = () => {
    for (const root of document.querySelectorAll("[data-exercise-src]")) initializeExercise(root);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}

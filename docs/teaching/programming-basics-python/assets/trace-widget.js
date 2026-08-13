(() => {
  "use strict";

  const exercises = {
    "variables-assignment": {
      code: [
        "x = 2",
        "y = x + 3",
        "x = y * 2",
        "print(x)"
      ],
      states: [
        { x: "未定義", y: "未定義", output: "なし" },
        { x: "2", y: "未定義", output: "なし" },
        { x: "2", y: "5", output: "なし" },
        { x: "10", y: "5", output: "なし" },
        { x: "10", y: "5", output: "10" }
      ]
    }
  };

  const fieldLabels = {
    x: "x",
    y: "y",
    output: "出力"
  };

  let widgetCount = 0;

  function normalize(value) {
    return value.trim().replace(/[０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xfee0)
    );
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function appendHighlightedCode(container, source) {
    const tokenPattern = /\bprint\b|\d+|[=+*]/g;
    let lastIndex = 0;

    for (const match of source.matchAll(tokenPattern)) {
      if (match.index > lastIndex) {
        container.append(document.createTextNode(source.slice(lastIndex, match.index)));
      }

      const token = match[0];
      const tokenClass = token === "print"
        ? "bu"
        : /^\d+$/.test(token)
          ? "dv"
          : "op";
      container.append(createElement("span", tokenClass, token));
      lastIndex = match.index + token.length;
    }

    if (lastIndex < source.length) {
      container.append(document.createTextNode(source.slice(lastIndex)));
    }
  }

  function buildWidget(root, exercise) {
    let stateIndex = 0;
    let isAdvancing = false;
    let advanceTimer = null;
    const history = [];
    widgetCount += 1;

    const layout = createElement("div", "trace-widget__layout");
    const codePanel = createElement("section", "trace-widget__code-panel");
    const codeHeading = createElement("h3", "trace-widget__heading", "コード");
    const codeList = createElement("ol", "trace-widget__code");
    const codeLines = exercise.code.map((code) => {
      const line = createElement("li", "trace-widget__line");
      const codeText = createElement("code", "sourceCode python");
      appendHighlightedCode(codeText, code);
      line.append(codeText);
      codeList.append(line);
      return line;
    });
    codePanel.append(codeHeading, codeList);

    const statePanel = createElement("section", "trace-widget__state-panel");
    const stateTable = createElement("table", "trace-widget__state");
    stateTable.setAttribute("aria-label", "各コード行を実行した直後の状態");
    const stateHead = document.createElement("thead");
    const stateHeadRow = document.createElement("tr");
    Object.values(fieldLabels).forEach((label) => {
      const heading = createElement("th", "", label);
      heading.scope = "col";
      stateHeadRow.append(heading);
    });
    stateHead.append(stateHeadRow);

    const resultRows = [];
    const stateBody = document.createElement("tbody");
    exercise.code.forEach(() => {
      const row = document.createElement("tr");
      const cells = {};
      Object.keys(fieldLabels).forEach((key) => {
        const cell = document.createElement("td");
        cell.dataset.field = key;
        cells[key] = cell;
        row.append(cell);
      });
      resultRows.push(cells);
      stateBody.append(row);
    });
    stateTable.append(stateHead, stateBody);
    statePanel.append(stateTable);

    const form = createElement("form", "trace-widget__prediction");
    const predictionHeading = createElement("h3", "trace-widget__heading");
    const predictionTable = createElement("table", "trace-widget__prediction-table");
    const predictionHead = document.createElement("thead");
    const predictionHeadRow = document.createElement("tr");
    Object.values(fieldLabels).forEach((label) => {
      const heading = createElement("th", "", label);
      heading.scope = "col";
      predictionHeadRow.append(heading);
    });
    predictionHead.append(predictionHeadRow);

    const inputs = {};
    const predictionBody = document.createElement("tbody");
    const predictionRow = document.createElement("tr");

    Object.entries(fieldLabels).forEach(([key, label]) => {
      const valueCell = document.createElement("td");
      const inputId = `trace-widget-${widgetCount}-${key}`;
      const input = createElement("input", "trace-widget__input");
      input.id = inputId;
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.dataset.field = key;
      input.placeholder = key === "output" ? "例：なし" : "例：未定義";
      input.setAttribute("aria-label", `${label}の予想`);
      inputs[key] = input;
      valueCell.append(input);
      predictionRow.append(valueCell);
    });
    predictionBody.append(predictionRow);

    predictionTable.append(predictionHead, predictionBody);

    const actions = createElement("div", "trace-widget__actions");
    const checkButton = createElement("button", "trace-widget__button", "確認");
    checkButton.type = "submit";
    const resetButton = createElement("button", "trace-widget__button", "最初に戻す");
    resetButton.type = "button";
    actions.append(checkButton, resetButton);

    const feedback = createElement("p", "trace-widget__feedback");
    feedback.setAttribute("aria-live", "polite");
    feedback.setAttribute("aria-atomic", "true");
    const complete = createElement("p", "trace-widget__complete", "全ての行を実行しました。");
    complete.hidden = true;

    form.append(
      predictionHeading,
      predictionTable,
      actions,
      feedback,
      complete
    );

    const executionComparison = createElement(
      "div",
      "trace-widget__execution-comparison"
    );
    executionComparison.append(codePanel, statePanel);
    layout.append(executionComparison, form);
    root.append(layout);

    function allInputs() {
      return Object.values(inputs);
    }

    function render() {
      const isComplete = stateIndex === exercise.code.length;

      resultRows.forEach((cells, index) => {
        const snapshot = history[index];
        Object.keys(cells).forEach((key) => {
          cells[key].textContent = snapshot ? snapshot[key] : "";
        });
      });

      codeLines.forEach((line, index) => {
        const isCurrent = index === stateIndex && !isComplete;
        const isExecuted = index < stateIndex || isComplete;
        line.classList.toggle("trace-widget__line--current", isCurrent);
        line.classList.toggle("trace-widget__line--executed", isExecuted);
        line.classList.toggle(
          "trace-widget__line--pending",
          !isCurrent && !isExecuted
        );
        line.removeAttribute("aria-current");
        if (isCurrent) line.setAttribute("aria-current", "step");
      });

      allInputs().forEach((input) => {
        input.disabled = isComplete || isAdvancing;
      });
      checkButton.disabled = isComplete || isAdvancing;
      complete.hidden = !isComplete;
      predictionHeading.textContent = isComplete
        ? "追跡完了"
        : `${stateIndex + 1}行目の実行後を予想`;
    }

    function clearPrediction() {
      allInputs().forEach((input) => {
        input.value = "";
        input.classList.remove(
          "trace-widget__input--correct",
          "trace-widget__input--incorrect"
        );
        input.removeAttribute("aria-invalid");
      });
      feedback.textContent = "";
      feedback.className = "trace-widget__feedback";
    }

    function checkPrediction(event) {
      event.preventDefault();
      if (stateIndex >= exercise.code.length || isAdvancing) return;

      const expectedState = exercise.states[stateIndex + 1];
      const incorrectFields = [];

      Object.entries(inputs).forEach(([key, input]) => {
        const isCorrect = normalize(input.value) === expectedState[key];
        input.classList.toggle("trace-widget__input--correct", isCorrect);
        input.classList.toggle("trace-widget__input--incorrect", !isCorrect);
        input.setAttribute("aria-invalid", String(!isCorrect));
        if (!isCorrect) incorrectFields.push(fieldLabels[key]);
      });

      if (incorrectFields.length === 0) {
        isAdvancing = true;
        feedback.textContent = "正解です。次の行へ進みます。";
        feedback.className = "trace-widget__feedback trace-widget__feedback--correct";
        render();
        advanceTimer = window.setTimeout(recordAndAdvance, 400);
      } else {
        feedback.textContent = `${incorrectFields.join("、")}をもう一度確認しましょう。`;
        feedback.className = "trace-widget__feedback trace-widget__feedback--incorrect";
      }
    }

    function recordAndAdvance() {
      advanceTimer = null;
      if (stateIndex >= exercise.code.length) return;
      history.push({ ...exercise.states[stateIndex + 1] });
      stateIndex += 1;
      isAdvancing = false;
      clearPrediction();
      render();
      if (stateIndex === exercise.code.length) {
        feedback.textContent = "4行目まで追跡できました。最終的な出力は 10 です。";
        feedback.className = "trace-widget__feedback trace-widget__feedback--correct";
      }
    }

    function reset() {
      if (advanceTimer !== null) {
        window.clearTimeout(advanceTimer);
        advanceTimer = null;
      }
      stateIndex = 0;
      isAdvancing = false;
      history.length = 0;
      clearPrediction();
      render();
      inputs.x.focus();
    }

    form.addEventListener("submit", checkPrediction);
    resetButton.addEventListener("click", reset);

    root.addEventListener("keydown", (event) => {
      const revealKeys = [
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "PageUp", "PageDown", "Home", "End", " ", "Enter"
      ];
      if (revealKeys.includes(event.key)) event.stopPropagation();
    });
    root.addEventListener("click", (event) => event.stopPropagation());
    root.addEventListener("pointerdown", (event) => event.stopPropagation());

    render();
  }

  function initialize() {
    document.querySelectorAll("[data-trace-widget]").forEach((root) => {
      if (root.dataset.traceWidgetReady === "true") return;
      const exerciseId = root.dataset.traceWidget || "variables-assignment";
      const exercise = exercises[exerciseId];
      if (!exercise) return;
      root.dataset.traceWidgetReady = "true";
      buildWidget(root, exercise);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();

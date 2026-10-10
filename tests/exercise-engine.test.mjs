import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  equalChoiceSets,
  gradeItem,
  normalizeText,
  numericEquivalent,
  parseRational,
} from "../teaching/probability-statistics-seikei/self-study/assets/exercise-engine.mjs";

const dataPath = new URL(
  "../teaching/probability-statistics-seikei/self-study/data/02.json",
  import.meta.url,
);

test("numeric parsing accepts exact equivalent fractions and decimals", () => {
  assert.equal(numericEquivalent("1/2", "0.5"), true);
  assert.equal(numericEquivalent("0.50", ".5"), true);
  assert.equal(numericEquivalent("-11", "-11.0"), true);
  assert.equal(numericEquivalent("1e-1", "0.1"), true);
  assert.equal(numericEquivalent("1/3", "0.3333333333333333"), false);
});

test("numeric parsing rejects unsafe or malformed input", () => {
  for (const value of ["", "1/0", "1/2/3", "Math.random()", "1+1", "Infinity", "0x10"]) {
    assert.equal(parseRational(value), null, value);
  }
});

test("multiple choice comparison is order independent and requires exact sets", () => {
  assert.equal(equalChoiceSets(["C", "A", "B"], ["A", "B", "C"]), true);
  assert.equal(equalChoiceSets(["A", "B"], ["A", "B", "C"]), false);
  assert.equal(equalChoiceSets(["A", "A"], ["A"]), false);
});

test("text normalization is limited to Unicode and whitespace normalization", () => {
  assert.equal(normalizeText("  Ａ  B\nC  "), "A B C");
  assert.notEqual(normalizeText("Answer"), normalizeText("answer"));
  assert.deepEqual(
    gradeItem({ type: "text", answer: "標準 解答" }, "  標準\n解答  "),
    { answered: true, correct: true },
  );
});

test("numeric accepted_answers participate in exact comparison", () => {
  assert.deepEqual(
    gradeItem({ type: "numeric", answer: "0.5", accepted_answers: ["1/2"] }, "0.50"),
    { answered: true, correct: true },
  );
});

test("all 39 canonical answers are accepted by the grading engine", async () => {
  const data = JSON.parse(await readFile(dataPath, "utf8"));
  const items = data.sections.flatMap((section) => section.items);
  assert.equal(items.length, 39);
  for (const item of items) {
    const response = Array.isArray(item.answer) ? [...item.answer].reverse() : item.answer;
    assert.deepEqual(gradeItem(item, response), { answered: true, correct: true }, item.id);
  }
});

test("representative wrong and unanswered responses are rejected", () => {
  assert.deepEqual(gradeItem({ type: "single_choice", answer: "A" }, "B"), {
    answered: true,
    correct: false,
  });
  assert.deepEqual(gradeItem({ type: "multiple_choice", answer: ["A", "B"] }, ["A"]), {
    answered: true,
    correct: false,
  });
  assert.deepEqual(gradeItem({ type: "numeric", answer: "1/2" }, "0.5001"), {
    answered: true,
    correct: false,
  });
  assert.deepEqual(gradeItem({ type: "numeric", answer: "1/2" }, ""), {
    answered: false,
    correct: false,
  });
});

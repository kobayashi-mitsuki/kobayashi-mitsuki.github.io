import assert from "node:assert/strict";

const debuggerOrigin = process.argv[2] || "http://127.0.0.1:9222";
const pageUrl = process.argv[3];
if (!pageUrl) throw new Error("Usage: node tests/browser-smoke.mjs <debugger-origin> <page-url>");

const targets = await fetch(`${debuggerOrigin}/json/list`).then((response) => response.json());
const target = targets.find((candidate) => candidate.type === "page");
if (!target) throw new Error("No debuggable page target found");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function command(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

await command("Page.enable");
await command("Runtime.enable");
await command("Page.navigate", { url: pageUrl });

for (let attempt = 0; attempt < 100; attempt += 1) {
  const ready = await evaluate(
    "document.readyState === 'complete' && document.querySelectorAll('[data-item-id]').length === 39",
  );
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 100));
}

const desktop = await evaluate(`(async () => {
  if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
  await new Promise((resolve) => setTimeout(resolve, 200));
  return {
    items: document.querySelectorAll('[data-item-id]').length,
    sections: document.querySelectorAll('.exercise-section').length,
    math: document.querySelectorAll('mjx-container').length,
    loadError: Boolean(document.querySelector('.exercise-load-error')),
    draftNotice: Boolean(document.querySelector('.exercise-draft-notice')),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
})()`);

assert.equal(desktop.items, 39);
assert.equal(desktop.sections, 9);
assert.ok(desktop.math > 0);
assert.equal(desktop.loadError, false);
assert.equal(desktop.draftNotice, true);
assert.equal(desktop.horizontalOverflow, false);

const interaction = await evaluate(`(async () => {
  const grade = async (itemId, values) => {
    const item = document.querySelector('[data-item-id="' + itemId + '"]');
    for (const value of values) {
      const input = item.querySelector('input[value="' + value + '"]') || item.querySelector('.exercise-text-input');
      if (input.type === 'radio' || input.type === 'checkbox') input.checked = true;
      else input.value = value;
      input.dispatchEvent(new Event(input.type === 'text' ? 'input' : 'change', { bubbles: true }));
    }
    item.querySelector('.exercise-button-primary').click();
    if (window.MathJax?.startup?.promise) await window.MathJax.startup.promise;
    await new Promise((resolve) => setTimeout(resolve, 100));
    return item.querySelector('.exercise-feedback').textContent;
  };
  return {
    singleCorrect: await grade('ps02-001', ['B']),
    singleWrong: await grade('ps02-002', ['A']),
    numericEquivalent: await grade('ps02-005', ['0.0']),
    multipleOrderIndependent: await grade('ps02-030', ['C', 'A', 'B']),
    summary: document.querySelector('.exercise-summary').textContent,
  };
})()`);

assert.match(interaction.singleCorrect, /正解です/);
assert.match(interaction.singleWrong, /不正解です/);
assert.match(interaction.singleWrong, /正解：D\./);
assert.match(interaction.numericEquivalent, /正解です/);
assert.match(interaction.multipleOrderIndependent, /正解です/);
assert.match(interaction.summary, /採点済み 4 \/ 39/);

await command("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await command("Page.reload", { ignoreCache: true });
for (let attempt = 0; attempt < 100; attempt += 1) {
  const ready = await evaluate(
    "document.readyState === 'complete' && document.querySelectorAll('[data-item-id]').length === 39",
  );
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 100));
}
const mobile = await evaluate(`({
  viewport: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
})`);
assert.equal(mobile.viewport, 390);
assert.equal(mobile.horizontalOverflow, false);

const themes = await evaluate(`(async () => {
  const read = () => ({
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    scheme: document.documentElement.dataset.quartoColorScheme || null,
  });
  const before = read();
  document.querySelector('.quarto-color-scheme-toggle').click();
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { before, after: read() };
})()`);
assert.notEqual(themes.before.bodyBackground, themes.after.bodyBackground);
assert.notEqual(themes.before.bodyColor, themes.after.bodyColor);

console.log(JSON.stringify({ desktop, interaction, mobile, themes }, null, 2));
socket.close();

import { chromium } from "playwright";

// Pré-condição: exige "Confirm email" desligado no Supabase (mailer_autoconfirm) —
// senão o signup não navega direto para /onboarding e todo o setup deste arquivo falha.
const BASE = "http://localhost:3000";
const password = "senha123456";

const results = [];
function check(name, condition, detail) {
  results.push({ name, pass: !!condition, detail });
  console.log(`${condition ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const email = `matheus.algustt+qalabels${Date.now()}@gmail.com`;

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/onboarding/, { timeout: 15000 });
await page.fill("#name", "QA Labels House");
await page.getByRole("button", { name: "Criar lar" }).click();
await page.waitForURL(/\/dashboard/, { timeout: 15000 });

// Set up: create an item, mark it presente + essencial, WITHOUT ever opening
// the selects again after the initial pick (to catch a "only correct right
// after interacting" regression of the label-mapping fix).
await page.getByRole("button", { name: "Adicionar item" }).click();
await page.waitForSelector('input[name="name"]', { state: "visible" });
await page.fill('input[name="name"]', "Item Labels Teste");
await page.locator("#priority").click();
await page.getByRole("option", { name: "Essencial", exact: true }).click();
check(
  "L0: trigger de prioridade mostra 'Essencial' (não 'essencial') logo após selecionar",
  (await page.locator("#priority").textContent()).includes("Essencial") &&
    !(await page.locator("#priority").textContent()).match(/^essencial/),
  await page.locator("#priority").textContent(),
);
await page.getByRole("button", { name: "Adicionar" }).click();
await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1000);

const row = page.locator(".rounded-lg.border", { hasText: "Item Labels Teste" });
await row.getByRole("button", { name: "Editar" }).click();
await page.waitForSelector("#status", { state: "visible" });
await page.locator("#status").click();
await page.getByRole("option", { name: "Ganho de presente" }).click();
await page.getByRole("button", { name: "Salvar alterações" }).click();
await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1000);

// Full page reload — reopen the edit dialog fresh, WITHOUT interacting with
// any select this time, and read the trigger text directly off the initial
// (server-driven defaultValue) render.
await page.reload({ waitUntil: "networkidle" });
await row.getByRole("button", { name: "Editar" }).click();
await page.waitForSelector("#status", { state: "visible" });

const statusTriggerText = (await page.locator("#status").textContent()).replace("▼", "").trim();
const priorityTriggerText = (await page.locator("#priority").textContent()).replace("▼", "").trim();
const categoryTriggerText = (await page.locator("#category").textContent()).replace("▼", "").trim();

check(
  "L1: após reload, select de status mostra 'Ganho de presente' (não 'presente')",
  statusTriggerText === "Ganho de presente",
  statusTriggerText,
);
check(
  "L2: após reload, select de prioridade mostra 'Essencial' (não 'essencial')",
  priorityTriggerText === "Essencial",
  priorityTriggerText,
);
check(
  "L3: select de categoria continua mostrando o nome legível (regressão do fix)",
  categoryTriggerText.length > 0 && !categoryTriggerText.includes("_"),
  categoryTriggerText,
);

// Also verify the OTHER status/priority values render correctly (not just
// the ones exercised above) — switch status back to "falta" and priority to
// "pode_esperar" and confirm the trigger text updates to proper labels too.
await page.locator("#status").click();
await page.getByRole("option", { name: "Falta comprar" }).click();
await page.locator("#priority").click();
await page.getByRole("option", { name: "Pode esperar", exact: true }).click();

const statusAfter = (await page.locator("#status").textContent()).replace("▼", "").trim();
const priorityAfter = (await page.locator("#priority").textContent()).replace("▼", "").trim();
check("L4: trocar para 'Falta comprar' exibe o label certo", statusAfter === "Falta comprar", statusAfter);
check("L5: trocar para 'Pode esperar' exibe o label certo", priorityAfter === "Pode esperar", priorityAfter);

await page.keyboard.press("Escape");

// L6: badges on the card use proper labels too (not raw enum values) —
// re-mark as presente/essencial and check the card itself.
await row.getByRole("button", { name: "Editar" }).click();
await page.waitForSelector("#status", { state: "visible" });
await page.locator("#status").click();
await page.getByRole("option", { name: "Ganho de presente" }).click();
await page.locator("#priority").click();
await page.getByRole("option", { name: "Essencial", exact: true }).click();
await page.getByRole("button", { name: "Salvar alterações" }).click();
await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1000);

const rowText = await row.textContent();
check(
  "L6: badges no card mostram 'Presente' e 'Essencial' (não os valores brutos)",
  rowText.includes("Presente") && rowText.includes("Essencial") && !rowText.includes("pode_esperar") && !rowText.match(/[^a-zA-Z]presente[^a-zA-Z]/),
  rowText,
);

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO LABELS: ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

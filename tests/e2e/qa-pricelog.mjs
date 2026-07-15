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
const email = `matheus.algustt+qapricelog${Date.now()}@gmail.com`;

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/onboarding/, { timeout: 15000 });
await page.fill("#name", "QA PriceLog House");
await page.getByRole("button", { name: "Criar lar" }).click();
await page.waitForURL(/\/dashboard/, { timeout: 15000 });

async function addItem(name) {
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page.waitForSelector('input[name="name"]', { state: "visible" });
  await page.fill('input[name="name"]', name);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

await addItem("Item PriceLog A");
await addItem("Item PriceLog B");

// PL1: invalid price in the price-log form shows inline error, doesn't add
{
  const row = page.locator(".rounded-lg.border", { hasText: "Item PriceLog A" });
  await row.getByRole("button", { name: "Editar" }).click();
  await page.waitForSelector("#price-log-form", { state: "visible" });

  await page.fill("#price-log-form input[name='price']", "abc");
  await page.getByRole("button", { name: "Adicionar preço" }).click();
  await page.waitForTimeout(1000);

  const dialogText = await page.locator('[role="dialog"]').textContent();
  check("PL1: preço inválido no log mostra erro inline", dialogText.includes("inválido"), dialogText.slice(-150));
  check(
    "PL1: nenhuma entrada foi criada com preço inválido",
    dialogText.includes("Nenhum preço registrado ainda."),
    dialogText.slice(dialogText.indexOf("Histórico"), dialogText.indexOf("Histórico") + 200),
  );
}

// PL2: valid entry appears, empty price is required (HTML5 required attr)
{
  await page.fill("#price-log-form input[name='price']", "");
  await page.getByRole("button", { name: "Adicionar preço" }).click();
  await page.waitForTimeout(500);
  const stillOnForm = await page.locator("#price-log-form").isVisible();
  check("PL2: campo de preço é obrigatório (HTML5 required bloqueia envio vazio)", stillOnForm, "");

  await page.fill("#price-log-form input[name='price']", "199,90");
  await page.fill("#price-log-form input[name='store']", "Loja Item A");
  await page.getByRole("button", { name: "Adicionar preço" }).click();
  await page.waitForTimeout(1000);
  const dialogText = await page.locator('[role="dialog"]').textContent();
  check("PL2: entrada válida (199,90) aparece no histórico", dialogText.includes("199,90") && dialogText.includes("Loja Item A"), "");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

// PL3: price log entries are isolated per item — item B shouldn't see item A's log
{
  const rowB = page.locator(".rounded-lg.border", { hasText: "Item PriceLog B" });
  await rowB.getByRole("button", { name: "Editar" }).click();
  await page.waitForSelector("#price-log-form", { state: "visible" });
  await page.locator("text=Nenhum preço registrado ainda.").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const dialogTextB = await page.locator('[role="dialog"]').textContent();
  check(
    "PL3: histórico de preço de um item não vaza para outro item",
    dialogTextB.includes("Nenhum preço registrado ainda.") && !dialogTextB.includes("Loja Item A"),
    dialogTextB.slice(dialogTextB.indexOf("Histórico"), dialogTextB.indexOf("Histórico") + 200),
  );
  await page.keyboard.press("Escape");
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO LOG DE PREÇO (UI): ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

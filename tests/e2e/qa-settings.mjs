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

function norm(s) {
  return s.replace(/ /g, " ").trim();
}

async function getBudgetNumbers(page) {
  const gasto = norm(await page.locator('p:text-is("Gasto") + p').textContent());
  const estimado = norm(
    await page.locator('p:text-is("Estimado") + p, p:text-is("Orçamento") + p').first().textContent(),
  );
  const restante = norm(await page.locator('p:text-is("Restante") + p').textContent());
  return { gasto, estimado, restante };
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const email = `matheus.algustt+qasettings${Date.now()}@gmail.com`;

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/onboarding/, { timeout: 15000 });
await page.fill("#name", "QA Settings House");
await page.getByRole("button", { name: "Criar lar" }).click();
await page.waitForURL(/\/dashboard/, { timeout: 15000 });

// D1: invite code shown
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
{
  const code = (await page.textContent("body")).match(/[A-Z0-9]{6}/)?.[0];
  check("D1: código de convite de 6 caracteres visível em /settings", !!code, code);
}

// D2: set budget_limit
await page.fill('input[name="budget_limit"]', "5000");
await page.locator("form", { has: page.locator("input[name='budget_limit']") }).getByRole("button", { name: "Salvar" }).click();
await page.waitForTimeout(1000);
{
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const nums = await getBudgetNumbers(page);
  check("D2: orçamento definido (5000) aparece no dashboard como referência", nums.estimado === "R$ 5.000,00", JSON.stringify(nums));
}

// Persistence check: reload settings, value should still show 5000
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
{
  const val = await page.inputValue('input[name="budget_limit"]');
  check("D2b: valor do orçamento persiste ao recarregar /settings", val === "5000", val);
}

// D3: clear budget_limit -> falls back to estimated total (0, since no items with price)
await page.fill('input[name="budget_limit"]', "");
await page.locator("form", { has: page.locator("input[name='budget_limit']") }).getByRole("button", { name: "Salvar" }).click();
await page.waitForTimeout(1000);
{
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const nums = await getBudgetNumbers(page);
  check(
    "D3: limpar orçamento volta a usar o total estimado como referência",
    nums.estimado === "R$ 0,00",
    JSON.stringify(nums),
  );
}

// D4: invalid (non-numeric) budget_limit input
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.fill('input[name="budget_limit"]', "10000");
await page.locator("form", { has: page.locator("input[name='budget_limit']") }).getByRole("button", { name: "Salvar" }).click();
await page.waitForTimeout(1000);
await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
await page.fill('input[name="budget_limit"]', "abc");
await page.locator("form", { has: page.locator("input[name='budget_limit']") }).getByRole("button", { name: "Salvar" }).click();
await page.waitForTimeout(1000);
{
  const url = page.url();
  const val = await page.inputValue('input[name="budget_limit"]');
  check(
    "REGRESSÃO D4: orçamento inválido ('abc') mostra erro e preserva o valor anterior (10000)",
    val === "10000" && url.includes("error"),
    `url=${url} val="${val}"`,
  );

  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  const valAfterReload = await page.inputValue('input[name="budget_limit"]');
  check(
    "REGRESSÃO D4b: valor preservado (10000) persiste após reload",
    valAfterReload === "10000",
    valAfterReload,
  );
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO CONFIGURAÇÕES: ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS/OBSERVAÇÕES:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

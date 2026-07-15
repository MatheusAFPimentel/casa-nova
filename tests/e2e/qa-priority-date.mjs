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

function localDateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function setMoveInDate(page, dateStr) {
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await page.fill('input[name="move_in_date"]', dateStr);
  await page
    .locator("form", { has: page.locator('input[name="move_in_date"]') })
    .getByRole("button", { name: "Salvar" })
    .click();
  await page.waitForTimeout(1000);
}

async function getDashboardSubtitle(page) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  return page.locator("p.text-muted-foreground").first().textContent();
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const email = `matheus.algustt+qaprio${Date.now()}@gmail.com`;

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/onboarding/, { timeout: 15000 });
await page.fill("#name", "QA Priority Date House");
await page.getByRole("button", { name: "Criar lar" }).click();
await page.waitForURL(/\/dashboard/, { timeout: 15000 });

// Countdown edge cases
{
  await setMoveInDate(page, localDateStr(0));
  check("P1: data = hoje mostra 'Mudança é hoje!'", (await getDashboardSubtitle(page)).includes("Mudança é hoje!"), await getDashboardSubtitle(page));
}
{
  await setMoveInDate(page, localDateStr(1));
  check("P2: data = amanhã mostra 'Mudança é amanhã!'", (await getDashboardSubtitle(page)).includes("Mudança é amanhã!"), await getDashboardSubtitle(page));
}
{
  await setMoveInDate(page, localDateStr(5));
  check("P3: data = +5 dias mostra '5 dias para a mudança'", (await getDashboardSubtitle(page)).includes("5 dias para a mudança"), await getDashboardSubtitle(page));
}
{
  await setMoveInDate(page, localDateStr(-1));
  check("P4: data = ontem mostra 'Mudança foi ontem'", (await getDashboardSubtitle(page)).includes("Mudança foi ontem"), await getDashboardSubtitle(page));
}
{
  await setMoveInDate(page, localDateStr(-10));
  check("P5: data = -10 dias mostra 'Mudança foi há 10 dias'", (await getDashboardSubtitle(page)).includes("Mudança foi há 10 dias"), await getDashboardSubtitle(page));
}
{
  await setMoveInDate(page, "");
  const subtitle = await getDashboardSubtitle(page);
  check("P6: limpar data remove a contagem regressiva (volta ao texto padrão)", subtitle.includes("Lista de compras da casa nova"), subtitle);
}

// Combined filters: category + status + essentialOnly + search
async function addItem(name, { category } = {}) {
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page.waitForSelector('input[name="name"]', { state: "visible" });
  await page.fill('input[name="name"]', name);
  if (category) {
    await page.locator("#category").click();
    await page.getByRole("option", { name: category, exact: true }).click();
  }
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

async function setEssential(name) {
  const row = page.locator(".rounded-lg.border", { hasText: name });
  await row.getByRole("button", { name: "Editar" }).click();
  await page.waitForSelector("#priority", { state: "visible" });
  await page.locator("#priority").click();
  await page.getByRole("option", { name: "Essencial", exact: true }).click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
}

await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
await addItem("Sofa Essencial Sala", { category: "Sala" });
await setEssential("Sofa Essencial Sala");
await addItem("Tapete Normal Sala", { category: "Sala" });
await addItem("Geladeira Essencial Cozinha 2", { category: "Cozinha" });
await setEssential("Geladeira Essencial Cozinha 2");

{
  await page.getByRole("button", { name: "Sala", exact: true }).click();
  await page.getByRole("button", { name: "Só essenciais" }).click();
  await page.waitForTimeout(400);
  const body = await page.textContent("body");
  check(
    "P7: filtro categoria='Sala' + 'Só essenciais' mostra só o essencial da Sala",
    body.includes("Sofa Essencial Sala") &&
      !body.includes("Tapete Normal Sala") &&
      !body.includes("Geladeira Essencial Cozinha 2"),
    "",
  );

  await page.fill('input[placeholder="Buscar item..."]', "Sofa");
  await page.waitForTimeout(400);
  const bodySearch = await page.textContent("body");
  check("P8: combinado com busca continua funcionando", bodySearch.includes("Sofa Essencial Sala"), "");

  await page.fill('input[placeholder="Buscar item..."]', "Geladeira");
  await page.waitForTimeout(400);
  const bodySearch2 = await page.textContent("body");
  check(
    "P9: busca por item que não bate com o filtro de categoria/essencial mostra vazio",
    bodySearch2.includes("Nenhum item encontrado"),
    "",
  );
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO PRIORIDADE/DATA: ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

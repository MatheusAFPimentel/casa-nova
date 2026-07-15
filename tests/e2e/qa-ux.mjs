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

const NBSP = String.fromCharCode(160);
function norm(s) {
  return s.split(NBSP).join(" ").trim();
}
async function getBudgetNumbers(page) {
  const gasto = norm(await page.locator('p:text-is("Gasto") + p').textContent());
  const estimado = norm(
    await page.locator('p:text-is("Estimado") + p, p:text-is("Orçamento") + p').first().textContent(),
  );
  return { gasto, estimado };
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const email = `matheus.algustt+qaux${Date.now()}@gmail.com`;

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/onboarding/, { timeout: 15000 });
await page.fill("#name", "Casa QA UX");
await page.getByRole("button", { name: "Criar lar" }).click();
await page.waitForURL(/\/dashboard/, { timeout: 15000 });
await page.waitForTimeout(500);

// U1: seeded categories all have pending items -> should start expanded
{
  const cozinhaHeader = page.locator('button[aria-controls^="category-panel-"]', { hasText: "Cozinha" });
  const expanded = await cozinhaHeader.getAttribute("aria-expanded");
  check("U1: categoria com pendências nasce expandida", expanded === "true", expanded);
  check("U1: item da Cozinha visível sem clicar", await page.getByText("Geladeira").isVisible(), "");
}

// U2: add item with quantity 2 and price 1500 -> estimated total = 3000
await page.getByRole("button", { name: "Adicionar item" }).click();
await page.waitForSelector('input[name="name"]', { state: "visible" });
await page.fill('input[name="name"]', "Cama Casal");
await page.fill('input[name="estimated_price"]', "1500");
await page.fill('input[name="quantity"]', "2");
await page.getByRole("button", { name: "Adicionar" }).click();
await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1000);
{
  const nums = await getBudgetNumbers(page);
  check("U2: preço unitário × quantidade soma corretamente (1500 × 2 = 3000)", nums.estimado === "R$ 3.000,00", JSON.stringify(nums));
}

// U3: badge x2 shows on the card
{
  const row = page.locator(".rounded-lg.border", { hasText: "Cama Casal" });
  const rowText = await row.textContent();
  check("U3: badge '×2' aparece no card", rowText.includes("×2"), rowText);
}

// U4: item with no price/store/link shows no meta line clutter
await page.getByRole("button", { name: "Adicionar item" }).click();
await page.waitForSelector('input[name="name"]', { state: "visible" });
await page.fill('input[name="name"]', "Item Sem Nada");
await page.getByRole("button", { name: "Adicionar" }).click();
await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1000);
{
  const row = page.locator(".rounded-lg.border", { hasText: "Item Sem Nada" });
  const rowText = await row.textContent();
  check("U4: item sem preço/loja/link NÃO mostra 'Estimado: —'", !rowText.includes("Estimado"), rowText);
}

// U5: mark everything in a category as bought -> after reload, category starts collapsed
{
  // Sala category has few seed items; let's mark all Sala items as comprado via checkbox
  await page.getByRole("button", { name: "Sala", exact: true }).click();
  await page.waitForTimeout(400);
  const checkboxes = page.locator('[data-slot="checkbox"]');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    await checkboxes.nth(i).click();
    await page.waitForTimeout(300);
  }
  await page.getByRole("button", { name: "Todas categorias" }).click();
  await page.waitForTimeout(300);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const salaHeader = page.locator('button[aria-controls^="category-panel-"]', { hasText: "Sala" });
  const expandedAfter = await salaHeader.getAttribute("aria-expanded");
  check("U5: categoria totalmente resolvida nasce recolhida após reload", expandedAfter === "false", expandedAfter);

  // U5c/U5d: o painel de uma categoria recolhida fica sempre no DOM (para a
  // animação de grid-rows funcionar), então a garantia de acessibilidade
  // não pode depender só de "não está no DOM" — precisa de aria-hidden E de
  // estar realmente invisível.
  //
  // NOTA (achado ao rodar, não só ao ler o código): a primeira versão desse
  // teste usava `sofaItem.isVisible()`, e falhou — o Playwright não detecta
  // clipping por ANCESTRAL (grid-row com altura 0 + overflow:hidden no pai).
  // O elemento do item mantém sua própria bounding box "natural"; só o
  // wrapper com overflow-hidden é comprimido a 0px. isVisible() olha só a
  // caixa do próprio elemento, não faz esse raciocínio de clipping herdado.
  // A fonte de verdade correta é a altura real (boundingBox) do wrapper
  // overflow-hidden — que é o pai direto do painel na árvore do DOM.
  const panelId = await salaHeader.getAttribute("aria-controls");
  const panel = page.locator(`#${panelId}`);
  const overflowWrapper = panel.locator("xpath=..");

  const panelAriaHiddenCollapsed = await panel.getAttribute("aria-hidden");
  check("U5c: painel recolhido tem aria-hidden='true'", panelAriaHiddenCollapsed === "true", panelAriaHiddenCollapsed);

  const wrapperBoxCollapsed = await overflowWrapper.boundingBox();
  check(
    "U5d: wrapper do painel recolhido tem altura visual zero (clipado de verdade, não só aria-hidden)",
    wrapperBoxCollapsed !== null && wrapperBoxCollapsed.height < 1,
    JSON.stringify(wrapperBoxCollapsed),
  );

  // toggle it open
  await salaHeader.click();
  await page.waitForTimeout(400);
  const expandedAfterClick = await salaHeader.getAttribute("aria-expanded");
  check("U5b: clicar no cabeçalho expande de novo", expandedAfterClick === "true", expandedAfterClick);

  const panelAriaHiddenExpanded = await panel.getAttribute("aria-hidden");
  check("U5e: painel expandido não tem aria-hidden='true'", panelAriaHiddenExpanded !== "true", panelAriaHiddenExpanded);

  const wrapperBoxExpanded = await overflowWrapper.boundingBox();
  check(
    "U5f: wrapper do painel expandido tem altura visual maior que zero",
    wrapperBoxExpanded !== null && wrapperBoxExpanded.height > 10,
    JSON.stringify(wrapperBoxExpanded),
  );

  const sofaVisibleExpanded = await page.getByText("Sofá", { exact: true }).isVisible().catch(() => false);
  check("U5g: item 'Sofá' está genuinamente visível quando expandido", sofaVisibleExpanded === true, `visible=${sofaVisibleExpanded}`);
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO UX: ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

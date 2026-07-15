import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Pré-condição: exige "Confirm email" desligado no Supabase (mailer_autoconfirm) —
// senão o signup não navega direto para /onboarding e todo o setup deste arquivo falha.
const BASE = "http://localhost:3000";
const password = "senha123456";
const shotDir = path.join(path.dirname(fileURLToPath(import.meta.url)), ".screenshots");
mkdirSync(shotDir, { recursive: true });

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
  const comprados = norm(await page.locator('p:text-is("Itens comprados") + p').textContent());
  const [bought, total] = comprados.split("/").map((s) => Number(s.trim()));
  return { gasto, estimado, restante, bought, total };
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const email = `matheus.algustt+qaitems${Date.now()}@gmail.com`;

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/onboarding/, { timeout: 15000 });
await page.fill("#name", "QA Items House");
await page.getByRole("button", { name: "Criar lar" }).click();
await page.waitForURL(/\/dashboard/, { timeout: 15000 });

async function addItem({ name, category, estimated_price, store, link, notes }) {
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page.waitForSelector('input[name="name"]', { state: "visible" });
  await page.fill('input[name="name"]', name);
  if (category) {
    await page.locator("#category").click();
    await page.getByRole("option", { name: category, exact: true }).click();
  }
  if (estimated_price !== undefined) await page.fill('input[name="estimated_price"]', estimated_price);
  if (store) await page.fill('input[name="store"]', store);
  if (link) await page.fill('input[name="link"]', link);
  if (notes) await page.fill('textarea[name="notes"]', notes);
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

// C1: add item with all fields
await addItem({
  name: "Item C1 Completo",
  category: "Sala",
  estimated_price: "200",
  store: "Loja X",
  link: "https://example.com/produto",
  notes: "nota teste",
});
{
  const body = await page.textContent("body");
  const nums = await getBudgetNumbers(page);
  check("C1: item aparece na lista", body.includes("Item C1 Completo"), "");
  check("C1: estimado total = R$ 200,00", nums.estimado === "R$ 200,00", JSON.stringify(nums));
}

// C2: comma decimal price
await addItem({ name: "Item C2 Virgula", category: "Sala", estimated_price: "150,50" });
{
  const nums = await getBudgetNumbers(page);
  check("C2: preço com vírgula (150,50) soma corretamente = R$ 350,50", nums.estimado === "R$ 350,50", JSON.stringify(nums));
}

// C3: empty optional fields, no price — REGRESSÃO: a UX review removeu de
// propósito a linha "Estimado: —" quando não há preço/loja/link (ruído
// visual); antes o comportamento esperado era o oposto.
await addItem({ name: "Item C3 SemPreco", category: "Diversos" });
{
  const body = await page.textContent("body");
  const row = page.locator(".rounded-lg.border", { hasText: "Item C3 SemPreco" });
  const rowText = await row.textContent();
  check(
    "REGRESSÃO C3: item sem preço/loja/link não mostra linha 'Estimado: —' (ruído removido de propósito)",
    body.includes("Item C3 SemPreco") && !rowText.includes("Estimado"),
    rowText,
  );
}

// invalid (non-numeric) price input — REGRESSÃO: antes era descartado
// silenciosamente (bug corrigido); agora deve bloquear com erro inline e
// NÃO criar o item.
const numsBeforeInvalid = await getBudgetNumbers(page);
{
  await page.getByRole("button", { name: "Adicionar item" }).click();
  await page.waitForSelector('input[name="name"]', { state: "visible" });
  await page.fill('input[name="name"]', "Item Preco Invalido");
  await page.fill('input[name="estimated_price"]', "abc");
  await page.getByRole("button", { name: "Adicionar" }).click();
  await page.waitForTimeout(1000);
  await page.locator("text=inválido").first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});

  const dialogVisible = await page.locator('[role="dialog"]').isVisible();
  const dialogText = await page.locator('[role="dialog"]').textContent();
  check("REGRESSÃO: dialog permanece aberto com preço inválido", dialogVisible, "");
  check("REGRESSÃO: mensagem de erro aparece no dialog", dialogText.includes("inválido"), dialogText.slice(-150));

  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  const nums = await getBudgetNumbers(page);
  const bodyAfter = await page.textContent("body");
  check(
    "REGRESSÃO: item com preço inválido NÃO foi criado",
    !bodyAfter.includes("Item Preco Invalido"),
    "",
  );
  check(
    "REGRESSÃO: total estimado não mudou",
    nums.estimado === numsBeforeInvalid.estimado,
    `antes=${numsBeforeInvalid.estimado} depois=${nums.estimado}`,
  );
}

await page.screenshot({ path: `${shotDir}/qa-items-01.png`, fullPage: true });

// C4: edit item, change category
{
  const row = page.locator(".rounded-lg.border", { hasText: "Item C3 SemPreco" });
  await row.getByRole("button", { name: "Editar" }).click();
  await page.waitForSelector("#category", { state: "visible" });
  await page.locator("#category").click();
  await page.getByRole("option", { name: "Cozinha", exact: true }).click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Cozinha", exact: true }).click();
  await page.waitForTimeout(300);
  const body = await page.textContent("body");
  check("C4: item editado aparece na categoria Cozinha após mudança", body.includes("Item C3 SemPreco"), "");
  await page.getByRole("button", { name: "Todas categorias" }).click();
  await page.waitForTimeout(300);
}

// C5: edit item, set actual_price + status comprado
{
  const row = page.locator(".rounded-lg.border", { hasText: "Item C1 Completo" });
  await row.getByRole("button", { name: "Editar" }).click();
  await page.waitForSelector('input[name="actual_price"]', { state: "visible" });
  await page.fill('input[name="actual_price"]', "180");
  await page.locator("#status").click();
  await page.getByRole("option", { name: "Comprado" }).click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const nums = await getBudgetNumbers(page);
  check("C5: gasto reflete preço real (180) do item marcado comprado", nums.gasto === "R$ 180,00", JSON.stringify(nums));

  // C5b: o bloco de preço em mono do card (rebranding "Manifesto de
  // Mudança") mostra "Est." e "Real" formatados — não testado até agora,
  // só o total do resumo de orçamento era verificado.
  const rowText = norm(await row.textContent());
  check(
    "C5b: card mostra 'Est. R$ 200,00' e 'Real R$ 180,00' no bloco de preço",
    rowText.includes("Est. R$ 200,00") && rowText.includes("Real R$ 180,00"),
    rowText,
  );
}

// C6: toggle comprado via checkbox WITHOUT actual_price set — REGRESSÃO do
// fix anterior: "Gasto" não deve mais usar o preço estimado como substituto.
{
  const before = await getBudgetNumbers(page);
  const row = page.locator(".rounded-lg.border", { hasText: "Item C2 Virgula" });
  await row.locator('[data-slot="checkbox"]').click();
  await page.waitForTimeout(1000);
  const after = await getBudgetNumbers(page);
  check(
    "REGRESSÃO C6: marcar comprado via checkbox sem preço real NÃO altera 'Gasto'",
    after.gasto === before.gasto,
    `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );
  check("C6: contador de comprados incrementou mesmo sem preço real", after.bought === before.bought + 1, JSON.stringify({ before, after }));
}

// C7: delete item
await addItem({ name: "Item Para Deletar", category: "Diversos" });
{
  const before = await getBudgetNumbers(page);
  page.once("dialog", (d) => d.accept());
  const row = page.locator(".rounded-lg.border", { hasText: "Item Para Deletar" });
  await row.getByRole("button", { name: "Remover" }).click();
  await page.waitForTimeout(1200);
  const bodyAfter = await page.textContent("body");
  const after = await getBudgetNumbers(page);
  check(
    "C7: remover item decrementa contagem total e some da lista",
    !bodyAfter.includes("Item Para Deletar") && after.total === before.total - 1,
    `before=${before.total} after=${after.total}`,
  );
}

// C8: category filter
{
  await page.getByRole("button", { name: "Sala", exact: true }).click();
  await page.waitForTimeout(400);
  const body = await page.textContent("body");
  check(
    "C8: filtro de categoria 'Sala' mostra só itens dessa categoria",
    body.includes("Item C1 Completo") && body.includes("Item C2 Virgula") && !body.includes("Item C3 SemPreco"),
    "",
  );
  await page.getByRole("button", { name: "Todas categorias" }).click();
  await page.waitForTimeout(300);
}

// C9: status filter
{
  await page.getByRole("tab", { name: "Comprado", exact: true }).click();
  await page.waitForTimeout(400);
  const body = await page.textContent("body");
  check("C9: filtro de status 'Comprado' esconde itens não comprados", !body.includes("Item C3 SemPreco"), "");
  await page.getByRole("tab", { name: "Todos", exact: true }).click();
  await page.waitForTimeout(300);
}

// C10: search
{
  await page.fill('input[placeholder="Buscar item..."]', "C1 Completo");
  await page.waitForTimeout(400);
  const body = await page.textContent("body");
  check("C10: busca por nome filtra corretamente", body.includes("Item C1 Completo") && !body.includes("Item C2 Virgula"), "");
  await page.fill('input[placeholder="Buscar item..."]', "");
  await page.waitForTimeout(300);
}

// C12: empty state
{
  await page.fill('input[placeholder="Buscar item..."]', "xyz-nao-existe-123");
  await page.waitForTimeout(400);
  const body = await page.textContent("body");
  check("C12: mensagem de estado vazio aparece quando busca não encontra nada", body.includes("Nenhum item encontrado"), "");
  await page.fill('input[placeholder="Buscar item..."]', "");
  await page.waitForTimeout(300);
}

await page.screenshot({ path: `${shotDir}/qa-items-02.png`, fullPage: true });

// C13: ordering stability regression check
{
  await page.reload({ waitUntil: "networkidle" });
  const names = await page.locator(".font-medium").allTextContents();
  const cozinhaSeedOrder = ["Geladeira", "Fogão", "Micro-ondas", "Liquidificador", "Cafeteira", "Panela de pressão"];
  const idxs = cozinhaSeedOrder.map((n) => names.indexOf(n));
  const isSorted = idxs.every((v, i) => i === 0 || v > idxs[i - 1]);
  check(
    "C13: ordem dos itens de seed permanece estável após múltiplas edições",
    isSorted && idxs.every((i) => i >= 0),
    JSON.stringify(idxs),
  );
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO ITENS/ORÇAMENTO: ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS/OBSERVAÇÕES:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

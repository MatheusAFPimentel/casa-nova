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
const email = `matheus.algustt+qagift${Date.now()}@gmail.com`;

await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/onboarding/, { timeout: 15000 });
await page.fill("#name", "QA Gift House");
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

// G1: gifted_by round-trips after reload
await addItem("Item Presente A");
{
  const row = page.locator(".rounded-lg.border", { hasText: "Item Presente A" });
  await row.getByRole("button", { name: "Editar" }).click();
  await page.waitForSelector("#status", { state: "visible" });
  await page.locator("#status").click();
  await page.getByRole("option", { name: "Ganho de presente" }).click();
  await page.fill('input[name="gifted_by"]', "Avó Rosa");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  await page.reload({ waitUntil: "networkidle" });
  await row.getByRole("button", { name: "Editar" }).click();
  await page.waitForSelector('input[name="gifted_by"]', { state: "visible" });
  const val = await page.inputValue('input[name="gifted_by"]');
  check("G1: 'quem deu' persiste após reload", val === "Avó Rosa", val);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

// G2: gifted_by is optional — marking presente without it shouldn't crash or
// show a broken "Presente de:" line
await addItem("Item Presente Sem Doador");
{
  const row = page.locator(".rounded-lg.border", { hasText: "Item Presente Sem Doador" });
  await row.getByRole("button", { name: "Editar" }).click();
  await page.waitForSelector("#status", { state: "visible" });
  await page.locator("#status").click();
  await page.getByRole("option", { name: "Ganho de presente" }).click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const rowText = await row.textContent();
  check(
    "G2: presente sem 'quem deu' não mostra linha 'Presente de:' quebrada",
    rowText.includes("Presente") && !rowText.includes("Presente de:"),
    rowText,
  );
}

// G3: quick checkbox on a "presente" item — documented quirk: promotes to
// "comprado" rather than toggling to "falta" (checkbox only understands
// falta<->comprado).
{
  const row = page.locator(".rounded-lg.border", { hasText: "Item Presente Sem Doador" });
  const checkbox = row.locator('[data-slot="checkbox"]');
  const checkedBefore = await checkbox.getAttribute("aria-checked");
  check("G3: checkbox aparece desmarcado para item 'presente'", checkedBefore !== "true", checkedBefore);

  await checkbox.click();
  await page.waitForTimeout(1000);
  // Use exact-text matches (not substring) for the badge, since the item's
  // own name contains the word "Presente" and would otherwise false-positive
  // on a plain row.textContent().includes("Presente") check.
  const compradoBadgeCount = await row.getByText("Comprado", { exact: true }).count();
  const presenteBadgeCount = await row.getByText("Presente", { exact: true }).count();
  check(
    "G3: clicar no checkbox de um item 'presente' promove para 'Comprado' (quirk documentado no plano)",
    compradoBadgeCount === 1 && presenteBadgeCount === 0,
    `comprado=${compradoBadgeCount} presente=${presenteBadgeCount}`,
  );
}

// G4: status filter tab "Presente" shows only gifted items
{
  await page.getByRole("tab", { name: "Presente", exact: true }).click();
  await page.waitForTimeout(400);
  const body = await page.textContent("body");
  check(
    "G4: aba 'Presente' mostra só itens com esse status",
    body.includes("Item Presente A") && !body.includes("Item Presente Sem Doador"),
    "",
  );
  await page.getByRole("tab", { name: "Todos", exact: true }).click();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO PRESENTE: ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

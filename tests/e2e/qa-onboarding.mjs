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

async function signupFresh(browser, emailSuffix) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const email = `matheus.algustt+qaonb${Date.now()}${emailSuffix}@gmail.com`;
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/onboarding/, { timeout: 15000 });
  return { ctx, page, email };
}

const browser = await chromium.launch();

// B2: empty name blocked by required field (HTML5)
{
  const { ctx, page } = await signupFresh(browser, "b2");
  await page.getByRole("button", { name: "Criar lar" }).click();
  await page.waitForTimeout(1000);
  check("B2: nome vazio não submete (continua em /onboarding)", page.url().includes("/onboarding"), page.url());
  await ctx.close();
}

// B3: invalid invite code
{
  const { ctx, page } = await signupFresh(browser, "b3");
  await page.fill("#invite_code", "ZZZZZZ");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForTimeout(1500);
  const url = page.url();
  const bodyText = await page.textContent("body");
  check(
    "B3: código de convite inválido mostra erro e não entra em nenhum lar",
    url.includes("/onboarding") && url.includes("error"),
    `url=${url} bodySnippet=${bodyText.slice(0, 200).replace(/\s+/g, " ")}`,
  );
  await ctx.close();
}

// B1 + B4 + B5: create household, capture invite code, second user joins, then
// first user revisiting /onboarding gets redirected to /dashboard
let inviteCode;
{
  const { ctx, page } = await signupFresh(browser, "b1");
  check("B1: novo usuário sem lar vê onboarding", page.url().includes("/onboarding"), page.url());

  await page.fill("#name", "QA Onboarding House");
  await page.getByRole("button", { name: "Criar lar" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  check("B1: criar lar redireciona para /dashboard", page.url().includes("/dashboard"), page.url());

  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  const text = await page.textContent("body");
  inviteCode = text.match(/[A-Z0-9]{6}/)?.[0];
  check("B1: código de convite de 6 caracteres foi gerado", !!inviteCode, inviteCode);

  // B5: user who already has a household hits /onboarding directly
  await page.goto(`${BASE}/onboarding`, { waitUntil: "networkidle" });
  check("B5: usuário com lar acessando /onboarding é redirecionado para /dashboard", page.url().includes("/dashboard"), page.url());

  await ctx.close();
}

// B4: second user joins with valid code
{
  const { ctx, page } = await signupFresh(browser, "b4");
  await page.fill("#invite_code", inviteCode);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  const text = await page.textContent("body");
  check("B4: segundo usuário entra com código válido e vê o lar compartilhado", text.includes("QA Onboarding House"), page.url());
  await ctx.close();
}

// B3b: lowercase invite code should still work (case-insensitivity check)
{
  const { ctx, page } = await signupFresh(browser, "b3b");
  await page.fill("#invite_code", inviteCode.toLowerCase());
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForTimeout(2000);
  const text = await page.textContent("body");
  check(
    "B3b: código de convite em minúsculas também funciona",
    page.url().includes("/dashboard") && text.includes("QA Onboarding House"),
    `url=${page.url()}`,
  );
  await ctx.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO ONBOARDING: ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

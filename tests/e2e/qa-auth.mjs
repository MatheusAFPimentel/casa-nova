import { chromium } from "playwright";

// Pré-condição: exige "Confirm email" desligado no Supabase (mailer_autoconfirm) —
// senão o signup não navega direto para /onboarding e todo o setup deste arquivo falha.
const BASE = "http://localhost:3000";
const email = `matheus.algustt+qaauth${Date.now()}@gmail.com`;
const password = "senha123456";

const results = [];
function check(name, condition, detail) {
  results.push({ name, pass: !!condition, detail });
  console.log(`${condition ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}

const browser = await chromium.launch();

// A1: unauthenticated access to protected routes redirects to /login
{
  const page = await browser.newPage();
  for (const path of ["/dashboard", "/onboarding", "/settings"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    check(`A1: GET ${path} sem sessão redireciona para /login`, page.url().endsWith("/login"), page.url());
  }
  await page.close();
}

// A7: icon routes must stay accessible without auth — regressão real: o
// matcher do proxy só excluía favicon.ico e extensões de arquivo literais;
// /icon e /apple-icon (rotas geradas via next/og, sem extensão na URL)
// ficavam presas no gate de auth e nunca carregavam para visitante deslogado.
{
  const page = await browser.newPage();
  for (const path of ["/icon", "/apple-icon"]) {
    const res = await page.request.get(`${BASE}${path}`);
    check(
      `A7: GET ${path} sem sessão retorna 200 (não redireciona pro /login)`,
      res.status() === 200 && (res.headers()["content-type"] || "").startsWith("image/"),
      `status=${res.status()} content-type=${res.headers()["content-type"]}`,
    );
  }
  await page.close();
}

// signup happy path (fresh context, no lingering session)
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(onboarding|login)/, { timeout: 15000 });
  check("A-signup: cadastro válido segue para onboarding", page.url().includes("/onboarding"), page.url());
  await ctx.close();
}

// A3: duplicate signup — separate fresh (logged-out) context, otherwise the
// still-authenticated session just bounces back into the app before ever
// reaching Supabase's duplicate-email check.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  const url = page.url();
  const bodyText = await page.textContent("body");
  check(
    "A3: cadastro duplicado mostra erro (não deixa criar 2a conta silenciosamente)",
    url.includes("error") || bodyText.toLowerCase().includes("already") || bodyText.toLowerCase().includes("registrad"),
    `url=${url} bodySnippet=${bodyText.slice(0, 200).replace(/\s+/g, " ")}`,
  );
  await ctx.close();
}

// A2: wrong password
{
  const page = await browser.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", "senhaErrada999");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  const url = page.url();
  check("A2: senha errada mantém em /login com erro", url.includes("/login") && url.includes("error"), url);
  await page.close();
}

// A-login happy path + A6: authenticated hitting /login or /signup redirects to app
{
  const page = await browser.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 15000 });
  check("A-login: login válido entra no app", true, page.url());

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  check("A6: usuário autenticado acessando /login é redirecionado", !page.url().endsWith("/login"), page.url());

  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  check("A6: usuário autenticado acessando /signup é redirecionado", !page.url().endsWith("/signup"), page.url());

  // A5: logout clears session
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }).catch(() => {});
  if (page.url().includes("/onboarding")) {
    // REGRESSÃO: /onboarding costumava não ter opção de logout (bug corrigido).
    const sairOnboarding = page.getByRole("button", { name: "Sair" });
    check(
      "REGRESSÃO: botão Sair continua presente em /onboarding",
      (await sairOnboarding.count()) > 0,
      "",
    );
    await page.fill("#name", "QA Auth Household");
    await page.getByRole("button", { name: "Criar lar" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  }
  const sairBtn = page.getByRole("button", { name: "Sair" });
  if (await sairBtn.count() > 0) {
    await sairBtn.click();
    await page.waitForURL(/\/login/, { timeout: 15000 });
    check("A5: logout redireciona para /login", page.url().includes("/login"), page.url());

    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    check("A5: após logout, /dashboard volta a redirecionar para /login", page.url().includes("/login"), page.url());
  } else {
    check("A5: botão Sair encontrado (pré-condição)", false, "não foi possível localizar o botão Sair; usuário pode não ter household ainda");
  }
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO AUTH: ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

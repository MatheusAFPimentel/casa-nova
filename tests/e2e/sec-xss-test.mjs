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

let xssFired = false;
page.on("dialog", async (d) => {
  xssFired = true;
  console.log("!!! ALERTA DISPAROU (XSS funcionou):", d.message());
  await d.dismiss();
});

const email = `matheus.algustt+secxss${Date.now()}@gmail.com`;
await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await page.click('button[type="submit"]');
await page.waitForURL(/\/onboarding/, { timeout: 15000 });

// Payload in household name (rendered as wordmark/title across onboarding + dashboard)
await page.fill("#name", '<img src=x onerror=alert(1)>');
await page.getByRole("button", { name: "Criar lar" }).click();
await page.waitForURL(/\/dashboard/, { timeout: 15000 });
await page.waitForTimeout(1000);

// Payload in item name
await page.getByRole("button", { name: "Adicionar item" }).click();
await page.waitForSelector('input[name="name"]', { state: "visible" });
await page.fill('input[name="name"]', '<script>alert(2)</script><img src=x onerror=alert(3)>');
await page.getByRole("button", { name: "Adicionar" }).click();
await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1500);

const html = await page.content();
const rawScriptTagPresent = html.includes("<script>alert(2)</script>");
const rawImgTagPresent = /<img[^>]*onerror=alert/.test(html);
const bodyText = await page.textContent("body");
const payloadAsEscapedText =
  bodyText.includes("<script>alert(2)</script>") || bodyText.includes("onerror=alert(3)");

check("SEC1: nenhum alert() disparou (household name ou item name payload)", xssFired === false, `xssFired=${xssFired}`);
check("SEC2: tag <script> não aparece crua (sem escape) no HTML final", rawScriptTagPresent === false, "");
check("SEC3: tag <img onerror> não aparece crua (sem escape) no HTML final", rawImgTagPresent === false, "");
check("SEC4: payload aparece como texto escapado na página (React default-escaping ativo)", payloadAsEscapedText, "");

await browser.close();

const failed = results.filter((r) => !r.pass);
console.log(`\n=== RESUMO XSS (OWASP A03): ${results.length - failed.length}/${results.length} passaram ===`);
if (failed.length) {
  console.log("FALHAS:");
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
}

process.exitCode = failed.length ? 1 : 0;

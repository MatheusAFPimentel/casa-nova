# Testes E2E (manuais)

10 scripts Playwright, cada um um arquivo standalone (`node tests/e2e/arquivo.mjs`),
sem framework de teste (sem Jest/Vitest, sem `describe/it`). Cobrem os fluxos
principais do app de ponta a ponta: auth, onboarding/convite, itens/orçamento,
presente, labels de select, log de preço, prioridade/data, configurações, UX
(categorias recolhíveis) e um teste de injeção XSS (OWASP A03).

## Por que não estão no CI

Cada execução cria conta(s) de verdade contra o Supabase configurado em
`.env.local` — que hoje é o projeto de **produção**. Não há limpeza automática
(apagar `auth.users` de outra conta exige a `service_role` key, que este
projeto deliberadamente nunca expõe). Rodar isso a cada push encheria o banco
real de contas/itens de teste para sempre.

Decisão (14/07/2026): manter execução manual, sob demanda, em vez de
automatizar no GitHub Actions. O CI (`.github/workflows/ci.yml`) continua só
com lint + build. Reavaliar se o projeto crescer para múltiplos
desenvolvedores — nesse caso, a opção mais indicada seria Supabase local via
`supabase start` no runner do CI (Postgres+Auth efêmero, sem custo e sem
tocar produção), não um segundo projeto hospedado.

## Como rodar

1. Suba o dev server: `npm run dev` (precisa estar em `http://localhost:3000`).
2. Em outro terminal, rode qualquer suíte: `node tests/e2e/qa-items.mjs`.
3. Leia o resumo no final (`=== RESUMO ... ===`). Cada script sai com
   `process.exitCode = 1` se algo falhou — útil para rodar várias em sequência
   e só investigar as que quebraram:

   ```bash
   for f in tests/e2e/qa-*.mjs tests/e2e/sec-*.mjs; do
     node "$f" || echo "FALHOU: $f"
   done
   ```

Playwright já está como devDependency (`npm install` resolve). Os browsers do
Playwright (`npx playwright install chromium`) precisam estar instalados
localmente na primeira vez.

## Padrão dos arquivos

```js
const results = [];
function check(name, condition, detail) {
  results.push({ name, pass: !!condition, detail });
  console.log(`${condition ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}
```

- `check()` é o único "assert" — não lança exceção, só registra e imprime na
  hora. Um caso falhar não aborta os outros (diferente de um `assert()` que
  jogaria exceção).
- **Sem mocks.** Cada script sobe um Chromium real, navega para o app e cria
  conta(s) com email único via timestamp (`+algo${Date.now()}@gmail.com`)
  contra o Supabase real. Testa o sistema de ponta a ponta (Playwright →
  Server Actions → Supabase/RLS), não uma função isolada.
- **Contextos isolados** (`browser.newContext()`) quando o mesmo arquivo
  precisa simular "sem sessão" vs "logado" — senão a sessão vazaria entre
  os casos dentro do mesmo arquivo.
- **Seletores**: `getByRole`/`getByText` quando possível (mais estável —
  semântico, não depende de classe CSS). Seletores de classe Tailwind
  (`.rounded-lg.border`) só quando não há alternativa semântica — são a parte
  mais frágil da suíte; uma mudança de classe no componente pode quebrar ou,
  pior, passar por coincidência (ver nota abaixo).
- **Convenção `REGRESSÃO:`**: nome de teste prefixado assim marca um caso
  escrito depois de um bug real acontecer — documenta o comportamento errado
  antigo vs. o correto atual.
- **Gotcha de formatação**: `formatBRL()` usa NBSP (` `) entre "R$" e o
  número. Toda comparação de string de preço precisa de um `norm()` que troca
  NBSP por espaço normal, senão falha silenciosamente por um caractere
  invisível.
- **`isVisible()` não detecta clipping por ancestral.** Se um elemento está
  visualmente escondido porque um ANCESTRAL tem altura 0 + `overflow:hidden`
  (como o painel de categoria recolhida em `dashboard-client.tsx`, que usa o
  truque `grid-template-rows: 0fr`), `locator.isVisible()` ainda retorna
  `true` — ele só olha a bounding box do próprio elemento, não segue a cadeia
  de ancestrais. Para testar esse tipo de clipping, use `boundingBox()` no
  elemento que realmente tem `overflow:hidden` e verifique `height === 0`
  (ver `qa-ux.mjs`, casos U5c-U5g, com o comentário explicando o achado).

## Cobertura conhecida como incompleta

- `qa-items.mjs` C13 usa o seletor `.font-medium` para nomes de item, mas o
  `Badge` também tem `font-medium` na classe base — o array de "nomes"
  inclui texto de badge junto. Passa hoje porque as strings não colidem, mas
  é frágil.
- `qa-priority-date.mjs` usa `p.text-muted-foreground.first()` para achar o
  subtítulo do dashboard — funciona porque hoje é o primeiro elemento com
  essa classe, mas é posicional, não semântico.
- `npm audit` reporta 2 avisos moderados de PostCSS empacotado *dentro* do
  Next.js (não introduzido por este diretório) — a correção sugerida
  rebaixaria o Next para uma versão canary muito antiga; não é uma correção
  válida. Baixo risco prático (o app não renderiza CSS vindo de usuário).

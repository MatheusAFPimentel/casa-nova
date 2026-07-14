import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBRL } from "@/lib/format";

export function BudgetSummary({
  estimatedTotal,
  spentTotal,
  budgetLimit,
  boughtCount,
  giftedCount,
  totalCount,
}: {
  estimatedTotal: number;
  spentTotal: number;
  budgetLimit: number | null;
  boughtCount: number;
  giftedCount: number;
  totalCount: number;
}) {
  const reference = budgetLimit ?? estimatedTotal;
  const progress = reference > 0 ? Math.min(100, (spentTotal / reference) * 100) : 0;
  const remaining = reference - spentTotal;

  return (
    <Card className="bg-primary/5 ring-primary/15">
      <CardHeader>
        <CardTitle className="text-lg">Orçamento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Progress
          value={progress}
          aria-label="Progresso do orçamento"
          aria-valuetext={`${formatBRL(spentTotal)} de ${formatBRL(reference)} gastos`}
        />
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
          <div>
            <p className="text-muted-foreground">Gasto</p>
            <p className="font-semibold">{formatBRL(spentTotal)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {budgetLimit ? "Orçamento" : "Estimado"}
            </p>
            <p className="font-semibold">{formatBRL(reference)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Restante</p>
            <p className="font-semibold">{formatBRL(remaining)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Itens comprados</p>
            <p className="font-semibold">
              {boughtCount} / {totalCount}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Presentes</p>
            <p className="font-semibold">{giftedCount}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

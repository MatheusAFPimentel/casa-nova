import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBudgetLimit, updateMoveInDate } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const { data: household } = await supabase
    .from("households")
    .select("id, name, invite_code, budget_limit, move_in_date")
    .eq("id", membership.household_id)
    .single();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          ← Voltar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Convidar seu par</CardTitle>
          <CardDescription>
            Compartilhe este código para que ele(a) entre na mesma lista.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border bg-muted px-4 py-3 text-center text-2xl font-bold tracking-widest">
            {household?.invite_code}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data da mudança</CardTitle>
          <CardDescription>
            Usada para mostrar a contagem regressiva no topo do painel (opcional).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateMoveInDate} className="flex flex-col gap-4">
            <input type="hidden" name="household_id" value={household?.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="move_in_date">Data</Label>
              <Input
                key={household?.move_in_date ?? "empty"}
                id="move_in_date"
                name="move_in_date"
                type="date"
                defaultValue={household?.move_in_date ?? ""}
              />
            </div>
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orçamento planejado</CardTitle>
          <CardDescription>
            Defina um valor total de referência para a barra de progresso do
            orçamento (opcional).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateBudgetLimit} className="flex flex-col gap-4">
            <input type="hidden" name="household_id" value={household?.id} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="budget_limit">Orçamento total (R$)</Label>
              <Input
                key={household?.budget_limit ?? "empty"}
                id="budget_limit"
                name="budget_limit"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={household?.budget_limit ?? ""}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit">Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

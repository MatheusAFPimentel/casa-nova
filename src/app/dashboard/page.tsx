import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BudgetSummary } from "@/components/budget-summary";
import { DashboardClient } from "@/components/dashboard-client";
import type { Item } from "@/lib/types";

function getMoveInMessage(moveInDate: string | null): string | null {
  if (!moveInDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${moveInDate}T00:00:00`);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diffDays > 1) return `${diffDays} dias para a mudança`;
  if (diffDays === 1) return "Mudança é amanhã!";
  if (diffDays === 0) return "Mudança é hoje!";
  if (diffDays === -1) return "Mudança foi ontem";
  return `Mudança foi há ${Math.abs(diffDays)} dias`;
}

export default async function DashboardPage() {
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
    .select("id, name, budget_limit, move_in_date")
    .eq("id", membership.household_id)
    .single();

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("household_id", membership.household_id)
    .order("position", { ascending: true });

  const itemList = (items ?? []) as Item[];
  // Gifted items don't need money planned for them anymore, so they're
  // excluded from the estimate used as the budget reference.
  const estimatedTotal = itemList.reduce(
    (sum, item) => sum + (item.status === "presente" ? 0 : (item.estimated_price ?? 0)),
    0,
  );
  // Only counts a confirmed actual_price as "spent" — falling back to the
  // estimate here would make "Gasto" look like real money that was never
  // actually recorded against the item.
  const spentTotal = itemList.reduce(
    (sum, item) => sum + (item.status === "comprado" ? (item.actual_price ?? 0) : 0),
    0,
  );
  const boughtCount = itemList.filter((item) => item.status === "comprado").length;
  const giftedCount = itemList.filter((item) => item.status === "presente").length;
  const moveInMessage = getMoveInMessage(household?.move_in_date ?? null);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-medium sm:text-3xl">
            {household?.name ?? "Nosso lar"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {moveInMessage ?? "Lista de compras da casa nova"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/settings" />}
          >
            <Settings />
            Configurações
          </Button>
          <form action={logout}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut />
              Sair
            </Button>
          </form>
        </div>
      </header>

      <BudgetSummary
        estimatedTotal={estimatedTotal}
        spentTotal={spentTotal}
        budgetLimit={household?.budget_limit ?? null}
        boughtCount={boughtCount}
        giftedCount={giftedCount}
        totalCount={itemList.length}
      />

      <DashboardClient items={itemList} householdId={membership.household_id} />
    </div>
  );
}

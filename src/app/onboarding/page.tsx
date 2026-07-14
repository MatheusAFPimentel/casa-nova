import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createHousehold, joinHousehold, logout } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OnboardingPage({
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
  if (membership) redirect("/dashboard");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/40 p-4">
      <h1 className="sr-only">Configurar seu lar no Casa Nova</h1>
      <div className="flex w-full max-w-3xl items-center justify-between">
        <p className="font-heading text-xl text-primary">Casa Nova</p>
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
      </div>
      <div className="flex w-full max-w-3xl flex-col gap-6 sm:flex-row">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Criar nosso lar</CardTitle>
            <CardDescription>
              Comece uma lista nova, já com sugestões de itens comuns para um
              casal novo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createHousehold} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome do lar</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Casa do Matheus & Ana"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Criar lar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Entrar com código</CardTitle>
            <CardDescription>
              Já tem um código de convite? Entre na lista que seu par já
              criou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={joinHousehold} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite_code">Código de convite</Label>
                <Input
                  id="invite_code"
                  name="invite_code"
                  placeholder="Ex: AB12CD"
                  className="uppercase"
                  maxLength={6}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="outline" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

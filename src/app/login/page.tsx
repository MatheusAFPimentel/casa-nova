import Link from "next/link";
import { login } from "@/app/actions";
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <p className="font-heading text-2xl text-primary">Casa Nova</p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse o planejamento da sua casa nova.</CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <p className="mb-4 text-sm text-muted-foreground">{message}</p>
          )}
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <Link href="/signup" className="underline underline-offset-4">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

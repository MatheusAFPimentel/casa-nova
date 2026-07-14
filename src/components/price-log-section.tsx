"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addPriceLogEntry, deletePriceLogEntry } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/format";
import type { PriceLogEntry } from "@/lib/types";

export function PriceLogSection({ itemId }: { itemId: string }) {
  const [entries, setEntries] = useState<PriceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    const supabase = createClient();
    const { data } = await supabase
      .from("price_log")
      .select("*")
      .eq("item_id", itemId)
      .order("observed_at", { ascending: false });
    setEntries((data ?? []) as PriceLogEntry[]);
    setLoading(false);
  }

  useEffect(() => {
    // Intentional: fetch-on-mount/on-itemId-change from the browser Supabase
    // client, not derived state — there's no external subscription to
    // attach to instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function handleAdd(formData: FormData) {
    setError(null);
    try {
      await addPriceLogEntry(formData);
      await refetch();
      const form = document.getElementById("price-log-form") as HTMLFormElement | null;
      form?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o preço.");
    }
  }

  async function handleDelete(id: string) {
    await deletePriceLogEntry(id);
    await refetch();
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <p className="text-sm font-medium">Histórico de preços</p>

      {!loading && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum preço registrado ainda.</p>
      )}

      {entries.length > 0 && (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {new Date(entry.observed_at + "T00:00:00").toLocaleDateString("pt-BR")} —{" "}
                {formatBRL(entry.price)}
                {entry.store ? ` — ${entry.store}` : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(entry.id)}
              >
                Remover
              </Button>
            </div>
          ))}
        </div>
      )}

      <form id="price-log-form" action={handleAdd} className="grid grid-cols-3 gap-2">
        <input type="hidden" name="item_id" value={itemId} />
        <div className="flex flex-col gap-1">
          <Label htmlFor="price" className="text-xs">
            Preço
          </Label>
          <Input id="price" name="price" inputMode="decimal" placeholder="0,00" required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="store-log" className="text-xs">
            Loja
          </Label>
          <Input id="store-log" name="store" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="observed_at" className="text-xs">
            Data
          </Label>
          <Input id="observed_at" name="observed_at" type="date" />
        </div>
        {error && <p className="col-span-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" variant="outline" size="sm" className="col-span-3">
          Adicionar preço
        </Button>
      </form>
    </div>
  );
}

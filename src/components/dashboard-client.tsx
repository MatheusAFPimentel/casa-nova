"use client";

import { useMemo, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemDialog } from "@/components/item-dialog";
import { ItemCard } from "@/components/item-card";
import { CATEGORIES } from "@/lib/seed-items";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import type { Item } from "@/lib/types";

type StatusFilter = "todos" | "falta" | "comprado" | "presente";

export function DashboardClient({
  items,
  householdId,
}: {
  items: Item[];
  householdId: string;
}) {
  const [category, setCategory] = useState<string>("todas");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [search, setSearch] = useState("");
  const [essentialOnly, setEssentialOnly] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (category !== "todas" && item.category !== category) return false;
      if (status !== "todos" && item.status !== status) return false;
      if (essentialOnly && item.priority !== "essencial") return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [items, category, status, essentialOnly, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of filtered) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="falta">Falta</TabsTrigger>
            <TabsTrigger value="comprado">Comprado</TabsTrigger>
            <TabsTrigger value="presente">Presente</TabsTrigger>
          </TabsList>
        </Tabs>

        <ItemDialog
          householdId={householdId}
          trigger={<Button>Adicionar item</Button>}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant={category === "todas" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategory("todas")}
          >
            Todas categorias
          </Button>
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c];
            return (
              <Button
                key={c}
                variant={category === c ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(c)}
              >
                {Icon && <Icon />}
                {c}
              </Button>
            );
          })}
          <Button
            variant={essentialOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setEssentialOnly((v) => !v)}
          >
            Só essenciais
          </Button>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          Nenhum item encontrado.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {[...grouped.entries()].map(([cat, catItems]) => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <div key={cat} className="flex flex-col gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                {Icon && <Icon className="size-4" />}
                {cat} ({catItems.length})
              </h2>
              <div className="flex flex-col gap-2">
                {catItems.map((item) => (
                  <ItemCard key={item.id} item={item} householdId={householdId} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

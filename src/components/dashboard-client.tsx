"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Item } from "@/lib/types";

type StatusFilter = "todos" | "falta" | "comprado" | "presente";

function categoryPanelId(category: string) {
  return `category-panel-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

// Categories where nothing is left to buy start collapsed (nothing useful to
// see there), everything else starts open — avoids both extremes (hiding
// everything on first load, or not reducing the scroll at all).
function defaultExpandedCategories(items: Item[]): Set<string> {
  const byCategory = new Map<string, Item[]>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const expanded = new Set<string>();
  for (const [cat, catItems] of byCategory) {
    const allResolved = catItems.every(
      (i) => i.status === "comprado" || i.status === "presente",
    );
    if (!allResolved) expanded.add(cat);
  }
  return expanded;
}

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() =>
    defaultExpandedCategories(items),
  );

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

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

      <div className="flex flex-col gap-4">
        {[...grouped.entries()].map(([cat, catItems]) => {
          const Icon = CATEGORY_ICONS[cat];
          const isExpanded = expandedCategories.has(cat);
          const panelId = categoryPanelId(cat);
          return (
            <div key={cat} className="flex flex-col gap-2">
              <h2>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  onClick={() => toggleCategory(cat)}
                  className="flex w-full cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown
                    className={cn("size-4 shrink-0 transition-transform", !isExpanded && "-rotate-90")}
                  />
                  {Icon && <Icon className="size-4 shrink-0" />}
                  {cat} ({catItems.length})
                </button>
              </h2>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
                  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <div
                    id={panelId}
                    aria-hidden={!isExpanded}
                    className="flex flex-col gap-2 pt-2"
                  >
                    {catItems.map((item) => (
                      <ItemCard key={item.id} item={item} householdId={householdId} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

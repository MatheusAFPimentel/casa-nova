"use client";

import { useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ItemDialog } from "@/components/item-dialog";
import { toggleItemStatus, deleteItem } from "@/app/actions";
import { formatBRL } from "@/lib/format";
import type { Item } from "@/lib/types";

export function ItemCard({ item, householdId }: { item: Item; householdId: string }) {
  const [isPending, startTransition] = useTransition();

  const hasPrice = item.estimated_price !== null || item.actual_price !== null;
  const hasMeta =
    (item.status === "presente" && item.gifted_by) || item.store || item.link;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed p-3">
      <Checkbox
        checked={item.status === "comprado"}
        disabled={isPending}
        aria-label={`Marcar "${item.name}" como comprado`}
        onCheckedChange={() =>
          startTransition(() => {
            toggleItemStatus(item.id, item.status);
          })
        }
        className="mt-1"
      />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={
              item.status === "comprado" || item.status === "presente"
                ? "font-medium line-through text-muted-foreground"
                : "font-medium"
            }
          >
            {item.name}
          </p>
          {item.quantity > 1 && <Badge variant="outline">×{item.quantity}</Badge>}
          {item.status === "comprado" && <Badge variant="stamp">Comprado</Badge>}
          {item.status === "presente" && <Badge variant="stamp">Presente</Badge>}
          {item.priority === "essencial" && <Badge variant="default">Essencial</Badge>}
        </div>
        {hasMeta && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {item.status === "presente" && item.gifted_by && (
              <span>Presente de: {item.gifted_by}</span>
            )}
            {item.store && <span>Loja: {item.store}</span>}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                Ver link
              </a>
            )}
          </div>
        )}
      </div>

      {hasPrice && (
        <div className="shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">
          {item.estimated_price !== null && (
            <p>Est. {formatBRL(item.estimated_price)}</p>
          )}
          {item.actual_price !== null && <p>Real {formatBRL(item.actual_price)}</p>}
        </div>
      )}

      <div className="flex shrink-0 gap-1">
        <ItemDialog
          householdId={householdId}
          item={item}
          trigger={
            <Button variant="ghost" size="sm">
              Editar
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm(`Remover "${item.name}" da lista?`)) {
              startTransition(() => {
                deleteItem(item.id);
              });
            }
          }}
        >
          Remover
        </Button>
      </div>
    </div>
  );
}

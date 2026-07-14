"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/seed-items";
import { addItem, updateItem } from "@/app/actions";
import { PriceLogSection } from "@/components/price-log-section";
import type { Item } from "@/lib/types";

// Base UI's <Select.Value> shows the raw value unless the Root is given an
// `items` value->label map — without it, e.g. "pode_esperar" renders as-is
// instead of "Pode esperar".
const CATEGORY_ITEMS = Object.fromEntries(CATEGORIES.map((c) => [c, c]));
const STATUS_ITEMS = {
  falta: "Falta comprar",
  comprado: "Comprado",
  presente: "Ganho de presente",
};
const PRIORITY_ITEMS = {
  essencial: "Essencial",
  pode_esperar: "Pode esperar",
};

export function ItemDialog({
  householdId,
  item,
  trigger,
}: {
  householdId: string;
  item?: Item;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(item);

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      if (isEdit) {
        await updateItem(formData);
      } else {
        await addItem(formData);
      }
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o item.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar item" : "Adicionar item"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {isEdit && <input type="hidden" name="id" value={item!.id} />}
          {!isEdit && (
            <input type="hidden" name="household_id" value={householdId} />
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" defaultValue={item?.name} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              name="category"
              items={CATEGORY_ITEMS}
              defaultValue={item?.category ?? CATEGORIES[0]}
            >
              <SelectTrigger id="category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="estimated_price">Preço estimado (por unidade)</Label>
              <Input
                id="estimated_price"
                name="estimated_price"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={item?.estimated_price ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="quantity">Quantidade</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min={1}
                step={1}
                defaultValue={item?.quantity ?? 1}
              />
            </div>
          </div>

          {isEdit && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="actual_price">Preço real (por unidade)</Label>
              <Input
                id="actual_price"
                name="actual_price"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={item?.actual_price ?? ""}
              />
            </div>
          )}

          {isEdit && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" items={STATUS_ITEMS} defaultValue={item?.status ?? "falta"}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="falta">Falta comprar</SelectItem>
                  <SelectItem value="comprado">Comprado</SelectItem>
                  <SelectItem value="presente">Ganho de presente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isEdit && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="gifted_by">Quem deu? (se foi presente)</Label>
              <Input
                id="gifted_by"
                name="gifted_by"
                placeholder="Ex: Tia Marta"
                defaultValue={item?.gifted_by ?? ""}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              name="priority"
              items={PRIORITY_ITEMS}
              defaultValue={item?.priority ?? "pode_esperar"}
            >
              <SelectTrigger id="priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essencial">Essencial</SelectItem>
                <SelectItem value="pode_esperar">Pode esperar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="store">Loja</Label>
              <Input id="store" name="store" defaultValue={item?.store ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="link">Link</Label>
              <Input id="link" name="link" defaultValue={item?.link ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" name="notes" defaultValue={item?.notes ?? ""} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full">
            {isEdit ? "Salvar alterações" : "Adicionar"}
          </Button>
        </form>

        {isEdit && <PriceLogSection itemId={item!.id} />}
      </DialogContent>
    </Dialog>
  );
}

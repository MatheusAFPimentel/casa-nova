"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SEED_ITEMS } from "@/lib/seed-items";

// Parses a price/amount field. Returns null for an empty (optional) value and
// throws a user-facing message for anything that isn't a valid number, so bad
// input surfaces as an error instead of being silently discarded as null.
function parseOptionalNumber(raw: string, fieldLabel: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const normalized = trimmed.replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldLabel} inválido: "${raw}". Use apenas números (ex: 150,50).`);
  }
  return value;
}

// Parses a quantity field. Empty defaults to 1 (quantity is never optional —
// every item needs at least one). Throws for anything that isn't a positive
// whole number.
function parsePositiveInteger(raw: string, fieldLabel: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 1;

  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${fieldLabel} inválida: "${raw}". Use um número inteiro de 1 ou mais.`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signup(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "Enviamos um link de confirmação para o seu e-mail. Confirme para poder entrar.",
      )}`,
    );
  }

  redirect("/onboarding");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Household / onboarding
// ---------------------------------------------------------------------------

export async function createHousehold(formData: FormData) {
  const name = String(formData.get("name") || "Nosso lar");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Creates the household and the caller's membership atomically via a
  // SECURITY DEFINER function — clients have no direct insert access to
  // households/household_members (see supabase/schema.sql for why).
  const { data: household, error } = await supabase.rpc("create_household", { p_name: name });
  if (error) throw error;

  const { error: itemsError } = await supabase.from("items").insert(
    SEED_ITEMS.map((item) => ({
      household_id: household.id,
      category: item.category,
      name: item.name,
    })),
  );
  if (itemsError) throw itemsError;

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function joinHousehold(formData: FormData) {
  const inviteCode = String(formData.get("invite_code") || "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Validates the code and enrolls the caller atomically via a SECURITY
  // DEFINER function — a direct table insert would let anyone self-enroll
  // into any household_id they could see or guess, invite code or not.
  const { error } = await supabase.rpc("join_household", { p_invite_code: inviteCode });
  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent("Código de convite inválido.")}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateBudgetLimit(formData: FormData) {
  const householdId = String(formData.get("household_id"));
  const raw = String(formData.get("budget_limit") || "");

  let budgetLimit: number | null = null;
  try {
    budgetLimit = parseOptionalNumber(raw, "Orçamento");
  } catch (e) {
    redirect(`/settings?error=${encodeURIComponent((e as Error).message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("households")
    .update({ budget_limit: budgetLimit })
    .eq("id", householdId);
  if (error) throw error;

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function addItem(formData: FormData) {
  const householdId = String(formData.get("household_id"));
  const category = String(formData.get("category"));
  const name = String(formData.get("name"));
  const estimatedPrice = parseOptionalNumber(String(formData.get("estimated_price") || ""), "Preço estimado");
  const quantity = parsePositiveInteger(String(formData.get("quantity") || ""), "Quantidade");
  const priority = String(formData.get("priority") || "pode_esperar");
  const store = String(formData.get("store") || "") || null;
  const link = String(formData.get("link") || "") || null;
  const notes = String(formData.get("notes") || "") || null;

  const supabase = await createClient();
  const { error } = await supabase.from("items").insert({
    household_id: householdId,
    category,
    name,
    estimated_price: estimatedPrice,
    quantity,
    priority,
    store,
    link,
    notes,
  });
  if (error) throw error;

  revalidatePath("/dashboard");
}

export async function updateItem(formData: FormData) {
  const id = String(formData.get("id"));
  const category = String(formData.get("category"));
  const name = String(formData.get("name"));
  const estimatedPrice = parseOptionalNumber(String(formData.get("estimated_price") || ""), "Preço estimado");
  const actualPrice = parseOptionalNumber(String(formData.get("actual_price") || ""), "Preço real");
  const quantity = parsePositiveInteger(String(formData.get("quantity") || ""), "Quantidade");
  const status = String(formData.get("status") || "falta");
  const giftedBy = String(formData.get("gifted_by") || "") || null;
  const priority = String(formData.get("priority") || "pode_esperar");
  const store = String(formData.get("store") || "") || null;
  const link = String(formData.get("link") || "") || null;
  const notes = String(formData.get("notes") || "") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .update({
      category,
      name,
      estimated_price: estimatedPrice,
      actual_price: actualPrice,
      quantity,
      status,
      gifted_by: giftedBy,
      priority,
      store,
      link,
      notes,
    })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/dashboard");
}

export async function toggleItemStatus(id: string, currentStatus: string) {
  const supabase = await createClient();
  const nextStatus = currentStatus === "comprado" ? "falta" : "comprado";
  const { error } = await supabase
    .from("items")
    .update({ status: nextStatus })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/dashboard");
}

export async function deleteItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/dashboard");
}

export async function updateMoveInDate(formData: FormData) {
  const householdId = String(formData.get("household_id"));
  const raw = String(formData.get("move_in_date") || "");
  const moveInDate = raw === "" ? null : raw;

  const supabase = await createClient();
  const { error } = await supabase
    .from("households")
    .update({ move_in_date: moveInDate })
    .eq("id", householdId);
  if (error) throw error;

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// Price log
// ---------------------------------------------------------------------------

export async function addPriceLogEntry(formData: FormData) {
  const itemId = String(formData.get("item_id"));
  const price = parseOptionalNumber(String(formData.get("price") || ""), "Preço");
  if (price === null) throw new Error("Informe um preço.");
  const store = String(formData.get("store") || "") || null;
  const observedAtRaw = String(formData.get("observed_at") || "");
  const observedAt = observedAtRaw || new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { error } = await supabase
    .from("price_log")
    .insert({ item_id: itemId, price, store, observed_at: observedAt });
  if (error) throw error;
}

export async function deletePriceLogEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("price_log").delete().eq("id", id);
  if (error) throw error;
}

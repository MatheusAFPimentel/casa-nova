export type Item = {
  id: string;
  household_id: string;
  category: string;
  name: string;
  estimated_price: number | null;
  actual_price: number | null;
  quantity: number;
  status: "falta" | "comprado" | "presente";
  gifted_by: string | null;
  priority: "essencial" | "pode_esperar";
  store: string | null;
  link: string | null;
  notes: string | null;
};

export type PriceLogEntry = {
  id: string;
  item_id: string;
  price: number;
  store: string | null;
  observed_at: string;
};

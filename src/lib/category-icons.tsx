import {
  ChefHat,
  BedDouble,
  Sofa,
  Bath,
  WashingMachine,
  Plug,
  Package2,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Cozinha: ChefHat,
  Quarto: BedDouble,
  Sala: Sofa,
  Banheiro: Bath,
  "Lavanderia e Limpeza": WashingMachine,
  Eletrodomésticos: Plug,
  Diversos: Package2,
};

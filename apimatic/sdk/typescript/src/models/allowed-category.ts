import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const AllowedCategory = {
  FoodPackaging: "food_packaging",
  CleaningSupplies: "cleaning_supplies",
  CookingIngredients: "cooking_ingredients",
  Beverages: "beverages",
  KitchenEquipment: "kitchen_equipment",
  Alcohol: "alcohol",
  GiftCards: "gift_cards",
  Services: "services",
} as const;
export type AllowedCategory = (typeof AllowedCategory)[keyof typeof AllowedCategory] | (string & {});

export const allowedCategorySchema: EnumSchema<AllowedCategory> = s.enumOf<AllowedCategory>(AllowedCategory);

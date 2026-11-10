import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Product category. */
export const Category = {
  FoodPackaging: "food_packaging",
  CleaningSupplies: "cleaning_supplies",
  CookingIngredients: "cooking_ingredients",
  Beverages: "beverages",
  KitchenEquipment: "kitchen_equipment",
  Alcohol: "alcohol",
  GiftCards: "gift_cards",
  Services: "services",
} as const;
export type Category = (typeof Category)[keyof typeof Category] | (string & {});

export const categorySchema: EnumSchema<Category> = s.enumOf<Category>(Category);

import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

/** Product category used by the Spend Mandate's category rules. */
export const ProductCategory = {
  FoodPackaging: "food_packaging",
  CleaningSupplies: "cleaning_supplies",
  CookingIngredients: "cooking_ingredients",
  Beverages: "beverages",
  KitchenEquipment: "kitchen_equipment",
  Alcohol: "alcohol",
  GiftCards: "gift_cards",
  Services: "services",
} as const;
export type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory] | (string & {});

export const productCategorySchema: EnumSchema<ProductCategory> = s.enumOf<ProductCategory>(ProductCategory);

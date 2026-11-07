export type ProductCategory = string;

export interface CategoryDefinition {
  id: string;
  label: string;
  icon?: string;
  isCustom?: boolean;
}

export interface Product {
  id?: number;
  name: string;
  category: ProductCategory;
  quantity: number;
  unit: 'г' | 'кг' | 'мл' | 'л' | 'шт';
  expiryDate?: string; // YYYY-MM-DD
  calories: number; // ккал на 100г
  protein: number;  // г на 100г
  fat: number;      // г на 100г
  carbs: number;    // г на 100г
  barcode?: string;
  addedAt: string;
}

export interface RecipeIngredient {
  name: string;
  amount: number; // точная граммовка/объем
  unit: string;   // г, мл, шт, ст.л., ч.л.
  category?: string;
  inPantry?: boolean;
}

export interface Recipe {
  id?: number;
  title: string;
  description: string;
  prepTimeMinutes: number;
  servings: number;
  calories: number; // на 1 порцию
  protein: number;  // г на порцию
  fat: number;      // г на порцию
  carbs: number;    // г на порцию
  ingredients: RecipeIngredient[]; // обязательно с граммовками
  instructions: string[];
  sourceUrl?: string;
  category: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  cuisine?: string;
  isFavorite?: boolean;
  importedFromWeb?: boolean;
  tags?: string[];
  createdAt: string;
}

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface MealPlanItem {
  id?: number;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  title: string;
  recipeId?: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  completed: boolean;
  notes?: string;
}

export interface WeightLog {
  id?: number;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
}

export type SubscriptionTier = 'free' | 'pro';

export interface UserProfile {
  id?: number;
  name: string;
  currentWeight: number;
  targetWeight: number;
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  geminiProxyUrl: string;
  theme: 'dark' | 'light';
  subscriptionTier: SubscriptionTier;
  proExpiresAt?: string;
  dailyScansUsed: number;
  lastScanDate: string; // YYYY-MM-DD
  telegramId?: number;
  telegramUsername?: string;
}

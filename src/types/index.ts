export type ProductCategory = 
  | 'dairy' 
  | 'meat' 
  | 'fish'
  | 'veg_fruit' 
  | 'bakery' 
  | 'grocery' 
  | 'drinks' 
  | 'snacks'
  | 'other';

export interface Product {
  id?: number;
  name: string;
  category: ProductCategory;
  quantity: number;
  unit: 'г' | 'кг' | 'мл' | 'л' | 'шт';
  expiryDate?: string; // YYYY-MM-DD
  calories: number; // ккал на 100г или на единицу
  protein: number;  // г
  fat: number;      // г
  carbs: number;    // г
  barcode?: string;
  addedAt: string;
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  inPantry?: boolean;
}

export interface Recipe {
  id?: number;
  title: string;
  description: string;
  prepTimeMinutes: number;
  servings: number;
  calories: number; // на порцию
  protein: number;
  fat: number;
  carbs: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  sourceUrl?: string;
  category: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  isFavorite?: boolean;
  importedFromWeb?: boolean;
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

export interface UserProfile {
  id?: number;
  name: string;
  currentWeight: number;
  targetWeight: number;
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  geminiApiKey: string;
  geminiProxyUrl: string; // кастомный прокси/эндпоинт для обхода блокировок
  theme: 'dark' | 'light';
}

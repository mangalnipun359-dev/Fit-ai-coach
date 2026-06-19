export interface UserProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number; // in cm
  weight: number; // in kg
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal: 'lose_weight' | 'maintain_weight' | 'gain_weight' | 'bulking' | 'cutting' | 'body_recomposition';
  dietPreference: 'anything' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean';
  injuriesOrLimitations?: string; // e.g. "Mild Knee Pain"
  environment?: 'gym' | 'home';
  equipmentAvailable?: string[]; // e.g. ["dumbbells", "barbell", "yoga_mat"]
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  timestamp: string;
  isSuggested?: boolean;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  time: string; // e.g. "08:30"
  imageUrl?: string;
  isAiGenerated?: boolean;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

export interface Workout {
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'hiit' | 'flexibility';
  durationMinutes: number;
  caloriesBurned: number;
  exercises: WorkoutExercise[];
  completed?: boolean;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  weight?: number;
  waterMl: number;
  meals: Meal[];
  workouts: Workout[];
  biotinMcg?: number; // micro-nutrient
  ironMg?: number;    // micro-nutrient
  zincMg?: number;    // micro-nutrient
}

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
}

export interface UserSession {
  userId: string;
  email: string;
  profile?: UserProfile;
  macroGoals?: MacroGoals;
  logs: Record<string, DailyLog>; // Quick map using key (YYYY-MM-DD)
  weightHistory: { date: string; weight: number }[];
  weeklyDietPlan?: {
    days: {
      dayName: string;
      meals: { mealType: string; name: string; calories: number; protein: number; carbs: number; fat: number; description: string }[];
    }[];
  };
  weeklyWorkoutPlan?: {
    days: {
      dayName: string;
      restDay: boolean;
      workouts: { name: string; category: string; duration: number; calories: number; exercises: { name: string; sets: number; reps: string; notes?: string }[] }[];
    }[];
  };
  chatMessages?: ChatMessage[];
}

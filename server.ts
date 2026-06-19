import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// High limits for handling food camera uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Initialize local database directories and files
const DATABASE_DIR = path.join(process.cwd(), "db_data");
const USERS_FILE = path.join(DATABASE_DIR, "users.json");

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

// Helper to interact with the simulated users file
function getDBUsers(): Record<string, any> {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to read user DB file, using fallback state:", e);
  }
  return {};
}

function saveDBUsers(users: Record<string, any>) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save user DB file:", e);
  }
}

// BMR and TDEE Auto-Calculator
function calculateMacros(profile: {
  age: number;
  gender: string;
  height: number;
  weight: number;
  activityLevel: string;
  goal: string;
  dietPreference: string;
}) {
  const { age, gender, height, weight, activityLevel, goal } = profile;

  // Mifflin-St Jeor Formula
  let bmr = 0;
  if (gender === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // TDEE Multipliers
  let multiplier = 1.2;
  switch (activityLevel) {
    case "sedentary": multiplier = 1.2; break;
    case "lightly_active": multiplier = 1.375; break;
    case "moderately_active": multiplier = 1.55; break;
    case "very_active": multiplier = 1.725; break;
    case "extra_active": multiplier = 1.9; break;
  }

  const tdee = Math.round(bmr * multiplier);

  // Focus Targets
  let calories = tdee;
  if (goal === "lose_weight" || goal === "cutting") {
    calories = Math.max(1200, tdee - 500);
  } else if (goal === "gain_weight" || goal === "bulking") {
    calories = tdee + 400;
  } else if (goal === "body_recomposition") {
    calories = tdee - 150;
  }

  // Dietary Macros Division (Protein/Carb/Fat multipliers)
  // Let's configure custom presets
  let carbp = 40, protp = 30, fatp = 30;
  if (profile.dietPreference === "keto") {
    carbp = 5; protp = 25; fatp = 70;
  } else if (profile.dietPreference === "vegan" || profile.dietPreference === "vegetarian") {
    carbp = 50; protp = 25; fatp = 25;
  } else if (goal === "gain_weight" || goal === "bulking") {
    carbp = 45; protp = 30; fatp = 25;
  } else if (goal === "lose_weight" || goal === "cutting") {
    carbp = 30; protp = 45; fatp = 25;
  } else if (goal === "body_recomposition") {
    carbp = 35; protp = 35; fatp = 30;
  }

  // Calculation (Protein: 4kcal/g, Carbs: 4kcal/g, Fat: 9kcal/g)
  const protein = Math.round((calories * (protp / 100)) / 4);
  const carbs = Math.round((calories * (carbp / 100)) / 4);
  const fat = Math.round((calories * (fatp / 100)) / 9);

  return {
    calories,
    protein,
    carbs,
    fat,
    bmr: Math.round(bmr),
    tdee,
  };
}

// Lazy Load Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    // Graceful check avoiding crash on server boot
    console.warn("⚠️ Warning: GEMINI_API_KEY is not configured yet.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/* ================== API ENDPOINTS ================== */

// Health & Status indicator
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    geminiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY",
  });
});

// Authentication Routes
app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();

  if (users[normalizedEmail]) {
    return res.status(400).json({ error: "Email is already registered" });
  }

  // Simple session initialization
  const newUserSession = {
    userId: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: normalizedEmail,
    password: password, // For sandbox simulation purposes
    logs: {},
    weightHistory: [],
  };

  users[normalizedEmail] = newUserSession;
  saveDBUsers(users);

  res.json({
    success: true,
    user: {
      userId: newUserSession.userId,
      email: newUserSession.email,
      logs: newUserSession.logs,
      weightHistory: newUserSession.weightHistory,
    },
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password credentials" });
  }

  res.json({
    success: true,
    user: {
      userId: user.userId,
      email: user.email,
      profile: user.profile,
      macroGoals: user.macroGoals,
      logs: user.logs || {},
      weightHistory: user.weightHistory || [],
      weeklyDietPlan: user.weeklyDietPlan,
      weeklyWorkoutPlan: user.weeklyWorkoutPlan,
    },
  });
});

// Sync Session state
app.post("/api/user/sync", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Session synchronization demands email" });
  }

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user) {
    return res.status(404).json({ error: "User session not matching inside DB state" });
  }

  res.json({
    success: true,
    user,
  });
});

// Update Profile
app.post("/api/user/profile", (req, res) => {
  const { email, profile } = req.body;
  if (!email || !profile) {
    return res.status(400).json({ error: "Preconditions failed: Email and Profile required" });
  }

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user) {
    return res.status(404).json({ error: "User profile update failed: User not found" });
  }

  // Process numbers safely
  const processedProfile = {
    age: parseInt(profile.age) || 28,
    gender: profile.gender || "male",
    height: parseFloat(profile.height) || 175,
    weight: parseFloat(profile.weight) || 75,
    activityLevel: profile.activityLevel || "moderately_active",
    goal: profile.goal || "maintain_weight",
    dietPreference: profile.dietPreference || "anything",
    injuriesOrLimitations: profile.injuriesOrLimitations || "",
  };

  const macroGoals = calculateMacros(processedProfile);

  user.profile = processedProfile;
  user.macroGoals = macroGoals;

  // Insert initial weight trace in history
  if (!user.weightHistory) user.weightHistory = [];
  const todayStr = new Date().toISOString().split("T")[0];
  const weightExists = user.weightHistory.find((w: any) => w.date === todayStr);
  if (!weightExists) {
    user.weightHistory.push({ date: todayStr, weight: processedProfile.weight });
  } else {
    weightExists.weight = processedProfile.weight;
  }

  users[normalizedEmail] = user;
  saveDBUsers(users);

  res.json({
    success: true,
    user,
  });
});

// Save Daily Activity Progress (Save log for a date)
app.post("/api/user/save-log", (req, res) => {
  const { email, date, log } = req.body;
  if (!email || !date || !log) {
    return res.status(400).json({ error: "Param validation failed for logs save request" });
  }

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user) {
    return res.status(404).json({ error: "Account not matching" });
  }

  if (!user.logs) user.logs = {};
  user.logs[date] = log;

  // If a manual weight was defined, log that in weightHistory list as well
  if (log.weight) {
    if (!user.weightHistory) user.weightHistory = [];
    const weightVal = parseFloat(log.weight);
    const existingIndex = user.weightHistory.findIndex((w: any) => w.date === date);
    if (existingIndex !== -1) {
      user.weightHistory[existingIndex].weight = weightVal;
    } else {
      user.weightHistory.push({ date, weight: weightVal });
    }
    // Also update current profile weight
    if (user.profile) {
      user.profile.weight = weightVal;
      // Recalc macro Targets
      user.macroGoals = calculateMacros(user.profile);
    }
  }

  users[normalizedEmail] = user;
  saveDBUsers(users);

  res.json({
    success: true,
    user,
  });
});

// Estimate caloric contents from food image uploads
app.post("/api/ai/estimate-food", async (req, res) => {
  const { base64Image } = req.body;
  if (!base64Image) {
    return res.status(400).json({ error: "Valid food product, snapshot base64 image represents required argument" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Return custom mock estimates so the user's interface continues working nicely even if they didn't add an API key yet!
    return res.json({
      success: true,
      data: {
        name: "Hearty Avocado Toast with Fried Egg",
        calories: 380,
        protein: 14,
        carbs: 32,
        fat: 22,
        mocked: true,
        reason: "Gemini Key missing - returned a sample avocado toast calorie assessment."
      }
    });
  }

  try {
    const rawBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Analyze this food photo. You must behave as an absolute expert dietitian/calorie counter. 
Generate a JSON object estimating the meal name, calorie counter counts, and gram details.
Strictly return JSON only matching this format:
{
  "name": "Single line name of the meal",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}
Do not write wrappers, code blocks (such as \`\`\`json), or explanations outside of the requested json. Return plain raw text that is directly JSON-parseable.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: rawBase64
          }
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const replyText = response.text?.trim() || "{}";
    const result = JSON.parse(replyText);

    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error("Gemini Vision food estimation failure: ", err);
    res.status(500).json({ error: "AI failed to count calories. Check error: " + err.message });
  }
});

// AI Weekly Diet Plan Generator
app.post("/api/ai/diet-plan", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email target verified for plan generation query" });
  }

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user || !user.profile) {
    return res.status(400).json({ error: "You must complete user onboarding profile settings before Diet Plan Generation." });
  }

  const ai = getGeminiClient();
  const macros = user.macroGoals || calculateMacros(user.profile);

  if (!ai) {
    // Generate lovely structured fallback Diet Calendar if local API is not verified
    const localFallbackDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => ({
      dayName: day,
      meals: [
        { mealType: "Breakfast", name: "High-protein Berry Oatmeal Bowl", calories: Math.round(macros.calories * 0.25), protein: Math.round(macros.protein * 0.25), carbs: Math.round(macros.carbs * 0.3), fat: Math.round(macros.fat * 0.2), description: "Instant steel-cut oats mixed with protein powder, pumpkin seeds, and a handful of dynamic fresh berries." },
        { mealType: "Lunch", name: "Grilled Chicken Quinoa Avocado Salad", calories: Math.round(macros.calories * 0.35), protein: Math.round(macros.protein * 0.35), carbs: Math.round(macros.carbs * 0.35), fat: Math.round(macros.fat * 0.35), description: "Perfect breast of chicken sliced over cooked tri-color quinoa, roasted greens, avocado wedges, light vinaigrette." },
        { mealType: "Snack", name: "Greek Yogurt with Raw Almonds", calories: Math.round(macros.calories * 0.15), protein: Math.round(macros.protein * 0.15), carbs: Math.round(macros.carbs * 0.1), fat: Math.round(macros.fat * 0.15), description: "Simple fat-free rich Greek yogurt with almonds, zero-calorie honey sweetener." },
        { mealType: "Dinner", name: "Fresh Baked Salmon with Asparagus", calories: Math.round(macros.calories * 0.25), protein: Math.round(macros.protein * 0.25), carbs: Math.round(macros.carbs * 0.25), fat: Math.round(macros.fat * 0.3), description: "Perfect salmon fillet baked with extra virgin olive oil, pan-seared lemon asparagus, roasted sweet potato wedges." },
      ]
    }));

    user.weeklyDietPlan = { days: localFallbackDays };
    users[normalizedEmail] = user;
    saveDBUsers(users);

    return res.json({
      success: true,
      weeklyDietPlan: user.weeklyDietPlan,
      mocked: true,
    });
  }

  try {
    const profileText = JSON.stringify(user.profile);
    const targetText = JSON.stringify(macros);

    const prompt = `Act as an elite personal chef and dynamic nutritional doctor. Generate a premium weekly diet schedule (Monday-Sunday, 7 full days) for our client profile.
Profile Details: ${profileText}
Daily Targets: ${targetText}

Develop delicious, easy, realistic meals matching their diet preference: ${user.profile.dietPreference}.
Be highly creative and avoid repeating the exact same menu every single day. Make sure breakfast, lunch, snack, and dinner calorie totals align roughly with the daily macroTargets.

Return a JSON document precisely structured as:
{
  "days": [
    {
      "dayName": "Monday",
      "meals": [
        {
          "mealType": "Breakfast",
          "name": "Concise meal title",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fat": number,
          "description": "Short explanation of ingredients and preparation steps"
        }
      ]
    }
  ]
}
Make sure all 7 days (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday) are fully included in the nested JSON days array. Ensure response is valid parseable JSON. Do not write any markdown codeblock decoration or text other than the plain json.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const cleanedText = response.text?.trim() || "{}";
    const result = JSON.parse(cleanedText);

    user.weeklyDietPlan = result;
    users[normalizedEmail] = user;
    saveDBUsers(users);

    res.json({
      success: true,
      weeklyDietPlan: result
    });
  } catch (err: any) {
    console.error("Gemini failed generating diet plan:", err);
    res.status(500).json({ error: "AI failed to generate structural diet plan: " + err.message });
  }
});

// AI Weekly Workout Plan Generator
app.post("/api/ai/workout-plan", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Missing identity parameter email for workouts generation" });
  }

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user || !user.profile) {
    res.status(400).json({ error: "Profile setting required before Generating Workouts." });
    return;
  }

  const ai = getGeminiClient();

  if (!ai) {
    const isHome = user.profile?.environment === "home";
    const painStr = (user.profile?.injuriesOrLimitations || "").toLowerCase();
    const hasKneePain = painStr.includes("knee") || painStr.includes("joint") || painStr.includes("leg");

    const localWorkoutsPlan = [
      {
        dayName: "Monday",
        restDay: false,
        workouts: [{ 
          name: isHome ? "AI Home Dumbbell/Bodyweight Push Protocol" : "AI Strength Gym Push Protocol", 
          category: "strength" as const, 
          duration: 45, 
          calories: 340, 
          exercises: [
            { name: isHome ? "Dumbbell Floor Press" : "Barbell Bench Press", sets: 3, reps: "8-10 reps" },
            { name: "Incline Dumbbell Flyes", sets: 3, reps: "12 reps" },
            { name: "Overhead Dumbbell Shoulder Press", sets: 3, reps: "10 reps" },
            { name: "Dumbbell Lateral Raises", sets: 3, reps: "15 reps" },
            { name: isHome ? "Chair Tricep Dips" : "Overhead Cable Tricep Extension", sets: 3, reps: "12 reps" }
          ]
        }]
      },
      {
        dayName: "Tuesday",
        restDay: false,
        workouts: [{ 
          name: isHome ? "AI Home Dumbbell/Bodyweight Pull Protocol" : "AI Strength Gym Pull Protocol", 
          category: "strength" as const, 
          duration: 45, 
          calories: 330, 
          exercises: [
            { name: isHome ? "Dumbbell Rows (Bed Anchor)" : "Conventional Lat Rows", sets: 3, reps: "10 reps" },
            { name: isHome ? "Incline Bed Pullover" : "Lat Pulldown (Wide Grip)", sets: 3, reps: "10-12 reps" },
            { name: "Single-Arm Dumbbell Rows", sets: 3, reps: "10 per arm" },
            { name: "Incline Hammer Bicep Curl", sets: 3, reps: "12 reps" },
            { name: isHome ? "Dumbbell Reverse Flyes" : "Face Pulls", sets: 3, reps: "15 reps" }
          ]
        }]
      },
      {
        dayName: "Wednesday",
        restDay: true,
        workouts: []
      },
      {
        dayName: "Thursday",
        restDay: false,
        workouts: [{ 
          name: isHome ? "AI Joint-Responsive Home Leg Protocol" : "AI Gym Leg Shred", 
          category: "strength" as const, 
          duration: 50, 
          calories: 410, 
          exercises: [
            { 
              name: hasKneePain ? "Bodyweight Glute Bridges (Knee-safe)" : (isHome ? "Dumbbell Goblet Squats" : "Barbell Back Squats"), 
              sets: 4, 
              reps: "12 reps",
              notes: hasKneePain ? "Replaces squats to eliminate high knee joint patella sheer stress." : undefined
            },
            { name: "Romanian Deadlifts (RDL)", sets: 3, reps: "10 reps" },
            { 
              name: hasKneePain ? "Clamshells & Quad Squeezes" : "Walking Lunges", 
              sets: 3, 
              reps: hasKneePain ? "15 reps" : "12 per leg",
              notes: hasKneePain ? "Promotes joint tracking & strengthening medial stabilizers." : undefined
            },
            { name: "Standing Calf Raises", sets: 4, reps: "15 reps" }
          ]
        }]
      },
      {
        dayName: "Friday",
        restDay: false,
        workouts: [{ 
          name: "High-Intensity Cardio Blast", 
          category: "hiit" as const, 
          duration: 30, 
          calories: 380, 
          exercises: [
            { name: isHome ? "High-Knees Warmup (No impact)" : "Treadmill Sprint Intervals", sets: 1, reps: "15 mins" },
            { name: isHome ? "Dumbbell Swings" : "Kettlebell Swings", sets: 3, reps: "45 seconds" },
            { name: hasKneePain ? "Fast Shadow Boxing" : "Jump Squats", sets: 3, reps: "20 reps" },
            { name: hasKneePain ? "Mountain Climbers (Slow pacing)" : "Burpees", sets: 3, reps: "15 reps" }
          ]
        }]
      },
      {
        dayName: "Saturday",
        restDay: false,
        workouts: [{ 
          name: "Core & Flexibility Flow", 
          category: "flexibility" as const, 
          duration: 35, 
          calories: 180, 
          exercises: [
            { name: "Plank Hold", sets: 3, reps: "60 seconds" },
            { name: "Hanging Knee Raises", sets: 3, reps: "15 reps" },
            { name: "Russian Twists", sets: 3, reps: "20 twists" },
            { name: "Full Body Dynamic Yoga Flow", sets: 1, reps: "15 minutes" }
          ]
        }]
      },
      {
        dayName: "Sunday",
        restDay: true,
        workouts: []
      }
    ];

    user.weeklyWorkoutPlan = { days: localWorkoutsPlan };
    users[normalizedEmail] = user;
    saveDBUsers(users);

    return res.json({
      success: true,
      weeklyWorkoutPlan: user.weeklyWorkoutPlan,
      mocked: true,
    });
  }

  try {
    const profileText = JSON.stringify(user.profile);
    const targetText = JSON.stringify(user.macroGoals || calculateMacros(user.profile));
    const environmentText = user.profile.environment ? `Workout Location Environment: ${user.profile.environment} (Available Equipment: ${JSON.stringify(user.profile.equipmentAvailable || [])})` : 'Workout Location Environment: gym';
    const injuriesText = user.profile.injuriesOrLimitations ? `Avoid heavy axial loading exercises stressing this area: ${user.profile.injuriesOrLimitations}` : 'No physical limits reported.';

    const prompt = `Act as an elite athletic strength and performance coach. Generate a premium weekly training setup (Monday to Sunday, 7 full days) tailored to this client profile.
Profile Details: ${profileText}
Workout Environment Constraints: ${environmentText}
Physical Limitations & Injuries: ${injuriesText}
Daily Targets: ${targetText}

Consider their fitness goal: ${user.profile.goal}. Specify realistic exercises, accurate sets, reps, duration, and approximate calorie burn.
If Workout Environment is "home", strictly output home-safe exercises (using bodyweight, dumbbells, kettlebell, resistance bands, or simple items). If environment is "gym", you can suggest power racks, cable machines, leg press, etc.
Avoid prescribing movements that would aggravate their reported injuries (for example, if knee pain, substitute high-impact plyometrics or deep weighted bar squats with glute bridges, walk, or safe low-load movements). Add short notes to explain why it is safer.

Return a JSON document precisely structured as:
{
  "days": [
    {
      "dayName": "Monday",
      "restDay": false,
      "workouts": [
        {
          "name": "Workout routine title",
          "category": "strength" or "cardio" or "hiit" or "flexibility",
          "duration": number, // in minutes
          "calories": number, // estimated calories burned
          "exercises": [
            {
              "name": "Exercise name",
              "sets": number,
              "reps": "exact reps instruction as string e.g. '8-10 reps' or '45 seconds'"
            }
          ]
        }
      ]
    }
  ]
}
Make sure all 7 days (Monday through Sunday) are represented in the structural format. Make sure the output contains valid raw JSON with zero wrappers or explanation outside.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const cleanedText = response.text?.trim() || "{}";
    const result = JSON.parse(cleanedText);

    user.weeklyWorkoutPlan = result;
    users[normalizedEmail] = user;
    saveDBUsers(users);

    res.json({
      success: true,
      weeklyWorkoutPlan: result
    });
  } catch (err: any) {
    console.error("Gemini failed generating workout plan:", err);
    res.status(500).json({ error: "AI failed to generate structural workout plan: " + err.message });
  }
});


// ================== AI CHAT COACH AND MEMORY ENDPOINTS ==================

// AI Chat Endpoint with memory persistence
app.post("/api/ai/chat", async (req, res) => {
  const { email, message } = req.body;
  if (!email || !message) {
    return res.status(400).json({ error: "Email and message are required for Chat Coach." });
  }

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user) {
    return res.status(404).json({ error: "User session not matching inside DB state" });
  }

  if (!user.chatMessages) {
    user.chatMessages = [];
  }

  // Push user's message
  const userMsg = {
    id: `msg_user_${Date.now()}`,
    sender: "user",
    text: message,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  user.chatMessages.push(userMsg);

  const profile = user.profile || {
    age: 26,
    gender: "male",
    height: 175,
    weight: 75,
    activityLevel: "moderately_active",
    goal: "lose_weight",
    dietPreference: "anything",
    injuriesOrLimitations: "",
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLog = (user.logs && user.logs[todayStr]) || { meals: [], workouts: [] };

  const ai = getGeminiClient();
  let coachReply = "";

  if (ai) {
    try {
      const recentChatContext = user.chatMessages
        .slice(-12) // last 12 messages for full context
        .map((m: any) => `${m.sender === "user" ? "User" : "Coach"}: ${m.text}`)
        .join("\n");

      const systemInstruction = `You are FitAI Coach, a supportive personal trainer, expert nutritionist, and relentless accountability coach available 24/7.
You speak clearly, warmly, and empathetically, motivating the user. Address them directly.
You must maintain full context/memory. Remember their goals, physical limitations, food preferences, and daily logs.

User Background Profile:
- Identity email: ${user.email}
- Age: ${profile.age} years
- Height: ${profile.height} cm, Weight: ${profile.weight} kg
- Primary Goal: ${profile.goal}
- Diet Preference: ${profile.dietPreference}
- Activity Level: ${profile.activityLevel}
- Physical Limitations / Injuries / Pain recorded in profile: ${profile.injuriesOrLimitations || 'None declared'}

Today's Log (${todayStr}):
- Meals: ${JSON.stringify(todayLog.meals || [])}
- Workouts registered: ${JSON.stringify(todayLog.workouts || [])}
- Weight reported: ${todayLog.weight || profile.weight} kg

Active Chat Conversation Context:
${recentChatContext}

If the user reports pain, discomfort, fatigue, injury, illness, travel, fasting, schedule changes, or dietary issues, adjust recommendations accordingly.
If a user mentions mild knee pain, shoulder pain, back pain, or leg issues, suggest specific pain-friendly exercise modifications (e.g. replacing deep barbell squats/lunges with glute bridges, leg press, or seated extensions for knee pain) and issue a supportive physical rehabilitative advisory.
NEVER diagnose medical conditions. Encourage professional medical consultation when symptoms indicate injury or major health concerns.
Response constraint: Speak directly, with a high degree of warmth and empathy, keep it highly conversational, supportive, and clear! Keep the response under 160 words. You can use English, Hinglish, or Hindi depending on the language of user message.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            { text: systemInstruction },
            { text: `User message to respond to: "${message}"` }
          ],
          config: {
            temperature: 0.7,
          }
        });
      } catch (firstErr: any) {
        console.warn("⚠️ gemini-3.5-flash experienced rate limits or 503 high demand. Trying stable fallback model gemini-3.1-flash-lite...");
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: [
              { text: systemInstruction },
              { text: `User message to respond to: "${message}"` }
            ],
            config: {
              temperature: 0.7,
            }
          });
        } catch (secondErr: any) {
          console.warn("⚠️ gemini-3.1-flash-lite fallback failed too. Trying legacy or secondary model query option...");
          // Try one more alternative or throw to go to custom local builder fallback
          throw secondErr;
        }
      }

      coachReply = response.text || "I'm right here with you! Let's stay focused on your goals.";
    } catch (err: any) {
      console.error("Gemini coach chat failed on both primary and fallback models:", err);
      // Construct a highly descriptive dynamic fallback from user profile details
      coachReply = `Aapki goal (${profile.goal.replace('_', ' ')}) aur user profile ko dhyan me rakhte hue, personal adjustment start karte hai.`;
      const msgLower = message.toLowerCase();
      const recordedInjuries = (profile.injuriesOrLimitations || "").toLowerCase();

      if (msgLower.includes("pain") || msgLower.includes("dard") || msgLower.includes("injury") || msgLower.includes("hurt") || msgLower.includes("knee") || recordedInjuries.includes("knee")) {
        if (recordedInjuries.includes("knee") || msgLower.includes("knee") || msgLower.includes("dard")) {
          coachReply = `Since you previously mentioned knee pain ("${profile.injuriesOrLimitations || 'Mild Knee Pain'}"), we should replace deep squats/lunges with low-impact Glute Bridges or Leg Presses today. Put ice on it and keep me updated! Please use the 'Adjust for Pain Points' button on the workouts panel to swap them out in one click!`;
        } else {
          coachReply = `I hear you about the discomfort! Let's rest that muscle group and do low-intensity mobility instead today. Let me know if you would like me to swap out any specific exercise.`;
        }
      } else {
        coachReply = `Let's keep pushing towards your target of ${profile.goal.replace('_', ' ')}: staying consistent is key! Keep any physical limits like "${profile.injuriesOrLimitations || 'none'}" in mind and let me know how you feel.`;
      }
    }
  } else {
    // Highly sophisticated rule-based mock responder to make the app feel wonderful and "smart" offline!
    const msgLower = message.toLowerCase();
    const recordedInjuries = (profile.injuriesOrLimitations || "").toLowerCase();

    if (msgLower.includes("pain") || msgLower.includes("dard") || msgLower.includes("injury") || msgLower.includes("hurt") || msgLower.includes("knee") || recordedInjuries.includes("knee")) {
      if (recordedInjuries.includes("knee") || msgLower.includes("knee") || msgLower.includes("dard")) {
        coachReply = `Since you previously mentioned knee pain ("${profile.injuriesOrLimitations || 'Mild Knee Pain'}"), I recommend avoiding heavy barbell squats and deep lunges today. Let's substitute them with knee-friendly movements such as Glute Bridges (3 sets of 15) or low-impact seated leg presses to maintain leg volume without shearing force on the joint. Try using the "AI Injury-Aware Modification" button on the Workouts panel to automatically swap out those squats! Put some ice on it, and take it slow. Let me know how the joint feels.`;
      } else {
        coachReply = `I hear you completely! Pain is your body's vital messaging channel. Let's adjust today's load and avoid stressing that area entirely. We can modify your workout on the exercises page to safely work around this discomfort. Keep details updated in your profile, rest well, and consult a doctor if pain persists!`;
      }
    } else if (msgLower.includes("diet") || msgLower.includes("food") || msgLower.includes("khana") || msgLower.includes("protein") || msgLower.includes("weight")) {
      coachReply = `For your daily goal of **${profile.goal.replace('_', ' ')}**, keeping your nutrition locked in is key. Since you track meals on a **${profile.dietPreference}** diet, make sure you are hitting about **${user.macroGoals?.protein || 135}g of protein** today. Let's make sure the meals in your journal reflect this!`;
    } else if (msgLower.includes("motivation") || msgLower.includes("tired") || msgLower.includes("thak") || msgLower.includes("missed") || msgLower.includes("laziness")) {
      coachReply = `Fatigue of both mind and body is completely natural, Rahul. As your coach, I say: a 15-minute light walk or active mobility session is infinitely better than doing absolute zero. Let's lower the daily intensity, focus on dynamic stretches, and bank a small win today. You've got this!`;
    } else {
      coachReply = `I am here! Based on your profile (Target: **${profile.goal.replaceAll('_', ' ')}**, Diet: **${profile.dietPreference}**), let's make sure we log all activities today. Is there anything specific like local pain or scheduling conflicts you want us to adjust for? I'm listening!`;
    }
  }

  // Save Coach reply
  const coachMsg = {
    id: `msg_coach_${Date.now()}`,
    sender: "coach",
    text: coachReply,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  user.chatMessages.push(coachMsg);

  users[normalizedEmail] = user;
  saveDBUsers(users);

  res.json({
    success: true,
    user,
    reply: coachReply,
  });
});

// Clear Chat Messages persistence
app.post("/api/ai/clear-chat", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (user) {
    user.chatMessages = [];
    users[normalizedEmail] = user;
    saveDBUsers(users);
  }

  res.json({ success: true, user });
});

// AI Injury-Aware Workout Modification Endpoint
app.post("/api/ai/modify-workout", async (req, res) => {
  const { email, date } = req.body;
  if (!email || !date) {
    return res.status(400).json({ error: "Email and date are required." });
  }

  const users = getDBUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users[normalizedEmail];

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  if (!user.logs) user.logs = {};
  if (!user.logs[date]) {
    user.logs[date] = {
      date,
      waterMl: 0,
      meals: [],
      workouts: [],
    };
  }

  const todayLog = user.logs[date];
  const profile = user.profile || { goal: "maintain_weight", injuriesOrLimitations: "" };
  const injuries = profile.injuriesOrLimitations || "Mild Knee Pain";

  const ai = getGeminiClient();
  let useLocalFallback = !ai;

  if (ai && todayLog.workouts && todayLog.workouts.length > 0) {
    try {
      const activeWorkoutsText = JSON.stringify(todayLog.workouts);
      const prompt = `You are an expert trainer. Your client has an active physical limitation/injury: "${injuries}".
They have the following registered exercises for today:
${activeWorkoutsText}

You must modify this list of workouts on-the-fly to make it completely safe and Injury-Aware. 
Specifically, replace any high-strain exercises that stress the injured area (e.g., if knee, replace barbell squats/lunges with glute bridges, leg extensions, or low-load seated leg press). If no heavy compound matches are there, optimize for safety. Add short helpful rehabilitation notes inside the exercise's notes field.

Return a modified JSON array of these same workouts. Match this JSON structure precisely:
[
  {
    "id": "existing_id_string",
    "name": "Modified Workout Title",
    "category": "strength" or "cardio" or "hiit" or "flexibility",
    "durationMinutes": number,
    "caloriesBurned": number,
    "exercises": [
      {
        "name": "Modified Exercise Name",
        "sets": number,
        "reps": "8-10 reps",
        "notes": "Short rehab advice specific to this exercise"
      }
    ],
    "completed": true
  }
]
Return only the raw parseable JSON array. No explanations or markers outside of the JSON array.`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
      } catch (firstErr: any) {
        console.warn("⚠️ gemini-3.5-flash experienced rate limits inside modify-workout. Retrying with gemini-3.1-flash-lite...");
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
      }

      const reply = response.text?.trim() || "[]";
      const modifiedWorkouts = JSON.parse(reply);
      if (Array.isArray(modifiedWorkouts) && modifiedWorkouts.length > 0) {
        todayLog.workouts = modifiedWorkouts;
      } else {
        useLocalFallback = true;
      }
    } catch (err: any) {
      console.error("Gemini failed modifying workout on both primary and fallback models, using precise local mapping fallback:", err);
      useLocalFallback = true;
    }
  }

  // Fallback modification executed if Gemini is not set or failed
  if (useLocalFallback && todayLog.workouts && todayLog.workouts.length > 0) {
    todayLog.workouts = todayLog.workouts.map((w: any) => {
      return {
        ...w,
        name: `${w.name} (Injury-Aware Rehab Mod)`,
        exercises: w.exercises.map((ex: any) => {
          const exName = ex.name.toLowerCase();
          if (injuries.toLowerCase().includes("knee") && (exName.includes("squat") || exName.includes("lunge"))) {
            return {
              name: "Glute Bridges (or Seated Leg Extensions)",
              sets: ex.sets,
              reps: "12-15 reps",
              notes: "Rehab Mod: Replaced knee-stressing squats/lunges with safe hip/glute extensions due to reported knee pain.",
            };
          }
          if (injuries.toLowerCase().includes("back") && (exName.includes("deadlift") || exName.includes("row"))) {
            return {
              name: "Chest-Supported Dumbbell Rows",
              sets: ex.sets,
              reps: "10-12 reps",
              notes: "Rehab Mod: Replaced axial spine loading exercises with chest-supported variations to shield lower back.",
            };
          }
          return {
            ...ex,
            notes: `Injury-Aware Shield: Monitored for "${injuries}"`,
          };
        }),
      };
    });
  }

  user.logs[date] = todayLog;
  users[normalizedEmail] = user;
  saveDBUsers(users);

  res.json({
    success: true,
    user,
  });
});


// Asset mounting / Static pages Fallbacks
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FitAI Coach server successfully running on port http://localhost:${PORT}`);
  });
}

startServer();

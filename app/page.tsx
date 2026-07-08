"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AuthGate from "./components/AuthGate";

type Category = "正餐" | "饮料" | "甜品" | "零食" | "水果" | "其他";
type Meal = "早餐" | "午餐" | "晚餐" | "加餐";
type Source = "外卖" | "堂食" | "自己做饭" | "便利店" | "咖啡店" | "其他";
type Payment = "微信" | "支付宝" | "银行卡" | "现金" | "其他";
type Activity = "久坐" | "轻度活动" | "中度活动" | "高度活动";
type Goal = "维持体重" | "减重" | "增重";
type Section = "record" | "today" | "insights" | "month";
type CalorieConfidence = "准确" | "估算" | "待补充";
type DeleteTarget =
  | { type: "food"; id: string; name: string }
  | { type: "exercise"; id: string; name: string }
  | { type: "template"; id: string; name: string };

type BodyData = {
  gender: "女" | "男";
  age: number;
  height: number;
  currentWeight: number;
  targetWeight: number;
  activity: Activity;
  goal: Goal;
  targetDeficit: number;
  monthlyBudget: number;
};

type FoodRecord = {
  id: string;
  name: string;
  amount: number;
  calories: number | "";
  calorieConfidence: CalorieConfidence;
  category: Category;
  meal: Meal;
  source: Source;
  payment: Payment;
  date: string;
  note: string;
};

type ExerciseRecord = {
  id: string;
  name: string;
  minutes: number | "";
  calories: number;
  date: string;
  note: string;
};

type FoodTemplate = Pick<FoodRecord, "name" | "amount" | "calories" | "calorieConfidence" | "category"> & {
  id: string;
};
type MealEstimate = {
  name: string;
  calories: number;
  category: Category;
  confidence: "低" | "中" | "高";
  note: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultBody: BodyData = {
  gender: "女",
  age: 25,
  height: 165,
  currentWeight: 60,
  targetWeight: 55,
  activity: "轻度活动",
  goal: "减重",
  targetDeficit: 500,
  monthlyBudget: 1800
};

const defaultFood: Omit<FoodRecord, "id"> = {
  name: "",
  amount: 0,
  calories: "",
  calorieConfidence: "待补充",
  category: "正餐",
  meal: "午餐",
  source: "外卖",
  payment: "微信",
  date: today(),
  note: ""
};

const defaultExercise: Omit<ExerciseRecord, "id"> = {
  name: "",
  minutes: "",
  calories: 0,
  date: today(),
  note: ""
};

const defaultTemplates: FoodTemplate[] = [
  { id: "template-rice", name: "米饭一份", amount: 1, calories: 180, calorieConfidence: "估算", category: "正餐" },
  { id: "template-soy", name: "豆浆 200ml", amount: 3, calories: 90, calorieConfidence: "估算", category: "饮料" },
  { id: "template-milk-tea", name: "奶茶", amount: 18, calories: 350, calorieConfidence: "估算", category: "饮料" },
  { id: "template-pudding", name: "布丁", amount: 6, calories: 120, calorieConfidence: "估算", category: "甜品" },
  { id: "template-noodle", name: "牛肉粉", amount: 18, calories: 650, calorieConfidence: "估算", category: "正餐" },
  { id: "template-chicken", name: "鸡胸肉饭", amount: 25, calories: 500, calorieConfidence: "估算", category: "正餐" },
  { id: "template-coffee", name: "美式咖啡", amount: 15, calories: 10, calorieConfidence: "估算", category: "饮料" },
  { id: "template-fruit", name: "水果一份", amount: 8, calories: 100, calorieConfidence: "估算", category: "水果" }
];

const activityFactors: Record<Activity, number> = {
  久坐: 1.2,
  轻度活动: 1.375,
  中度活动: 1.55,
  高度活动: 1.725
};

const categories: Category[] = ["正餐", "饮料", "甜品", "零食", "水果", "其他"];
const meals: Meal[] = ["早餐", "午餐", "晚餐", "加餐"];
const sources: Source[] = ["外卖", "堂食", "自己做饭", "便利店", "咖啡店", "其他"];
const payments: Payment[] = ["微信", "支付宝", "银行卡", "现金", "其他"];
const calorieConfidences: CalorieConfidence[] = ["准确", "估算", "待补充"];
const chartColors = ["#007aff", "#30d158", "#ff9500", "#af52de", "#ff3b30", "#8e8e93"];

function dateByOffset(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function daysInSelectedMonth(dateText: string) {
  const [year, month] = dateText.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function dayOfMonth(dateText: string) {
  return Number(dateText.slice(8, 10));
}

function selectedDateLabel(dateText: string) {
  if (dateText === dateByOffset(0)) return "今天";
  if (dateText === dateByOffset(-1)) return "昨天";
  if (dateText === dateByOffset(-2)) return "前天";
  return dateText;
}

function money(value: number) {
  return `¥${value.toFixed(2)}`;
}

function round(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function percent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function calorieValue(value: number | "") {
  return Number(value || 0);
}

function calorieText(item: Pick<FoodRecord, "calories" | "calorieConfidence">) {
  if (item.calories === "" || item.calorieConfidence === "待补充") return "热量待补充";
  return `${round(item.calories)} kcal · ${item.calorieConfidence}`;
}

function normalizeFoods(items: FoodRecord[]) {
  return items.map((item) => ({
    ...item,
    calorieConfidence: item.calorieConfidence ?? (item.calories === "" ? "待补充" : "估算")
  }));
}

function normalizeTemplates(items: FoodTemplate[]) {
  return items.map((item, index) => ({
    ...item,
    id: item.id ?? `template-${index}-${item.name}`,
    calorieConfidence: item.calorieConfidence ?? (item.calories === "" ? "待补充" : "估算")
  }));
}

function loadState<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadUserState<T>(userId: string, key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const scopedKey = `eatcost.${userId}.${key}`;
  return loadState(scopedKey, loadState(`eatcost.${key}`, fallback));
}

function saveUserState<T>(userId: string, key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`eatcost.${userId}.${key}`, JSON.stringify(value));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const maxSide = 512;
        const ratio = Math.min(maxSide / image.width, maxSide / image.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("图片压缩失败"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.5));
      } catch {
        reject(new Error("这张图片格式暂时读不了，请换一张照片再试"));
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片读取失败，请换一张更清晰的照片"));
    };

    image.src = objectUrl;
  });
}

function friendlyAiError(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") {
    return "识别超时了，请换一张更清晰的照片或稍后再试";
  }

  const message = error instanceof Error ? error.message : "识别失败，请稍后再试";
  if (message.includes("expected pattern") || message.includes("did not match")) {
    return "图片或豆包接口格式没有被接受。请确认 ARK_MODEL 是 doubao-seed-1-6-flash-250828，或者换一张照片再试。";
  }

  return message;
}

export default function Home() {
  return <AuthGate>{(user) => <HomeApp userId={user.id} />}</AuthGate>;
}

function HomeApp({ userId }: { userId: string }) {
  const [ready, setReady] = useState(false);
  const [body, setBody] = useState(defaultBody);
  const [foods, setFoods] = useState<FoodRecord[]>([]);
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [templates, setTemplates] = useState(defaultTemplates);
  const [foodForm, setFoodForm] = useState(defaultFood);
  const [exerciseForm, setExerciseForm] = useState(defaultExercise);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [foodMoreOpen, setFoodMoreOpen] = useState(false);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("record");
  const [selectedDate, setSelectedDate] = useState(today());
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiEstimate, setAiEstimate] = useState<MealEstimate | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    setBody({ ...defaultBody, ...loadUserState(userId, "body", defaultBody) });
    setFoods(normalizeFoods(loadUserState(userId, "foods", [])));
    setExercises(loadUserState(userId, "exercises", []));
    setTemplates(normalizeTemplates(loadUserState(userId, "templates", defaultTemplates)));
    setReady(true);
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    saveUserState(userId, "body", body);
    saveUserState(userId, "foods", foods);
    saveUserState(userId, "exercises", exercises);
    saveUserState(userId, "templates", templates);
  }, [ready, userId, body, foods, exercises, templates]);

  useEffect(() => {
    if (editingFoodId || editingExerciseId) return;
    setFoodForm((current) => ({ ...current, date: selectedDate }));
    setExerciseForm((current) => ({ ...current, date: selectedDate }));
  }, [editingExerciseId, editingFoodId, selectedDate]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const metrics = useMemo(() => {
    const bmr =
      body.gender === "男"
        ? 10 * body.currentWeight + 6.25 * body.height - 5 * body.age + 5
        : 10 * body.currentWeight + 6.25 * body.height - 5 * body.age - 161;
    const tdee = bmr * activityFactors[body.activity];
    const suggestedIntake =
      body.goal === "增重" ? tdee + Math.abs(body.targetDeficit) : tdee - body.targetDeficit;
    return { bmr: round(bmr), tdee: round(tdee), suggestedIntake: round(suggestedIntake) };
  }, [body]);

  const stats = useMemo(() => {
    const currentDate = selectedDate;
    const month = currentDate.slice(0, 7);
    const todayFoods = foods.filter((item) => item.date === currentDate);
    const monthFoods = foods.filter((item) => item.date.startsWith(month));
    const todayExercises = exercises.filter((item) => item.date === currentDate);
    const todayIntake = sum(todayFoods, "calories");
    const todayExercise = sum(todayExercises, "calories");
    const todayDeficit = metrics.tdee + todayExercise - todayIntake;
    const monthSpending = sum(monthFoods, "amount");
    const currentDay = dayOfMonth(currentDate);
    const daysInMonth = daysInSelectedMonth(currentDate);
    const remainingDaysInMonth = Math.max(daysInMonth - currentDay + 1, 1);
    const remainingBudget = Math.max(body.monthlyBudget - monthSpending, 0);
    const budgetPerDay = remainingBudget / remainingDaysInMonth;
    const budgetSpentRatio = body.monthlyBudget > 0 ? monthSpending / body.monthlyBudget : 0;
    const projectedMonthSpending = (monthSpending / Math.max(currentDay, 1)) * daysInMonth;
    const remainingIntake = Math.max(metrics.suggestedIntake - todayIntake, 0);
    const todayBudgetLeft = Math.max(budgetPerDay - sum(todayFoods, "amount"), 0);
    const drinkDessertSpending = sum(
      monthFoods.filter((item) => item.category === "饮料" || item.category === "甜品"),
      "amount"
    );
    const deliverySpending = sum(monthFoods.filter((item) => item.source === "外卖"), "amount");
    const categorySpending = categories.map((category, index) => ({
      label: category,
      value: sum(monthFoods.filter((item) => item.category === category), "amount"),
      color: chartColors[index]
    }));
    const sourceSpending = sources.map((source, index) => ({
      label: source,
      value: sum(monthFoods.filter((item) => item.source === source), "amount"),
      color: chartColors[index]
    }));
    const mealCalories = meals.map((meal, index) => ({
      label: meal,
      value: sum(todayFoods.filter((item) => item.meal === meal), "calories"),
      color: chartColors[index]
    }));

    return {
      todayFoods,
      todayExercises,
      todayIntake,
      todayExercise,
      todayDeficit,
      hasFoodToday: todayFoods.length > 0,
      targetReached: todayFoods.length > 0 && todayDeficit >= body.targetDeficit,
      remainingIntake,
      todaySpending: sum(todayFoods, "amount"),
      monthSpending,
      monthAverageSpending: monthSpending / Math.max(currentDay, 1),
      monthIntake: sum(monthFoods, "calories"),
      monthAverageIntake: sum(monthFoods, "calories") / Math.max(currentDay, 1),
      drinkSpending: sum(monthFoods.filter((item) => item.category === "饮料"), "amount"),
      dessertSpending: sum(monthFoods.filter((item) => item.category === "甜品"), "amount"),
      drinkDessertSpending,
      drinkDessertRatio: monthSpending > 0 ? drinkDessertSpending / monthSpending : 0,
      deliverySpending,
      deliveryRatio: monthSpending > 0 ? deliverySpending / monthSpending : 0,
      budgetPerDay,
      remainingDaysInMonth,
      budgetSpentRatio,
      calorieProgressRatio: metrics.suggestedIntake > 0 ? todayIntake / metrics.suggestedIntake : 0,
      projectedMonthSpending,
      remainingBudget,
      todayBudgetLeft,
      categorySpending,
      sourceSpending,
      mealCalories
    };
  }, [body.monthlyBudget, body.targetDeficit, exercises, foods, metrics.suggestedIntake, metrics.tdee, selectedDate]);

  function sum<T extends { [K in keyof T]: T[K] }>(items: T[], key: keyof T) {
    return items.reduce((total, item) => total + Number(item[key] || 0), 0);
  }

  function fillSampleData() {
    const currentDate = selectedDate || today();
    setFoods([
      {
        id: uid(),
        name: "鸡胸肉饭",
        amount: 25,
        calories: 500,
        calorieConfidence: "估算",
        category: "正餐",
        meal: "午餐",
        source: "外卖",
        payment: "微信",
        date: currentDate,
        note: "示例数据"
      },
      {
        id: uid(),
        name: "豆浆 200ml",
        amount: 3,
        calories: 90,
        calorieConfidence: "估算",
        category: "饮料",
        meal: "早餐",
        source: "便利店",
        payment: "微信",
        date: currentDate,
        note: "示例数据"
      },
      {
        id: uid(),
        name: "水果一份",
        amount: 8,
        calories: "",
        calorieConfidence: "待补充",
        category: "水果",
        meal: "加餐",
        source: "便利店",
        payment: "支付宝",
        date: currentDate,
        note: "示例：热量可以之后补"
      }
    ]);
    setExercises([
      {
        id: uid(),
        name: "快走",
        minutes: 30,
        calories: 160,
        date: currentDate,
        note: "示例数据"
      }
    ]);
    setNotice("示例数据已填入");
  }

  function saveFood(event: FormEvent) {
    event.preventDefault();
    if (!foodForm.name.trim()) return;
    const record: FoodRecord = {
      ...foodForm,
      calories: foodForm.calories === "" ? "" : Number(foodForm.calories),
      amount: Number(foodForm.amount || 0),
      id: editingFoodId ?? uid()
    };
    setFoods((current) =>
      editingFoodId ? current.map((item) => (item.id === editingFoodId ? record : item)) : [record, ...current]
    );
    setFoodForm({ ...defaultFood, date: selectedDate });
    setEditingFoodId(null);
    setNotice(editingFoodId ? "吃喝记录已保存" : "已新增吃喝记录");
  }

  function saveCurrentAsTemplate() {
    if (!foodForm.name.trim()) return;
    const template: FoodTemplate = {
      id: editingTemplateId ?? uid(),
      name: foodForm.name.trim(),
      amount: Number(foodForm.amount || 0),
      calories: foodForm.calories === "" ? "" : Number(foodForm.calories),
      calorieConfidence: foodForm.calorieConfidence,
      category: foodForm.category
    };
    setTemplates((current) =>
      editingTemplateId ? current.map((item) => (item.id === editingTemplateId ? template : item)) : [template, ...current]
    );
    setEditingTemplateId(null);
    setNotice(editingTemplateId ? "常吃模板已更新" : "已保存为常吃模板");
  }

  function editTemplate(item: FoodTemplate) {
    setEditingTemplateId(item.id);
    setFoodForm((current) => ({
      ...current,
      name: item.name,
      amount: item.amount,
      calories: item.calories,
      calorieConfidence: item.calorieConfidence,
      category: item.category
    }));
  }

  function saveExercise(event: FormEvent) {
    event.preventDefault();
    if (!exerciseForm.name.trim()) return;
    const record: ExerciseRecord = { ...exerciseForm, id: editingExerciseId ?? uid() };
    setExercises((current) =>
      editingExerciseId ? current.map((item) => (item.id === editingExerciseId ? record : item)) : [record, ...current]
    );
    setExerciseForm({ ...defaultExercise, date: selectedDate });
    setEditingExerciseId(null);
    setExerciseOpen(false);
    setNotice(editingExerciseId ? "运动记录已保存" : "已新增运动记录");
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.type === "food") {
      setFoods((current) => current.filter((food) => food.id !== pendingDelete.id));
      setNotice("吃喝记录已删除");
    }
    if (pendingDelete.type === "exercise") {
      setExercises((current) => current.filter((exercise) => exercise.id !== pendingDelete.id));
      setNotice("运动记录已删除");
    }
    if (pendingDelete.type === "template") {
      setTemplates((current) => current.filter((template) => template.id !== pendingDelete.id));
      setNotice("常吃模板已删除");
    }
    setPendingDelete(null);
  }

  function openSection(section: Section, options?: { openExercise?: boolean }) {
    setActiveSection(section);
    if (options?.openExercise) setExerciseOpen(true);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function openExerciseModal() {
    setEditingExerciseId(null);
    setExerciseForm({ ...defaultExercise, date: selectedDate });
    setExerciseOpen(true);
  }

  function closeExerciseModal() {
    setExerciseOpen(false);
    setEditingExerciseId(null);
    setExerciseForm({ ...defaultExercise, date: selectedDate });
  }

  async function analyzeMealPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      setAiError("请上传图片文件");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiEstimate(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const image = await fileToDataUrl(file);
      const response = await fetch("/api/analyze-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({ error: "服务器没有返回有效结果" }));
      if (!response.ok) throw new Error(data.error || "识别失败");
      const estimate = data as MealEstimate;
      setAiEstimate(estimate);
      setFoodForm((current) => ({
        ...current,
        name: estimate.name || current.name,
        calories: Number(estimate.calories || current.calories),
        calorieConfidence: "估算",
        category: estimate.category || current.category
      }));
    } catch (error) {
      setAiError(friendlyAiError(error));
    } finally {
      window.clearTimeout(timeout);
      setAiLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-3 py-5 sm:px-6 lg:py-10">
      <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-5xl font-semibold text-ink sm:text-7xl">Eatcost</h1>
          <p className="mt-2 text-lg font-semibold text-ink sm:mt-3 sm:text-2xl">今天吃了多少钱？</p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <p className="max-w-sm text-sm leading-6 text-muted sm:text-right">打开就记一餐，顺手看看今天还能吃多少、还能花多少钱。</p>
          <a className="w-fit rounded-full bg-[#f2f2f7] px-4 py-2 text-sm font-medium text-apple transition hover:bg-white" href="/settings/">
            设置身体数据和预算
          </a>
        </div>
      </header>

      <nav className="sticky top-0 z-10 -mx-3 mb-4 border-y border-white/70 bg-white/80 px-3 py-2 backdrop-blur-xl sm:static sm:mx-0 sm:rounded-full sm:border sm:px-2">
        <div className="flex gap-2 overflow-x-auto">
          {[
            ["record", "记录"],
            ["today", "今日"],
            ["insights", "洞察"],
            ["month", "月度"]
          ].map(([section, label]) => (
            <button
              key={section}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeSection === section ? "bg-apple text-white" : "bg-[#f2f2f7] text-ink hover:bg-white"
              }`}
              onClick={() => setActiveSection(section as Section)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <DateSwitcher selectedDate={selectedDate} onChange={setSelectedDate} />

      {foods.length + exercises.length === 0 && (
        <section className="mb-4 rounded-[22px] border border-white/70 bg-paper p-4 shadow-soft backdrop-blur-xl sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5">
          <div>
            <p className="font-semibold text-ink">想先看看完整效果？</p>
            <p className="mt-1 text-sm leading-6 text-muted">一键放入几条示例吃喝和运动记录，之后你也可以在设置里清空。</p>
          </div>
          <button
            className="mt-3 rounded-full bg-apple px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,122,255,0.22)] sm:mt-0"
            onClick={fillSampleData}
            type="button"
          >
            填入示例数据
          </button>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <DashboardAction
          title="记一餐"
          value={`${round(stats.todayIntake)} / ${metrics.suggestedIntake} kcal`}
          note={stats.hasFoodToday ? "记录今天吃了什么" : "点这里快速记录吃喝"}
          onClick={() => openSection("record")}
        />
        <DashboardAction
          title="看热量"
          value={`${round(stats.remainingIntake)} kcal`}
          note="今天剩余可吃"
          onClick={() => openSection("insights")}
        />
        <DashboardAction
          title="记运动"
          value={`${round(stats.todayExercise)} kcal`}
          note="记录额外消耗"
          onClick={openExerciseModal}
        />
        <DashboardAction
          title="看支出"
          value={`${money(stats.todaySpending)} / ${money(stats.budgetPerDay)}`}
          note={`剩 ${stats.remainingDaysInMonth} 天 · 本月剩余 ${money(stats.remainingBudget)}`}
          onClick={() => openSection("month")}
        />
      </section>

      {activeSection === "record" && (
        <section>
          <Card title="今天还能吃什么" className="mt-4">
            <TemplateSuggestions remainingIntake={stats.remainingIntake} remainingBudget={stats.todayBudgetLeft} templates={templates} />
          </Card>

      <div className="mt-4">
        <Card title="快速记录吃喝">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-sm leading-6 text-muted">先记一餐，运动消耗可以用右侧按钮单独补，不占主页面空间。</p>
            <button
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition hover:bg-black active:scale-[0.98]"
              onClick={openExerciseModal}
              type="button"
            >
              + 记录运动
            </button>
          </div>
          <div className="mb-4 rounded-[20px] bg-[#f5f5f7] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">拍照估算热量</p>
                <p className="mt-1 text-sm leading-5 text-muted">上传这餐照片，AI 会估算名称和热量；价格仍需要你确认。</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-apple shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                  {aiLoading ? "识别中..." : "拍照"}
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={aiLoading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) analyzeMealPhoto(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <label className="cursor-pointer rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-apple shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                  上传图片
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    disabled={aiLoading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) analyzeMealPhoto(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            {aiEstimate && (
              <div className="mt-3 rounded-2xl bg-white p-3 text-sm text-muted">
                <span className="font-semibold text-ink">{aiEstimate.name}</span> · 约 {aiEstimate.calories} kcal · 可信度 {aiEstimate.confidence}
                {aiEstimate.note && <p className="mt-1">{aiEstimate.note}</p>}
              </div>
            )}
            {aiError && <p className="mt-3 rounded-2xl bg-[#fff1f0] p-3 text-sm text-tomato">{aiError}</p>}
          </div>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveFood}>
            <Text label="名称" value={foodForm.name} onChange={(value) => setFoodForm({ ...foodForm, name: value })} />
            <Field label="金额" value={foodForm.amount} step="0.01" onChange={(value) => setFoodForm({ ...foodForm, amount: Number(value) })} />
            <Field
              label="热量 kcal，可空"
              value={foodForm.calories}
              onChange={(value) =>
                setFoodForm({
                  ...foodForm,
                  calories: value === "" ? "" : Number(value),
                  calorieConfidence: value === "" ? "待补充" : foodForm.calorieConfidence === "待补充" ? "估算" : foodForm.calorieConfidence
                })
              }
            />
            <Select label="餐次" value={foodForm.meal} options={meals} onChange={(value) => setFoodForm({ ...foodForm, meal: value as Meal })} />
            <button
              type="button"
              className="rounded-2xl bg-[#f2f2f7] px-4 py-3 text-sm font-medium text-muted transition hover:text-apple sm:col-span-2"
              onClick={() => setFoodMoreOpen((open) => !open)}
            >
              {foodMoreOpen ? "收起更多选项" : "更多选项：分类 / 来源 / 支付 / 备注"}
            </button>
            {foodMoreOpen && (
              <div className="grid gap-3 rounded-[20px] bg-white/60 p-3 sm:col-span-2 sm:grid-cols-2">
                <Select label="分类" value={foodForm.category} options={categories} onChange={(value) => setFoodForm({ ...foodForm, category: value as Category })} />
                <Select label="热量可信度" value={foodForm.calorieConfidence} options={calorieConfidences} onChange={(value) => setFoodForm({ ...foodForm, calorieConfidence: value as CalorieConfidence })} />
                <Select label="来源" value={foodForm.source} options={sources} onChange={(value) => setFoodForm({ ...foodForm, source: value as Source })} />
                <Select label="支付方式" value={foodForm.payment} options={payments} onChange={(value) => setFoodForm({ ...foodForm, payment: value as Payment })} />
                <Text label="日期" type="date" value={foodForm.date} onChange={(value) => setFoodForm({ ...foodForm, date: value })} />
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-sm text-muted">备注</span>
                  <textarea className="min-h-20 w-full rounded-2xl border border-transparent bg-[#f2f2f7] px-4 py-3 text-ink outline-none transition focus:border-apple/40 focus:bg-white focus:ring-4 focus:ring-apple/10" value={foodForm.note} onChange={(event) => setFoodForm({ ...foodForm, note: event.target.value })} />
                </label>
              </div>
            )}
            <button className="rounded-2xl bg-apple px-4 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(0,122,255,0.24)] transition hover:bg-[#006fe6] sm:col-span-2">
              {editingFoodId ? "保存吃喝记录" : "新增吃喝记录"}
            </button>
            <button
              className="rounded-2xl bg-[#f2f2f7] px-4 py-3 text-sm font-semibold text-apple transition hover:bg-white sm:col-span-2"
              type="button"
              onClick={saveCurrentAsTemplate}
            >
              {editingTemplateId ? "保存常吃模板修改" : "把当前内容存为常吃模板"}
            </button>
          </form>

          <div className="mt-5 border-t border-line/70 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">常吃快捷</h3>
              <span className="text-xs text-muted">点一下自动填入</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {templates.map((item) => (
                <div key={item.id} className="shrink-0 rounded-[22px] bg-[#f2f2f7] p-2">
                  <button
                    className="block min-w-32 rounded-2xl px-2 py-1 text-left transition hover:bg-white"
                    onClick={() =>
                      setFoodForm({
                        ...foodForm,
                        name: item.name,
                        amount: item.amount,
                        calories: item.calories,
                        calorieConfidence: item.calorieConfidence,
                        category: item.category
                      })
                    }
                    type="button"
                  >
                    <span className="block text-sm font-semibold text-ink">{item.name}</span>
                    <span className="text-xs text-muted">{money(item.amount)} · {calorieText(item)}</span>
                  </button>
                  <div className="mt-1 flex gap-1">
                    <button className="rounded-full bg-white px-3 py-1 text-xs font-medium text-apple" type="button" onClick={() => editTemplate(item)}>
                      编辑
                    </button>
                    <button
                      className="rounded-full bg-[#fff1f0] px-3 py-1 text-xs font-medium text-tomato"
                      type="button"
                      onClick={() => setPendingDelete({ type: "template", id: item.id, name: item.name })}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <Card title={`${selectedDateLabel(selectedDate)}记录`} className="mt-4">
        <TodayRecords
          meals={meals}
          todayFoods={stats.todayFoods}
          todayExercises={stats.todayExercises}
          onEditFood={(item) => {
            setFoodForm(stripId(item));
            setEditingFoodId(item.id);
          }}
          onDeleteFood={(item) => setPendingDelete({ type: "food", id: item.id, name: item.name })}
          onEditExercise={(item) => {
            setExerciseOpen(true);
            setExerciseForm(stripId(item));
            setEditingExerciseId(item.id);
          }}
          onDeleteExercise={(item) => setPendingDelete({ type: "exercise", id: item.id, name: item.name })}
        />
      </Card>
        </section>
      )}

      {activeSection === "today" && (
      <section>
      <Card title={`${selectedDateLabel(selectedDate)}时间线`} className="mt-4">
        <TodayRecords
          meals={meals}
          todayFoods={stats.todayFoods}
          todayExercises={stats.todayExercises}
          onEditFood={(item) => {
            setFoodForm(stripId(item));
            setEditingFoodId(item.id);
          }}
          onDeleteFood={(item) => setPendingDelete({ type: "food", id: item.id, name: item.name })}
          onEditExercise={(item) => {
            setExerciseOpen(true);
            setExerciseForm(stripId(item));
            setEditingExerciseId(item.id);
          }}
          onDeleteExercise={(item) => setPendingDelete({ type: "exercise", id: item.id, name: item.name })}
        />
      </Card>
      </section>
      )}

      {activeSection === "insights" && (
      <section>
      <Card title="可视化洞察" className="mt-4">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <ProgressPanel
            title="今日热量进度"
            value={`${round(stats.todayIntake)} / ${metrics.suggestedIntake} kcal`}
            note={`剩余 ${round(stats.remainingIntake)} kcal`}
            ratio={stats.calorieProgressRatio}
            color="#30d158"
          />
          <ProgressPanel
            title="本月预算进度"
            value={`${money(stats.monthSpending)} / ${money(body.monthlyBudget)}`}
            note={`剩余 ${money(stats.remainingBudget)}`}
            ratio={stats.budgetSpentRatio}
            color="#007aff"
          />
          <DistributionPanel
            title="本月支出构成"
            emptyText="本月还没有吃喝支出"
            items={stats.categorySpending}
            formatter={money}
          />
          <DistributionPanel
            title="今日热量构成"
            emptyText="今天还没有记录热量"
            items={stats.mealCalories}
            formatter={(value) => `${round(value)} kcal`}
          />
          <DistributionPanel
            title="本月来源构成"
            emptyText="本月还没有来源记录"
            items={stats.sourceSpending}
            formatter={money}
            className="lg:col-span-2"
          />
        </div>
      </Card>
      </section>
      )}

      {activeSection === "month" && (
      <section>
      <Card title="本月统计" className="mt-4">
        <div className="mb-4 rounded-[20px] bg-[#f2f2f7] p-4 text-sm leading-6 text-muted">
          <p className="font-semibold text-ink">本月你在吃喝上花了 {money(stats.monthSpending)}</p>
          <p>
            饮料甜品花了 {money(stats.drinkDessertSpending)}，占 {Math.round(stats.drinkDessertRatio * 100)}%；外卖花了 {money(stats.deliverySpending)}，占 {Math.round(stats.deliveryRatio * 100)}%。
          </p>
          <p>
            按现在速度，本月预计会花 {money(stats.projectedMonthSpending)}
            {body.monthlyBudget > 0 && stats.projectedMonthSpending > body.monthlyBudget
              ? `，可能超预算 ${money(stats.projectedMonthSpending - body.monthlyBudget)}`
              : "，目前节奏还稳"}。
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="本月吃喝总支出" value={money(stats.monthSpending)} />
          <Stat title="本月预算剩余" value={money(stats.remainingBudget)} note={`预算 ${money(body.monthlyBudget)}`} />
          <Stat title="今日建议可花" value={money(stats.budgetPerDay)} note={`按剩余 ${stats.remainingDaysInMonth} 天重算 · 今日还可花 ${money(stats.todayBudgetLeft)}`} />
          <Stat title="本月平均每日支出" value={money(stats.monthAverageSpending)} />
          <Stat title="本月总摄入热量" value={`${round(stats.monthIntake)} kcal`} />
          <Stat title="本月平均每日摄入" value={`${round(stats.monthAverageIntake)} kcal`} />
          <Stat title="本月饮料支出" value={money(stats.drinkSpending)} />
          <Stat title="本月甜品支出" value={money(stats.dessertSpending)} />
          <Stat title="本月外卖支出" value={money(stats.deliverySpending)} />
          <Stat title="当前实际缺口" value={stats.hasFoodToday ? `${round(stats.todayDeficit)} kcal` : "未计算"} note={stats.hasFoodToday ? (stats.targetReached ? "已达成目标缺口" : `还差 ${round(body.targetDeficit - stats.todayDeficit)} kcal`) : "先记录吃喝后再计算"} />
        </div>
      </Card>
      </section>
      )}

      {exerciseOpen && (
        <Modal title={editingExerciseId ? "编辑运动记录" : "记录运动"} onClose={closeExerciseModal}>
          <form className="grid gap-3" onSubmit={saveExercise}>
            <Text label="运动名称" value={exerciseForm.name} onChange={(value) => setExerciseForm({ ...exerciseForm, name: value })} />
            <Field label="时长 分钟，可选" value={exerciseForm.minutes} onChange={(value) => setExerciseForm({ ...exerciseForm, minutes: value === "" ? "" : Number(value) })} />
            <Field label="消耗热量 kcal" value={exerciseForm.calories} onChange={(value) => setExerciseForm({ ...exerciseForm, calories: Number(value) })} />
            <Text label="日期" type="date" value={exerciseForm.date} onChange={(value) => setExerciseForm({ ...exerciseForm, date: value })} />
            <Text label="备注" value={exerciseForm.note} onChange={(value) => setExerciseForm({ ...exerciseForm, note: value })} />
            <button className="rounded-2xl bg-apple px-4 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(0,122,255,0.24)] transition active:scale-[0.98]">
              {editingExerciseId ? "保存运动记录" : "新增运动记录"}
            </button>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <Modal title="确认删除" onClose={() => setPendingDelete(null)}>
          <p className="text-sm leading-6 text-muted">要删除“{pendingDelete.name}”吗？这个操作不能撤回。</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button className="rounded-2xl bg-[#f2f2f7] px-4 py-3 font-semibold text-ink" type="button" onClick={() => setPendingDelete(null)}>
              取消
            </button>
            <button className="rounded-2xl bg-[#fff1f0] px-4 py-3 font-semibold text-tomato" type="button" onClick={confirmDelete}>
              删除
            </button>
          </div>
        </Modal>
      )}

      {notice && <Toast message={notice} />}
    </main>
  );
}

function stripId<T extends { id: string }>(item: T): Omit<T, "id"> {
  const { id: _id, ...rest } = item;
  return rest;
}

function DateSwitcher({ selectedDate, onChange }: { selectedDate: string; onChange: (value: string) => void }) {
  const quickDates = [
    { label: "今天", value: dateByOffset(0) },
    { label: "昨天", value: dateByOffset(-1) },
    { label: "前天", value: dateByOffset(-2) }
  ];

  return (
    <section className="mb-4 flex flex-col gap-2 rounded-[22px] border border-white/70 bg-paper p-2 shadow-soft backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2 overflow-x-auto">
        {quickDates.map((item) => (
          <button
            key={item.label}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              selectedDate === item.value ? "bg-apple text-white" : "bg-[#f2f2f7] text-ink hover:bg-white"
            }`}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 rounded-full bg-[#f2f2f7] px-4 py-2 text-sm text-muted">
        指定日期
        <input className="bg-transparent font-semibold text-ink outline-none" type="date" value={selectedDate} onChange={(event) => onChange(event.target.value)} />
      </label>
    </section>
  );
}

function TemplateSuggestions({
  remainingIntake,
  remainingBudget,
  templates
}: {
  remainingIntake: number;
  remainingBudget: number;
  templates: FoodTemplate[];
}) {
  const availableTemplates = templates.filter((item) => item.calorieConfidence !== "待补充" && item.calories !== "");
  const suggestions = availableTemplates
    .filter((item) => calorieValue(item.calories) <= remainingIntake && item.amount <= remainingBudget)
    .sort((a, b) => calorieValue(b.calories) - calorieValue(a.calories))
    .slice(0, 3);
  const combos = availableTemplates
    .flatMap((first, firstIndex) =>
      availableTemplates.slice(firstIndex + 1).map((second) => ({
        names: `${first.name} + ${second.name}`,
        calories: calorieValue(first.calories) + calorieValue(second.calories),
        amount: first.amount + second.amount
      }))
    )
    .filter((item) => item.calories <= remainingIntake && item.amount <= remainingBudget)
    .sort((a, b) => b.calories - a.calories)
    .slice(0, 3);

  if (remainingIntake <= 0) {
    return <p className="rounded-2xl bg-[#fff1f0] p-4 text-sm leading-6 text-tomato">今天的目标摄入额度已经用完了，可以优先选择低热量饮品或把运动记录补上。</p>;
  }

  if (remainingBudget <= 0) {
    return <p className="rounded-2xl bg-[#fff1f0] p-4 text-sm leading-6 text-tomato">今天还剩 {round(remainingIntake)} kcal，但今日建议预算已经用完了。可以优先选家里现成的食物。</p>;
  }

  if (suggestions.length + combos.length === 0) {
    return <p className="rounded-2xl bg-[#f2f2f7] p-4 text-sm leading-6 text-muted">今天还能吃 {round(remainingIntake)} kcal，还可花 {money(remainingBudget)}，但常吃模板里暂时没有合适的选择。</p>;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[0.9fr_2fr] lg:items-center">
      <div>
        <p className="text-3xl font-semibold text-ink sm:text-4xl">{round(remainingIntake)} kcal</p>
        <p className="mt-1 text-sm text-muted">今天剩余可摄入</p>
        <p className="mt-1 text-sm text-muted">今日还可花 {money(remainingBudget)}</p>
      </div>
      <div className="space-y-3">
        {suggestions.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-muted">单个选择</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {suggestions.map((item) => (
                <div key={`${item.id}-suggestion`} className="rounded-2xl bg-[#f2f2f7] p-4">
                  <p className="font-semibold text-ink">{item.name}</p>
                  <p className="mt-1 text-sm text-muted">{round(calorieValue(item.calories))} kcal · {money(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {combos.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-muted">两样组合</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {combos.map((item) => (
                <div key={`${item.names}-combo`} className="rounded-2xl bg-[#f2f2f7] p-4">
                  <p className="font-semibold text-ink">{item.names}</p>
                  <p className="mt-1 text-sm text-muted">{round(item.calories)} kcal · {money(item.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TodayRecords({
  meals,
  todayFoods,
  todayExercises,
  onEditFood,
  onDeleteFood,
  onEditExercise,
  onDeleteExercise
}: {
  meals: Meal[];
  todayFoods: FoodRecord[];
  todayExercises: ExerciseRecord[];
  onEditFood: (item: FoodRecord) => void;
  onDeleteFood: (item: FoodRecord) => void;
  onEditExercise: (item: ExerciseRecord) => void;
  onDeleteExercise: (item: ExerciseRecord) => void;
}) {
  return (
    <div className="space-y-5">
      {meals.map((meal) => {
        const items = todayFoods.filter((item) => item.meal === meal);
        if (items.length === 0) return null;
        return (
          <TimelineGroup key={meal} title={meal}>
            {items.map((item) => (
              <RecordRow
                key={item.id}
                title={item.name}
                meta={`${item.category} · ${item.source} · ${item.payment}`}
                value={`${money(item.amount)} · ${calorieText(item)}`}
                onEdit={() => onEditFood(item)}
                onDelete={() => onDeleteFood(item)}
              />
            ))}
          </TimelineGroup>
        );
      })}
      {todayExercises.length > 0 && (
        <TimelineGroup title="运动消耗">
          {todayExercises.map((item) => (
            <RecordRow
              key={item.id}
              title={item.name}
              meta={`${item.minutes || 0} 分钟 · ${item.note || "运动"}`}
              value={`-${item.calories} kcal`}
              onEdit={() => onEditExercise(item)}
              onDelete={() => onDeleteExercise(item)}
            />
          ))}
        </TimelineGroup>
      )}
      {todayFoods.length + todayExercises.length === 0 && (
        <p className="rounded-2xl bg-[#f2f2f7] p-4 text-sm leading-6 text-muted">今天还没有记录吃喝。先用上面的常吃快捷记一笔，系统再计算实际缺口。</p>
      )}
    </div>
  );
}

function TimelineGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 sm:grid-cols-[5rem_1fr]">
      <h3 className="pt-3 text-sm font-semibold text-muted">{title}</h3>
      <div className="space-y-2 border-l border-line/70 pl-4">{children}</div>
    </section>
  );
}

function RingPanel({
  title,
  value,
  note,
  ratio,
  color
}: {
  title: string;
  value: string;
  note: string;
  ratio: number;
  color: string;
}) {
  const progress = percent(ratio);
  const isOver = ratio > 1;
  const displayProgress = Math.min(progress, 100);
  const background = `conic-gradient(${isOver ? "#ff3b30" : color} ${displayProgress}%, #ffffff ${displayProgress}% 100%)`;

  return (
    <div className="grid gap-4 rounded-[24px] bg-[#f5f5f7] p-4 sm:grid-cols-[9.5rem_1fr] sm:items-center">
      <div className="relative mx-auto grid aspect-square w-36 place-items-center rounded-full sm:w-auto" style={{ background }}>
        <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-[#f5f5f7] text-center">
          <span className={`text-2xl font-semibold ${isOver ? "text-tomato" : "text-ink"}`}>{progress}%</span>
          <span className="text-xs text-muted">完成</span>
        </div>
      </div>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted">{title}</p>
            <p className="mt-1 text-2xl font-semibold leading-tight text-ink">{value}</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${displayProgress}%`, backgroundColor: isOver ? "#ff3b30" : color }}
          />
        </div>
        <p className="mt-3 text-sm leading-5 text-muted">{isOver ? "已经超出目标，后面可以轻一点" : note}</p>
      </div>
    </div>
  );
}

function ProgressPanel({
  title,
  value,
  note,
  ratio,
  color
}: {
  title: string;
  value: string;
  note: string;
  ratio: number;
  color: string;
}) {
  const width = percent(ratio);
  const isOver = ratio > 1;

  return (
    <div className="rounded-[20px] bg-[#f5f5f7] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${isOver ? "bg-[#fff1f0] text-tomato" : "bg-white text-ink"}`}>
          {width}%
        </span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, backgroundColor: isOver ? "#ff3b30" : color }}
        />
      </div>
      <p className="mt-3 text-sm text-muted">{isOver ? "已经超出目标，后面可以轻一点" : note}</p>
    </div>
  );
}

function DistributionPanel({
  title,
  items,
  formatter,
  emptyText,
  className = ""
}: {
  title: string;
  items: { label: string; value: number; color: string }[];
  formatter: (value: number) => string;
  emptyText: string;
  className?: string;
}) {
  const total = items.reduce((sumValue, item) => sumValue + item.value, 0);
  const visibleItems = items.filter((item) => item.value > 0);

  return (
    <div className={`rounded-[20px] bg-[#f5f5f7] p-4 ${className}`}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-ink">{title}</h3>
        <span className="text-sm text-muted">合计 {formatter(total)}</span>
      </div>
      {visibleItems.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex h-4 overflow-hidden rounded-full bg-white">
            {visibleItems.map((item) => {
              const itemRatio = total > 0 ? item.value / total : 0;
              return (
                <div
                  key={`${item.label}-segment`}
                  className="h-full"
                  style={{ width: `${percent(itemRatio)}%`, backgroundColor: item.color }}
                />
              );
            })}
          </div>
          {visibleItems.map((item) => {
            const itemRatio = total > 0 ? item.value / total : 0;
            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{item.label}</span>
                  <span className="text-muted">
                    {formatter(item.value)} · {percent(itemRatio)}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full" style={{ width: `${percent(itemRatio)}%`, backgroundColor: item.color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`animate-[cardIn_0.28s_ease-out] rounded-[20px] border border-white/70 bg-paper p-4 shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)] sm:rounded-[22px] sm:p-5 ${className}`}>
      <h2 className="mb-4 text-lg font-semibold text-ink sm:text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ title, value, note, strong = false }: { title: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`rounded-[22px] border border-white/70 bg-paper p-4 shadow-soft backdrop-blur-xl sm:p-5 ${strong ? "ring-2 ring-mint/70" : ""}`}>
      <p className="text-xs font-medium text-muted sm:text-sm">{title}</p>
      <p className="mt-2 break-words text-2xl font-semibold tracking-normal text-ink sm:text-3xl">{value}</p>
      {note && <p className="mt-2 text-xs leading-5 text-muted sm:text-sm">{note}</p>}
    </div>
  );
}

function DashboardAction({
  title,
  value,
  note,
  onClick
}: {
  title: string;
  value: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      className="min-h-36 rounded-[22px] border border-white/70 bg-paper p-4 text-left shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_50px_rgba(0,0,0,0.08)] active:scale-[0.98] sm:min-h-40 sm:p-5"
      onClick={onClick}
      type="button"
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2f2f7] text-sm font-semibold text-apple">›</span>
          </div>
          <p className="break-words text-2xl font-semibold leading-tight tracking-normal text-ink sm:text-3xl">{value}</p>
        </div>
        <p className="text-xs leading-5 text-muted sm:text-sm">{note}</p>
      </div>
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-black/20 px-3 py-3 backdrop-blur-sm sm:place-items-center" role="dialog" aria-modal="true">
      <section className="w-full max-w-md animate-[modalIn_0.24s_ease-out] rounded-[28px] border border-white/80 bg-paper p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-ink">{title}</h2>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-[#f2f2f7] text-lg font-semibold text-muted transition hover:bg-white" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div className="animate-[toastIn_0.22s_ease-out] rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(0,0,0,0.2)]">
        {message}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = "1"
}: {
  label: string;
  value: number | "";
  onChange: (value: string) => void;
  step?: string;
}) {
  return <Text label={label} type="number" value={String(value)} step={step} onChange={onChange} />;
}

function Text({
  label,
  value,
  onChange,
  type = "text",
  step
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        className="h-12 w-full rounded-2xl border border-transparent bg-[#f2f2f7] px-4 text-ink outline-none transition placeholder:text-[#8e8e93] focus:border-apple/40 focus:bg-white focus:ring-4 focus:ring-apple/10"
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <select
        className="h-12 w-full rounded-2xl border border-transparent bg-[#f2f2f7] px-4 text-ink outline-none transition focus:border-apple/40 focus:bg-white focus:ring-4 focus:ring-apple/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function RecordRow({
  title,
  meta,
  value,
  onEdit,
  onDelete
}: {
  title: string;
  meta: string;
  value: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-transparent bg-[#f5f5f7] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">{meta}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
        <p className="font-semibold text-ink">{value}</p>
        <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-apple shadow-[0_1px_2px_rgba(0,0,0,0.06)]" onClick={onEdit}>
          编辑
        </button>
        <button className="rounded-full bg-[#fff1f0] px-4 py-2 text-sm font-medium text-tomato" onClick={onDelete}>
          删除
        </button>
      </div>
    </div>
  );
}

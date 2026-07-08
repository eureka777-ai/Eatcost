"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = "正餐" | "饮料" | "甜品" | "零食" | "水果" | "其他";
type Meal = "早餐" | "午餐" | "晚餐" | "加餐";
type Source = "外卖" | "堂食" | "自己做饭" | "便利店" | "咖啡店" | "其他";
type Payment = "微信" | "支付宝" | "银行卡" | "现金" | "其他";
type Activity = "久坐" | "轻度活动" | "中度活动" | "高度活动";
type Goal = "维持体重" | "减重" | "增重";

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
  calories: number;
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

type FoodTemplate = Pick<FoodRecord, "name" | "amount" | "calories" | "category">;

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
  calories: 0,
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
  { name: "米饭一份", amount: 1, calories: 180, category: "正餐" },
  { name: "豆浆 200ml", amount: 3, calories: 90, category: "饮料" },
  { name: "奶茶", amount: 18, calories: 350, category: "饮料" },
  { name: "布丁", amount: 6, calories: 120, category: "甜品" },
  { name: "牛肉粉", amount: 18, calories: 650, category: "正餐" },
  { name: "鸡胸肉饭", amount: 25, calories: 500, category: "正餐" },
  { name: "美式咖啡", amount: 15, calories: 10, category: "饮料" },
  { name: "水果一份", amount: 8, calories: 100, category: "水果" }
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
const chartColors = ["#007aff", "#30d158", "#ff9500", "#af52de", "#ff3b30", "#8e8e93"];

function money(value: number) {
  return `¥${value.toFixed(2)}`;
}

function round(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

function percent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
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

export default function Home() {
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

  useEffect(() => {
    setBody({ ...defaultBody, ...loadState("eatcost.body", defaultBody) });
    setFoods(loadState("eatcost.foods", []));
    setExercises(loadState("eatcost.exercises", []));
    setTemplates(loadState("eatcost.templates", defaultTemplates));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("eatcost.body", JSON.stringify(body));
    localStorage.setItem("eatcost.foods", JSON.stringify(foods));
    localStorage.setItem("eatcost.exercises", JSON.stringify(exercises));
    localStorage.setItem("eatcost.templates", JSON.stringify(templates));
  }, [ready, body, foods, exercises, templates]);

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
    const currentDate = today();
    const month = currentDate.slice(0, 7);
    const todayFoods = foods.filter((item) => item.date === currentDate);
    const monthFoods = foods.filter((item) => item.date.startsWith(month));
    const todayExercises = exercises.filter((item) => item.date === currentDate);
    const todayIntake = sum(todayFoods, "calories");
    const todayExercise = sum(todayExercises, "calories");
    const todayDeficit = metrics.tdee + todayExercise - todayIntake;
    const monthSpending = sum(monthFoods, "amount");
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const budgetPerDay = body.monthlyBudget / daysInMonth;
    const budgetSpentRatio = body.monthlyBudget > 0 ? monthSpending / body.monthlyBudget : 0;
    const projectedMonthSpending = (monthSpending / dayOfMonth) * daysInMonth;
    const remainingIntake = Math.max(metrics.suggestedIntake - todayIntake, 0);
    const remainingBudget = Math.max(body.monthlyBudget - monthSpending, 0);
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
      monthAverageSpending: monthSpending / dayOfMonth,
      monthIntake: sum(monthFoods, "calories"),
      monthAverageIntake: sum(monthFoods, "calories") / dayOfMonth,
      drinkSpending: sum(monthFoods.filter((item) => item.category === "饮料"), "amount"),
      dessertSpending: sum(monthFoods.filter((item) => item.category === "甜品"), "amount"),
      drinkDessertSpending,
      drinkDessertRatio: monthSpending > 0 ? drinkDessertSpending / monthSpending : 0,
      deliverySpending,
      deliveryRatio: monthSpending > 0 ? deliverySpending / monthSpending : 0,
      budgetPerDay,
      budgetSpentRatio,
      calorieProgressRatio: metrics.suggestedIntake > 0 ? todayIntake / metrics.suggestedIntake : 0,
      projectedMonthSpending,
      remainingBudget,
      todayBudgetLeft,
      categorySpending,
      sourceSpending,
      mealCalories
    };
  }, [body.monthlyBudget, body.targetDeficit, exercises, foods, metrics.suggestedIntake, metrics.tdee]);

  function sum<T extends { [K in keyof T]: T[K] }>(items: T[], key: keyof T) {
    return items.reduce((total, item) => total + Number(item[key] || 0), 0);
  }

  function saveFood(event: FormEvent) {
    event.preventDefault();
    if (!foodForm.name.trim()) return;
    const record: FoodRecord = { ...foodForm, id: editingFoodId ?? uid() };
    setFoods((current) =>
      editingFoodId ? current.map((item) => (item.id === editingFoodId ? record : item)) : [record, ...current]
    );
    setFoodForm({ ...defaultFood, date: today() });
    setEditingFoodId(null);
  }

  function saveExercise(event: FormEvent) {
    event.preventDefault();
    if (!exerciseForm.name.trim()) return;
    const record: ExerciseRecord = { ...exerciseForm, id: editingExerciseId ?? uid() };
    setExercises((current) =>
      editingExerciseId ? current.map((item) => (item.id === editingExerciseId ? record : item)) : [record, ...current]
    );
    setExerciseForm({ ...defaultExercise, date: today() });
    setEditingExerciseId(null);
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

      <nav className="sticky top-0 z-10 -mx-3 mb-4 border-y border-white/70 bg-white/75 px-3 py-2 backdrop-blur-xl sm:static sm:mx-0 sm:rounded-full sm:border sm:px-2">
        <div className="flex gap-2 overflow-x-auto">
          {[
            ["#record", "记录"],
            ["#today", "今日"],
            ["#insights", "洞察"],
            ["#month", "月度"]
          ].map(([href, label]) => (
            <a key={href} className="shrink-0 rounded-full bg-[#f2f2f7] px-4 py-2 text-sm font-semibold text-ink transition hover:bg-apple hover:text-white" href={href}>
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Stat title="今日已摄入" value={`${round(stats.todayIntake)} / ${metrics.suggestedIntake} kcal`} note={stats.hasFoodToday ? "已开始记录今日吃喝" : "今日还没有记录吃喝"} />
        <Stat title="今日剩余可吃" value={`${round(stats.remainingIntake)} kcal`} note="先看这个，再决定下一口" strong />
        <Stat title="今日运动消耗" value={`${round(stats.todayExercise)} kcal`} note="额外运动消耗" />
        <Stat title="今日吃喝支出" value={`${money(stats.todaySpending)} / ${money(stats.budgetPerDay)}`} note={`本月剩余 ${money(stats.remainingBudget)}`} />
      </section>

      <Card title="今天还能吃什么" className="mt-4">
        <TemplateSuggestions remainingIntake={stats.remainingIntake} templates={templates} />
      </Card>

      <section id="record" className="scroll-mt-20">
      <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-[1.45fr_0.75fr]">
        <Card title="快速记录吃喝">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveFood}>
            <Text label="名称" value={foodForm.name} onChange={(value) => setFoodForm({ ...foodForm, name: value })} />
            <Field label="金额" value={foodForm.amount} step="0.01" onChange={(value) => setFoodForm({ ...foodForm, amount: Number(value) })} />
            <Field label="热量 kcal" value={foodForm.calories} onChange={(value) => setFoodForm({ ...foodForm, calories: Number(value) })} />
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
          </form>

          <div className="mt-5 border-t border-line/70 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">常吃快捷</h3>
              <span className="text-xs text-muted">点一下自动填入</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {templates.map((item) => (
                <button
                  key={`${item.name}-${item.calories}`}
                  className="shrink-0 rounded-full bg-[#f2f2f7] px-4 py-2 text-left transition hover:bg-white hover:shadow-[0_8px_22px_rgba(0,0,0,0.06)]"
                  onClick={() => setFoodForm({ ...foodForm, ...item })}
                >
                  <span className="block text-sm font-semibold text-ink">{item.name}</span>
                  <span className="text-xs text-muted">{money(item.amount)} · {item.calories} kcal</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card title="运动">
          <button
            className="w-full rounded-2xl bg-ink px-4 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition hover:bg-black"
            onClick={() => setExerciseOpen((open) => !open)}
          >
            {exerciseOpen ? "收起运动记录" : "+ 记录运动"}
          </button>
          {exerciseOpen && (
            <form className="mt-4 grid gap-3" onSubmit={saveExercise}>
              <Text label="运动名称" value={exerciseForm.name} onChange={(value) => setExerciseForm({ ...exerciseForm, name: value })} />
              <Field label="时长 分钟，可选" value={exerciseForm.minutes} onChange={(value) => setExerciseForm({ ...exerciseForm, minutes: value === "" ? "" : Number(value) })} />
              <Field label="消耗热量 kcal" value={exerciseForm.calories} onChange={(value) => setExerciseForm({ ...exerciseForm, calories: Number(value) })} />
              <Text label="日期" type="date" value={exerciseForm.date} onChange={(value) => setExerciseForm({ ...exerciseForm, date: value })} />
              <Text label="备注" value={exerciseForm.note} onChange={(value) => setExerciseForm({ ...exerciseForm, note: value })} />
              <button className="rounded-2xl bg-apple px-4 py-3 font-semibold text-white">
                {editingExerciseId ? "保存运动记录" : "新增运动记录"}
              </button>
            </form>
          )}
        </Card>
      </div>
      </section>

      <section id="today" className="scroll-mt-20">
      <Card title="今日时间线" className="mt-4">
        <div className="space-y-5">
          {meals.map((meal) => {
            const items = stats.todayFoods.filter((item) => item.meal === meal);
            if (items.length === 0) return null;
            return (
              <TimelineGroup key={meal} title={meal}>
                {items.map((item) => (
                  <RecordRow
                    key={item.id}
                    title={item.name}
                    meta={`${item.category} · ${item.source} · ${item.payment}`}
                    value={`${money(item.amount)} · ${item.calories} kcal`}
                    onEdit={() => {
                      setFoodForm(stripId(item));
                      setEditingFoodId(item.id);
                    }}
                    onDelete={() => setFoods((current) => current.filter((food) => food.id !== item.id))}
                  />
                ))}
              </TimelineGroup>
            );
          })}
          {stats.todayExercises.length > 0 && (
            <TimelineGroup title="运动消耗">
              {stats.todayExercises.map((item) => (
                <RecordRow
                  key={item.id}
                  title={item.name}
                  meta={`${item.minutes || 0} 分钟 · ${item.note || "运动"}`}
                  value={`-${item.calories} kcal`}
                  onEdit={() => {
                    setExerciseOpen(true);
                    setExerciseForm(stripId(item));
                    setEditingExerciseId(item.id);
                  }}
                  onDelete={() => setExercises((current) => current.filter((exercise) => exercise.id !== item.id))}
                />
              ))}
            </TimelineGroup>
          )}
          {stats.todayFoods.length + stats.todayExercises.length === 0 && (
            <p className="rounded-2xl bg-[#f2f2f7] p-4 text-sm leading-6 text-muted">今天还没有记录吃喝。先用上面的常吃快捷记一笔，系统再计算实际缺口。</p>
          )}
        </div>
      </Card>
      </section>

      <section id="insights" className="scroll-mt-20">
      <Card title="可视化洞察" className="mt-4">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <RingPanel
            title="今日热量进度"
            value={`${round(stats.todayIntake)} / ${metrics.suggestedIntake} kcal`}
            note={`剩余 ${round(stats.remainingIntake)} kcal`}
            ratio={stats.calorieProgressRatio}
            color="#30d158"
          />
          <RingPanel
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

      <section id="month" className="scroll-mt-20">
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
          <Stat title="今日建议可花" value={money(stats.budgetPerDay)} note={`今日还可花 ${money(stats.todayBudgetLeft)}`} />
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

    </main>
  );
}

function stripId<T extends { id: string }>(item: T): Omit<T, "id"> {
  const { id: _id, ...rest } = item;
  return rest;
}

function TemplateSuggestions({
  remainingIntake,
  templates
}: {
  remainingIntake: number;
  templates: FoodTemplate[];
}) {
  const suggestions = templates
    .filter((item) => item.calories <= remainingIntake)
    .sort((a, b) => b.calories - a.calories)
    .slice(0, 3);

  if (remainingIntake <= 0) {
    return <p className="rounded-2xl bg-[#fff1f0] p-4 text-sm leading-6 text-tomato">今天的目标摄入额度已经用完了，可以优先选择低热量饮品或把运动记录补上。</p>;
  }

  if (suggestions.length === 0) {
    return <p className="rounded-2xl bg-[#f2f2f7] p-4 text-sm leading-6 text-muted">今天还能吃 {round(remainingIntake)} kcal，但常吃模板里暂时没有刚好适合的选择。</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_2fr] sm:items-center">
      <div>
        <p className="text-3xl font-semibold text-ink sm:text-4xl">{round(remainingIntake)} kcal</p>
        <p className="mt-1 text-sm text-muted">今天剩余可摄入</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {suggestions.map((item) => (
          <div key={`${item.name}-suggestion`} className="rounded-2xl bg-[#f2f2f7] p-4">
            <p className="font-semibold text-ink">{item.name}</p>
            <p className="mt-1 text-sm text-muted">{item.calories} kcal · {money(item.amount)}</p>
          </div>
        ))}
      </div>
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
    <section className={`rounded-[20px] border border-white/70 bg-paper p-4 shadow-soft backdrop-blur-xl sm:rounded-[22px] sm:p-5 ${className}`}>
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

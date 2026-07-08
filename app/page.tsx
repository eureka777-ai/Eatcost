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
  targetDeficit: 500
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

function money(value: number) {
  return `¥${value.toFixed(2)}`;
}

function round(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
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
  const [bodyOpen, setBodyOpen] = useState(false);

  useEffect(() => {
    setBody(loadState("eatcost.body", defaultBody));
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

    return {
      todayFoods,
      todayExercises,
      todayIntake,
      todayExercise,
      todayDeficit,
      targetReached: todayDeficit >= body.targetDeficit,
      todaySpending: sum(todayFoods, "amount"),
      monthSpending,
      monthAverageSpending: monthSpending / dayOfMonth,
      monthIntake: sum(monthFoods, "calories"),
      monthAverageIntake: sum(monthFoods, "calories") / dayOfMonth,
      drinkSpending: sum(monthFoods.filter((item) => item.category === "饮料"), "amount"),
      dessertSpending: sum(monthFoods.filter((item) => item.category === "甜品"), "amount"),
      deliverySpending: sum(monthFoods.filter((item) => item.source === "外卖"), "amount")
    };
  }, [body.targetDeficit, exercises, foods, metrics.tdee]);

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
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-apple">Eatcost</p>
          <h1 className="text-3xl font-semibold text-ink sm:text-5xl">吃喝花费与热量缺口</h1>
        </div>
        <p className="max-w-sm text-sm leading-6 text-muted sm:text-right">只记录吃喝、热量、运动和减重目标。</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="今日摄入" value={`${round(stats.todayIntake)} kcal`} note={`目标 ${metrics.suggestedIntake} kcal`} />
        <Stat title="今日运动消耗" value={`${round(stats.todayExercise)} kcal`} note="额外运动消耗" />
        <Stat
          title="今日实际缺口"
          value={`${round(stats.todayDeficit)} kcal`}
          note={stats.targetReached ? "已达成目标缺口" : `还差 ${round(body.targetDeficit - stats.todayDeficit)} kcal`}
          strong={stats.targetReached}
        />
        <Stat title="吃喝支出" value={money(stats.todaySpending)} note={`本月 ${money(stats.monthSpending)}`} />
      </section>

      <section className="mt-4 overflow-hidden rounded-[22px] border border-white/70 bg-paper shadow-soft backdrop-blur-xl">
        <button
          className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/50"
          onClick={() => setBodyOpen((open) => !open)}
        >
          <span>
            <span className="block text-base font-semibold text-ink">身体数据和目标设置</span>
            <span className="mt-1 block text-sm text-muted">
              BMR {metrics.bmr} kcal · TDEE {metrics.tdee} kcal · 建议摄入 {metrics.suggestedIntake} kcal
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-[#f2f2f7] px-3 py-1 text-sm font-medium text-muted">{bodyOpen ? "收起" : "展开"}</span>
        </button>
        {bodyOpen && (
          <div className="grid gap-3 border-t border-line/70 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="性别" value={body.gender} options={["女", "男"]} onChange={(value) => setBody({ ...body, gender: value as BodyData["gender"] })} />
            <Field label="年龄" value={body.age} onChange={(value) => setBody({ ...body, age: Number(value) })} />
            <Field label="身高 cm" value={body.height} onChange={(value) => setBody({ ...body, height: Number(value) })} />
            <Field label="当前体重 kg" value={body.currentWeight} onChange={(value) => setBody({ ...body, currentWeight: Number(value) })} />
            <Field label="目标体重 kg" value={body.targetWeight} onChange={(value) => setBody({ ...body, targetWeight: Number(value) })} />
            <Select label="活动水平" value={body.activity} options={Object.keys(activityFactors)} onChange={(value) => setBody({ ...body, activity: value as Activity })} />
            <Select label="目标" value={body.goal} options={["维持体重", "减重", "增重"]} onChange={(value) => setBody({ ...body, goal: value as Goal })} />
            <Field label="期望每日热量缺口 kcal" value={body.targetDeficit} onChange={(value) => setBody({ ...body, targetDeficit: Number(value) })} />
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
        <Card title="快速记录吃喝">
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveFood}>
            <Text label="名称" value={foodForm.name} onChange={(value) => setFoodForm({ ...foodForm, name: value })} />
            <Field label="金额" value={foodForm.amount} step="0.01" onChange={(value) => setFoodForm({ ...foodForm, amount: Number(value) })} />
            <Field label="热量 kcal" value={foodForm.calories} onChange={(value) => setFoodForm({ ...foodForm, calories: Number(value) })} />
            <Select label="分类" value={foodForm.category} options={categories} onChange={(value) => setFoodForm({ ...foodForm, category: value as Category })} />
            <Select label="餐次" value={foodForm.meal} options={meals} onChange={(value) => setFoodForm({ ...foodForm, meal: value as Meal })} />
            <Select label="来源" value={foodForm.source} options={sources} onChange={(value) => setFoodForm({ ...foodForm, source: value as Source })} />
            <Select label="支付方式" value={foodForm.payment} options={payments} onChange={(value) => setFoodForm({ ...foodForm, payment: value as Payment })} />
            <Text label="日期" type="date" value={foodForm.date} onChange={(value) => setFoodForm({ ...foodForm, date: value })} />
            <label className="sm:col-span-2">
              <span className="mb-1 block text-sm text-muted">备注</span>
              <textarea className="min-h-20 w-full rounded-2xl border border-transparent bg-[#f2f2f7] px-4 py-3 text-ink outline-none transition focus:border-apple/40 focus:bg-white focus:ring-4 focus:ring-apple/10" value={foodForm.note} onChange={(event) => setFoodForm({ ...foodForm, note: event.target.value })} />
            </label>
            <button className="rounded-2xl bg-apple px-4 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(0,122,255,0.24)] transition hover:bg-[#006fe6] sm:col-span-2">
              {editingFoodId ? "保存吃喝记录" : "新增吃喝记录"}
            </button>
          </form>
        </Card>

        <Card title="快速记录运动消耗">
          <form className="grid gap-3" onSubmit={saveExercise}>
            <Text label="运动名称" value={exerciseForm.name} onChange={(value) => setExerciseForm({ ...exerciseForm, name: value })} />
            <Field label="时长 分钟，可选" value={exerciseForm.minutes} onChange={(value) => setExerciseForm({ ...exerciseForm, minutes: value === "" ? "" : Number(value) })} />
            <Field label="消耗热量 kcal" value={exerciseForm.calories} onChange={(value) => setExerciseForm({ ...exerciseForm, calories: Number(value) })} />
            <Text label="日期" type="date" value={exerciseForm.date} onChange={(value) => setExerciseForm({ ...exerciseForm, date: value })} />
            <Text label="备注" value={exerciseForm.note} onChange={(value) => setExerciseForm({ ...exerciseForm, note: value })} />
            <button className="rounded-2xl bg-ink px-4 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition hover:bg-black">
              {editingExerciseId ? "保存运动记录" : "新增运动记录"}
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card title="今日记录列表">
          <div className="space-y-3">
            {stats.todayFoods.map((item) => (
              <RecordRow
                key={item.id}
                title={item.name}
                meta={`${item.meal} · ${item.category} · ${item.source} · ${item.payment}`}
                value={`${money(item.amount)} · ${item.calories} kcal`}
                onEdit={() => {
                  setFoodForm(stripId(item));
                  setEditingFoodId(item.id);
                }}
                onDelete={() => setFoods((current) => current.filter((food) => food.id !== item.id))}
              />
            ))}
            {stats.todayExercises.map((item) => (
              <RecordRow
                key={item.id}
                title={item.name}
                meta={`${item.minutes || 0} 分钟 · 运动消耗`}
                value={`${item.calories} kcal`}
                onEdit={() => {
                  setExerciseForm(stripId(item));
                  setEditingExerciseId(item.id);
                }}
                onDelete={() => setExercises((current) => current.filter((exercise) => exercise.id !== item.id))}
              />
            ))}
            {stats.todayFoods.length + stats.todayExercises.length === 0 && (
              <p className="rounded-lg bg-wash p-4 text-sm text-muted">今天还没有记录，可以先点常吃模板快速填入。</p>
            )}
          </div>
        </Card>

        <Card title="常吃模板">
          <div className="grid gap-2">
            {templates.map((item) => (
              <button
                key={`${item.name}-${item.calories}`}
              className="flex items-center justify-between rounded-2xl border border-transparent bg-[#f5f5f7] px-4 py-3 text-left transition hover:bg-white hover:shadow-[0_8px_22px_rgba(0,0,0,0.06)]"
                onClick={() => setFoodForm({ ...foodForm, ...item })}
              >
                <span>
                  <span className="block font-semibold text-ink">{item.name}</span>
                  <span className="text-sm text-muted">{item.category}</span>
                </span>
                <span className="text-right text-sm font-semibold text-ink">
                  {money(item.amount)}
                  <br />
                  {item.calories} kcal
                </span>
              </button>
            ))}
            <button className="rounded-2xl border border-dashed border-line px-3 py-3 text-sm font-medium text-muted transition hover:border-apple hover:text-apple" onClick={() => setTemplates(defaultTemplates)}>
              恢复默认模板
            </button>
          </div>
        </Card>
      </div>

      <Card title="本月统计" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat title="本月吃喝总支出" value={money(stats.monthSpending)} />
          <Stat title="本月平均每日支出" value={money(stats.monthAverageSpending)} />
          <Stat title="本月总摄入热量" value={`${round(stats.monthIntake)} kcal`} />
          <Stat title="本月平均每日摄入" value={`${round(stats.monthAverageIntake)} kcal`} />
          <Stat title="本月饮料支出" value={money(stats.drinkSpending)} />
          <Stat title="本月甜品支出" value={money(stats.dessertSpending)} />
          <Stat title="本月外卖支出" value={money(stats.deliverySpending)} />
          <Stat title="目标热量缺口" value={`${round(body.targetDeficit)} kcal`} />
        </div>
      </Card>
    </main>
  );
}

function stripId<T extends { id: string }>(item: T): Omit<T, "id"> {
  const { id: _id, ...rest } = item;
  return rest;
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[22px] border border-white/70 bg-paper p-5 shadow-soft backdrop-blur-xl ${className}`}>
      <h2 className="mb-4 text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ title, value, note, strong = false }: { title: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`rounded-[22px] border border-white/70 bg-paper p-5 shadow-soft backdrop-blur-xl ${strong ? "ring-2 ring-mint/70" : ""}`}>
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal text-ink">{value}</p>
      {note && <p className="mt-2 text-sm leading-5 text-muted">{note}</p>}
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
    <div className="flex flex-col gap-3 rounded-2xl border border-transparent bg-[#f5f5f7] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-muted">{meta}</p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
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

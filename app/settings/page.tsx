"use client";

import { useEffect, useMemo, useState } from "react";

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

const activityFactors: Record<Activity, number> = {
  久坐: 1.2,
  轻度活动: 1.375,
  中度活动: 1.55,
  高度活动: 1.725
};

function loadBody() {
  if (typeof window === "undefined") return defaultBody;
  const raw = window.localStorage.getItem("eatcost.body");
  if (!raw) return defaultBody;
  try {
    return { ...defaultBody, ...JSON.parse(raw) } as BodyData;
  } catch {
    return defaultBody;
  }
}

function money(value: number) {
  return `¥${value.toFixed(2)}`;
}

function round(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

export default function SettingsPage() {
  const [ready, setReady] = useState(false);
  const [body, setBody] = useState(defaultBody);

  useEffect(() => {
    setBody(loadBody());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("eatcost.body", JSON.stringify(body));
  }, [body, ready]);

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

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyBudget = body.monthlyBudget / daysInMonth;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <a className="text-sm font-medium text-apple" href="/">
            返回记录
          </a>
          <h1 className="mt-3 text-4xl font-semibold text-ink sm:text-6xl">设置</h1>
          <p className="mt-3 text-sm leading-6 text-muted">这些信息不用每天改，设置好之后首页会直接帮你计算剩余热量和预算。</p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat title="基础代谢 BMR" value={`${metrics.bmr} kcal`} />
        <Stat title="每日总消耗 TDEE" value={`${metrics.tdee} kcal`} />
        <Stat title="建议每日摄入" value={`${metrics.suggestedIntake} kcal`} />
      </section>

      <section className="mt-4 rounded-[22px] border border-white/70 bg-paper p-5 shadow-soft backdrop-blur-xl">
        <h2 className="mb-4 text-xl font-semibold text-ink">身体数据和热量目标</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="性别" value={body.gender} options={["女", "男"]} onChange={(value) => setBody({ ...body, gender: value as BodyData["gender"] })} />
          <Field label="年龄" value={body.age} onChange={(value) => setBody({ ...body, age: Number(value) })} />
          <Field label="身高 cm" value={body.height} onChange={(value) => setBody({ ...body, height: Number(value) })} />
          <Field label="当前体重 kg" value={body.currentWeight} onChange={(value) => setBody({ ...body, currentWeight: Number(value) })} />
          <Field label="目标体重 kg" value={body.targetWeight} onChange={(value) => setBody({ ...body, targetWeight: Number(value) })} />
          <Select label="活动水平" value={body.activity} options={Object.keys(activityFactors)} onChange={(value) => setBody({ ...body, activity: value as Activity })} />
          <Select label="目标" value={body.goal} options={["维持体重", "减重", "增重"]} onChange={(value) => setBody({ ...body, goal: value as Goal })} />
          <Field label="期望每日热量缺口 kcal" value={body.targetDeficit} onChange={(value) => setBody({ ...body, targetDeficit: Number(value) })} />
        </div>
      </section>

      <section className="mt-4 rounded-[22px] border border-white/70 bg-paper p-5 shadow-soft backdrop-blur-xl">
        <h2 className="mb-4 text-xl font-semibold text-ink">吃喝预算</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
          <Field label="本月吃喝预算 ¥" value={body.monthlyBudget} step="1" onChange={(value) => setBody({ ...body, monthlyBudget: Number(value) })} />
          <Stat title="平均每天可花" value={money(dailyBudget)} />
          <Stat title="当前月预算" value={money(body.monthlyBudget)} />
        </div>
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/70 bg-paper p-5 shadow-soft backdrop-blur-xl">
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
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
  value: number;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm text-muted">{label}</span>
      <input
        className="h-12 w-full rounded-2xl border border-transparent bg-[#f2f2f7] px-4 text-ink outline-none transition focus:border-apple/40 focus:bg-white focus:ring-4 focus:ring-apple/10"
        type="number"
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

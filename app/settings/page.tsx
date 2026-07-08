"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import AuthGate from "../components/AuthGate";

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

function loadBody(userId: string) {
  if (typeof window === "undefined") return defaultBody;
  const raw = window.localStorage.getItem(`eatcost.${userId}.body`) || window.localStorage.getItem("eatcost.body");
  if (!raw) return defaultBody;
  try {
    return { ...defaultBody, ...JSON.parse(raw) } as BodyData;
  } catch {
    return defaultBody;
  }
}

function saveBody(userId: string, body: BodyData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`eatcost.${userId}.body`, JSON.stringify(body));
}

function loadUserValue<T>(userId: string, key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(`eatcost.${userId}.${key}`) || window.localStorage.getItem(`eatcost.${key}`);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveUserValue<T>(userId: string, key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`eatcost.${userId}.${key}`, JSON.stringify(value));
}

function removeUserValue(userId: string, key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`eatcost.${userId}.${key}`);
}

function money(value: number) {
  return `¥${value.toFixed(2)}`;
}

function round(value: number) {
  return Math.round(Number.isFinite(value) ? value : 0);
}

export default function SettingsPage() {
  return <AuthGate>{(user) => <SettingsApp userId={user.id} />}</AuthGate>;
}

function SettingsApp({ userId }: { userId: string }) {
  const [ready, setReady] = useState(false);
  const [body, setBody] = useState(defaultBody);

  useEffect(() => {
    setBody(loadBody(userId));
    setReady(true);
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    saveBody(userId, body);
  }, [body, ready, userId]);

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

  function exportJson() {
    const data = {
      exportedAt: new Date().toISOString(),
      body: loadUserValue(userId, "body", defaultBody),
      foods: loadUserValue(userId, "foods", []),
      exercises: loadUserValue(userId, "exercises", []),
      templates: loadUserValue(userId, "templates", [])
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eatcost-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.body) {
        const nextBody = { ...defaultBody, ...data.body };
        saveUserValue(userId, "body", nextBody);
        setBody(nextBody);
      }
      if (Array.isArray(data.foods)) saveUserValue(userId, "foods", data.foods);
      if (Array.isArray(data.exercises)) saveUserValue(userId, "exercises", data.exercises);
      if (Array.isArray(data.templates)) saveUserValue(userId, "templates", data.templates);
      window.alert("导入成功，回到首页就能看到数据。");
    } catch {
      window.alert("这个 JSON 文件读不了，请确认是 Eatcost 导出的备份。");
    }
  }

  function clearAllData() {
    const first = window.confirm("确定要清空 Eatcost 的所有本地数据吗？这会删除吃喝记录、运动记录和常吃模板。");
    if (!first) return;
    const second = window.confirm("再确认一次：清空后无法恢复，除非你已经导出过 JSON 备份。确定清空吗？");
    if (!second) return;
    ["body", "foods", "exercises", "templates"].forEach((key) => removeUserValue(userId, key));
    setBody(defaultBody);
    window.alert("已经清空。");
  }

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

      <section className="wave-hover mt-4 rounded-[22px] border border-white/70 bg-paper p-5 shadow-soft backdrop-blur-xl">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-apple">Backup</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">数据备份与迁移</h2>
          </div>
          <p className="text-sm leading-6 text-muted">换手机、重装、清空前，先从这里备份。</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <DataToolCard
            title="导出备份"
            note="把身体数据、吃喝记录、运动记录和常吃模板保存成一个 JSON 文件。"
            action="下载 JSON"
            onClick={exportJson}
          />
          <label className="wave-hover cursor-pointer rounded-[22px] bg-[#f2f2f7] p-4 transition hover:-translate-y-0.5 hover:bg-white">
            <span className="block text-lg font-semibold text-ink">导入备份</span>
            <span className="mt-2 block text-sm leading-6 text-muted">选择之前导出的 JSON 文件，恢复到当前账号的本地数据里。</span>
            <span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-apple shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              选择 JSON
            </span>
            <input className="hidden" type="file" accept="application/json,.json" onChange={importJson} />
          </label>
          <DataToolCard
            title="清空数据"
            note="删除当前账号在这台设备上的 Eatcost 数据。操作前会二次确认。"
            action="清空所有数据"
            danger
            onClick={clearAllData}
          />
        </div>
      </section>
    </main>
  );
}

function DataToolCard({
  title,
  note,
  action,
  danger = false,
  onClick
}: {
  title: string;
  note: string;
  action: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="wave-hover rounded-[22px] bg-[#f2f2f7] p-4 transition hover:-translate-y-0.5 hover:bg-white">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{note}</p>
      <button
        className={`mt-4 rounded-full px-4 py-2 text-sm font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${
          danger ? "bg-[#fff1f0] text-tomato" : "bg-white text-apple"
        }`}
        type="button"
        onClick={onClick}
      >
        {action}
      </button>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="wave-hover rounded-[22px] border border-white/70 bg-paper p-5 shadow-soft backdrop-blur-xl">
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

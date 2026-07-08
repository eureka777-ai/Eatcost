"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "../lib/supabase";

type AuthGateProps = {
  children: (user: User) => ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      setReady(true);
    }, 6000);

    supabase.auth.getSession().then(({ data }) => {
      if (window.location.hash.includes("type=recovery")) {
        setRecoveryMode(true);
      }
      setUser(data.session?.user ?? null);
      setReady(true);
      window.clearTimeout(fallbackTimer);
    }).catch(() => {
      setReady(true);
      window.clearTimeout(fallbackTimer);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
      if (event === "SIGNED_OUT") {
        setRecoveryMode(false);
      }
      setUser(session?.user ?? null);
    });

    return () => {
      window.clearTimeout(fallbackTimer);
      data.subscription.unsubscribe();
    };
  }, []);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage("");

    const authCall =
      mode === "login"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await authCall;
    if (error) {
      setMessage(toFriendlyAuthError(error.message));
    } else if (mode === "signup") {
      setMessage("注册成功。如果 Supabase 要求邮箱验证，请先去邮箱点确认链接。");
    }

    setLoading(false);
  }

  async function sendResetEmail(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`
    });

    setMessage(error ? toFriendlyAuthError(error.message) : "重置密码邮件已发送，请去邮箱里点链接。");
    setLoading(false);
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(toFriendlyAuthError(error.message));
    } else {
      setRecoveryMode(false);
      setNewPassword("");
      setMessage("密码已更新。");
    }

    setLoading(false);
  }

  if (!ready) {
    return <AuthShell title="Eatcost" subtitle="正在进入你的记录..." />;
  }

  if (!hasSupabaseConfig || !supabase) {
    return (
      <AuthShell title="还差一步配置" subtitle="登录功能已经接好，部署前需要在 Vercel 里加 Supabase 环境变量。">
        <div className="mt-6 rounded-[22px] bg-[#f2f2f7] p-4 text-sm leading-7 text-muted">
          <p className="font-semibold text-ink">需要添加：</p>
          <p>NEXT_PUBLIC_SUPABASE_URL</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
        </div>
      </AuthShell>
    );
  }

  if (recoveryMode) {
    return (
      <AuthShell title="重设密码" subtitle="输入一个新密码，之后就可以继续使用 Eatcost。">
        <form className="mt-6 grid gap-3" onSubmit={updatePassword}>
          <label>
            <span className="mb-1 block text-sm text-muted">新密码</span>
            <input
              className="h-12 w-full rounded-2xl border border-transparent bg-[#f2f2f7] px-4 text-ink outline-none transition focus:border-apple/40 focus:bg-white focus:ring-4 focus:ring-apple/10"
              type="password"
              minLength={6}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          {message && <p className="rounded-2xl bg-[#f2f2f7] p-3 text-sm leading-6 text-muted">{message}</p>}
          <button className="rounded-2xl bg-apple px-4 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(0,122,255,0.24)]" disabled={loading}>
            {loading ? "保存中..." : "保存新密码"}
          </button>
        </form>
      </AuthShell>
    );
  }

  if (!user) {
    return (
      <AuthShell title="Eatcost" subtitle="登录后开始记录你的每餐价格和热量。">
        <form className="mt-6 grid gap-3" onSubmit={mode === "forgot" ? sendResetEmail : handleAuth}>
          <label>
            <span className="mb-1 block text-sm text-muted">邮箱</span>
            <input
              className="h-12 w-full rounded-2xl border border-transparent bg-[#f2f2f7] px-4 text-ink outline-none transition focus:border-apple/40 focus:bg-white focus:ring-4 focus:ring-apple/10"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {mode !== "forgot" && (
            <label>
              <span className="mb-1 block text-sm text-muted">密码</span>
              <input
                className="h-12 w-full rounded-2xl border border-transparent bg-[#f2f2f7] px-4 text-ink outline-none transition focus:border-apple/40 focus:bg-white focus:ring-4 focus:ring-apple/10"
                type="password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
          )}
          {message && <p className="rounded-2xl bg-[#f2f2f7] p-3 text-sm leading-6 text-muted">{message}</p>}
          <button className="rounded-2xl bg-apple px-4 py-3 font-semibold text-white shadow-[0_10px_24px_rgba(0,122,255,0.24)]" disabled={loading}>
            {loading ? "处理中..." : mode === "login" ? "登录" : mode === "signup" ? "注册" : "发送重置邮件"}
          </button>
          {mode === "login" && (
            <button
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-muted"
              type="button"
              onClick={() => {
                setMode("forgot");
                setMessage("");
              }}
            >
              忘记密码？
            </button>
          )}
          <button
            className="rounded-2xl bg-[#f2f2f7] px-4 py-3 text-sm font-semibold text-apple"
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
          >
            {mode === "login" ? "没有账号？去注册" : "已有账号？去登录"}
          </button>
        </form>
      </AuthShell>
    );
  }

  return <>{children(user)}</>;
}

function AuthShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <section className="rounded-[28px] border border-white/70 bg-paper p-6 shadow-soft backdrop-blur-xl">
        <p className="text-sm font-semibold text-apple">Eatcost</p>
        <h1 className="mt-2 text-4xl font-semibold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}

function toFriendlyAuthError(message: string) {
  if (message.includes("Invalid login credentials")) return "邮箱或密码不对。";
  if (message.includes("Email not confirmed")) return "邮箱还没有验证，请先去邮箱点确认链接。";
  if (message.includes("rate limit")) return "邮件发送太频繁了，请稍后再试。";
  if (message.includes("Password")) return "密码至少需要 6 位。";
  return message || "登录失败，请稍后再试。";
}

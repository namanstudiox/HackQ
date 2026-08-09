"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import AuthShell from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import PasswordToggle from "@/components/auth/PasswordToggle";
import { sendPasswordReset, signIn } from "@/lib/room-config";
import { validateLogin, type LoginErrors, type LoginValues } from "@/components/auth/validate";

const EMPTY: LoginValues = { email: "", password: "" };

const MailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[18px] w-[18px]"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[18px] w-[18px]"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/**
 * Self-contained "Remember me" checkbox: holds its own state so toggling it
 * re-renders only this tiny element — not the whole form.
 */
function RememberMe() {
  const [checked, setChecked] = useState(false);

  return (
    <label className="group flex cursor-pointer select-none items-center gap-2.5 text-sm text-neutral-300">
      <span className="relative flex h-[18px] w-[18px] items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[5px] border border-white/25 bg-white/10 transition-colors duration-150 hover:border-white/40 focus-visible:ring-2 focus-visible:ring-matte/50 checked:border-matte checked:bg-matte"
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 text-black opacity-0 transition-opacity duration-100 peer-checked:opacity-100"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      Remember me
    </label>
  );
}

export default function LoginForm({
  verificationFailed = false,
}: {
  /** /auth/callback bounced us here — a verification/recovery link failed. */
  verificationFailed?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<LoginValues>(EMPTY);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Server-rendered via the page's searchParams — identical HTML on both sides.
  const [serverError, setServerError] = useState<string | null>(
    verificationFailed
      ? "We couldn't verify that link — it may have expired. Try signing in again."
      : null
  );
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);
  const [forgotBusy, setForgotBusy] = useState(false);

  const set =
    (key: keyof LoginValues) =>
    (value: string) => {
      setValues((v) => ({ ...v, [key]: value }));
      if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    };

  const handleBlur =
    (key: keyof LoginValues) =>
    () => {
      const errs = validateLogin(values);
      if (errs[key]) setErrors((e) => ({ ...e, [key]: errs[key] }));
    };

  // Real sign-in against Supabase (email confirmation is enforced server-side,
  // so unverified accounts get a clear message here).
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validateLogin(values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    const res = await signIn(values.email, values.password);
    setSubmitting(false);
    if (!res.ok) {
      setServerError(res.error ?? "Couldn't sign you in — try again.");
      return;
    }
    // Honor invite deep links: /login?next=/room?code=HQ-…
    const next = new URLSearchParams(window.location.search).get("next") ?? "/room";
    router.push(next);
  };

  const handleForgot = async () => {
    if (!values.email.trim()) {
      setServerError("Enter your email first, then use forgot password.");
      setShowForgot(true);
      return;
    }
    setForgotBusy(true);
    const res = await sendPasswordReset(values.email.trim());
    setForgotBusy(false);
    if (res.ok) {
      setForgotMsg(`Password reset link sent to ${values.email.trim()}.`);
    } else {
      setServerError(res.error ?? "Couldn't send the reset link.");
    }
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back — sign in to continue to HackQ."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-white transition hover:text-matte"
          >
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <AuthField
          id="email"
          label="Email address"
          type="email"
          value={values.email}
          onChange={set("email")}
          onBlur={handleBlur("email")}
          error={errors.email}
          autoComplete="email"
          placeholder="Enter your email"
          leftIcon={<MailIcon />}
        />
        <AuthField
          id="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          value={values.password}
          onChange={set("password")}
          onBlur={handleBlur("password")}
          error={errors.password}
          autoComplete="current-password"
          placeholder="Enter your password"
          leftIcon={<LockIcon />}
          rightSlot={
            <PasswordToggle show={showPassword} onClick={() => setShowPassword((s) => !s)} />
          }
        />
        <div className="flex items-center justify-between gap-4">
          <RememberMe />
          <button
            type="button"
            onClick={() => setShowForgot((s) => !s)}
            className="text-sm text-neutral-400 transition hover:text-white"
          >
            Forgot password?
          </button>
        </div>
        {showForgot && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-wrap items-center gap-2 text-xs leading-relaxed text-neutral-500"
          >
            <span>We&apos;ll email you a reset link.</span>
            <button
              type="button"
              onClick={handleForgot}
              disabled={forgotBusy}
              className="font-semibold text-white transition hover:text-matte disabled:opacity-60"
            >
              {forgotBusy ? "Sending…" : "Send link"}
            </button>
          </motion.p>
        )}
        {forgotMsg && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="text-xs leading-relaxed text-emerald-400/90"
          >
            {forgotMsg}
          </motion.p>
        )}
        {serverError && (
          <p role="alert" className="text-xs font-medium text-red-400">
            {serverError}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-matte text-[15px] font-semibold text-black shadow-[inset_0_-1px_0_rgba(0,0,0,0.2),0_10px_24px_-12px_rgba(166,200,58,0.6)] transition-all duration-200 hover:brightness-110 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-xs leading-relaxed text-neutral-500">
          By continuing, you agree to HackQ&apos;s Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}

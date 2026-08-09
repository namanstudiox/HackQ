"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import PasswordToggle from "@/components/auth/PasswordToggle";
import PasswordStrength from "@/components/auth/PasswordStrength";
import { signUp } from "@/lib/room-config";
import { validateSignup, type SignupErrors, type SignupValues } from "@/components/auth/validate";

const EMPTY: SignupValues = { name: "", email: "", password: "" };

const UserIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-[18px] w-[18px]"
  >
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
);

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

export default function SignupForm() {
  const router = useRouter();
  const [values, setValues] = useState<SignupValues>(EMPTY);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const set =
    (key: keyof SignupValues) =>
    (value: string) => {
      setValues((v) => ({ ...v, [key]: value }));
      if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    };

  const handleBlur =
    (key: keyof SignupValues) =>
    () => {
      const errs = validateSignup(values);
      if (errs[key]) setErrors((e) => ({ ...e, [key]: errs[key] }));
    };

  // Real signup: Supabase creates the account and emails a verification link.
  // The account can't sign in until the link is clicked — that's the flow.
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validateSignup(values);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    const res = await signUp(values.name, values.email, values.password);
    setSubmitting(false);
    if (!res.ok) {
      setServerError(res.error ?? "Something went wrong — try again.");
      return;
    }
    if (res.confirmation) {
      setSent(true);
      return;
    }
    router.push("/room");
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="One more step before you're in."
        footer={
          <>
            Already verified?{" "}
            <Link
              href="/login"
              className="font-semibold text-white transition hover:text-matte"
            >
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-white/80"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            We sent a verification link to{" "}
            <span className="font-medium text-white">{values.email}</span>. Click it to
            activate your account — then sign in and you&apos;re in.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
            no link? check spam / promotions
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Sign up"
      subtitle="Start building with HackQ. Free for hackathons — no card required."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-white transition hover:text-matte"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <AuthField
          id="name"
          label="Display name"
          value={values.name}
          onChange={set("name")}
          onBlur={handleBlur("name")}
          error={errors.name}
          autoComplete="name"
          placeholder="Enter your name"
          leftIcon={<UserIcon />}
        />
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
          autoComplete="new-password"
          placeholder="Enter your password"
          hint="Use 8+ characters with an uppercase letter, number, and symbol."
          leftIcon={<LockIcon />}
          rightSlot={
            <PasswordToggle show={showPassword} onClick={() => setShowPassword((s) => !s)} />
          }
        />
        <PasswordStrength password={values.password} />
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
          {submitting ? "Creating account…" : "Sign up"}
        </button>
        <p className="text-center text-xs leading-relaxed text-neutral-500">
          By creating an account, you agree to HackQ&apos;s Terms of Service and Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}

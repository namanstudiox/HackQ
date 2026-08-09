import { cn } from "@/lib/utils";

const LEVELS = [
  { label: "weak", min: 1 },
  { label: "okay", min: 2 },
  { label: "good", min: 3 },
  { label: "strong", min: 4 },
] as const;

function passwordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

export default function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const score = passwordScore(password);
  const level = LEVELS[Math.max(0, score - 1)];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1" aria-hidden>
        {LEVELS.map((lvl, i) => (
          <span
            key={lvl.label}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-300",
              i < score ? "bg-matte" : "bg-white/10"
            )}
          />
        ))}
      </div>
      <p aria-live="polite" className="text-[11px] text-neutral-500">
        {level.label} password
      </p>
    </div>
  );
}

// Okrągła plakietka persony z inicjałami. Reuse w pasku AI, nagłówku czatu i pickerze.

import { cn } from "@/lib/utils";
import { getTherapist } from "@/lib/therapists";

const SIZES = {
  sm: "h-7 w-7 rounded-lg text-[11px]",
  md: "h-9 w-9 rounded-xl text-xs",
  lg: "h-11 w-11 rounded-2xl text-sm",
} as const;

export function TherapistAvatar({
  therapistId,
  size = "md",
  className,
}: {
  therapistId: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const therapist = getTherapist(therapistId);
  if (!therapist) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center font-serif font-semibold shadow-sm",
        therapist.avatarBg,
        SIZES[size],
        className,
      )}
    >
      {therapist.initials}
    </span>
  );
}

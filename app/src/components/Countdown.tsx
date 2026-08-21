import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatCountdown } from "../lib/domain";

export function useCountdownText(closeAt: string | undefined | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return closeAt ? formatCountdown(closeAt, now) : "";
}

export function CountdownChip({ closeAt }: { closeAt: string | undefined | null }) {
  const text = useCountdownText(closeAt);
  if (!closeAt) return null;
  return (
    <div className="inline-flex items-center whitespace-nowrap border border-border-strong rounded-full px-3.5 py-1.5 text-[13px] text-muted">
      <Clock size={14} className="mr-1.5 flex-shrink-0" />
      Window closes in<span className="ml-1">{text}</span>
    </div>
  );
}

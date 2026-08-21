import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X } from "lucide-react";

export function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`bg-surface border border-border rounded-[14px] p-4 ${onClick ? "cursor-pointer hover:border-border-hover transition-colors" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-[9px] border-none bg-accent text-on-accent font-semibold text-sm px-5 py-2.5 cursor-pointer hover:bg-accent-hover transition-colors disabled:opacity-45 disabled:cursor-not-allowed font-sans ${className}`}
    />
  );
}

export function GhostButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg border border-border-strong bg-transparent text-text font-medium text-[13.5px] px-4 py-2 cursor-pointer hover:bg-surface-2 transition-colors disabled:opacity-45 disabled:cursor-not-allowed font-sans ${className}`}
    />
  );
}

export function IconButton({ className = "", children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-[30px] h-[30px] flex items-center justify-center rounded-lg border-none bg-transparent text-faint cursor-pointer hover:bg-surface-2 hover:text-text transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`w-full bg-input border border-border rounded-[9px] px-3 py-2.5 text-text text-sm font-sans focus:outline-none focus:border-accent ${className}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full bg-input border border-border rounded-[9px] px-3 py-2.5 text-text text-sm font-sans resize-y focus:outline-none focus:border-accent ${className}`}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs text-muted mb-1.5">{children}</label>;
}

export function Tag({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "neutral" }) {
  return (
    <span
      className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${
        tone === "accent" ? "bg-tag-accent text-accent-light" : "bg-tag-neutral text-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ pct, ticks, thick = false }: { pct: number; ticks?: { pct: number }[]; thick?: boolean }) {
  return (
    <div className={`relative ${thick ? "h-1.5" : "h-[5px]"} rounded-full bg-surface-2 overflow-hidden`}>
      <div className="absolute inset-y-0 left-0 bg-accent rounded-full transition-[width]" style={{ width: `${pct}%` }} />
      {ticks?.map((t, i) => (
        <div key={i} className="absolute top-0 h-full w-px bg-white/25" style={{ left: `${t.pct}%` }} />
      ))}
    </div>
  );
}

export function StatCard({ icon, label, value, dark = false }: { icon: ReactNode; label: string; value: string; dark?: boolean }) {
  return (
    <div className={`${dark ? "bg-input" : "bg-surface"} border border-border rounded-xl p-4`}>
      <div className="flex items-center gap-1.5 text-muted text-[11.5px] uppercase tracking-wide mb-2">
        {icon}
        {label}
      </div>
      <div className="font-bold text-2xl">{value}</div>
    </div>
  );
}

export function Modal({ onClose, children, maxWidth = 440 }: { onClose: () => void; children: ReactNode; maxWidth?: number }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-overlay flex items-center justify-center p-6 z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-modal border border-border-strong rounded-2xl p-7 w-full"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ kicker, title, onClose }: { kicker: string; title: string; onClose: () => void }) {
  return (
    <div className="flex justify-between items-start gap-3 mb-1">
      <div>
        <div className="text-[11px] text-faint uppercase tracking-wide mb-1">{kicker}</div>
        <h3 className="m-0 text-[19px] font-semibold leading-tight">{title}</h3>
      </div>
      <IconButton onClick={onClose} aria-label="Close" className="flex-shrink-0">
        <X size={16} />
      </IconButton>
    </div>
  );
}

export function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      className={`flex-shrink-0 w-[42px] h-6 rounded-full border-none cursor-pointer relative transition-colors ${on ? "bg-accent" : "bg-surface-2"}`}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-knob transition-[left]"
        style={{ left: on ? 20 : 2 }}
      />
    </button>
  );
}

export function PageKicker({ children }: { children: ReactNode }) {
  return <div className="text-accent-light text-xs font-semibold tracking-wider uppercase mb-1.5">{children}</div>;
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-faint text-[13.5px] m-0">{children}</p>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="text-error text-[13px] m-0">{children}</p>;
}

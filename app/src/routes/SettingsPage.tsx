import { useAuth } from "../lib/AuthContext";
import { useSettings, useToggleSetting } from "../hooks/useSettings";
import { PageKicker, Toggle } from "../components/ui";

const TOGGLES = [
  {
    key: "email_on_unlock" as const,
    label: "Email me when a tier unlocks",
    description: "Get notified the moment your pool crosses a volume threshold.",
  },
  {
    key: "reminder_before_close" as const,
    label: "Remind me before the window closes",
    description: "A heads-up 24 hours before pledges lock in.",
  },
  {
    key: "ai_suggestions" as const,
    label: "Show AI pledge suggestions",
    description: "Keep the AI suggestion box on the Buyer Dashboard.",
  },
];

export default function SettingsPage() {
  const { buyerProfile } = useAuth();
  const { data: settings } = useSettings(buyerProfile?.id);
  const toggle = useToggleSetting(buyerProfile?.id ?? "");

  if (!buyerProfile || !settings) return null;

  return (
    <div className="max-w-[640px] mx-auto px-6 pt-8 pb-14 w-full">
      <PageKicker>Settings</PageKicker>
      <h2 className="text-[26px] font-bold m-0 mb-6 tracking-tight">Notification preferences</h2>
      <div className="bg-surface border border-border rounded-2xl">
        {TOGGLES.map((t, i) => (
          <div
            key={t.key}
            className={`flex justify-between items-center gap-4 px-5 py-4.5 ${
              i < TOGGLES.length - 1 ? "border-b border-divider" : ""
            }`}
          >
            <div>
              <div className="text-sm font-medium mb-0.5">{t.label}</div>
              <div className="text-[12.5px] text-muted">{t.description}</div>
            </div>
            <Toggle
              on={settings[t.key]}
              label={t.label}
              onToggle={() => toggle.mutate({ key: t.key, value: !settings[t.key] })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

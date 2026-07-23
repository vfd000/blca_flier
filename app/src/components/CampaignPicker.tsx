import type { Campaign } from "../lib/types";

interface Props {
  campaigns: Campaign[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

export function CampaignPicker({ campaigns, selectedId, onChange }: Props) {
  if (campaigns.length === 0) return null;
  return (
    <select
      className="campaign-picker"
      value={selectedId ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label="Campaign"
    >
      <option value="">No campaign (zones only)</option>
      {campaigns.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.active ? "" : " (inactive)"}
        </option>
      ))}
    </select>
  );
}

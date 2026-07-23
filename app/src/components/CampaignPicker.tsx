import type { Campaign } from "../lib/types";

interface Props {
  campaigns: Campaign[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function CampaignPicker({ campaigns, selectedId, onChange }: Props) {
  if (campaigns.length === 0) return null;
  return (
    <select
      className="campaign-picker"
      value={selectedId ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Campaign"
    >
      {campaigns.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.active ? "" : " (inactive)"}
        </option>
      ))}
    </select>
  );
}

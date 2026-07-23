import { STATUS_COLORS, STATUS_LABELS, type DeliveryStatusValue } from "../lib/types";

const ORDER: DeliveryStatusValue[] = ["not_started", "no_answer", "delivered", "skipped"];

export function StatusLegend() {
  return (
    <div className="status-legend">
      {ORDER.map((status) => (
        <span key={status} className="status-legend-item">
          <span className="status-dot" style={{ background: STATUS_COLORS[status] }} />
          {STATUS_LABELS[status]}
        </span>
      ))}
    </div>
  );
}

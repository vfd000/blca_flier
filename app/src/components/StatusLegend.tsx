import { STATUS_COLORS, STATUS_LABELS, type DeliveryStatusValue } from "../lib/types";

const ORDER: DeliveryStatusValue[] = ["not_started", "no_answer", "delivered", "skipped"];

export function StatusLegend() {
  return (
    <div className="status-legend">
      <p className="hint">Fill color = zone. Ring = delivery status:</p>
      {ORDER.map((status) => (
        <span key={status} className="status-legend-item">
          <span
            className="status-dot"
            style={{
              borderColor: STATUS_COLORS[status],
              borderWidth: status === "delivered" ? 3 : 2,
            }}
          >
            {status === "delivered" && <span className="status-dot-check">&#10003;</span>}
          </span>
          {STATUS_LABELS[status]}
        </span>
      ))}
    </div>
  );
}

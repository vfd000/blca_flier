import { STATUS_LABELS, type DeliveryStatusValue, type House, type Zone } from "../lib/types";

const ORDER: DeliveryStatusValue[] = ["not_started", "no_answer", "delivered", "skipped"];

interface Props {
  house: House;
  zone: Zone | null;
  status: DeliveryStatusValue;
  canEdit: boolean;
  onSetStatus: (status: DeliveryStatusValue) => void;
  onClose: () => void;
}

export function HousePanel({ house, zone, status, canEdit, onSetStatus, onClose }: Props) {
  return (
    <div className="house-panel">
      <button className="house-panel-close" onClick={onClose} aria-label="Close">
        &times;
      </button>
      <h3>{house.address}</h3>
      <p className="house-panel-zone">
        Zone: <strong>{zone ? `${zone.number}${zone.name ? ` (${zone.name})` : ""}` : "None"}</strong>
      </p>
      <p className="house-panel-status">
        Status: <strong>{STATUS_LABELS[status]}</strong>
      </p>
      {canEdit ? (
        <div className="house-panel-actions">
          {ORDER.map((s) => (
            <button
              key={s}
              className={`btn status-btn status-btn-${s}`}
              disabled={s === status}
              onClick={() => onSetStatus(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      ) : (
        <p className="house-panel-readonly">
          {house.notes ? house.notes : "Sign in as the assigned volunteer to update this house."}
        </p>
      )}
    </div>
  );
}

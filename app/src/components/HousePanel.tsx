import { STATUS_LABELS, type DeliveryStatusValue, type House, type Profile, type Zone } from "../lib/types";
import { NotesEditor } from "./NotesEditor";

const ORDER: DeliveryStatusValue[] = ["not_started", "no_answer", "delivered", "skipped"];

interface DirectAssignment {
  volunteerId: string;
  label: string;
}

interface ZoneAssignmentInfo {
  label: string;
}

interface Props {
  house: House;
  zone: Zone | null;
  status: DeliveryStatusValue;
  notes: string | null;
  canEdit: boolean;
  onSetStatus: (status: DeliveryStatusValue) => void;
  onSaveNotes: (notes: string | null) => void;
  onClose: () => void;
  isAdmin: boolean;
  campaignId: string | null;
  zones: Zone[];
  profiles: Profile[];
  directAssignment: DirectAssignment | null;
  zoneAssignment: ZoneAssignmentInfo | null;
  onChangeZone: (zoneId: number | null) => void;
  onAssignVolunteer: (volunteerId: string | null) => void;
}

export function HousePanel({
  house,
  zone,
  status,
  notes,
  canEdit,
  onSetStatus,
  onSaveNotes,
  onClose,
  isAdmin,
  campaignId,
  zones,
  profiles,
  directAssignment,
  zoneAssignment,
  onChangeZone,
  onAssignVolunteer,
}: Props) {
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
      {notes && !canEdit && <p className="house-panel-notes">📝 {notes}</p>}
      {canEdit ? (
        <>
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
          <NotesEditor notes={notes} onSaveNotes={onSaveNotes} onSetStatus={onSetStatus} />
        </>
      ) : (
        !notes && <p className="house-panel-readonly">Sign in as the assigned volunteer to update this house.</p>
      )}
      {isAdmin && (
        <div className="house-panel-admin">
          <label className="house-panel-field">
            Zone
            <select
              value={house.zone_id ?? ""}
              onChange={(e) => onChangeZone(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">None</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  Zone {z.number} {z.name ? `(${z.name})` : ""}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">Zones are shared across all campaigns.</p>

          {campaignId ? (
            <>
              <label className="house-panel-field">
                Assigned volunteer (this campaign)
                <select
                  value={directAssignment?.volunteerId ?? ""}
                  onChange={(e) => onAssignVolunteer(e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name ?? p.email}
                    </option>
                  ))}
                </select>
              </label>
              {zoneAssignment && (
                <p className="hint">Also covered via its zone, assigned to {zoneAssignment.label} for this campaign.</p>
              )}
            </>
          ) : (
            <p className="hint">Pick a campaign above to assign a volunteer to this house.</p>
          )}
        </div>
      )}
    </div>
  );
}

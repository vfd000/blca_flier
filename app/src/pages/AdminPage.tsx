import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useAssignments } from "../hooks/useAssignments";
import { useCampaigns } from "../hooks/useCampaigns";
import { defaultZoneColorHex } from "../lib/colors";
import type { Invitation, Profile, Role } from "../lib/types";

export function AdminPage({ campaignId }: { campaignId: string | null }) {
  return (
    <div className="admin-page">
      <ZonesSection />
      <AssignmentsSection campaignId={campaignId} />
      <PeopleSection />
      <InvitationsSection />
      <CampaignsSection />
    </div>
  );
}

function PeopleSection() {
  const { profile: myProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    supabase
      .from("profiles")
      .select("*")
      .order("display_name")
      .then(({ data }) => setProfiles(data ?? []));
  };

  useEffect(refresh, []);

  const handleRoleChange = async (id: string, role: Role) => {
    setError(null);
    const { error: updateError } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (updateError) setError(updateError.message);
    else refresh();
  };

  return (
    <section className="admin-section">
      <h3>People</h3>
      <p className="hint">
        Anyone who signs in without an invite starts as a volunteer -- promote someone to admin
        here at any time. (Your own row is locked to avoid accidentally demoting yourself.)
      </p>
      {error && <p className="error">{error}</p>}
      <ul className="admin-list">
        {profiles.map((p) => (
          <li key={p.id}>
            {p.display_name ?? p.email}
            {p.id === myProfile?.id && " (you)"}
            <select
              value={p.role}
              disabled={p.id === myProfile?.id}
              onChange={(e) => handleRoleChange(p.id, e.target.value as Role)}
            >
              <option value="volunteer">Volunteer</option>
              <option value="admin">Admin</option>
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ZonesSection() {
  const { zones, houses, refresh } = useZonesAndHouses();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!number) return;
    const { error: insertError } = await supabase.from("zones").insert({ number: Number(number), name: name || null });
    if (insertError) setError(insertError.message);
    else {
      setNumber("");
      setName("");
      refresh();
    }
  };

  const handleDelete = async (id: number) => {
    const { error: deleteError } = await supabase.from("zones").delete().eq("id", id);
    if (deleteError) setError(deleteError.message);
    else refresh();
  };

  const handleColorChange = async (id: number, color: string | null) => {
    const { error: updateError } = await supabase.from("zones").update({ color }).eq("id", id);
    if (updateError) setError(updateError.message);
    else refresh();
  };

  const houseCountByZone = new Map<number, number>();
  for (const h of houses) {
    if (h.zone_id == null) continue;
    houseCountByZone.set(h.zone_id, (houseCountByZone.get(h.zone_id) ?? 0) + 1);
  }

  return (
    <section className="admin-section">
      <h3>Zones</h3>
      <p className="hint">
        Zones group houses for assignment (also drawable on the map's "Select &amp; assign" tool).
        They're durable across campaigns -- assign a volunteer to one below, campaign by campaign.
      </p>
      <form className="admin-form" onSubmit={handleCreate}>
        <input
          type="number"
          data-1p-ignore="true"
          data-lpignore="true"
          autoComplete="off"
          placeholder="Zone #"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
        />
        <input
          data-1p-ignore="true"
          data-lpignore="true"
          autoComplete="off"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Create zone
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="admin-list">
        {zones.map((z) => (
          <li key={z.id}>
            <input
              type="color"
              className="zone-color-input"
              value={z.color ?? defaultZoneColorHex(z.id)}
              onChange={(e) => handleColorChange(z.id, e.target.value)}
              title="Zone color"
            />
            Zone {z.number} {z.name ? `(${z.name})` : ""} -- {houseCountByZone.get(z.id) ?? 0} house
            {(houseCountByZone.get(z.id) ?? 0) === 1 ? "" : "s"}
            {z.color && (
              <button className="btn btn-link" onClick={() => handleColorChange(z.id, null)}>
                reset color
              </button>
            )}
            <button className="btn btn-link" onClick={() => handleDelete(z.id)}>
              delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AssignmentsSection({ campaignId }: { campaignId: string | null }) {
  const { zones, houses } = useZonesAndHouses();
  const { assignments, refresh } = useAssignments(campaignId);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [targetType, setTargetType] = useState<"zone" | "house">("zone");
  const [targetId, setTargetId] = useState<string>("");
  const [volunteerId, setVolunteerId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .order("display_name")
      .then(({ data }) => setProfiles(data ?? []));
  }, []);

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!campaignId || !targetId || !volunteerId) return;
    const { error: insertError } = await supabase.from("assignments").insert({
      campaign_id: campaignId,
      zone_id: targetType === "zone" ? Number(targetId) : null,
      house_id: targetType === "house" ? Number(targetId) : null,
      volunteer_id: volunteerId,
    });
    if (insertError) setError(insertError.message);
    else refresh();
  };

  const handleRemove = async (id: number) => {
    await supabase.from("assignments").delete().eq("id", id);
    refresh();
  };

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const houseById = new Map(houses.map((h) => [h.id, h]));

  const volunteerLabel = (id: string) => profileById.get(id)?.display_name ?? profileById.get(id)?.email ?? id;
  const zoneAssignee = (zoneId: number) => assignments.find((a) => a.zone_id === zoneId);
  const houseAssignee = (houseId: number) => assignments.find((a) => a.house_id === houseId);

  return (
    <section className="admin-section">
      <h3>Assignments</h3>
      {!campaignId && <p className="hint">Pick a campaign above first.</p>}
      {campaignId && (
        <>
          <form className="admin-form" onSubmit={handleAssign}>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value as "zone" | "house")}>
              <option value="zone">Whole zone</option>
              <option value="house">Single house</option>
            </select>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} required>
              <option value="" disabled>
                {targetType === "zone" ? "Choose a zone..." : "Choose a house..."}
              </option>
              {targetType === "zone"
                ? zones.map((z) => {
                    const existing = zoneAssignee(z.id);
                    return (
                      <option key={z.id} value={z.id}>
                        Zone {z.number} {z.name ? `(${z.name})` : ""}
                        {existing ? ` -- already assigned to ${volunteerLabel(existing.volunteer_id)}` : ""}
                      </option>
                    );
                  })
                : houses.map((h) => {
                    const existing = houseAssignee(h.id);
                    return (
                      <option key={h.id} value={h.id}>
                        {h.address}
                        {existing ? ` -- already assigned to ${volunteerLabel(existing.volunteer_id)}` : ""}
                      </option>
                    );
                  })}
            </select>
            <select value={volunteerId} onChange={(e) => setVolunteerId(e.target.value)} required>
              <option value="" disabled>
                Choose a volunteer...
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name ?? p.email}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit">
              Assign
            </button>
          </form>
          {error && <p className="error">{error}</p>}
          <ul className="admin-list">
            {assignments.map((a) => (
              <li key={a.id}>
                {a.zone_id != null
                  ? `Zone ${zoneById.get(a.zone_id)?.number ?? a.zone_id}`
                  : houseById.get(a.house_id ?? -1)?.address ?? "house"}
                {" -> "}
                {profileById.get(a.volunteer_id)?.display_name ?? profileById.get(a.volunteer_id)?.email ?? a.volunteer_id}
                <button className="btn btn-link" onClick={() => handleRemove(a.id)}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function InvitationsSection() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("volunteer");
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    supabase
      .from("invitations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setInvitations(data ?? []));
  };

  useEffect(refresh, []);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error: insertError } = await supabase.from("invitations").insert({ email, role });
    if (insertError) setError(insertError.message);
    else {
      setEmail("");
      refresh();
    }
  };

  const handleRemove = async (id: number) => {
    await supabase.from("invitations").delete().eq("id", id);
    refresh();
  };

  return (
    <section className="admin-section">
      <h3>Invitations</h3>
      <p className="hint">
        Adding an invite here doesn't send email yet -- share the site link with that person
        yourself; when they sign in with this exact Google account email, they get the role below.
      </p>
      <form className="admin-form" onSubmit={handleInvite}>
        <input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="volunteer">Volunteer</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn btn-primary" type="submit">
          Invite
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="admin-list">
        {invitations.map((inv) => (
          <li key={inv.id}>
            {inv.email} -- {inv.role}
            {inv.accepted_at ? " (accepted)" : " (pending)"}
            <button className="btn btn-link" onClick={() => handleRemove(inv.id)}>
              remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CampaignsSection() {
  const { campaigns, refresh } = useCampaigns();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error: insertError } = await supabase.from("campaigns").insert({ slug, name });
    if (insertError) setError(insertError.message);
    else {
      setSlug("");
      setName("");
      refresh();
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("campaigns").update({ active: !active }).eq("id", id);
    refresh();
  };

  return (
    <section className="admin-section">
      <h3>Campaigns</h3>
      <form className="admin-form" onSubmit={handleCreate}>
        <input placeholder="slug (e.g. bbq-aug-2027)" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="btn btn-primary" type="submit">
          Create
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="admin-list">
        {campaigns.map((c) => (
          <li key={c.id}>
            {c.name} {c.active ? "(active)" : "(inactive)"}
            <button className="btn btn-link" onClick={() => toggleActive(c.id, c.active)}>
              {c.active ? "deactivate" : "activate"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

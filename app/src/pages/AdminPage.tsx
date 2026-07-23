import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { useZonesAndHouses } from "../hooks/useZonesAndHouses";
import { useAssignments } from "../hooks/useAssignments";
import { useRoutes } from "../hooks/useRoutes";
import { useCampaigns } from "../hooks/useCampaigns";
import type { Invitation, Profile, Role } from "../lib/types";

export function AdminPage({ campaignId }: { campaignId: string | null }) {
  return (
    <div className="admin-page">
      <RoutesSection />
      <AssignmentsSection campaignId={campaignId} />
      <InvitationsSection />
      <CampaignsSection />
    </div>
  );
}

function RoutesSection() {
  const { houses } = useZonesAndHouses();
  const { routes, houseIdsByRoute, refresh } = useRoutes();
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!number) return;
    const { error: insertError } = await supabase.from("routes").insert({ number: Number(number), name: name || null });
    if (insertError) setError(insertError.message);
    else {
      setNumber("");
      setName("");
      refresh();
    }
  };

  const handleDelete = async (id: number) => {
    await supabase.from("routes").delete().eq("id", id);
    refresh();
  };

  return (
    <section className="admin-section">
      <h3>Routes</h3>
      <p className="hint">
        Routes are durable delivery groups (draw them on the map's "Select &amp; assign" tool). They
        persist across campaigns -- assign a volunteer to a route below, campaign by campaign.
      </p>
      <form className="admin-form" onSubmit={handleCreate}>
        <input type="number" placeholder="Route #" value={number} onChange={(e) => setNumber(e.target.value)} required />
        <input placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" type="submit">
          Create route
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="admin-list">
        {routes.map((r) => (
          <li key={r.id}>
            Route {r.number} {r.name ? `(${r.name})` : ""} -- {houseIdsByRoute.get(r.id)?.size ?? 0} house
            {(houseIdsByRoute.get(r.id)?.size ?? 0) === 1 ? "" : "s"}
            <button className="btn btn-link" onClick={() => handleDelete(r.id)}>
              delete
            </button>
          </li>
        ))}
        {routes.length === 0 && houses.length > 0 && <li className="hint">No routes yet.</li>}
      </ul>
    </section>
  );
}

function AssignmentsSection({ campaignId }: { campaignId: string | null }) {
  const { routes } = useRoutes();
  const { assignments, refresh } = useAssignments(campaignId);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [routeId, setRouteId] = useState<string>("");
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
    if (!campaignId || !routeId || !volunteerId) return;
    const { error: upsertError } = await supabase
      .from("assignments")
      .upsert(
        { campaign_id: campaignId, route_id: Number(routeId), volunteer_id: volunteerId },
        { onConflict: "campaign_id,route_id" }
      );
    if (upsertError) setError(upsertError.message);
    else refresh();
  };

  const handleRemove = async (id: number) => {
    await supabase.from("assignments").delete().eq("id", id);
    refresh();
  };

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const routeById = new Map(routes.map((r) => [r.id, r]));

  return (
    <section className="admin-section">
      <h3>Assignments</h3>
      {!campaignId && <p className="hint">Pick a campaign above first.</p>}
      {campaignId && (
        <>
          {routes.length === 0 && <p className="hint">No routes yet -- create one above first.</p>}
          <form className="admin-form" onSubmit={handleAssign}>
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)} required>
              <option value="" disabled>
                Choose a route...
              </option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  Route {r.number} {r.name ? `(${r.name})` : ""}
                </option>
              ))}
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
            {assignments.map((a) => {
              const route = routeById.get(a.route_id);
              return (
                <li key={a.id}>
                  Route {route?.number ?? a.route_id} {route?.name ? `(${route.name})` : ""}
                  {" -> "}
                  {profileById.get(a.volunteer_id)?.display_name ?? profileById.get(a.volunteer_id)?.email ?? a.volunteer_id}
                  <button className="btn btn-link" onClick={() => handleRemove(a.id)}>
                    remove
                  </button>
                </li>
              );
            })}
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

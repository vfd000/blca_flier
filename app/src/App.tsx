import { useEffect, useRef, useState } from "react";
import { HashRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useCampaigns } from "./hooks/useCampaigns";
import { CampaignPicker } from "./components/CampaignPicker";
import { SignInButton } from "./components/SignInButton";
import { MapPage } from "./pages/MapPage";
import { AdminPage } from "./pages/AdminPage";
import { MyHousesPage } from "./pages/MyHousesPage";

function Shell() {
  const { session, isAdmin } = useAuth();
  const { campaigns } = useCampaigns();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  // Distinguishes "not initialized yet" from "user explicitly chose no
  // campaign" -- both look like campaignId === null, but only the former
  // should get auto-filled with the active campaign.
  const userPickedCampaign = useRef(false);

  useEffect(() => {
    if (userPickedCampaign.current || campaignId || campaigns.length === 0) return;
    const active = campaigns.find((c) => c.active) ?? campaigns[0];
    setCampaignId(active.id);
  }, [campaigns, campaignId]);

  const handleCampaignChange = (id: string | null) => {
    userPickedCampaign.current = true;
    setCampaignId(id);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <nav>
          <Link to="/">Map</Link>
          {session && <Link to="/my-houses">My houses</Link>}
          {isAdmin && <Link to="/admin">Admin</Link>}
        </nav>
        <CampaignPicker campaigns={campaigns} selectedId={campaignId} onChange={handleCampaignChange} />
        <SignInButton />
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<MapPage campaignId={campaignId} />} />
          <Route path="/my-houses" element={<MyHousesPage campaignId={campaignId} />} />
          <Route
            path="/admin"
            element={isAdmin ? <AdminPage campaignId={campaignId} /> : <Navigate to="/" replace />}
          />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AuthProvider>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Properties from "./Properties";
import Tenants from "./Tenants";
import Leases from "./Leases";
import Payments from "./Payments";
import Reports from "./Reports";
import Defaulters from "./Defaulters";
import Login from "./Login";
import ViewerLayout from "./ViewerLayout";

const T = {
  dashboard: "\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645",
  properties: "\u0627\u0644\u0639\u0642\u0627\u0631\u0627\u062A",
  tenants: "\u0627\u0644\u0645\u0633\u062A\u0623\u062C\u0631\u0648\u0646",
  leases: "\u0627\u0644\u0639\u0642\u0648\u062F",
  payments: "\u0627\u0644\u062F\u0641\u0639\u0627\u062A",
  reports: "\u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631",
  defaulters: "\u0627\u0644\u0645\u062A\u0639\u062B\u0631\u0648\u0646",
  units: "\u0627\u0644\u0648\u062D\u062F\u0627\u062A",
  logout: "\u062E\u0631\u0648\u062C",
};

const NAV_ITEMS = [
  { key: "dashboard", label: T.dashboard, icon: "\uD83C\uDFE0" },
  { key: "properties", label: T.properties, icon: "\uD83C\uDFE2\uD83C\uDFE2\uD83C\uDFE2" },
  { key: "tenants", label: T.tenants, icon: "\uD83D\uDC64" },
  { key: "leases", label: T.leases, icon: "\uD83D\uDCC4" },
  { key: "payments", label: T.payments, icon: "\uD83D\uDCB0" },
  { key: "reports", label: T.reports, icon: "\uD83D\uDCCA" },
  { key: "defaulters", label: T.defaulters, icon: "\u26A0\uFE0F" },
];

export default function App() {
  const [role, setRole] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [stats, setStats] = useState({ properties: 0, units: 0, tenants: 0, leases: 0, payments: 0 });

  useEffect(() => {
    const savedRole = localStorage.getItem("role");
    if (savedRole === "admin") setRole("admin");
    if (window.location.pathname === "/view") setRole("viewer");
  }, []);

  useEffect(() => {
    if (role === "admin") fetchStats();
  }, [role, activePage]);

  async function fetchStats() {
    const [p, u, t, l, pay] = await Promise.all([
      supabase.from("properties").select("id", { count: "exact", head: true }),
      supabase.from("units").select("id", { count: "exact", head: true }),
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase.from("leases").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("id", { count: "exact", head: true }),
    ]);
    setStats({
      properties: p.count || 0,
      units: u.count || 0,
      tenants: t.count || 0,
      leases: l.count || 0,
      payments: pay.count || 0,
    });
  }

  function goBack() {
    setActivePage("dashboard");
    fetchStats();
  }

  function handleLogout() {
    localStorage.removeItem("role");
    setRole(null);
  }

  if (role === "viewer") return <ViewerLayout />;
  if (!role) return <Login onLogin={(r) => setRole(r)} />;

  const cardStyle = {
    background: "#fff", borderRadius: "12px", padding: "24px 20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center", flex: 1, cursor: "pointer"
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <div style={{ width: "220px", background: "#1B4D7A", display: "flex", flexDirection: "column", padding: "24px 0" }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #2E6394" }}>
          <img src="/logo_v6_wide.svg" alt="logo" style={{ width: "100%" }} />
        </div>
        <nav style={{ flex: 1, padding: "16px 0" }}>
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => setActivePage(item.key)} style={{
              display: "block", width: "100%", padding: "12px 20px", textAlign: "right",
              background: activePage === item.key ? "#2E6394" : "transparent",
              color: item.key === "defaulters" ? "#fca5a5" : "#fff",
              border: "none", fontSize: "15px", cursor: "pointer",
              fontFamily: "Cairo, sans-serif", borderRight: activePage === item.key ? "4px solid #F5D98C" : "4px solid transparent"
            }}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #2E6394" }}>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "10px", background: "#c0392b", color: "#fff",
            border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "14px"
          }}>{T.logout}</button>
        </div>
      </div>

      <div style={{ flex: 1, background: "#f0f4f8", overflow: "auto" }}>
        {activePage === "dashboard" && (
          <div style={{ padding: "32px" }}>
            <h2 style={{ color: "#1B4D7A", marginBottom: "24px" }}>{T.dashboard}</h2>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {[
                { label: T.properties, value: stats.properties, icon: "\uD83C\uDFE2\uD83C\uDFE2\uD83C\uDFE2", color: "#2E6394", page: "properties" },
                { label: T.units, value: stats.units, icon: "\uD83D\uDEAA\uD83D\uDEAA\uD83D\uDEAA", color: "#27ae60", page: null },
                { label: T.tenants, value: stats.tenants, icon: "\uD83D\uDC64", color: "#8e44ad", page: "tenants" },
                { label: T.leases, value: stats.leases, icon: "\uD83D\uDCC4", color: "#e67e22", page: "leases" },
                { label: T.payments, value: stats.payments, icon: "\uD83D\uDCB0", color: "#c0392b", page: "payments" },
              ].map(card => (
                <div key={card.label} style={cardStyle} onClick={() => card.page && setActivePage(card.page)}>
                  <div style={{ fontSize: "32px" }}>{card.icon}</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: card.color, margin: "8px 0" }}>{card.value}</div>
                  <div style={{ color: "#666", fontSize: "14px" }}>{card.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activePage === "properties" && <Properties onBack={goBack} />}
        {activePage === "tenants" && <Tenants onBack={goBack} />}
        {activePage === "leases" && <Leases onBack={goBack} />}
        {activePage === "payments" && <Payments onBack={goBack} />}
        {activePage === "reports" && <Reports onBack={goBack} />}
        {activePage === "defaulters" && <Defaulters onBack={goBack} />}
      </div>
    </div>
  );
}
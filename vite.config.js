import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Properties from "./Properties";
import Tenants from "./Tenants";
import Leases from "./Leases";
import Payments from "./Payments";
import Reports from "./Reports";
import Login from "./Login";
import ViewerLayout from "./ViewerLayout";

const NAV_ITEMS = [
  { key: "dashboard", label: "لوحة التحكم", icon: "🏠" },
  { key: "properties", label: "العقارات", icon: "🏢" },
  { key: "tenants", label: "المستأجرون", icon: "👤" },
  { key: "leases", label: "العقود", icon: "📄" },
  { key: "payments", label: "الدفعات", icon: "💰" },
  { key: "reports", label: "التقارير", icon: "📊" },
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

  function handleLogout() {
    localStorage.removeItem("role");
    setRole(null);
  }

  if (role === "viewer") return <ViewerLayout />;
  if (!role) return <Login onLogin={(r) => setRole(r)} />;

  const cardStyle = {
    background: "#fff", borderRadius: "12px", padding: "24px 20px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center", flex: 1
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <div style={{ width: "220px", background: "#1B4D7A", display: "flex", flexDirection: "column", padding: "24px 0" }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #2E6394" }}>
          <img src="/logo_v6_wide.svg" alt="شعار" style={{ width: "100%" }} />
        </div>
        <nav style={{ flex: 1, padding: "16px 0" }}>
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => setActivePage(item.key)} style={{
              display: "block", width: "100%", padding: "12px 20px", textAlign: "right",
              background: activePage === item.key ? "#2E6394" : "transparent",
              color: "#fff", border: "none", fontSize: "15px", cursor: "pointer",
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
          }}>خروج 🚪</button>
        </div>
      </div>

      <div style={{ flex: 1, background: "#f0f4f8", overflow: "auto" }}>
        {activePage === "dashboard" && (
          <div style={{ padding: "32px" }}>
            <h2 style={{ color: "#1B4D7A", marginBottom: "24px" }}>لوحة التحكم</h2>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {[
                { label: "العقارات", value: stats.properties, icon: "🏢", color: "#2E6394" },
                { label: "الوحدات", value: stats.units, icon: "🚪", color: "#27ae60" },
                { label: "المستأجرون", value: stats.tenants, icon: "👤", color: "#8e44ad" },
                { label: "العقود", value: stats.leases, icon: "📄", color: "#e67e22" },
                { label: "الدفعات", value: stats.payments, icon: "💰", color: "#c0392b" },
              ].map(card => (
                <div key={card.label} style={cardStyle}>
                  <div style={{ fontSize: "32px" }}>{card.icon}</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: card.color, margin: "8px 0" }}>{card.value}</div>
                  <div style={{ color: "#666", fontSize: "14px" }}>{card.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activePage === "properties" && <Properties onBack={() => setActivePage("dashboard")} />}
        {activePage === "tenants" && <Tenants onBack={() => setActivePage("dashboard")} />}
        {activePage === "leases" && <Leases onBack={() => setActivePage("dashboard")} />}
        {activePage === "payments" && <Payments onBack={() => setActivePage("dashboard")} />}
        {activePage === "reports" && <Reports onBack={() => setActivePage("dashboard")} />}
      </div>
    </div>
  );
}
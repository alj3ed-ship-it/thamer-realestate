import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Properties from "./Properties";
import Tenants from "./Tenants";
import Leases from "./Leases";
import Payments from "./Payments";
import Reports from "./Reports";
import Defaulters from "./Defaulters";
import Projects from "./Projects";
import Bookings from "./Bookings";
import Login from "./Login";
import ResetPassword from "./ResetPassword";
import ViewerLayout from "./ViewerLayout";
import { ReadOnlyProvider } from "./ReadOnlyContext";
import ViewerLimited from "./ViewerLimited";
import PropertyDetail from "./PropertyDetail";
import Units from "./Units";
import Entitlements from "./Entitlements";
import Letters from "./Letters";
import VatReturns from "./VatReturns";
import DashboardCharts from "./components/DashboardCharts";

const T = {
  dashboard: "لوحة التحكم",
  properties: "العقارات",
  tenants: "المستأجرون",
  leases: "العقود",
  payments: "الدفعات",
  reports: "التقارير",
  defaulters: "المتعثرون",
  units: "الوحدات",
  entitlements: "الاستحقاقات",
  projects: "المشاريع",
  bookings: "قاعة مذهلة",
  letters: "الخطابات",
  vatReturns: "الإقرارات الضريبية",
  logout: "خروج",
};

const NAV_ITEMS = [
  { key: "dashboard", label: T.dashboard, icon: "🏠" },
  { key: "properties", label: T.properties, icon: "🏢" },
  { key: "units", label: T.units, icon: "🚪" },
  { key: "tenants", label: T.tenants, icon: "👤" },
  { key: "leases", label: T.leases, icon: "📄" },
  { key: "payments", label: T.payments, icon: "💰" },
  { key: "entitlements", label: T.entitlements, icon: "📅" },
  { key: "vatReturns", label: T.vatReturns, icon: "🧾" },
  { key: "reports", label: T.reports, icon: "📊" },
  { key: "defaulters", label: T.defaulters, icon: "⚠️" },
  { key: "projects", label: T.projects, icon: "🛠️" },
  { key: "bookings", label: T.bookings, icon: "🎉" },
  { key: "letters", label: T.letters, icon: "✉️" },
];

export default function App() {
  const [role, setRole] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
   const [letterPrefill, setLetterPrefill] = useState(null);
  const [stats, setStats] = useState({ properties: 0, units: 0, tenants: 0, leases: 0, payments: 0 });

  useEffect(() => {
    if (window.location.pathname === "/view") {
      setRole("viewer");
      setCheckingSession(false);
      return;
    }
    if (window.location.pathname === "/view2") {
      setRole("viewer2");
      setCheckingSession(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.warn("انتهت مهلة التحقق من الجلسة — يبدو أن هناك بطء في اتصال Supabase.");
      setCheckingSession(false);
    }, 8000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      if (session) setRole("admin");
      setCheckingSession(false);
    }).catch((err) => {
      clearTimeout(timeoutId);
      console.error("خطأ أثناء التحقق من الجلسة:", err);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (window.location.pathname === "/view") return;
      setRole(session ? "admin" : null);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (role === "admin" || role === "viewer") fetchStats();
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
    setSelectedPropertyId(null);
    fetchStats();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setRole(null);
  }

  if (window.location.pathname === "/reset-password") {
    return <ResetPassword />;
  }

  if (checkingSession) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#f0f4f8", fontFamily: "Cairo, sans-serif",
        color: "#1B4D7A", fontSize: "16px"
      }}>
        جاري التحقق من الجلسة...
      </div>
    );
  }

   if (role === "viewer2") return <ViewerLimited />;
  if (!role) return <Login onLogin={(r) => setRole(r)} />;

 const cardStyle = {
  background: "#fff", borderRadius: "10px", padding: "16px 12px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center", flex: 1, cursor: "pointer"
};


  return (
    <ReadOnlyProvider value={role === "viewer"}>
    <div style={{ display: "flex", minHeight: "100vh", maxWidth: "100vw", overflowX: "hidden", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <div className="print-sidebar" style={{ width: "220px", flexShrink: 0, background: "#1B4D7A", display: "flex", flexDirection: "column", padding: "24px 0" }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #2E6394" }}>
          <img src="/logo_v6_wide.svg" alt="logo" style={{ width: "100%" }} />
        </div>
        <nav style={{ flex: 1, padding: "16px 0" }}>
          {NAV_ITEMS.filter(item => !(role === "viewer" && item.key === "letters")).map(item => (
            <button key={item.key} onClick={() => { setActivePage(item.key); setSelectedPropertyId(null); }} style={{
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
        {role !== "viewer" && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid #2E6394" }}>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "10px", background: "#c0392b", color: "#fff",
            border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "14px"
          }}>{T.logout}</button>
        </div>
        )}
      </div>

      <div className="print-main-content" style={{ flex: 1, minWidth: 0, background: "#f0f4f8", overflow: "auto" }}>
        {activePage === "dashboard" && (
          <div style={{ padding: "18px 22px" }}>
            <h2 style={{ color: "#1B4D7A", marginBottom: "12px", fontSize: "20px" }}>{T.dashboard}</h2>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {[
                { label: T.properties, value: stats.properties, icon: "🏢", color: "#2E6394", page: "properties" },
                { label: T.units, value: stats.units, icon: "🚪🚪🚪", color: "#27ae60", page: "units" },
                { label: T.tenants, value: stats.tenants, icon: "👤", color: "#8e44ad", page: "tenants" },
                { label: T.leases, value: stats.leases, icon: "📄", color: "#e67e22", page: "leases" },
                { label: T.payments, value: stats.payments, icon: "💰", color: "#c0392b", page: "payments" },
              ].map(card => (
                <div key={card.label} style={cardStyle} onClick={() => card.page && setActivePage(card.page)}>
                 <div style={{ fontSize: "22px" }}>{card.icon}</div>
                           <div style={{ fontSize: "20px", fontWeight: "bold", color: card.color, margin: "4px 0" }}>{card.value}</div>
                  <div style={{ color: "#666", fontSize: "14px" }}>{card.label}</div>
                </div>
              ))}
            </div>
                   <DashboardCharts />
          </div>
        )}
        {activePage === "projects" && <Projects onBack={goBack} />}
        {activePage === "bookings" && <Bookings onBack={goBack} />}
        {activePage === "properties" && !selectedPropertyId && (
          <Properties onBack={goBack} onSelectProperty={(id) => setSelectedPropertyId(id)} />
        )}
        {activePage === "properties" && selectedPropertyId && (
          <PropertyDetail propertyId={selectedPropertyId} onBack={() => setSelectedPropertyId(null)} />
        )}
        {activePage === "units" && <Units onBack={goBack} />}
        {activePage === "tenants" && <Tenants onBack={goBack} />}
        {activePage === "leases" && <Leases onBack={goBack} />}
        {activePage === "payments" && <Payments onBack={goBack} />}
        {activePage === "entitlements" && <Entitlements onBack={goBack} />}
        {activePage === "vatReturns" && <VatReturns onBack={goBack} />}
        {activePage === "letters" && (
          <Letters onBack={goBack} prefillData={letterPrefill} onPrefillConsumed={() => setLetterPrefill(null)} />
        )}
        {activePage === "reports" && <Reports onBack={goBack} />}
        {activePage === "defaulters" && (
          <Defaulters
            onBack={goBack}
            onCreateLetter={(data) => {
              setLetterPrefill(data);
              setActivePage("letters");
            }}
          />
        )}
      </div>
    </div>
    </ReadOnlyProvider>
  );
}
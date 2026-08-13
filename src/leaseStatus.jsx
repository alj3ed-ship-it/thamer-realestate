// دالة موحّدة لحساب حالة عقد الإيجار (نشط / قريب الانتهاء / منتهي)
// تُستخدم في Leases.jsx و Payments.jsx و Entitlements.jsx

export function getLeaseStatus(endDate) {
  if (!endDate) {
    return { key: "unknown", label: "—", color: "#9ca3af", bg: "#f3f4f6", border: "#e5e7eb" };
  }

  const end = new Date(endDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((end - today) / 86400000);

  if (diffDays < 0) {
    return { key: "expired", label: "منتهي", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", days: diffDays };
  }
  if (diffDays <= 60) {
    return { key: "ending", label: `باقي ${diffDays} يوم`, color: "#d97706", bg: "#fef3c7", border: "#fcd34d", days: diffDays };
  }
  return { key: "active", label: "نشط", color: "#059669", bg: "#d1fae5", border: "#6ee7b7", days: diffDays };
}

export function LeaseStatusBadge({ endDate, style = {} }) {
  const s = getLeaseStatus(endDate);
  const icon = s.key === "expired" ? "🔴" : s.key === "ending" ? "🟠" : s.key === "active" ? "🟢" : "⚪";
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
      whiteSpace: "nowrap", display: "inline-block", fontFamily: "Cairo, sans-serif",
      ...style
    }}>
      {icon} {s.label}
    </span>
  );
}

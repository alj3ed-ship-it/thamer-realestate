export const UNIT_TYPE_COLORS = {
  "محل": { color: "#2E86C1", bg: "#EBF5FB", border: "#AED6F1" },
  "شقة": { color: "#8E44AD", bg: "#F4ECF7", border: "#D2B4DE" },
};

export const DEFAULT_UNIT_COLOR = { color: "#D68910", bg: "#FEF5E7", border: "#F8C471" };

export function getUnitTypeColor(unitType) {
  return UNIT_TYPE_COLORS[unitType] || DEFAULT_UNIT_COLOR;
}

export const STATUS_COLORS = {
  paid: { color: "#27ae60", bg: "#EAFAF1", label: "مدفوع ✓" },
  partial: { color: "#f39c12", bg: "#FEF9E7", label: "جزئي ⚠" },
  unpaid: { color: "#e74c3c", bg: "#FDEDEC", label: "لم يُسدَّد ✗" },
};

export function getStatusStyle(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.unpaid;
}

export const BRAND_NAVY = "#1B4D7A";
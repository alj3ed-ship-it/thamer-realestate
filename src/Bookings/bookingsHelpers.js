import React from 'react';

export const EVENT_TYPES = ['كاملة', 'نساء', 'رجال', 'أخرى'];
export const RECEIVER_STAGE1_OPTIONS = ['أبو أيوب', 'تحويل مباشر', 'نقدي مباشر'];
export const RECEIVER_FINAL_OPTIONS = ['مستلم', 'الوالد', 'لم يستلم'];
export const REMAINING_STATUS_OPTIONS = ['مستلم', 'جزئي', 'غير مستلم'];
export const DEFAULT_STAFF_RATES = { 'كاملة': 1970, 'نساء': 1020, 'رجال': 950, 'أخرى': 0 };
export const DEFAULT_SUPPLIES_RATES = { 'كاملة': 450, 'نساء': 225, 'رجال': 225, 'أخرى': 0 };
export const DEFAULT_ANNUAL_SALARY = 30000;
export const DEFAULT_SALARIES_BY_YEAR = { '1446': 48000, '1447': 48000 };
export const DEFAULT_ABU_AYOUB_RATES = { 'كاملة': 200, 'نساء': 150, 'رجال': 150, 'أخرى': 0 };
export const DEFAULT_ANNUAL_ELECTRICITY = 12000;
export const DEFAULT_WATER_RATE_PER_PAIR = 250;
export const INCOME_TYPES = ['ميز', 'صوتيات', 'مطبخ القصر', 'أخرى'];

export const STATUS_COLORS = {
  'مستلم': { bg: '#EAFAF1', text: '#27ae60', label: 'مستلم ✓' },
  'جزئي': { bg: '#FEF9E7', text: '#f39c12', label: 'جزئي ⚠' },
  'غير مستلم': { bg: '#FDEDEC', text: '#e74c3c', label: 'غير مستلم ✗' },
};

export const CANCEL_STATUS_LABELS = {
  cancelled_kept_deposit: { bg: '#FEF5E7', text: '#B9770E', label: 'ملغي - محتفظ بالعربون' },
  cancelled_refunded: { bg: '#FDEDEC', text: '#e74c3c', label: 'ملغي - مسترجع العربون' },
};

export function getEffectiveAmounts(b) {
  const status = b.booking_status || 'active';
  if (status === 'cancelled_refunded') {
    return { revenue: 0, remaining: 0, countsForCost: false };
  }
  if (status === 'cancelled_kept_deposit') {
    return { revenue: Number(b.deposit_amount || 0), remaining: 0, countsForCost: false };
  }
  return {
    revenue: Number(b.total_amount || 0),
    remaining: b.remaining_status !== 'مستلم' ? Number(b.remaining_amount || 0) : 0,
    countsForCost: true,
  };
}

export const TYPE_COLORS = {
  'كاملة': { bg: '#EAF2F8', text: '#1B4D7A', border: '#AED6F1' },
  'نساء': { bg: '#FDF2F8', text: '#C2185B', border: '#F8BBD0' },
  'رجال': { bg: '#E8F6F3', text: '#148F77', border: '#A2D9CE' },
  'أخرى': { bg: '#F4F6F7', text: '#7f8c8d', border: '#D5D8DC' },
};

export const INCOME_TYPE_COLORS = {
  'ميز': { bg: '#FEF5E7', text: '#B7950B', border: '#F9E79F' },
  'صوتيات': { bg: '#F4ECF7', text: '#7D3C98', border: '#D2B4DE' },
  'مطبخ القصر': { bg: '#FDF2E9', text: '#B9770E', border: '#F5CBA7' },
  'أخرى': { bg: '#F4F6F7', text: '#7f8c8d', border: '#D5D8DC' },
};

export function formatHijriDisplay(dateStr) {
  if (!dateStr) return '—';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getHijriYear(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return parts[2];
}

export function typeBadge(type) {
  const c = TYPE_COLORS[type] || TYPE_COLORS['أخرى'];
  return React.createElement('span', {
    style: {
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap',
    },
  }, type);
}

export function incomeTypeBadge(type) {
  const c = INCOME_TYPE_COLORS[type] || INCOME_TYPE_COLORS['أخرى'];
  return React.createElement('span', {
    style: {
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap',
    },
  }, type);
}

export function clientBadge(name) {
  return React.createElement('span', {
    style: {
      background: '#FEF9E7', color: '#9A7D0A', border: '1px solid #F7DC6F',
      padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap',
    },
  }, name);
}

export function receiverColor(value) {
  if (value === 'مستلم') return '#27ae60';
  if (value === 'لم يستلم') return '#e74c3c';
  return '#1B4D7A';
}

export function SummaryCard({ label, value, color, onClick }) {
  return React.createElement(
    'div',
    {
      onClick,
      style: {
        background: '#fff', border: `2px solid ${color}`, borderRadius: '10px', padding: '14px 20px', minWidth: '180px',
        cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s',
      },
      onMouseEnter: (e) => { if (onClick) e.currentTarget.style.transform = 'translateY(-2px)'; },
      onMouseLeave: (e) => { if (onClick) e.currentTarget.style.transform = 'translateY(0)'; },
    },
    React.createElement('div', { style: { fontSize: '13px', color: '#666' } }, label),
    React.createElement('div', { style: { fontSize: '20px', fontWeight: 'bold', color } }, value),
    onClick ? React.createElement('div', { style: { fontSize: '11px', color: '#999', marginTop: '4px' } }, 'اضغط للتفاصيل ◂') : null
  );
}

export function yearTabStyle(active) {
  return {
    padding: '8px 20px',
    borderRadius: '8px',
    border: active ? 'none' : '1px solid #ddd',
    background: active ? '#1B4D7A' : '#fff',
    color: active ? '#fff' : '#555',
    fontWeight: 'bold',
    fontSize: '14px',
    fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer',
  };
}

export function typeTabStyle(type, active) {
  const c = TYPE_COLORS[type] || { text: '#1B4D7A', border: '#ddd' };
  return {
    padding: '8px 20px',
    borderRadius: '8px',
    border: active ? 'none' : `1px solid ${c.border}`,
    background: active ? c.text : '#fff',
    color: active ? '#fff' : c.text,
    fontWeight: 'bold',
    fontSize: '14px',
    fontFamily: 'Cairo, sans-serif',
    cursor: 'pointer',
  };
}

export const th = { padding: '12px 16px', fontWeight: 'bold', color: '#555' };
export const td = { padding: '12px 16px' };
export const label = { display: 'block', marginTop: '10px', marginBottom: '4px', fontSize: '13px', color: '#555' };
export const input = {
  width: '100%',
  padding: '8px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontFamily: 'Cairo, sans-serif',
  boxSizing: 'border-box',
};
export const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
export const modalStyle = {
  background: '#fff', borderRadius: '12px', padding: '24px', width: '420px', maxHeight: '90vh', overflowY: 'auto',
  direction: 'rtl', fontFamily: 'Cairo, sans-serif',
};
export const wideModalStyle = {
  background: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '900px', maxHeight: '85vh', overflowY: 'auto',
  direction: 'rtl', fontFamily: 'Cairo, sans-serif',
};
export function actionBtn(color) {
  return {
    background: color, color: '#fff', border: 'none', padding: '6px 12px',
    borderRadius: '6px', cursor: 'pointer', marginLeft: '6px', fontSize: '13px', fontFamily: 'Cairo, sans-serif',
  };
}

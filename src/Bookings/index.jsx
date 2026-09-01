import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useReadOnly } from '../ReadOnlyContext';
import ExportToolbar from '../components/ExportToolbar';
import {
  EVENT_TYPES, RECEIVER_STAGE1_OPTIONS, RECEIVER_FINAL_OPTIONS, REMAINING_STATUS_OPTIONS,
  DEFAULT_STAFF_RATES, DEFAULT_SUPPLIES_RATES, DEFAULT_ANNUAL_SALARY, DEFAULT_SALARIES_BY_YEAR,
  DEFAULT_ABU_AYOUB_RATES, DEFAULT_ANNUAL_ELECTRICITY, DEFAULT_WATER_RATE_PER_PAIR, INCOME_TYPES,
  CANCEL_STATUS_LABELS, getEffectiveAmounts, formatHijriDisplay, getHijriYear,
  SummaryCard, yearTabStyle, typeTabStyle, label, input, overlayStyle, modalStyle, actionBtn,
} from './bookingsHelpers';
import PendingApprovals from './PendingApprovals';
import ExpenseSettings from './ExpenseSettings';
import YearlyChart from './YearlyChart';
import BookingsTable from './BookingsTable';
import ExtraIncomeSection from './ExtraIncomeSection';

export default function Bookings() {
  const isReadOnly = useReadOnly();
  const [bookings, setBookings] = useState([]);
  const [extraIncome, setExtraIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingExtraId, setEditingExtraId] = useState(null);
  const [hallId, setHallId] = useState(null);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [lockedYears, setLockedYears] = useState(new Set());
  const [staffRates, setStaffRates] = useState(() => {
    const saved = localStorage.getItem('bookings_staff_rates');
    try {
      return saved ? { ...DEFAULT_STAFF_RATES, ...JSON.parse(saved) } : DEFAULT_STAFF_RATES;
    } catch {
      return DEFAULT_STAFF_RATES;
    }
  });
  const [suppliesRates, setSuppliesRates] = useState(() => {
    const saved = localStorage.getItem('bookings_supplies_rates');
    try {
      return saved ? { ...DEFAULT_SUPPLIES_RATES, ...JSON.parse(saved) } : DEFAULT_SUPPLIES_RATES;
    } catch {
      return DEFAULT_SUPPLIES_RATES;
    }
  });
  const [annualSalaries, setAnnualSalaries] = useState(() => {
    const saved = localStorage.getItem('bookings_annual_salaries');
    try {
      return saved ? { ...DEFAULT_SALARIES_BY_YEAR, ...JSON.parse(saved) } : DEFAULT_SALARIES_BY_YEAR;
    } catch {
      return DEFAULT_SALARIES_BY_YEAR;
    }
  });

  function setStaffRate(type, value) {
    setStaffRates((prev) => {
      const next = { ...prev, [type]: value };
      supabase.from('hall_settings').upsert({ key: 'bookings_staff_rates', value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('فشل حفظ أسعار المباشرين:', error); });
      return next;
    });
  }

  function setSuppliesRate(type, value) {
    setSuppliesRates((prev) => {
      const next = { ...prev, [type]: value };
      supabase.from('hall_settings').upsert({ key: 'bookings_supplies_rates', value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('فشل حفظ أسعار القهوة والشاهي:', error); });
      return next;
    });
  }

  function getAnnualSalary(year) {
    return annualSalaries[year] !== undefined ? annualSalaries[year] : DEFAULT_ANNUAL_SALARY;
  }

  function setAnnualSalaryForYear(year, value) {
    setAnnualSalaries((prev) => {
      const next = { ...prev, [year]: value };
      supabase.from('hall_settings').upsert({ key: 'bookings_annual_salaries', value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('فشل حفظ الرواتب السنوية:', error); });
      return next;
    });
  }

  const [abuAyoubRates, setAbuAyoubRates] = useState(() => {
    const saved = localStorage.getItem('bookings_abu_ayoub_rates');
    try {
      return saved ? { ...DEFAULT_ABU_AYOUB_RATES, ...JSON.parse(saved) } : DEFAULT_ABU_AYOUB_RATES;
    } catch {
      return DEFAULT_ABU_AYOUB_RATES;
    }
  });
  const [electricityByYear, setElectricityByYear] = useState(() => {
    const saved = localStorage.getItem('bookings_electricity_by_year');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [waterRatePerPair, setWaterRatePerPair] = useState(() => {
    const saved = localStorage.getItem('bookings_water_rate_per_pair');
    return saved ? Number(saved) : DEFAULT_WATER_RATE_PER_PAIR;
  });

  function setAbuAyoubRate(type, value) {
    setAbuAyoubRates((prev) => {
      const next = { ...prev, [type]: value };
      supabase.from('hall_settings').upsert({ key: 'bookings_abu_ayoub_rates', value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('فشل حفظ عمولة أبو أيوب:', error); });
      return next;
    });
  }

  function getElectricity(year) {
    return electricityByYear[year] !== undefined ? electricityByYear[year] : DEFAULT_ANNUAL_ELECTRICITY;
  }

  function setElectricityForYear(year, value) {
    setElectricityByYear((prev) => {
      const next = { ...prev, [year]: value };
      supabase.from('hall_settings').upsert({ key: 'bookings_electricity_by_year', value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('فشل حفظ الكهرباء:', error); });
      return next;
    });
  }

  function setWaterRatePerPairAndSave(value) {
    setWaterRatePerPair(value);
    supabase.from('hall_settings').upsert({ key: 'bookings_water_rate_per_pair', value, updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error('فشل حفظ سعر الماء:', error); });
  }

  const emptyForm = {
    event_date_hijri: '',
    event_type: 'كاملة',
    client_name: '',
    total_amount: '',
    deposit_amount: '',
    deposit_receiver_stage1: RECEIVER_STAGE1_OPTIONS[0],
    deposit_receiver_final: RECEIVER_FINAL_OPTIONS[0],
    remaining_amount: '',
    remaining_status: 'جزئي',
    remaining_receiver_stage1: '',
    remaining_receiver_final: 'لم يستلم',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const emptyExtraForm = {
    booking_id: '',
    income_type: INCOME_TYPES[0],
    amount: '',
    date_hijri: '',
    client_name: '',
    notes: '',
  };
  const [extraForm, setExtraForm] = useState(emptyExtraForm);

  useEffect(() => {
    loadHallAndBookings();
  }, []);

  // إعدادات القاعة تُحفظ مباشرة في Supabase (hall_settings) داخل كل دالة تعديل أدناه

  async function loadHallAndBookings() {
    setLoading(true);
    setError(null);
    try {
      const { data: hall, error: hallErr } = await supabase
        .from('properties')
        .select('id')
        .eq('name', 'قاعة مذهلة')
        .single();

      if (hallErr) throw hallErr;
      setHallId(hall.id);

      const { data, error: bookingsErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('property_id', hall.id);

      if (bookingsErr) throw bookingsErr;

      const sorted = (data || []).sort((a, b) => {
        const pa = a.event_date_hijri.split('/').map(Number);
        const pb = b.event_date_hijri.split('/').map(Number);
        if (pa[2] !== pb[2]) return pa[2] - pb[2];
        if (pa[1] !== pb[1]) return pa[1] - pb[1];
        return pa[0] - pb[0];
      });

      setBookings(sorted);

      const { data: extraData, error: extraErr } = await supabase
        .from('hall_extra_income')
        .select('*')
        .order('created_at', { ascending: false });

      if (extraErr) throw extraErr;
      setExtraIncome(extraData || []);

      const { data: lockData, error: lockErr } = await supabase
        .from('hall_year_locks')
        .select('year')
        .eq('property_id', hall.id)
        .eq('locked', true);

      if (lockErr) throw lockErr;
      setLockedYears(new Set((lockData || []).map((l) => l.year)));

      const { data: settingsData, error: settingsErr } = await supabase
        .from('hall_settings')
        .select('key, value');

      if (settingsErr) throw settingsErr;
      const settingsMap = {};
      (settingsData || []).forEach((s) => { settingsMap[s.key] = s.value; });
      setStaffRates(settingsMap.bookings_staff_rates || DEFAULT_STAFF_RATES);
      setSuppliesRates(settingsMap.bookings_supplies_rates || DEFAULT_SUPPLIES_RATES);
      setAnnualSalaries(settingsMap.bookings_annual_salaries || DEFAULT_SALARIES_BY_YEAR);
      setAbuAyoubRates(settingsMap.bookings_abu_ayoub_rates || DEFAULT_ABU_AYOUB_RATES);
      setElectricityByYear(settingsMap.bookings_electricity_by_year || {});
      setWaterRatePerPair(
        settingsMap.bookings_water_rate_per_pair !== undefined
          ? settingsMap.bookings_water_rate_per_pair
          : DEFAULT_WATER_RATE_PER_PAIR
      );
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل الحجوزات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(booking) {
    setForm({
      event_date_hijri: booking.event_date_hijri,
      event_type: booking.event_type,
      client_name: booking.client_name,
      total_amount: booking.total_amount,
      deposit_amount: booking.deposit_amount,
      deposit_receiver_stage1: booking.deposit_receiver_stage1 || RECEIVER_STAGE1_OPTIONS[0],
      deposit_receiver_final: booking.deposit_receiver_final || RECEIVER_FINAL_OPTIONS[0],
      remaining_amount: booking.remaining_amount,
      remaining_status: booking.remaining_status,
      remaining_receiver_stage1: booking.remaining_receiver_stage1 || '',
      remaining_receiver_final: booking.remaining_receiver_final || 'لم يستلم',
      notes: booking.notes || '',
    });
    setEditingId(booking.id);
    setShowForm(true);
  }

  function openAddExtraForm() {
    setExtraForm(emptyExtraForm);
    setEditingExtraId(null);
    setShowExtraForm(true);
  }

  function openEditExtraForm(entry) {
    setExtraForm({
      booking_id: entry.booking_id || '',
      income_type: entry.income_type,
      amount: entry.amount,
      date_hijri: entry.date_hijri || '',
      client_name: entry.client_name || '',
      notes: entry.notes || '',
    });
    setEditingExtraId(entry.id);
    setShowExtraForm(true);
  }

  // الحفظ من لوحة الأدمن يُعتبر معتمداً مباشرة (status = approved)
  async function handleSave() {
    if (!form.event_date_hijri || !form.client_name || !form.total_amount) {
      alert('الرجاء تعبئة التاريخ واسم العميل والمبلغ الإجمالي على الأقل');
      return;
    }

    const payload = {
      property_id: hallId,
      event_date_hijri: form.event_date_hijri,
      event_type: form.event_type,
      client_name: form.client_name,
      total_amount: Number(form.total_amount),
      deposit_amount: Number(form.deposit_amount) || 0,
      deposit_receiver_stage1: form.deposit_receiver_stage1,
      deposit_receiver_final: form.deposit_receiver_final,
      remaining_amount: Number(form.remaining_amount) || 0,
      remaining_status: form.remaining_status,
      remaining_receiver_stage1: form.remaining_receiver_stage1,
      remaining_receiver_final: form.remaining_receiver_final,
      notes: form.notes,
      status: 'approved',
      previous_data: null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingId) {
        const { error: updateErr } = await supabase
          .from('bookings')
          .update(payload)
          .eq('id', editingId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('bookings')
          .insert([{ ...payload, booking_status: 'active' }]);
        if (insertErr) throw insertErr;
      }
      setShowForm(false);
      loadHallAndBookings();
    } catch (err) {
      console.error(err);
      alert('خطأ أثناء الحفظ: ' + err.message);
    }
  }

  async function handleSaveExtra() {
    if (!extraForm.income_type || !extraForm.amount) {
      alert('الرجاء تعبئة نوع الدخل والمبلغ على الأقل');
      return;
    }

    const payload = {
      booking_id: extraForm.booking_id || null,
      income_type: extraForm.income_type,
      amount: Number(extraForm.amount),
      date_hijri: extraForm.date_hijri || null,
      client_name: extraForm.client_name || null,
      notes: extraForm.notes || null,
    };

    try {
      if (editingExtraId) {
        const { error: updateErr } = await supabase
          .from('hall_extra_income')
          .update(payload)
          .eq('id', editingExtraId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('hall_extra_income')
          .insert([payload]);
        if (insertErr) throw insertErr;
      }
      setShowExtraForm(false);
      loadHallAndBookings();
    } catch (err) {
      console.error(err);
      alert('خطأ أثناء الحفظ: ' + err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('تحذير: الحذف نهائي ويشيل الحجز بالكامل من كل الإحصائيات (حتى العربون).\nلو الحفلة انلغت وتبي تحتفظ بالعربون ضمن المداخيل، استخدم زر "إلغاء" بدل هذا.\n\nمتأكد تبي تحذف هذا الحجز نهائياً؟')) return;
    try {
      const { error: delErr } = await supabase.from('bookings').delete().eq('id', id);
      if (delErr) throw delErr;
      loadHallAndBookings();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  }

  async function handleCancelBooking(booking) {
    const choice = prompt(
      'إلغاء الحجز:\nاكتب 1 = احتفاظ بالعربون ضمن المداخيل\nاكتب 2 = استرجاع العربون بالكامل (استثناء المبلغ كله)',
      '1'
    );
    if (choice === null) return;
    if (choice !== '1' && choice !== '2') {
      alert('اختيار غير صحيح. اكتب 1 أو 2.');
      return;
    }
    const newStatus = choice === '1' ? 'cancelled_kept_deposit' : 'cancelled_refunded';
    const label = newStatus === 'cancelled_kept_deposit' ? 'ملغي - محتفظ بالعربون' : 'ملغي - مسترجع العربون';
    if (!confirm(`تأكيد: سيتم تعليم الحجز كـ "${label}". هل تريد المتابعة؟`)) return;
    try {
      const { error: cancelErr } = await supabase
        .from('bookings')
        .update({ booking_status: newStatus })
        .eq('id', booking.id);
      if (cancelErr) throw cancelErr;
      loadHallAndBookings();
    } catch (err) {
      alert('خطأ أثناء الإلغاء: ' + err.message);
    }
  }

  async function handleReactivateBooking(booking) {
    if (!confirm('إعادة تفعيل هذا الحجز كحجز نشط عادي؟')) return;
    try {
      const { error: reactErr } = await supabase
        .from('bookings')
        .update({ booking_status: 'active' })
        .eq('id', booking.id);
      if (reactErr) throw reactErr;
      loadHallAndBookings();
    } catch (err) {
      alert('خطأ أثناء إعادة التفعيل: ' + err.message);
    }
  }

  async function handleToggleYearLock(year) {
    const isLocked = lockedYears.has(year);
    if (isLocked) {
      if (!confirm(`فتح قفل سنة ${year} هـ؟ راح تقدر تعدّل/تحذف/تلغي حجوزاتها من جديد.`)) return;
      try {
        const { error: unlockErr } = await supabase
          .from('hall_year_locks')
          .update({ locked: false })
          .eq('property_id', hallId)
          .eq('year', year);
        if (unlockErr) throw unlockErr;
        loadHallAndBookings();
      } catch (err) {
        alert('خطأ أثناء فتح القفل: ' + err.message);
      }
    } else {
      if (!confirm(`قفل سنة ${year} هـ من التعديل والحذف والإلغاء؟ (تقدر تفتحها لاحقاً لو احتجت)`)) return;
      try {
        const { error: lockErr } = await supabase
          .from('hall_year_locks')
          .upsert({ property_id: hallId, year, locked: true }, { onConflict: 'property_id,year' });
        if (lockErr) throw lockErr;
        loadHallAndBookings();
      } catch (err) {
        alert('خطأ أثناء القفل: ' + err.message);
      }
    }
  }

  async function handleDeleteExtra(id) {
    if (!confirm('متأكد تبي تحذف هذا الدخل الإضافي؟')) return;
    try {
      const { error: delErr } = await supabase.from('hall_extra_income').delete().eq('id', id);
      if (delErr) throw delErr;
      loadHallAndBookings();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  }

  // === اعتماد / رفض ما أدخله المحاسب ===
  async function handleApproveBooking(booking) {
    try {
      const { error: approveErr } = await supabase
        .from('bookings')
        .update({ status: 'approved', previous_data: null, needs_review: false, admin_note: null })
        .eq('id', booking.id);
      if (approveErr) throw approveErr;
      loadHallAndBookings();
    } catch (err) {
      alert('خطأ أثناء الاعتماد: ' + err.message);
    }
  }

  async function handleRejectBooking(booking) {
    const isEdit = !!booking.previous_data;
    const reason = prompt(
      isEdit ? 'سبب رفض التعديل (اختياري) — راح يظهر للمحاسب:' : 'سبب رفض الحجز (اختياري) — راح يظهر للمحاسب:',
      ''
    );
    if (reason === null) return; // ضغط إلغاء

    try {
      if (isEdit) {
        // نرجّع البيانات المعتمدة القديمة، ونترك إشعار للمحاسب بدل ما نخفي الموضوع
        const { error: restoreErr } = await supabase
          .from('bookings')
          .update({
            ...booking.previous_data,
            status: 'approved',
            previous_data: null,
            needs_review: true,
            admin_note: reason || 'تم رفض التعديل الأخير، وأُعيد الحجز لآخر بيانات معتمدة.',
          })
          .eq('id', booking.id);
        if (restoreErr) throw restoreErr;
      } else {
        // حجز جديد بالكامل: لا نحذفه فوراً، نتركه كإشعار رفض يشوفه المحاسب ثم يختفي بعد اطلاعه
        const { error: rejectErr } = await supabase
          .from('bookings')
          .update({
            status: 'rejected',
            needs_review: true,
            admin_note: reason || 'تم رفض هذا الحجز.',
          })
          .eq('id', booking.id);
        if (rejectErr) throw rejectErr;
      }
      loadHallAndBookings();
    } catch (err) {
      alert('خطأ أثناء الرفض: ' + err.message);
    }
  }

  // بانتظار الاعتماد (من المحاسب) — لا تدخل في الإحصائيات أدناه
  const pendingBookings = useMemo(
    () => bookings.filter((b) => b.status === 'pending'),
    [bookings]
  );

  // المعتمدة فقط تدخل في الجدول الرئيسي والإحصائيات (صفوف بدون status تُعتبر معتمدة، للتوافق مع البيانات القديمة)
  const approvedBookings = useMemo(
    () => bookings.filter((b) => (b.status || 'approved') === 'approved'),
    [bookings]
  );

  // استخراج كل السنين الموجودة فعلياً بالبيانات المعتمدة (ديناميكياً)
  const availableYears = useMemo(() => {
    const years = new Set();
    approvedBookings.forEach((b) => {
      const y = getHijriYear(b.event_date_hijri);
      if (y) years.add(y);
    });
    return Array.from(years).sort();
  }, [approvedBookings]);

  // بيانات الرسم البياني: لكل سنة عدد الحجوزات، الدخل، الصافي بعد خصم المصاريف التفصيلية
  const yearlyStats = useMemo(() => {
    const map = {};
    approvedBookings.forEach((b) => {
      const y = getHijriYear(b.event_date_hijri);
      if (!y) return;
      if (!map[y]) map[y] = { year: y, count: 0, activeCount: 0, revenue: 0, staffCost: 0, suppliesCost: 0, abuAyoubCost: 0 };
      map[y].count += 1;
      const eff = getEffectiveAmounts(b);
      map[y].revenue += eff.revenue;
      if (eff.countsForCost) {
        map[y].activeCount += 1;
        map[y].staffCost += staffRates[b.event_type] || 0;
        map[y].suppliesCost += suppliesRates[b.event_type] || 0;
        map[y].abuAyoubCost += abuAyoubRates[b.event_type] || 0;
      }
    });
    const extraByYear = {};
    extraIncome.forEach((e) => {
      const y = getHijriYear(e.date_hijri);
      if (!y) return;
      extraByYear[y] = (extraByYear[y] || 0) + Number(e.amount || 0);
    });
    return Object.values(map)
      .sort((a, b) => a.year.localeCompare(b.year))
      .map((row) => {
        const salary = getAnnualSalary(row.year);
        const electricity = getElectricity(row.year);
        const water = Math.ceil(row.activeCount / 2) * waterRatePerPair;
        const extra = extraByYear[row.year] || 0;
        const expenses = row.staffCost + row.suppliesCost + row.abuAyoubCost + salary + electricity + water;
        return {
          ...row,
          net: Math.round(row.revenue + extra - expenses),
        };
      });
  }, [approvedBookings, extraIncome, staffRates, suppliesRates, abuAyoubRates, annualSalaries, electricityByYear, waterRatePerPair]);

  const filteredBookings = approvedBookings.filter((b) => {
    const yearMatch = selectedYear === 'all' || getHijriYear(b.event_date_hijri) === selectedYear;
    const typeMatch = selectedType === 'all' || b.event_type === selectedType;
    return yearMatch && typeMatch;
  });

  const filteredExtraIncome = selectedYear === 'all'
    ? extraIncome
    : extraIncome.filter((e) => getHijriYear(e.date_hijri) === selectedYear);

  const totalRevenue = filteredBookings.reduce((sum, b) => sum + getEffectiveAmounts(b).revenue, 0);
  const totalPending = filteredBookings.reduce((sum, b) => sum + getEffectiveAmounts(b).remaining, 0);
  const totalCollected = totalRevenue - totalPending;

  const activeFilteredBookings = filteredBookings.filter((b) => getEffectiveAmounts(b).countsForCost);
  const totalStaffCost = activeFilteredBookings.reduce((sum, b) => sum + (staffRates[b.event_type] || 0), 0);
  const totalSuppliesCost = activeFilteredBookings.reduce((sum, b) => sum + (suppliesRates[b.event_type] || 0), 0);
  const totalAbuAyoubCost = activeFilteredBookings.reduce((sum, b) => sum + (abuAyoubRates[b.event_type] || 0), 0);
  const relevantYearsForSalary = selectedYear === 'all' ? availableYears : [selectedYear];
  const totalSalaryCost = relevantYearsForSalary.reduce((sum, y) => sum + getAnnualSalary(y), 0);
  const totalElectricityCost = relevantYearsForSalary.reduce((sum, y) => sum + getElectricity(y), 0);
  const totalWaterCost = Math.ceil(activeFilteredBookings.length / 2) * waterRatePerPair;
  const totalExpenses = totalStaffCost + totalSuppliesCost + totalAbuAyoubCost + totalSalaryCost + totalElectricityCost + totalWaterCost;

  const totalExtraIncome = filteredExtraIncome.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const grandTotal = totalRevenue + totalExtraIncome;
  const totalNet = grandTotal - totalExpenses;

  function bookingLabel(b) {
    return `${formatHijriDisplay(b.event_date_hijri)} هـ — ${b.client_name}`;
  }

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, sans-serif', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>🎉 حجوزات قاعة مذهلة</h2>
        {!isReadOnly && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openAddExtraForm}
            style={{
              background: '#148F77',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            + إضافة دخل إضافي
          </button>
          <button
            onClick={openAddForm}
            style={{
              background: '#1B4D7A',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'Cairo, sans-serif',
            }}
          >
            + إضافة حجز جديد
          </button>
        </div>
        )}
      </div>

      {/* ==== قسم بانتظار الاعتماد — تعديلات/حجوزات المحاسب ==== */}
      {!isReadOnly && pendingBookings.length > 0 && (
        <PendingApprovals
          pendingBookings={pendingBookings}
          onApprove={handleApproveBooking}
          onReject={handleRejectBooking}
        />
      )}

      <ExportToolbar
        title={`حجوزات قاعة مذهلة${selectedYear !== 'all' ? ' - سنة ' + selectedYear + ' هـ' : ' - كل السنين'}${selectedType !== 'all' ? ' - ' + selectedType : ''}`}
        data={filteredBookings.map((b) => ({
          ...b,
          event_date_hijri: formatHijriDisplay(b.event_date_hijri),
          booking_status_label: (CANCEL_STATUS_LABELS[b.booking_status] || {}).label || 'نشط',
        }))}
        columns={[
          { key: 'event_date_hijri', label: 'التاريخ الهجري' },
          { key: 'event_type', label: 'النوع' },
          { key: 'client_name', label: 'العميل' },
          { key: 'total_amount', label: 'الإجمالي' },
          { key: 'deposit_amount', label: 'العربون' },
          { key: 'remaining_amount', label: 'الباقي' },
          { key: 'remaining_status', label: 'حالة الباقي' },
          { key: 'booking_status_label', label: 'حالة الحجز' },
        ]}
        stats={[
          { label: 'عدد الحجوزات النشطة', value: activeFilteredBookings.length, color: '#1B4D7A' },
          { label: 'عدد الحجوزات الملغاة', value: filteredBookings.length - activeFilteredBookings.length, color: '#f39c12' },
          { label: 'إجمالي قيمة الحجوزات', value: `${totalRevenue.toLocaleString()} ر.س`, color: '#1B4D7A' },
          { label: 'دخل إضافي', value: `${totalExtraIncome.toLocaleString()} ر.س`, color: '#148F77' },
          { label: 'الإجمالي الكلي', value: `${grandTotal.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'مباشرين/مباشرات', value: `${totalStaffCost.toLocaleString()} ر.س`, color: '#8E44AD' },
          { label: 'قهوة وشاهي ومنظفات', value: `${totalSuppliesCost.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'عمولة أبو أيوب', value: `${totalAbuAyoubCost.toLocaleString()} ر.س`, color: '#6C3483' },
          { label: 'الراتب السنوي', value: `${totalSalaryCost.toLocaleString()} ر.س`, color: '#7f8c8d' },
          { label: 'الكهرباء السنوية', value: `${totalElectricityCost.toLocaleString()} ر.س`, color: '#B7950B' },
          { label: 'الماء', value: `${totalWaterCost.toLocaleString()} ر.س`, color: '#2E86C1' },
          { label: 'إجمالي المصاريف', value: `${totalExpenses.toLocaleString()} ر.س`, color: '#D35400' },
          { label: 'صافي الدخل', value: `${totalNet.toLocaleString()} ر.س`, color: '#27ae60' },
        ]}
      />

      {/* تبويبات السنوات */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedYear('all')}
          style={yearTabStyle(selectedYear === 'all')}
        >
          كل السنين
        </button>
        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            style={yearTabStyle(selectedYear === y)}
          >
            {lockedYears.has(y) ? '🔒 ' : ''}{y} هـ
          </button>
        ))}
      </div>

      {selectedYear !== 'all' && !isReadOnly && (
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => handleToggleYearLock(selectedYear)}
            style={{ ...actionBtn(lockedYears.has(selectedYear) ? '#7f8c8d' : '#8E44AD'), padding: '8px 16px', fontSize: '13px' }}
          >
            {lockedYears.has(selectedYear) ? `🔓 فتح قفل سنة ${selectedYear} هـ` : `🔒 قفل سنة ${selectedYear} هـ`}
          </button>
        </div>
      )}

      {/* تبويبات نوع الحفلة */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedType('all')}
          style={typeTabStyle('all', selectedType === 'all')}
        >
          كل الأنواع
        </button>
        {EVENT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            style={typeTabStyle(t, selectedType === t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* بطاقات ملخص (حسب التبويب المختار) */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <SummaryCard label="عدد الحجوزات النشطة" value={activeFilteredBookings.length} color="#1B4D7A" />
        <SummaryCard label="عدد الحجوزات الملغاة" value={filteredBookings.length - activeFilteredBookings.length} color="#f39c12" />
        <SummaryCard label="المصاريف" value={`${totalExpenses.toLocaleString()} ر.س`} color="#D35400" />
        <SummaryCard label="الباقي غير المحصّل" value={`${totalPending.toLocaleString()} ر.س`} color="#e74c3c" />
        <SummaryCard label="صافي الدخل (بعد خصم المصاريف)" value={`${totalNet.toLocaleString()} ر.س`} color="#8E44AD" />
        <SummaryCard label="دخل إضافي" value={`${totalExtraIncome.toLocaleString()} ر.س`} color="#148F77" onClick={() => setShowExtraDetails(true)} />
        <SummaryCard label="الإجمالي الكلي (حجوزات + دخل إضافي)" value={`${grandTotal.toLocaleString()} ر.س`} color="#B9770E" />
      </div>

      {/* إعدادات المصاريف: أجور المباشرين/المباشرات + قهوة وشاهي + الراتب السنوي */}
      <ExpenseSettings
        staffRates={staffRates} setStaffRate={setStaffRate}
        suppliesRates={suppliesRates} setSuppliesRate={setSuppliesRate}
        abuAyoubRates={abuAyoubRates} setAbuAyoubRate={setAbuAyoubRate}
        selectedYear={selectedYear}
        getAnnualSalary={getAnnualSalary} setAnnualSalaryForYear={setAnnualSalaryForYear}
        getElectricity={getElectricity} setElectricityForYear={setElectricityForYear}
        waterRatePerPair={waterRatePerPair} setWaterRatePerPairAndSave={setWaterRatePerPairAndSave}
      />

      {/* الرسم البياني المقارن بين السنين */}
      <YearlyChart yearlyStats={yearlyStats} />

      {error && <div style={{ color: '#e74c3c', marginBottom: '10px' }}>{error}</div>}
      {loading ? (
        <div>جاري التحميل...</div>
      ) : (
        <BookingsTable
          filteredBookings={filteredBookings}
          isReadOnly={isReadOnly}
          lockedYears={lockedYears}
          openEditForm={openEditForm}
          handleCancelBooking={handleCancelBooking}
          handleReactivateBooking={handleReactivateBooking}
          handleDelete={handleDelete}
        />
      )}

      <ExtraIncomeSection
        showExtraDetails={showExtraDetails} setShowExtraDetails={setShowExtraDetails}
        filteredExtraIncome={filteredExtraIncome} bookings={bookings} isReadOnly={isReadOnly}
        openEditExtraForm={openEditExtraForm} handleDeleteExtra={handleDeleteExtra}
        showExtraForm={showExtraForm} setShowExtraForm={setShowExtraForm}
        extraForm={extraForm} setExtraForm={setExtraForm} editingExtraId={editingExtraId}
        handleSaveExtra={handleSaveExtra} bookingLabel={bookingLabel}
      />

      {/* فورم الإضافة/التعديل - الحجوزات */}
      {showForm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>{editingId ? 'تعديل حجز' : 'إضافة حجز جديد'}</h3>

            <label style={label}>تاريخ المناسبة (هجري - يوم/شهر/سنة)</label>
            <input
              type="text"
              placeholder="مثال: 24/1/1448"
              value={form.event_date_hijri}
              onChange={(e) => setForm({ ...form, event_date_hijri: e.target.value })}
              style={input}
            />

            <label style={label}>نوع المناسبة</label>
            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              style={input}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <label style={label}>اسم العميل</label>
            <input
              type="text"
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              style={input}
            />

            <label style={label}>المبلغ الإجمالي</label>
            <input
              type="number"
              value={form.total_amount}
              onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
              style={input}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={label}>العربون</label>
                <input
                  type="number"
                  value={form.deposit_amount}
                  onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })}
                  style={input}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={label}>الباقي</label>
                <input
                  type="number"
                  value={form.remaining_amount}
                  onChange={(e) => setForm({ ...form, remaining_amount: e.target.value })}
                  style={input}
                />
              </div>
            </div>

            <label style={label}>استلام العربون (مرحلة أولى)</label>
            <select
              value={form.deposit_receiver_stage1}
              onChange={(e) => setForm({ ...form, deposit_receiver_stage1: e.target.value })}
              style={input}
            >
              {RECEIVER_STAGE1_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <label style={label}>استلام العربون (نهائي)</label>
            <select
              value={form.deposit_receiver_final}
              onChange={(e) => setForm({ ...form, deposit_receiver_final: e.target.value })}
              style={input}
            >
              {RECEIVER_FINAL_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <label style={label}>حالة الباقي</label>
            <select
              value={form.remaining_status}
              onChange={(e) => setForm({ ...form, remaining_status: e.target.value })}
              style={input}
            >
              {REMAINING_STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <label style={label}>استلام الباقي (نهائي)</label>
            <select
              value={form.remaining_receiver_final}
              onChange={(e) => setForm({ ...form, remaining_receiver_final: e.target.value })}
              style={input}
            >
              {RECEIVER_FINAL_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>

            <label style={label}>ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              style={{ ...input, minHeight: '60px' }}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={handleSave} style={{ ...actionBtn('#1B4D7A'), flex: 1, padding: '10px' }}>
                حفظ
              </button>
              <button onClick={() => setShowForm(false)} style={{ ...actionBtn('#999'), flex: 1, padding: '10px' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

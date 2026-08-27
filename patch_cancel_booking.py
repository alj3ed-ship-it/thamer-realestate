import io

path = "src/Bookings.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) Add CANCEL_STATUS_LABELS + getEffectiveAmounts helper after STATUS_COLORS
old1 = """const STATUS_COLORS = {
  'مستلم': { bg: '#EAFAF1', text: '#27ae60', label: 'مستلم ✓' },
  'جزئي': { bg: '#FEF9E7', text: '#f39c12', label: 'جزئي ⚠' },
  'غير مستلم': { bg: '#FDEDEC', text: '#e74c3c', label: 'غير مستلم ✗' },
};"""
new1 = old1 + """

const CANCEL_STATUS_LABELS = {
  cancelled_kept_deposit: { bg: '#FEF5E7', text: '#B9770E', label: 'ملغي - محتفظ بالعربون' },
  cancelled_refunded: { bg: '#FDEDEC', text: '#e74c3c', label: 'ملغي - مسترجع العربون' },
};

function getEffectiveAmounts(b) {
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
}"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) Insert to only set booking_status on new inserts (never overwrite on edit)
old2 = """      } else {
        const { error: insertErr } = await supabase
          .from('bookings')
          .insert([payload]);
        if (insertErr) throw insertErr;
      }"""
new2 = """      } else {
        const { error: insertErr } = await supabase
          .from('bookings')
          .insert([{ ...payload, booking_status: 'active' }]);
        if (insertErr) throw insertErr;
      }"""
assert content.count(old2) == 1
content = content.replace(old2, new2)

# 3) Stronger warning on hard-delete, plus add cancel/reactivate handlers
old3 = """  async function handleDelete(id) {
    if (!confirm('متأكد تبي تحذف هذا الحجز؟')) return;
    try {
      const { error: delErr } = await supabase.from('bookings').delete().eq('id', id);
      if (delErr) throw delErr;
      loadHallAndBookings();
    } catch (err) {
      alert('خطأ أثناء الحذف: ' + err.message);
    }
  }

  async function handleDeleteExtra(id) {"""
new3 = """  async function handleDelete(id) {
    if (!confirm('تحذير: الحذف نهائي ويشيل الحجز بالكامل من كل الإحصائيات (حتى العربون).\\nلو الحفلة انلغت وتبي تحتفظ بالعربون ضمن المداخيل، استخدم زر "إلغاء" بدل هذا.\\n\\nمتأكد تبي تحذف هذا الحجز نهائياً؟')) return;
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
      'إلغاء الحجز:\\nاكتب 1 = احتفاظ بالعربون ضمن المداخيل\\nاكتب 2 = استرجاع العربون بالكامل (استثناء المبلغ كله)',
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

  async function handleDeleteExtra(id) {"""
assert content.count(old3) == 1
content = content.replace(old3, new3)

# 4) yearlyStats: use getEffectiveAmounts, exclude cancelled from cost/water calc
old4 = """  const yearlyStats = useMemo(() => {
    const map = {};
    approvedBookings.forEach((b) => {
      const y = getHijriYear(b.event_date_hijri);
      if (!y) return;
      if (!map[y]) map[y] = { year: y, count: 0, revenue: 0, staffCost: 0, suppliesCost: 0, abuAyoubCost: 0 };
      map[y].count += 1;
      map[y].revenue += Number(b.total_amount || 0);
      map[y].staffCost += staffRates[b.event_type] || 0;
      map[y].suppliesCost += suppliesRates[b.event_type] || 0;
      map[y].abuAyoubCost += abuAyoubRates[b.event_type] || 0;
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
        const water = Math.ceil(row.count / 2) * waterRatePerPair;
        const extra = extraByYear[row.year] || 0;
        const expenses = row.staffCost + row.suppliesCost + row.abuAyoubCost + salary + electricity + water;
        return {
          ...row,
          net: Math.round(row.revenue + extra - expenses),
        };
      });
  }, [approvedBookings, extraIncome, staffRates, suppliesRates, abuAyoubRates, annualSalaries, electricityByYear, waterRatePerPair]);"""
new4 = """  const yearlyStats = useMemo(() => {
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
  }, [approvedBookings, extraIncome, staffRates, suppliesRates, abuAyoubRates, annualSalaries, electricityByYear, waterRatePerPair]);"""
assert content.count(old4) == 1
content = content.replace(old4, new4)

# 5) Filtered totals: use getEffectiveAmounts, exclude cancelled from cost calc
old5 = """  const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const totalPending = filteredBookings
    .filter((b) => b.remaining_status !== 'مستلم')
    .reduce((sum, b) => sum + Number(b.remaining_amount || 0), 0);
  const totalCollected = totalRevenue - totalPending;

  const totalStaffCost = filteredBookings.reduce((sum, b) => sum + (staffRates[b.event_type] || 0), 0);
  const totalSuppliesCost = filteredBookings.reduce((sum, b) => sum + (suppliesRates[b.event_type] || 0), 0);
  const totalAbuAyoubCost = filteredBookings.reduce((sum, b) => sum + (abuAyoubRates[b.event_type] || 0), 0);
  const relevantYearsForSalary = selectedYear === 'all' ? availableYears : [selectedYear];
  const totalSalaryCost = relevantYearsForSalary.reduce((sum, y) => sum + getAnnualSalary(y), 0);
  const totalElectricityCost = relevantYearsForSalary.reduce((sum, y) => sum + getElectricity(y), 0);
  const totalWaterCost = Math.ceil(filteredBookings.length / 2) * waterRatePerPair;
  const totalExpenses = totalStaffCost + totalSuppliesCost + totalAbuAyoubCost + totalSalaryCost + totalElectricityCost + totalWaterCost;"""
new5 = """  const totalRevenue = filteredBookings.reduce((sum, b) => sum + getEffectiveAmounts(b).revenue, 0);
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
  const totalExpenses = totalStaffCost + totalSuppliesCost + totalAbuAyoubCost + totalSalaryCost + totalElectricityCost + totalWaterCost;"""
assert content.count(old5) == 1
content = content.replace(old5, new5)

# 6) Table header: add status column
old6 = """                    <th style={th}>الاستلام النهائي (باقي)</th>
                    {!isReadOnly && <th style={th}>إجراءات</th>}"""
new6 = """                    <th style={th}>الاستلام النهائي (باقي)</th>
                    <th style={th}>حالة الحجز</th>
                    {!isReadOnly && <th style={th}>إجراءات</th>}"""
assert content.count(old6) == 1
content = content.replace(old6, new6)

# 7) Table row: add status cell + cancel/reactivate buttons
old7 = """                        <td style={{ ...td, fontWeight: 'bold', color: receiverColor(b.remaining_receiver_final) }}>
                          {b.remaining_receiver_final || '—'}
                        </td>
                        {!isReadOnly && (
                        <td style={td}>
                          <button onClick={() => openEditForm(b)} style={actionBtn('#1B4D7A')}>تعديل</button>
                          <button onClick={() => handleDelete(b.id)} style={actionBtn('#e74c3c')}>حذف</button>
                        </td>
                        )}"""
new7 = """                        <td style={{ ...td, fontWeight: 'bold', color: receiverColor(b.remaining_receiver_final) }}>
                          {b.remaining_receiver_final || '—'}
                        </td>
                        <td style={td}>
                          {b.booking_status && b.booking_status !== 'active' ? (
                            <span style={{
                              background: (CANCEL_STATUS_LABELS[b.booking_status] || {}).bg,
                              color: (CANCEL_STATUS_LABELS[b.booking_status] || {}).text,
                              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                            }}>
                              {(CANCEL_STATUS_LABELS[b.booking_status] || {}).label}
                            </span>
                          ) : (
                            <span style={{ color: '#27ae60', fontSize: '12px', fontWeight: 'bold' }}>نشط ✓</span>
                          )}
                        </td>
                        {!isReadOnly && (
                        <td style={td}>
                          <button onClick={() => openEditForm(b)} style={actionBtn('#1B4D7A')}>تعديل</button>
                          {b.booking_status && b.booking_status !== 'active' ? (
                            <button onClick={() => handleReactivateBooking(b)} style={actionBtn('#27ae60')}>إعادة تفعيل</button>
                          ) : (
                            <button onClick={() => handleCancelBooking(b)} style={actionBtn('#f39c12')}>إلغاء</button>
                          )}
                          <button onClick={() => handleDelete(b.id)} style={actionBtn('#e74c3c')}>حذف</button>
                        </td>
                        )}"""
assert content.count(old7) == 1
content = content.replace(old7, new7)

# 8) colSpan for empty-state row needs +1 for the new column
old8 = """                      <td colSpan={9} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                        لا يوجد حجوزات لهذه السنة
                      </td>"""
new8 = """                      <td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                        لا يوجد حجوزات لهذه السنة
                      </td>"""
assert content.count(old8) == 1
content = content.replace(old8, new8)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تطبيق كل التعديلات بنجاح ✅")
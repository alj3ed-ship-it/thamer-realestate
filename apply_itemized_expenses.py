# -*- coding: utf-8 -*-
"""
يستبدل نظام نسبة المصاريف % بنظام مصاريف تفصيلي:
- أجور مباشرين/مباشرات لكل نوع حفلة (كاملة/نساء/رجال/أخرى)
- قهوة وشاهي ومنظفات لكل نوع حفلة
- راتب سنوي ثابت لكل سنة (افتراضي 30,000، مع استثناء 1446 و1447 = 48,000)
كل الأرقام قابلة للتعديل من الواجهة وتُحفظ بـ localStorage
"""

path = "src/Bookings.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1) استبدال ثابت نسبة المصاريف بثوابت الأسعار التفصيلية
old1 = "const DEFAULT_EXPENSE_PCT = 25;"
new1 = """const DEFAULT_STAFF_RATES = { 'كاملة': 1970, 'نساء': 1020, 'رجال': 950, 'أخرى': 0 };
const DEFAULT_SUPPLIES_RATES = { 'كاملة': 450, 'نساء': 225, 'رجال': 225, 'أخرى': 0 };
const DEFAULT_ANNUAL_SALARY = 30000;
const DEFAULT_SALARIES_BY_YEAR = { '1446': 48000, '1447': 48000 };"""
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على DEFAULT_EXPENSE_PCT — تحقق يدوياً")

# 2) استبدال state النسبة بكامل الحالات الجديدة (أسعار المباشرين + المستلزمات + الرواتب)
old2 = """  const [expensePcts, setExpensePcts] = useState(() => {
    const saved = localStorage.getItem('bookings_expense_pcts_by_year');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  function getExpensePct(year) {
    return expensePcts[year] !== undefined ? expensePcts[year] : DEFAULT_EXPENSE_PCT;
  }

  function setExpensePctForYear(year, value) {
    setExpensePcts((prev) => ({ ...prev, [year]: value }));
  }"""
new2 = """  const [staffRates, setStaffRates] = useState(() => {
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
    setStaffRates((prev) => ({ ...prev, [type]: value }));
  }

  function setSuppliesRate(type, value) {
    setSuppliesRates((prev) => ({ ...prev, [type]: value }));
  }

  function getAnnualSalary(year) {
    return annualSalaries[year] !== undefined ? annualSalaries[year] : DEFAULT_ANNUAL_SALARY;
  }

  function setAnnualSalaryForYear(year, value) {
    setAnnualSalaries((prev) => ({ ...prev, [year]: value }));
  }"""
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على state expensePcts — تحقق يدوياً")

# 3) تعديل useEffect لحفظ الأسعار الثلاثة بدل نسبة واحدة
old3 = """  useEffect(() => {
    localStorage.setItem('bookings_expense_pcts_by_year', JSON.stringify(expensePcts));
  }, [expensePcts]);"""
new3 = """  useEffect(() => {
    localStorage.setItem('bookings_staff_rates', JSON.stringify(staffRates));
  }, [staffRates]);

  useEffect(() => {
    localStorage.setItem('bookings_supplies_rates', JSON.stringify(suppliesRates));
  }, [suppliesRates]);

  useEffect(() => {
    localStorage.setItem('bookings_annual_salaries', JSON.stringify(annualSalaries));
  }, [annualSalaries]);"""
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على useEffect الحفظ — تحقق يدوياً")

# 4) تعديل حساب yearlyStats للرسم البياني
old4 = """  // بيانات الرسم البياني: لكل سنة عدد الحجوزات، الدخل، الصافي بعد خصم نسبة المصاريف
  const yearlyStats = useMemo(() => {
    const map = {};
    approvedBookings.forEach((b) => {
      const y = getHijriYear(b.event_date_hijri);
      if (!y) return;
      if (!map[y]) map[y] = { year: y, count: 0, revenue: 0 };
      map[y].count += 1;
      map[y].revenue += Number(b.total_amount || 0);
    });
    return Object.values(map)
      .sort((a, b) => a.year.localeCompare(b.year))
      .map((row) => ({
        ...row,
        net: Math.round(row.revenue * (1 - getExpensePct(row.year) / 100)),
      }));
  }, [approvedBookings, expensePcts]);"""
new4 = """  // بيانات الرسم البياني: لكل سنة عدد الحجوزات، الدخل، الصافي بعد خصم المصاريف التفصيلية
  const yearlyStats = useMemo(() => {
    const map = {};
    approvedBookings.forEach((b) => {
      const y = getHijriYear(b.event_date_hijri);
      if (!y) return;
      if (!map[y]) map[y] = { year: y, count: 0, revenue: 0, staffCost: 0, suppliesCost: 0 };
      map[y].count += 1;
      map[y].revenue += Number(b.total_amount || 0);
      map[y].staffCost += staffRates[b.event_type] || 0;
      map[y].suppliesCost += suppliesRates[b.event_type] || 0;
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
        const extra = extraByYear[row.year] || 0;
        const expenses = row.staffCost + row.suppliesCost + salary;
        return {
          ...row,
          net: Math.round(row.revenue + extra - expenses),
        };
      });
  }, [approvedBookings, extraIncome, staffRates, suppliesRates, annualSalaries]);"""
if old4 in content:
    content = content.replace(old4, new4, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حساب yearlyStats — تحقق يدوياً")

# 5) تعديل حسابات الإجماليات (totalNet / totalExpenses)
old5 = """  const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const totalPending = filteredBookings
    .filter((b) => b.remaining_status !== 'مستلم')
    .reduce((sum, b) => sum + Number(b.remaining_amount || 0), 0);
  const totalCollected = totalRevenue - totalPending;
  const totalNet = Math.round(
    filteredBookings.reduce((sum, b) => {
      const y = getHijriYear(b.event_date_hijri);
      const pct = getExpensePct(y);
      return sum + Number(b.total_amount || 0) * (1 - pct / 100);
    }, 0)
  );
  const totalExpenses = totalRevenue - totalNet;
  const totalExtraIncome = filteredExtraIncome.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const grandTotal = totalRevenue + totalExtraIncome;"""
new5 = """  const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  const totalPending = filteredBookings
    .filter((b) => b.remaining_status !== 'مستلم')
    .reduce((sum, b) => sum + Number(b.remaining_amount || 0), 0);
  const totalCollected = totalRevenue - totalPending;

  const totalStaffCost = filteredBookings.reduce((sum, b) => sum + (staffRates[b.event_type] || 0), 0);
  const totalSuppliesCost = filteredBookings.reduce((sum, b) => sum + (suppliesRates[b.event_type] || 0), 0);
  const relevantYearsForSalary = selectedYear === 'all' ? availableYears : [selectedYear];
  const totalSalaryCost = relevantYearsForSalary.reduce((sum, y) => sum + getAnnualSalary(y), 0);
  const totalExpenses = totalStaffCost + totalSuppliesCost + totalSalaryCost;

  const totalExtraIncome = filteredExtraIncome.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const grandTotal = totalRevenue + totalExtraIncome;
  const totalNet = grandTotal - totalExpenses;"""
if old5 in content:
    content = content.replace(old5, new5, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حسابات الإجماليات — تحقق يدوياً")

# 6) استبدال حقل نسبة المصاريف بلوحة إعدادات المصاريف التفصيلية
old6 = """      {/* نسبة المصاريف الخاصة بكل سنة */}
      <div style={{
        background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '440px', flexWrap: 'wrap',
      }}>
        {selectedYear === 'all' ? (
          <span style={{ fontSize: '13px', color: '#888' }}>
            اختر سنة معينة من الأعلى لتعديل نسبة مصاريفها (الافتراضي: {DEFAULT_EXPENSE_PCT}%)
          </span>
        ) : (
          <>
            <label style={{ fontSize: '14px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              نسبة مصاريف {selectedYear} هـ (%)
            </label>
            <input
              type="number"
              value={getExpensePct(selectedYear)}
              onChange={(e) => setExpensePctForYear(selectedYear, Number(e.target.value) || 0)}
              style={{ width: '80px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
            />
          </>
        )}
      </div>"""
new6 = """      {/* إعدادات المصاريف: أجور المباشرين/المباشرات + قهوة وشاهي + الراتب السنوي */}
      <div style={{
        background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        padding: '16px 20px', marginBottom: '20px',
      }}>
        <h4 style={{ margin: '0 0 12px', color: '#555', fontSize: '14px' }}>⚙️ إعدادات المصاريف (لكل حفلة حسب نوعها)</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {EVENT_TYPES.map((t) => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: (TYPE_COLORS[t] || {}).text || '#555' }}>{t}</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>مباشرين</span>
                <input
                  type="number"
                  value={staffRates[t] ?? 0}
                  onChange={(e) => setStaffRate(t, Number(e.target.value) || 0)}
                  style={{ width: '70px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>قهوة وشاهي</span>
                <input
                  type="number"
                  value={suppliesRates[t] ?? 0}
                  onChange={(e) => setSuppliesRate(t, Number(e.target.value) || 0)}
                  style={{ width: '70px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
          {selectedYear === 'all' ? (
            <span style={{ fontSize: '13px', color: '#888' }}>
              اختر سنة معينة من الأعلى لتعديل راتبها السنوي (الافتراضي: {DEFAULT_ANNUAL_SALARY.toLocaleString()} ر.س)
            </span>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                الراتب السنوي {selectedYear} هـ (ر.س)
              </label>
              <input
                type="number"
                value={getAnnualSalary(selectedYear)}
                onChange={(e) => setAnnualSalaryForYear(selectedYear, Number(e.target.value) || 0)}
                style={{ width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
              />
            </div>
          )}
        </div>
      </div>"""
if old6 in content:
    content = content.replace(old6, new6, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حقل نسبة المصاريف بالواجهة — تحقق يدوياً")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ تم تطبيق {changes} من أصل 6 تعديلات على {path}")

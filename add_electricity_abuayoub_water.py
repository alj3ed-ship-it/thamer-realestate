# -*- coding: utf-8 -*-
"""
يضيف ثلاث بنود مصاريف جديدة للنظام التفصيلي بصفحة حجوزات قاعة مذهلة:
1) الكهرباء السنوية (افتراضي 12,000 ر.س لكل سنة، قابلة للتعديل)
2) عمولة أبو أيوب لكل حفلة حسب نوعها (كاملة 200، نساء/رجال 150)
3) الماء: 250 ر.س لكل حفلتين (على إجمالي عدد الحفلات بغض النظر عن النوع، بتقريب لأعلى)
"""

path = "src/Bookings.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# 1) إضافة الثوابت الجديدة
old1 = "const DEFAULT_SALARIES_BY_YEAR = { '1446': 48000, '1447': 48000 };"
new1 = """const DEFAULT_SALARIES_BY_YEAR = { '1446': 48000, '1447': 48000 };
const DEFAULT_ABU_AYOUB_RATES = { 'كاملة': 200, 'نساء': 150, 'رجال': 150, 'أخرى': 0 };
const DEFAULT_ANNUAL_ELECTRICITY = 12000;
const DEFAULT_WATER_RATE_PER_PAIR = 250;"""
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على DEFAULT_SALARIES_BY_YEAR — تحقق يدوياً")

# 2) إضافة state ودوال جديدة بعد setAnnualSalaryForYear
old2 = """  function setAnnualSalaryForYear(year, value) {
    setAnnualSalaries((prev) => ({ ...prev, [year]: value }));
  }

  const emptyForm = {"""
new2 = """  function setAnnualSalaryForYear(year, value) {
    setAnnualSalaries((prev) => ({ ...prev, [year]: value }));
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
    setAbuAyoubRates((prev) => ({ ...prev, [type]: value }));
  }

  function getElectricity(year) {
    return electricityByYear[year] !== undefined ? electricityByYear[year] : DEFAULT_ANNUAL_ELECTRICITY;
  }

  function setElectricityForYear(year, value) {
    setElectricityByYear((prev) => ({ ...prev, [year]: value }));
  }

  const emptyForm = {"""
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على setAnnualSalaryForYear — تحقق يدوياً")

# 3) حفظ القيم الجديدة بـ localStorage
old3 = """  useEffect(() => {
    localStorage.setItem('bookings_annual_salaries', JSON.stringify(annualSalaries));
  }, [annualSalaries]);"""
new3 = """  useEffect(() => {
    localStorage.setItem('bookings_annual_salaries', JSON.stringify(annualSalaries));
  }, [annualSalaries]);

  useEffect(() => {
    localStorage.setItem('bookings_abu_ayoub_rates', JSON.stringify(abuAyoubRates));
  }, [abuAyoubRates]);

  useEffect(() => {
    localStorage.setItem('bookings_electricity_by_year', JSON.stringify(electricityByYear));
  }, [electricityByYear]);

  useEffect(() => {
    localStorage.setItem('bookings_water_rate_per_pair', String(waterRatePerPair));
  }, [waterRatePerPair]);"""
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على useEffect حفظ annualSalaries — تحقق يدوياً")

# 4) تعديل yearlyStats لإدخال البنود الجديدة بحساب الرسم البياني
old4 = """  const yearlyStats = useMemo(() => {
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
new4 = """  const yearlyStats = useMemo(() => {
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
if old4 in content:
    content = content.replace(old4, new4, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على yearlyStats — تحقق يدوياً")

# 5) تعديل حساب الإجماليات لإضافة البنود الجديدة
old5 = """  const totalStaffCost = filteredBookings.reduce((sum, b) => sum + (staffRates[b.event_type] || 0), 0);
  const totalSuppliesCost = filteredBookings.reduce((sum, b) => sum + (suppliesRates[b.event_type] || 0), 0);
  const relevantYearsForSalary = selectedYear === 'all' ? availableYears : [selectedYear];
  const totalSalaryCost = relevantYearsForSalary.reduce((sum, y) => sum + getAnnualSalary(y), 0);
  const totalExpenses = totalStaffCost + totalSuppliesCost + totalSalaryCost;"""
new5 = """  const totalStaffCost = filteredBookings.reduce((sum, b) => sum + (staffRates[b.event_type] || 0), 0);
  const totalSuppliesCost = filteredBookings.reduce((sum, b) => sum + (suppliesRates[b.event_type] || 0), 0);
  const totalAbuAyoubCost = filteredBookings.reduce((sum, b) => sum + (abuAyoubRates[b.event_type] || 0), 0);
  const relevantYearsForSalary = selectedYear === 'all' ? availableYears : [selectedYear];
  const totalSalaryCost = relevantYearsForSalary.reduce((sum, y) => sum + getAnnualSalary(y), 0);
  const totalElectricityCost = relevantYearsForSalary.reduce((sum, y) => sum + getElectricity(y), 0);
  const totalWaterCost = Math.ceil(filteredBookings.length / 2) * waterRatePerPair;
  const totalExpenses = totalStaffCost + totalSuppliesCost + totalAbuAyoubCost + totalSalaryCost + totalElectricityCost + totalWaterCost;"""
if old5 in content:
    content = content.replace(old5, new5, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حساب الإجماليات — تحقق يدوياً")

# 6) إضافة حقل عمولة أبو أيوب بجانب المباشرين وقهوة وشاهي بلوحة الإعدادات
old6 = """              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
        </div>"""
new6 = """              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>قهوة وشاهي</span>
                <input
                  type="number"
                  value={suppliesRates[t] ?? 0}
                  onChange={(e) => setSuppliesRate(t, Number(e.target.value) || 0)}
                  style={{ width: '70px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#888', whiteSpace: 'nowrap' }}>عمولة أبو أيوب</span>
                <input
                  type="number"
                  value={abuAyoubRates[t] ?? 0}
                  onChange={(e) => setAbuAyoubRate(t, Number(e.target.value) || 0)}
                  style={{ width: '70px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
                />
              </div>
            </div>
          ))}
        </div>"""
if old6 in content:
    content = content.replace(old6, new6, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حقل قهوة وشاهي بالإعدادات — تحقق يدوياً")

# 7) إضافة حقول الكهرباء السنوية + الماء بجانب الراتب السنوي
old7 = """        <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
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
new7 = """        <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
          {selectedYear === 'all' ? (
            <span style={{ fontSize: '13px', color: '#888' }}>
              اختر سنة معينة من الأعلى لتعديل راتبها السنوي وكهرباءها (الافتراضي: راتب {DEFAULT_ANNUAL_SALARY.toLocaleString()} ر.س، كهرباء {DEFAULT_ANNUAL_ELECTRICITY.toLocaleString()} ر.س)
            </span>
          ) : (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  الكهرباء السنوية {selectedYear} هـ (ر.س)
                </label>
                <input
                  type="number"
                  value={getElectricity(selectedYear)}
                  onChange={(e) => setElectricityForYear(selectedYear, Number(e.target.value) || 0)}
                  style={{ width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
                />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px' }}>
            <label style={{ fontSize: '13px', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              الماء (ر.س لكل حفلتين)
            </label>
            <input
              type="number"
              value={waterRatePerPair}
              onChange={(e) => setWaterRatePerPair(Number(e.target.value) || 0)}
              style={{ width: '100px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontFamily: 'Cairo, sans-serif' }}
            />
          </div>
        </div>
      </div>"""
if old7 in content:
    content = content.replace(old7, new7, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على حقل الراتب السنوي — تحقق يدوياً")

# 8) تحديث بطاقات تقرير PDF/الطباعة لتشمل البنود الجديدة
old8 = """        stats={[
          { label: 'عدد الحجوزات', value: filteredBookings.length, color: '#1B4D7A' },
          { label: 'إجمالي قيمة الحجوزات', value: `${totalRevenue.toLocaleString()} ر.س`, color: '#1B4D7A' },
          { label: 'دخل إضافي', value: `${totalExtraIncome.toLocaleString()} ر.س`, color: '#148F77' },
          { label: 'الإجمالي الكلي', value: `${grandTotal.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'مباشرين/مباشرات', value: `${totalStaffCost.toLocaleString()} ر.س`, color: '#8E44AD' },
          { label: 'قهوة وشاهي ومنظفات', value: `${totalSuppliesCost.toLocaleString()} ر.س`, color: '#B9770E' },
          { label: 'الراتب السنوي', value: `${totalSalaryCost.toLocaleString()} ر.س`, color: '#7f8c8d' },
          { label: 'إجمالي المصاريف', value: `${totalExpenses.toLocaleString()} ر.س`, color: '#D35400' },
          { label: 'صافي الدخل', value: `${totalNet.toLocaleString()} ر.س`, color: '#27ae60' },
        ]}"""
new8 = """        stats={[
          { label: 'عدد الحجوزات', value: filteredBookings.length, color: '#1B4D7A' },
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
        ]}"""
if old8 in content:
    content = content.replace(old8, new8, 1)
    changes += 1
else:
    print("⚠ لم يتم العثور على بطاقات stats بالتقرير — تحقق يدوياً")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print(f"✅ تم تطبيق {changes} من أصل 8 تعديلات على {path}")

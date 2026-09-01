import io

path = "src/Bookings.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) Remove the 6 localStorage-writing useEffects
old1 = """  useEffect(() => {
    localStorage.setItem('bookings_staff_rates', JSON.stringify(staffRates));
  }, [staffRates]);

  useEffect(() => {
    localStorage.setItem('bookings_supplies_rates', JSON.stringify(suppliesRates));
  }, [suppliesRates]);

  useEffect(() => {
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
new1 = "  // إعدادات القاعة تُحفظ مباشرة في Supabase (hall_settings) داخل كل دالة تعديل أدناه"
assert content.count(old1) == 1, f"old1 count: {content.count(old1)}"
content = content.replace(old1, new1)

# 2) setStaffRate -> save to Supabase
old2 = """  function setStaffRate(type, value) {
    setStaffRates((prev) => ({ ...prev, [type]: value }));
  }"""
new2 = """  function setStaffRate(type, value) {
    setStaffRates((prev) => {
      const next = { ...prev, [type]: value };
      supabase.from('hall_settings').upsert({ key: 'bookings_staff_rates', value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('فشل حفظ أسعار المباشرين:', error); });
      return next;
    });
  }"""
assert content.count(old2) == 1, f"old2 count: {content.count(old2)}"
content = content.replace(old2, new2)

# 3) setSuppliesRate -> save to Supabase
old3 = """  function setSuppliesRate(type, value) {
    setSuppliesRates((prev) => ({ ...prev, [type]: value }));
  }"""
new3 = """  function setSuppliesRate(type, value) {
    setSuppliesRates((prev) => {
      const next = { ...prev, [type]: value };
      supabase.from('hall_settings').upsert({ key: 'bookings_supplies_rates', value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('فشل حفظ أسعار القهوة والشاهي:', error); });
      return next;
    });
  }"""
assert content.count(old3) == 1, f"old3 count: {content.count(old3)}"
content = content.replace(old3, new3)

# 4) setAnnualSalaryForYear -> save to Supabase
old4 = """  function setAnnualSalaryForYear(year, value) {
    setAnnualSalaries((prev) => ({ ...prev, [year]: value }));
  }"""
new4 = """  function setAnnualSalaryForYear(year, value) {
    setAnnualSalaries((prev) => {
      const next = { ...prev, [year]: value };
      supabase.from('hall_settings').upsert({ key: 'bookings_annual_salaries', value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('فشل حفظ الرواتب السنوية:', error); });
      return next;
    });
  }"""
assert content.count(old4) == 1, f"old4 count: {content.count(old4)}"
content = content.replace(old4, new4)

# 5) setAbuAyoubRate -> save to Supabase
old5 = """  function setAbuAyoubRate(type, value) {
    setAbuAyoubRates((prev) => ({ ...prev, [type]: value }));
  }"""
new5 = """  function setAbuAyoubRate(type, value) {
    setAbuAyoubRates((prev) => {
      const next = { ...prev, [type]: value };
      supabase.from('hall_settings').upsert({ key: 'bookings_abu_ayoub_rates', value: next, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.error('فشل حفظ عمولة أبو أيوب:', error); });
      return next;
    });
  }"""
assert content.count(old5) == 1, f"old5 count: {content.count(old5)}"
content = content.replace(old5, new5)

# 6) setElectricityForYear -> save to Supabase
old6 = """  function setElectricityForYear(year, value) {
    setElectricityByYear((prev) => ({ ...prev, [year]: value }));
  }"""
new6 = """  function setElectricityForYear(year, value) {
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
  }"""
assert content.count(old6) == 1, f"old6 count: {content.count(old6)}"
content = content.replace(old6, new6)

# 7) update the water rate input's onChange to use the new save-aware function
old7 = "onChange={(e) => setWaterRatePerPair(Number(e.target.value) || 0)}"
new7 = "onChange={(e) => setWaterRatePerPairAndSave(Number(e.target.value) || 0)}"
assert content.count(old7) == 1, f"old7 count: {content.count(old7)}"
content = content.replace(old7, new7)

# 8) load hall_settings inside loadHallAndBookings, right after lockedYears is set
old8 = """      if (lockErr) throw lockErr;
      setLockedYears(new Set((lockData || []).map((l) => l.year)));
    } catch (err) {"""
new8 = """      if (lockErr) throw lockErr;
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
    } catch (err) {"""
assert content.count(old8) == 1, f"old8 count: {content.count(old8)}"
content = content.replace(old8, new8)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ تم تطبيق كل التعديلات بنجاح")
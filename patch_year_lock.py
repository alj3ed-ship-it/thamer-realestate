import io

path = "src/Bookings.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) Add lockedYears state
old1 = """  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');"""
new1 = """  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [lockedYears, setLockedYears] = useState(new Set());"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) Fetch locked years inside loadHallAndBookings
old2 = """      if (extraErr) throw extraErr;
      setExtraIncome(extraData || []);
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل الحجوزات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }"""
new2 = """      if (extraErr) throw extraErr;
      setExtraIncome(extraData || []);

      const { data: lockData, error: lockErr } = await supabase
        .from('hall_year_locks')
        .select('year')
        .eq('property_id', hall.id)
        .eq('locked', true);

      if (lockErr) throw lockErr;
      setLockedYears(new Set((lockData || []).map((l) => l.year)));
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل الحجوزات: ' + err.message);
    } finally {
      setLoading(false);
    }
  }"""
assert content.count(old2) == 1
content = content.replace(old2, new2)

# 3) Add handleToggleYearLock between handleReactivateBooking and handleDeleteExtra
old3 = """  async function handleDeleteExtra(id) {"""
new3 = """  async function handleToggleYearLock(year) {
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

  async function handleDeleteExtra(id) {"""
assert content.count(old3) == 1
content = content.replace(old3, new3)

# 4) Show lock icon on year tabs + add lock/unlock toggle button
old4 = """        {availableYears.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            style={yearTabStyle(selectedYear === y)}
          >
            {y} هـ
          </button>
        ))}
      </div>

      {/* تبويبات نوع الحفلة */}"""
new4 = """        {availableYears.map((y) => (
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

      {/* تبويبات نوع الحفلة */}"""
assert content.count(old4) == 1
content = content.replace(old4, new4)

# 5) Gate row actions behind the lock
old5 = """                        {!isReadOnly && (
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
new5 = """                        {!isReadOnly && (
                        <td style={td}>
                          {lockedYears.has(getHijriYear(b.event_date_hijri)) ? (
                            <span style={{ color: '#7f8c8d', fontSize: '12px', fontWeight: 'bold' }}>🔒 سنة مقفلة</span>
                          ) : (
                            <>
                              <button onClick={() => openEditForm(b)} style={actionBtn('#1B4D7A')}>تعديل</button>
                              {b.booking_status && b.booking_status !== 'active' ? (
                                <button onClick={() => handleReactivateBooking(b)} style={actionBtn('#27ae60')}>إعادة تفعيل</button>
                              ) : (
                                <button onClick={() => handleCancelBooking(b)} style={actionBtn('#f39c12')}>إلغاء</button>
                              )}
                              <button onClick={() => handleDelete(b.id)} style={actionBtn('#e74c3c')}>حذف</button>
                            </>
                          )}
                        </td>
                        )}"""
assert content.count(old5) == 1
content = content.replace(old5, new5)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تطبيق قفل السنوات بنجاح ✅")
# -*- coding: utf-8 -*-
"""
النسخة الشاملة: تطبق على الصفحات كلها (المستأجرون / العقود / الدفعات / الاستحقاقات):
1) فلترة المستأجر تعتمد على العقار المحدد.
2) فلتر نوع الوحدة (قائمة منسدلة ديناميكية: محل/شقة/ورشة + أي نوع جديد يُكتشف تلقائياً).

شغّله من جذر المشروع (بدل السكربت السابق):
    cd C:\\Users\\aljuaid\\Desktop\\thamer-realestate
    python apply_filter_fixes_v2.py
"""

def replace_once(content, old, new, label):
    count = content.count(old)
    if count != 1:
        print(f"[تحذير] لم أجد تطابقاً وحيداً لـ: {label} (عدد التطابقات: {count})")
        print("      -> تخطّيت هذا التعديل.")
        return content, False
    return content.replace(old, new, 1), True


def patch_file(path, patches):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    applied = 0
    for label, old, new in patches:
        content, ok = replace_once(content, old, new, label)
        if ok:
            applied += 1
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"==> {path}: تم تطبيق {applied} من أصل {len(patches)} تعديل.\n")


def unit_select_block(state_var, setter):
    return f'''
                  <div>
                    <label style={{{{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}}}>نوع الوحدة</label>
                    <select value={{{state_var}}} onChange={{(e) => {setter}(e.target.value)}}
                      style={{{{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", minWidth: "140px" }}}}>
                      <option value="">كل الأنواع</option>
                      {{allUnitTypes.map((t) => (
                        <option key={{t}} value={{t}}>{{t}}</option>
                      ))}}
                    </select>
                  </div>'''


# ============================================================
# 1) Entitlements.jsx
# ============================================================
entitlements_patches = [
    (
        "state نوع الوحدة",
        '''  const [selectedTenants, setSelectedTenants] = useState([]);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [tenantSearchText, setTenantSearchText] = useState("");''',
        '''  const [selectedTenants, setSelectedTenants] = useState([]);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [tenantSearchText, setTenantSearchText] = useState("");
  const [selectedUnitType, setSelectedUnitType] = useState("");''',
    ),
    (
        "فلترة المستأجر حسب العقار + قائمة أنواع الوحدات",
        '''  const filteredTenantOptions = uniqueTenants.filter((name) =>
    name.toLowerCase().includes(tenantSearchText.toLowerCase())
  );''',
        '''  const filteredTenantOptions = uniqueTenants
    .filter((name) => {
      if (selectedProperties.length === 0) return true;
      return payments.some(
        (p) => p.leases?.tenants?.name === name && selectedProperties.includes(p.leases?.property_id)
      );
    })
    .filter((name) => name.toLowerCase().includes(tenantSearchText.toLowerCase()));

  const uniqueUnitTypes = useMemo(() => {
    const set = new Set();
    payments.forEach((p) => {
      (p.leases?.lease_units || []).forEach((lu) => {
        const t = lu.units?.unit_type;
        if (t) set.add(t.trim());
      });
    });
    const known = ["محل", "شقة", "ورشة"];
    const knownPresent = known.filter((k) => set.has(k));
    const others = Array.from(set).filter((t) => !known.includes(t)).sort((a, b) => a.localeCompare(b, "ar"));
    return [...knownPresent, ...others];
  }, [payments]);''',
    ),
    (
        "فلترة النتائج حسب نوع الوحدة",
        '''      const units = lease.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
      let sortType = 99;''',
        '''      const units = lease.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
      if (selectedUnitType && !units.some((u) => (u.unit_type || "").trim() === selectedUnitType)) continue;
      let sortType = 99;''',
    ),
    (
        "قائمة نوع الوحدة المنسدلة (UI)",
        '''        <button onClick={handleSearch}
          style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
          بحث
        </button>''',
        '''        <div>
          <label style={{ display: "block", fontSize: "13px", color: "#555", marginBottom: "6px", fontWeight: "bold" }}>نوع الوحدة</label>
          <select value={selectedUnitType} onChange={(e) => setSelectedUnitType(e.target.value)}
            style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontFamily: "Cairo, sans-serif", minWidth: "140px" }}>
            <option value="">كل الأنواع</option>
            {uniqueUnitTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <button onClick={handleSearch}
          style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Cairo, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
          بحث
        </button>''',
    ),
]

# ============================================================
# 2) ViewerLimited.jsx
# ============================================================
viewer_limited_patches = [
    (
        "دالة مساعدة لتصفية المستأجرين حسب العقار + قائمة أنواع الوحدات",
        '''  const allTenantNames = useMemo(() => {
    return allowedTenants.map((t) => t.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
  }, [allowedTenants]);

  const leasesFilteredTenantOptions = allTenantNames.filter((name) =>
    name.toLowerCase().includes(leasesTenantSearchText.toLowerCase())
  );
  const tenantsFilteredTenantOptions = allTenantNames.filter((name) =>
    name.toLowerCase().includes(tenantsTenantSearchText.toLowerCase())
  );
  const paymentsFilteredTenantOptions = allTenantNames.filter((name) =>
    name.toLowerCase().includes(paymentsTenantSearchText.toLowerCase())
  );''',
        '''  const allTenantNames = useMemo(() => {
    return allowedTenants.map((t) => t.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
  }, [allowedTenants]);

  function tenantOptionsForProperties(selectedProps) {
    const list = selectedProps.length === 0
      ? allowedTenants
      : allowedTenants.filter((t) => allowedLeases.some((l) => l.tenant_id === t.id && selectedProps.includes(l.property_id)));
    return list.map((t) => t.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
  }

  const allUnitTypes = useMemo(() => {
    const set = new Set();
    allowedLeases.forEach((l) => {
      (l.lease_units || []).forEach((lu) => {
        const t = lu.units?.unit_type;
        if (t) set.add(t.trim());
      });
    });
    const known = ["محل", "شقة", "ورشة"];
    const knownPresent = known.filter((k) => set.has(k));
    const others = Array.from(set).filter((t) => !known.includes(t)).sort((a, b) => a.localeCompare(b, "ar"));
    return [...knownPresent, ...others];
  }, [allowedLeases]);

  const leasesFilteredTenantOptions = tenantOptionsForProperties(leasesSelectedProperties).filter((name) =>
    name.toLowerCase().includes(leasesTenantSearchText.toLowerCase())
  );
  const tenantsFilteredTenantOptions = tenantOptionsForProperties(tenantsSelectedProperties).filter((name) =>
    name.toLowerCase().includes(tenantsTenantSearchText.toLowerCase())
  );
  const paymentsFilteredTenantOptions = tenantOptionsForProperties(paymentsSelectedProperties).filter((name) =>
    name.toLowerCase().includes(paymentsTenantSearchText.toLowerCase())
  );''',
    ),
    (
        "فلترة مستأجري الاستحقاقات حسب العقار",
        '''  const entFilteredTenantOptions = entUniqueTenants.filter((name) =>
    name.toLowerCase().includes(entTenantSearchText.toLowerCase())
  );''',
        '''  const entFilteredTenantOptions = tenantOptionsForProperties(entSelectedProperties).filter((name) =>
    name.toLowerCase().includes(entTenantSearchText.toLowerCase())
  );''',
    ),
    (
        "state نوع الوحدة - المستأجرون",
        '''  const [tenantsTenantSearchText, setTenantsTenantSearchText] = useState("");''',
        '''  const [tenantsTenantSearchText, setTenantsTenantSearchText] = useState("");
  const [tenantsSelectedUnitType, setTenantsSelectedUnitType] = useState("");''',
    ),
    (
        "state نوع الوحدة - العقود",
        '''  const [leasesTenantSearchText, setLeasesTenantSearchText] = useState("");''',
        '''  const [leasesTenantSearchText, setLeasesTenantSearchText] = useState("");
  const [leasesSelectedUnitType, setLeasesSelectedUnitType] = useState("");''',
    ),
    (
        "state نوع الوحدة - الدفعات",
        '''  const [paymentsTenantSearchText, setPaymentsTenantSearchText] = useState("");''',
        '''  const [paymentsTenantSearchText, setPaymentsTenantSearchText] = useState("");
  const [paymentsSelectedUnitType, setPaymentsSelectedUnitType] = useState("");''',
    ),
    (
        "state نوع الوحدة - الاستحقاقات",
        '''  const [entTenantSearchText, setEntTenantSearchText] = useState("");''',
        '''  const [entTenantSearchText, setEntTenantSearchText] = useState("");
  const [entSelectedUnitType, setEntSelectedUnitType] = useState("");''',
    ),
    (
        "فلترة قائمة المستأجرين حسب نوع الوحدة",
        '''  const filteredTenants = allowedTenants.filter(t => {
    if (tenantsSelectedTenants.length > 0 && !tenantsSelectedTenants.includes(t.name)) return false;
    if (tenantsSelectedProperties.length > 0) {
      const tLeases = allowedLeases.filter(l => l.tenant_id === t.id);
      const matches = tLeases.some(l => tenantsSelectedProperties.includes(l.property_id));
      if (!matches) return false;
    }
    return true;
  });''',
        '''  const filteredTenants = allowedTenants.filter(t => {
    if (tenantsSelectedTenants.length > 0 && !tenantsSelectedTenants.includes(t.name)) return false;
    if (tenantsSelectedProperties.length > 0) {
      const tLeases = allowedLeases.filter(l => l.tenant_id === t.id);
      const matches = tLeases.some(l => tenantsSelectedProperties.includes(l.property_id));
      if (!matches) return false;
    }
    if (tenantsSelectedUnitType) {
      const hasType = t._sort.units.some(u => (u.unit_type || "").trim() === tenantsSelectedUnitType);
      if (!hasType) return false;
    }
    return true;
  });''',
    ),
    (
        "فلترة قائمة العقود حسب نوع الوحدة",
        '''  const filteredLeases = sortedAllowedLeases.filter(l => {
    if (leasesSelectedProperties.length > 0 && !leasesSelectedProperties.includes(l.property_id)) return false;
    if (leasesSelectedTenants.length > 0) {
      const tenantName = tenants.find(t => t.id === l.tenant_id)?.name;
      if (!leasesSelectedTenants.includes(tenantName)) return false;
    }
    return true;
  });''',
        '''  const filteredLeases = sortedAllowedLeases.filter(l => {
    if (leasesSelectedProperties.length > 0 && !leasesSelectedProperties.includes(l.property_id)) return false;
    if (leasesSelectedTenants.length > 0) {
      const tenantName = tenants.find(t => t.id === l.tenant_id)?.name;
      if (!leasesSelectedTenants.includes(tenantName)) return false;
    }
    if (leasesSelectedUnitType) {
      const unitsList = l.lease_units?.map(lu => lu.units).filter(Boolean) || [];
      if (!unitsList.some(u => (u.unit_type || "").trim() === leasesSelectedUnitType)) return false;
    }
    return true;
  });''',
    ),
    (
        "فلترة قائمة الدفعات حسب نوع الوحدة",
        '''  const filteredPaymentsList = allowedPayments
    .filter((p) => {
      if (paymentsSelectedProperties.length > 0 && !paymentsSelectedProperties.includes(p.leases?.property_id)) return false;
      if (paymentsSelectedTenants.length > 0 && !paymentsSelectedTenants.includes(p.leases?.tenants?.name)) return false;
      return true;
    })''',
        '''  const filteredPaymentsList = allowedPayments
    .filter((p) => {
      if (paymentsSelectedProperties.length > 0 && !paymentsSelectedProperties.includes(p.leases?.property_id)) return false;
      if (paymentsSelectedTenants.length > 0 && !paymentsSelectedTenants.includes(p.leases?.tenants?.name)) return false;
      if (paymentsSelectedUnitType) {
        const unitsList = p.leases?.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
        if (!unitsList.some((u) => (u.unit_type || "").trim() === paymentsSelectedUnitType)) return false;
      }
      return true;
    })''',
    ),
    (
        "فلترة نتائج الاستحقاقات حسب نوع الوحدة",
        '''      const unitsList = lease.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
      const status = computeStatus(row, hijri);''',
        '''      const unitsList = lease.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
      if (entSelectedUnitType && !unitsList.some((u) => (u.unit_type || "").trim() === entSelectedUnitType)) continue;
      const status = computeStatus(row, hijri);''',
    ),
    (
        "UI نوع الوحدة - المستأجرون",
        '''                        {tenantsFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={tenantsSelectedTenants.includes(name)}
                              onChange={() => setTenantsSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="tenants-table">''',
        '''                        {tenantsFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={tenantsSelectedTenants.includes(name)}
                              onChange={() => setTenantsSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
'''
        + unit_select_block("tenantsSelectedUnitType", "setTenantsSelectedUnitType")
        + '''
                </div>

                <div id="tenants-table">''',
    ),
    (
        "UI نوع الوحدة - العقود",
        '''                        {leasesFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={leasesSelectedTenants.includes(name)}
                              onChange={() => setLeasesSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="leases-table">''',
        '''                        {leasesFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={leasesSelectedTenants.includes(name)}
                              onChange={() => setLeasesSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
'''
        + unit_select_block("leasesSelectedUnitType", "setLeasesSelectedUnitType")
        + '''
                </div>

                <div id="leases-table">''',
    ),
    (
        "UI نوع الوحدة - الدفعات",
        '''                        {paymentsFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={paymentsSelectedTenants.includes(name)}
                              onChange={() => setPaymentsSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="payments-table">''',
        '''                        {paymentsFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={paymentsSelectedTenants.includes(name)}
                              onChange={() => setPaymentsSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
'''
        + unit_select_block("paymentsSelectedUnitType", "setPaymentsSelectedUnitType")
        + '''
                </div>

                <div id="payments-table">''',
    ),
    (
        "UI نوع الوحدة - الاستحقاقات",
        '''                  <button onClick={handleEntitlementsSearch}
                    style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
                    بحث
                  </button>''',
        unit_select_block("entSelectedUnitType", "setEntSelectedUnitType")
        + '''

                  <button onClick={handleEntitlementsSearch}
                    style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
                    بحث
                  </button>''',
    ),
]

# ============================================================
# 3) ViewerLayout.jsx
# ============================================================
viewer_layout_patches = [
    (
        "دالة مساعدة لتصفية المستأجرين حسب العقار + قائمة أنواع الوحدات",
        '''  const allTenantNames = useMemo(() => {
    return tenants.map((t) => t.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
  }, [tenants]);

  const leasesFilteredTenantOptions = allTenantNames.filter((name) =>
    name.toLowerCase().includes(leasesTenantSearchText.toLowerCase())
  );
  const tenantsFilteredTenantOptions = allTenantNames.filter((name) =>
    name.toLowerCase().includes(tenantsTenantSearchText.toLowerCase())
  );
  const paymentsFilteredTenantOptions = allTenantNames.filter((name) =>
    name.toLowerCase().includes(paymentsTenantSearchText.toLowerCase())
  );''',
        '''  const allTenantNames = useMemo(() => {
    return tenants.map((t) => t.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
  }, [tenants]);

  function tenantOptionsForProperties(selectedProps) {
    const list = selectedProps.length === 0
      ? tenants
      : tenants.filter((t) => leases.some((l) => l.tenant_id === t.id && selectedProps.includes(l.property_id)));
    return list.map((t) => t.name).filter(Boolean).sort((a, b) => a.localeCompare(b, "ar"));
  }

  const allUnitTypes = useMemo(() => {
    const set = new Set();
    units.forEach((u) => { if (u.unit_type) set.add(u.unit_type.trim()); });
    const known = ["محل", "شقة", "ورشة"];
    const knownPresent = known.filter((k) => set.has(k));
    const others = Array.from(set).filter((t) => !known.includes(t)).sort((a, b) => a.localeCompare(b, "ar"));
    return [...knownPresent, ...others];
  }, [units]);

  const leasesFilteredTenantOptions = tenantOptionsForProperties(leasesSelectedProperties).filter((name) =>
    name.toLowerCase().includes(leasesTenantSearchText.toLowerCase())
  );
  const tenantsFilteredTenantOptions = tenantOptionsForProperties(tenantsSelectedProperties).filter((name) =>
    name.toLowerCase().includes(tenantsTenantSearchText.toLowerCase())
  );
  const paymentsFilteredTenantOptions = tenantOptionsForProperties(paymentsSelectedProperties).filter((name) =>
    name.toLowerCase().includes(paymentsTenantSearchText.toLowerCase())
  );''',
    ),
    (
        "فلترة مستأجري الاستحقاقات حسب العقار",
        '''  const entFilteredTenantOptions = entUniqueTenants.filter((name) =>
    name.toLowerCase().includes(entTenantSearchText.toLowerCase())
  );''',
        '''  const entFilteredTenantOptions = tenantOptionsForProperties(entSelectedProperties).filter((name) =>
    name.toLowerCase().includes(entTenantSearchText.toLowerCase())
  );''',
    ),
    (
        "state نوع الوحدة - المستأجرون",
        '''  const [tenantsTenantSearchText, setTenantsTenantSearchText] = useState("");''',
        '''  const [tenantsTenantSearchText, setTenantsTenantSearchText] = useState("");
  const [tenantsSelectedUnitType, setTenantsSelectedUnitType] = useState("");''',
    ),
    (
        "state نوع الوحدة - العقود",
        '''  const [leasesTenantSearchText, setLeasesTenantSearchText] = useState("");''',
        '''  const [leasesTenantSearchText, setLeasesTenantSearchText] = useState("");
  const [leasesSelectedUnitType, setLeasesSelectedUnitType] = useState("");''',
    ),
    (
        "state نوع الوحدة - الدفعات",
        '''  const [paymentsTenantSearchText, setPaymentsTenantSearchText] = useState("");''',
        '''  const [paymentsTenantSearchText, setPaymentsTenantSearchText] = useState("");
  const [paymentsSelectedUnitType, setPaymentsSelectedUnitType] = useState("");''',
    ),
    (
        "state نوع الوحدة - الاستحقاقات",
        '''  const [entTenantSearchText, setEntTenantSearchText] = useState("");''',
        '''  const [entTenantSearchText, setEntTenantSearchText] = useState("");
  const [entSelectedUnitType, setEntSelectedUnitType] = useState("");''',
    ),
    (
        "فلترة قائمة المستأجرين حسب نوع الوحدة",
        '''  const filteredTenants = sortedTenants.filter(t => {
    if (tenantsSelectedTenants.length > 0 && !tenantsSelectedTenants.includes(t.name)) return false;
    if (tenantsSelectedProperties.length > 0) {
      const tLeases = leases.filter(l => l.tenant_id === t.id);
      const matches = tLeases.some(l => tenantsSelectedProperties.includes(l.property_id));
      if (!matches) return false;
    }
    return true;
  });''',
        '''  const filteredTenants = sortedTenants.filter(t => {
    if (tenantsSelectedTenants.length > 0 && !tenantsSelectedTenants.includes(t.name)) return false;
    if (tenantsSelectedProperties.length > 0) {
      const tLeases = leases.filter(l => l.tenant_id === t.id);
      const matches = tLeases.some(l => tenantsSelectedProperties.includes(l.property_id));
      if (!matches) return false;
    }
    if (tenantsSelectedUnitType) {
      const hasType = t._sort.units.some(u => (u.unit_type || "").trim() === tenantsSelectedUnitType);
      if (!hasType) return false;
    }
    return true;
  });''',
    ),
    (
        "فلترة قائمة العقود حسب نوع الوحدة",
        '''  const filteredLeases = sortedLeases.filter(l => {
    if (leasesSelectedProperties.length > 0 && !leasesSelectedProperties.includes(l.property_id)) return false;
    if (leasesSelectedTenants.length > 0) {
      const tenantName = tenants.find(t => t.id === l.tenant_id)?.name;
      if (!leasesSelectedTenants.includes(tenantName)) return false;
    }
    return true;
  });''',
        '''  const filteredLeases = sortedLeases.filter(l => {
    if (leasesSelectedProperties.length > 0 && !leasesSelectedProperties.includes(l.property_id)) return false;
    if (leasesSelectedTenants.length > 0) {
      const tenantName = tenants.find(t => t.id === l.tenant_id)?.name;
      if (!leasesSelectedTenants.includes(tenantName)) return false;
    }
    if (leasesSelectedUnitType) {
      const unitsList = l.lease_units?.map(lu => lu.units).filter(Boolean) || [];
      if (!unitsList.some(u => (u.unit_type || "").trim() === leasesSelectedUnitType)) return false;
    }
    return true;
  });''',
    ),
    (
        "فلترة قائمة الدفعات حسب نوع الوحدة",
        '''  const filteredPaymentsList = payments
    .filter((p) => {
      if (paymentsSelectedProperties.length > 0 && !paymentsSelectedProperties.includes(p.leases?.property_id)) return false;
      if (paymentsSelectedTenants.length > 0 && !paymentsSelectedTenants.includes(p.leases?.tenants?.name)) return false;
      return true;
    })''',
        '''  const filteredPaymentsList = payments
    .filter((p) => {
      if (paymentsSelectedProperties.length > 0 && !paymentsSelectedProperties.includes(p.leases?.property_id)) return false;
      if (paymentsSelectedTenants.length > 0 && !paymentsSelectedTenants.includes(p.leases?.tenants?.name)) return false;
      if (paymentsSelectedUnitType) {
        const unitsList = p.leases?.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
        if (!unitsList.some((u) => (u.unit_type || "").trim() === paymentsSelectedUnitType)) return false;
      }
      return true;
    })''',
    ),
    (
        "فلترة نتائج الاستحقاقات حسب نوع الوحدة",
        '''      const unitsList = lease.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
      const status = computeStatus(row);''',
        '''      const unitsList = lease.lease_units?.map((lu) => lu.units).filter(Boolean) || [];
      if (entSelectedUnitType && !unitsList.some((u) => (u.unit_type || "").trim() === entSelectedUnitType)) continue;
      const status = computeStatus(row);''',
    ),
    (
        "UI نوع الوحدة - المستأجرون",
        '''                        {tenantsFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={tenantsSelectedTenants.includes(name)}
                              onChange={() => setTenantsSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="tenants-table">''',
        '''                        {tenantsFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={tenantsSelectedTenants.includes(name)}
                              onChange={() => setTenantsSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
'''
        + unit_select_block("tenantsSelectedUnitType", "setTenantsSelectedUnitType")
        + '''
                </div>

                <div id="tenants-table">''',
    ),
    (
        "UI نوع الوحدة - العقود",
        '''                        {leasesFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={leasesSelectedTenants.includes(name)}
                              onChange={() => setLeasesSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="leases-table">''',
        '''                        {leasesFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={leasesSelectedTenants.includes(name)}
                              onChange={() => setLeasesSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
'''
        + unit_select_block("leasesSelectedUnitType", "setLeasesSelectedUnitType")
        + '''
                </div>

                <div id="leases-table">''',
    ),
    (
        "UI نوع الوحدة - الدفعات",
        '''                        {paymentsFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={paymentsSelectedTenants.includes(name)}
                              onChange={() => setPaymentsSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="payments-table">''',
        '''                        {paymentsFilteredTenantOptions.map((name) => (
                          <label key={name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", fontSize: "14px", cursor: "pointer" }}>
                            <input type="checkbox" checked={paymentsSelectedTenants.includes(name)}
                              onChange={() => setPaymentsSelectedTenants((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])} />
                            {name}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
'''
        + unit_select_block("paymentsSelectedUnitType", "setPaymentsSelectedUnitType")
        + '''
                </div>

                <div id="payments-table">''',
    ),
    (
        "UI نوع الوحدة - الاستحقاقات",
        '''                  <button onClick={handleEntitlementsSearch}
                    style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
                    بحث
                  </button>''',
        unit_select_block("entSelectedUnitType", "setEntSelectedUnitType")
        + '''

                  <button onClick={handleEntitlementsSearch}
                    style={{ background: "#1B4D7A", color: "#fff", padding: "9px 28px", borderRadius: "8px", border: "none", fontSize: "14px", fontFamily: "Tahoma, Arial, sans-serif", cursor: "pointer", fontWeight: "bold" }}>
                    بحث
                  </button>''',
    ),
]


if __name__ == "__main__":
    patch_file("src/Entitlements.jsx", entitlements_patches)
    patch_file("src/ViewerLimited.jsx", viewer_limited_patches)
    patch_file("src/ViewerLayout.jsx", viewer_layout_patches)
    print("انتهى. أي سطر [تحذير] يعني ما لقيت المكان بالضبط — أرسل لي محتوى ذاك الجزء من الملف وأصلحه يدوياً.")

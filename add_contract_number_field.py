import io

path = "src/Letters.jsx"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1) سحب lease_number من قاعدة البيانات مع باقي بيانات العقد
old1 = '''    const { data, error } = await supabase.from("leases").select(`
      id,
      tenants ( name, phone ),
      properties ( name ),
      lease_units ( units ( unit_number, unit_type ) )
    `);'''
new1 = '''    const { data, error } = await supabase.from("leases").select(`
      id,
      lease_number,
      tenants ( name, phone ),
      properties ( name ),
      lease_units ( units ( unit_number, unit_type ) )
    `);'''
assert content.count(old1) == 1, f"old1 = {content.count(old1)}"
content = content.replace(old1, new1)

old1b = '''      const retry = await supabase.from("leases").select(`
        id,
        tenants ( name ),
        properties ( name ),
        lease_units ( units ( unit_number, unit_type ) )
      `);'''
new1b = '''      const retry = await supabase.from("leases").select(`
        id,
        lease_number,
        tenants ( name ),
        properties ( name ),
        lease_units ( units ( unit_number, unit_type ) )
      `);'''
assert content.count(old1b) == 1, f"old1b = {content.count(old1b)}"
content = content.replace(old1b, new1b)

# 2) إضافة contract_number ضمن leaseOptions
old2 = '''      .map((l) => ({
        id: l.id,
        tenant: l.tenants?.name || "",
        phone: l.tenants?.phone || "",
        property: l.properties?.name || "",'''
new2 = '''      .map((l) => ({
        id: l.id,
        tenant: l.tenants?.name || "",
        phone: l.tenants?.phone || "",
        contractNumber: l.lease_number || "",
        property: l.properties?.name || "",'''
assert content.count(old2) == 1, f"old2 = {content.count(old2)}"
content = content.replace(old2, new2)

# 3) إضافة state جديد لرقم العقد
old3 = '  const [amount, setAmount] = useState("");'
new3 = '  const [amount, setAmount] = useState("");\n  const [contractNumber, setContractNumber] = useState("");'
assert content.count(old3) == 1, f"old3 = {content.count(old3)}"
content = content.replace(old3, new3)

# 4) تعبئة contractNumber عند اختيار المستأجر
old4 = '''      setTenantName(found.tenant);
      setPropertyName(found.property);
      setUnitText(found.unit);
      setLeaseSearch(`${found.tenant} — ${found.property} (${found.unit || "بدون وحدة"})`);
      applyTemplate(letterTypeKey, {
        tenant: found.tenant,
        property: found.property,
        unit: found.unit,
        amount,
      });'''
new4 = '''      setTenantName(found.tenant);
      setPropertyName(found.property);
      setUnitText(found.unit);
      setContractNumber(found.contractNumber);
      setLeaseSearch(`${found.tenant} — ${found.property} (${found.unit || "بدون وحدة"})`);
      applyTemplate(letterTypeKey, {
        tenant: found.tenant,
        property: found.property,
        unit: found.unit,
        amount,
        contractNumber: found.contractNumber,
      });'''
assert content.count(old4) == 1, f"old4 = {content.count(old4)}"
content = content.replace(old4, new4)

# 5) تمرير contractNumber ضمن applyTemplate الأساسية
old5 = '''    const ctx = {
      tenant: overrides.tenant ?? tenantName,
      property: overrides.property ?? propertyName,
      unit: overrides.unit ?? unitText,
      amount: overrides.amount ?? amount,
    };'''
new5 = '''    const ctx = {
      tenant: overrides.tenant ?? tenantName,
      property: overrides.property ?? propertyName,
      unit: overrides.unit ?? unitText,
      amount: overrides.amount ?? amount,
      contractNumber: overrides.contractNumber ?? contractNumber,
    };'''
assert content.count(old5) == 1, f"old5 = {content.count(old5)}"
content = content.replace(old5, new5)

# 6) استبدال قالب "طلب شهادة تسجيل ضريبي" بالنص النهائي المتفق عليه
old6 = '''    key: "tax_certificate_request",
    label: "طلب شهادة تسجيل ضريبي",
    buildBody: ({ tenant, property, unit }) =>
      `المكرم / ${tenant || "..........."}\\n\\nالسلام عليكم ورحمة الله وبركاته، وبعد:\\n\\nإشارةً إلى عقد الإيجار المبرم بينكم وبين مكتبنا بخصوص الوحدة (${unit || "..........."}) الكائنة ضمن ${property || "..........."}، ونظراً لالتزام مكتبنا بإصدار الفواتير الضريبية وفق الأنظمة والتعليمات الصادرة عن هيئة الزكاة والضريبة والجمارك (ZATCA)، فإننا نأمل من سعادتكم موافاتنا بنسخة من شهادة التسجيل الضريبي الخاصة بكم (متضمنة الرقم الضريبي)، وذلك لاستكمال متطلبات إصدار الفاتورة الضريبية المتعلقة بالعقد المذكور.\\n\\nيرجى التكرم بإرسال المستند عبر البريد الإلكتروني أو وسيلة التواصل المتاحة لديكم في أقرب وقت ممكن، تسهيلاً لإجراءات الفوترة من جانبنا.\\n\\nشاكرين لكم حسن تعاونكم، ودمتم بخير.`,'''
new6 = '''    key: "tax_certificate_request",
    label: "طلب شهادة تسجيل ضريبي",
    buildBody: ({ tenant, property, unit, contractNumber }) =>
      `المكرم / ${tenant || "..........."}\\n\\nالسلام عليكم ورحمة الله وبركاته، وبعد:\\n\\nإشارةً إلى عقد الإيجار رقم ${contractNumber || "..........."} بخصوص الوحدة (${unit || "..........."}) الكائنة ضمن ${property || "..........."}، ونظراً لالتزام مكتبنا بإصدار الفواتير الضريبية وفق الأنظمة والتعليمات الصادرة عن هيئة الزكاة والضريبة والجمارك (ZATCA)، فإننا نأمل موافاتنا بنسخة من الشهادة الضريبية الخاصة بكم، وذلك لاستكمال متطلبات إصدار الفاتورة الضريبية المتعلقة بالعقد المذكور.\\n\\nيرجى التكرم بإرسال الشهادة الضريبية عبر واتساب المكتب في أقرب وقت ممكن، تسهيلاً لإجراءات الفوترة من جانبنا.\\n\\nشاكرين لكم حسن تعاونكم، ودمتم بخير.`,'''
assert content.count(old6) == 1, f"old6 = {content.count(old6)}"
content = content.replace(old6, new6)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم بنجاح ✅")
import pathlib

path = pathlib.Path("src/lib/zatca/standardTaxInvoiceTemplate.js")
content = path.read_text(encoding="utf-8")

old = "  populated_template = populated_template.replace('SET_BILLING_REFERENCE', '')\n"
new = (
    "  const billingReferenceBlock = props.cancelation?.billing_reference\n"
    "    ? `<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${props.cancelation.billing_reference.id}</cbc:ID></cac:InvoiceDocumentReference></cac:BillingReference>`\n"
    "    : ''\n"
    "  populated_template = populated_template.replace('SET_BILLING_REFERENCE', billingReferenceBlock)\n"
)

assert content.count(old) == 1, f"عدد النتائج غير متوقع: {content.count(old)}"
content = content.replace(old, new)
path.write_text(content, encoding="utf-8")
print("تم التعديل بنجاح ✅")
path = "src/lib/zatcaCompliance.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  if (process.env.ZATCA_PRIVATE_KEY && process.env.ZATCA_COMPLIANCE_CERTIFICATE) {
    return {
      egs_uuid: process.env.ZATCA_EGS_UUID,
      private_key: unescapeNewlines(process.env.ZATCA_PRIVATE_KEY),
      csr: unescapeNewlines(process.env.ZATCA_CSR),
      compliance_certificate: unescapeNewlines(process.env.ZATCA_COMPLIANCE_CERTIFICATE),
      compliance_api_secret: process.env.ZATCA_COMPLIANCE_API_SECRET,
    }
  }"""

assert content.count(old) == 1, f"Expected 1 match, found {content.count(old)}"

new = """  if (process.env.ZATCA_PRIVATE_KEY && process.env.ZATCA_COMPLIANCE_CERTIFICATE) {
    let compliance_request_id = process.env.ZATCA_COMPLIANCE_REQUEST_ID

    // Fallback: compliance_request_id isn't in Vercel env vars yet, but it
    // exists in the local sandbox JSON file — read just that one field.
    if (!compliance_request_id && fs.existsSync(CREDENTIALS_FILE)) {
      const fileCreds = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
      compliance_request_id = fileCreds.compliance_request_id
    }

    return {
      egs_uuid: process.env.ZATCA_EGS_UUID,
      private_key: unescapeNewlines(process.env.ZATCA_PRIVATE_KEY),
      csr: unescapeNewlines(process.env.ZATCA_CSR),
      compliance_certificate: unescapeNewlines(process.env.ZATCA_COMPLIANCE_CERTIFICATE),
      compliance_api_secret: process.env.ZATCA_COMPLIANCE_API_SECRET,
      compliance_request_id,
    }
  }"""

content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم إصلاح compliance_request_id بنجاح")
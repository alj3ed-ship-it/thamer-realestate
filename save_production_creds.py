path = "src/lib/zatcaCompliance.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """  const ok = response.status >= 200 && response.status < 300
  if (!ok) {
    throw new Error(`فشل طلب شهادة الإنتاج (HTTP ${response.status}): ${JSON.stringify(response.data)}`)
  }

  return {
    production_certificate: response.data?.binarySecurityToken,
    production_api_secret: response.data?.secret,
    request_id: response.data?.requestID,
    disposition_message: response.data?.dispositionMessage,
    raw: response.data,
  }
}"""

assert content.count(old) == 1, f"Expected 1 match, found {content.count(old)}"

new = """  const ok = response.status >= 200 && response.status < 300
  if (!ok) {
    throw new Error(`فشل طلب شهادة الإنتاج (HTTP ${response.status}): ${JSON.stringify(response.data)}`)
  }

  const result = {
    production_certificate: response.data?.binarySecurityToken,
    production_api_secret: response.data?.secret,
    request_id: response.data?.requestID,
    disposition_message: response.data?.dispositionMessage,
    raw: response.data,
  }

  // Persist alongside the existing sandbox compliance credentials so
  // subsequent calls (real invoice submission) can read them back.
  if (fs.existsSync(CREDENTIALS_FILE)) {
    const existing = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'))
    existing.production_certificate = result.production_certificate
    existing.production_api_secret = result.production_api_secret
    existing.production_request_id = result.request_id
    existing.production_onboarded_at = new Date().toISOString()
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(existing, null, 2), 'utf8')
  }

  return result
}"""

content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم إضافة الحفظ التلقائي بنجاح")
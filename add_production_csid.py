path = "src/lib/zatcaCompliance.js"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    invoice_type: noteType === 'debit_note' ? 'إشعار مدين' : 'إشعار دائن',
    compliance: {
      passed,
      status,
      http_status: response.status,
      messages: {
        info: validation?.infoMessages || [],
        warnings: validation?.warningMessages || [],
        errors: validation?.errorMessages || [],
      },
      raw: response.data,
    },
  }
}"""

assert content.count(old) == 1, f"Expected 1 match, found {content.count(old)}"

new = old + """


export async function runProductionCsidOnboarding() {
  const credentials = loadCredentials()
  assertCredentials(credentials)

  if (!credentials.compliance_request_id) {
    throw new Error('compliance_request_id غير موجود ببيانات الاعتماد — لا يمكن طلب شهادة الإنتاج')
  }

  const response = await axios.post(
    `${SANDBOX_BASEURL}/production/csids`,
    {
      compliance_request_id: String(credentials.compliance_request_id),
    },
    {
      headers: {
        'Accept-Version': 'V2',
        'Accept-Language': 'en',
        ...getAuthHeaders(credentials.compliance_certificate, credentials.compliance_api_secret),
      },
      validateStatus: () => true,
    }
  )

  const ok = response.status >= 200 && response.status < 300
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

content = content.replace(old, new)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم إضافة runProductionCsidOnboarding بنجاح")
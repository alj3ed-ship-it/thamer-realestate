import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { supabase } from './supabaseClient'
import { useReadOnly } from './ReadOnlyContext'

const INVOICE_TYPES = ['ضريبية', 'ضريبية مبسطة']
const VAT_RATE = 15

function emptyItem() {
  return { key: Math.random().toString(36).slice(2), description: '', quantity: '1', unit_price: '' }
}

function emptyForm() {
  return {
    organization_id: '',
    invoice_type: 'ضريبية مبسطة',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    customer_name: '',
    customer_vat_number: '',
    customer_cr_number: '',
    customer_city: '',
    customer_address: '',
    customer_id_number: '',
    customer_id_type: '',
    customer_phone: '',
    amount_paid: '',
    lease_id: '',
    items: [emptyItem()],
  }
}

function lineAmounts(item) {
  const qty = Number(item.quantity) || 0
  const price = Number(item.unit_price) || 0
  const lineTotal = qty * price
  const vatAmount = lineTotal * (VAT_RATE / 100)
  return { lineTotal, vatAmount, gross: lineTotal + vatAmount }
}

function Invoices({ onBack }) {
  useEffect(() => {
    if (!document.getElementById('tajawal-font-link')) {
      const link = document.createElement('link')
      link.id = 'tajawal-font-link'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap'
      document.head.appendChild(link)
    }
  }, [])
  const isReadOnly = useReadOnly()
  const [organizations, setOrganizations] = useState([])
  const [tenants, setTenants] = useState([])
  const [tenantSearchText, setTenantSearchText] = useState('')
  const [leases, setLeases] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [printingInvoice, setPrintingInvoice] = useState(null)
  const printAreaRef = useRef(null)
  const [invoices, setInvoices] = useState([])
  const [status, setStatus] = useState('loading')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [editingInvoiceId, setEditingInvoiceId] = useState(null)
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState('')
  const [zatcaChecks, setZatcaChecks] = useState({})
  const [noteForm, setNoteForm] = useState(null) // { invoice, noteType, reason, items }
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [noteResult, setNoteResult] = useState(null)
  const [zatcaEnvironment, setZatcaEnvironment] = useState(null) // 'sandbox' | 'simulation' | 'production' | null (loading/unknown)
  const [prodSubmissions, setProdSubmissions] = useState({}) // { [invoiceId]: { loading, error, result } }
  const [prodConfirm, setProdConfirm] = useState(null) // { invoice, submissionType, confirmText }
  const [prodConfirmSubmitting, setProdConfirmSubmitting] = useState(false)
  const [settingsModal, setSettingsModal] = useState(null) // { organization_id, id, bank_name, account_name, account_number, iban, invoice_notes_ar, notes_enabled, bank_details_enabled, loading, saving, error }

  async function handleOpenSettings() {
    const orgId = form.organization_id
    if (!orgId) { alert('اختر المنشأة أولاً'); return }
    setSettingsModal({ organization_id: orgId, loading: true })
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle()
    if (error) {
      setSettingsModal({ organization_id: orgId, loading: false, error: error.message })
      return
    }
    setSettingsModal({
      organization_id: orgId,
      id: data?.id || null,
      bank_name: data?.bank_name || '',
      account_name: data?.account_name || '',
      account_number: data?.account_number || '',
      iban: data?.iban || '',
      invoice_notes_ar: data?.invoice_notes_ar || '',
      notes_enabled: data?.notes_enabled || false,
      bank_details_enabled: data?.bank_details_enabled || false,
      loading: false, saving: false, error: '',
    })
  }

  async function handleSaveSettings() {
    if (!settingsModal) return
    setSettingsModal(s => ({ ...s, saving: true, error: '' }))
    const payload = {
      organization_id: settingsModal.organization_id,
      bank_name: settingsModal.bank_name || null,
      account_name: settingsModal.account_name || null,
      account_number: settingsModal.account_number || null,
      iban: settingsModal.iban || null,
      invoice_notes_ar: settingsModal.invoice_notes_ar || null,
      notes_enabled: settingsModal.notes_enabled,
      bank_details_enabled: settingsModal.bank_details_enabled,
    }
    let error
    if (settingsModal.id) {
      ;({ error } = await supabase.from('organization_settings').update(payload).eq('id', settingsModal.id))
    } else {
      ;({ error } = await supabase.from('organization_settings').insert([payload]))
    }
    if (error) { setSettingsModal(s => ({ ...s, saving: false, error: error.message })); return }
    setSettingsModal(s => ({ ...s, saving: false }))
    setTimeout(() => setSettingsModal(null), 600)
  }

  async function fetchAll() {
    setStatus('loading')
    const [org, inv, ten, lea] = await Promise.all([
      supabase.from('organizations').select('id, name, vat_number, cr_number, address, phone').order('name'),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('tenants').select('id, full_name, name, official_name, vat_number, cr_number, address, id_number').order('full_name'),
      supabase.from('leases').select('id, tenant_id, lease_number, status'),
    ])
    setOrganizations(org.data || [])
    setInvoices(inv.data || [])
    setTenants(ten.data || [])
    setLeases(lea.data || [])
    setForm(f => ({ ...f, organization_id: f.organization_id || org.data?.[0]?.id || '' }))
    setStatus('success')
  }

  useEffect(() => { fetchAll() }, [])

  useEffect(() => {
    fetch('/api/zatca-environment')
      .then(r => r.json())
      .then(d => setZatcaEnvironment(d.environment || 'sandbox'))
      .catch(() => setZatcaEnvironment('sandbox'))
  }, [])

  useEffect(() => {
    function handleAfterPrint() { setPrintingInvoice(null) }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  useEffect(() => {
    if (!printingInvoice) return

    if (printingInvoice.mode === 'print' || printingInvoice.mode === 'pdf') {
      // نستخدم نافذة طباعة المتصفح للحالتين — يضمن تطابق التصميم 100% دائماً.
      // لتحميل PDF: يختار المستخدم "حفظ كـ PDF" من قائمة الطابعة بدل طابعة فعلية.
      const t = setTimeout(() => window.print(), 200)
      return () => clearTimeout(t)
    }
  }, [printingInvoice])

  function updateItem(key, field, value) {
    setForm(f => ({
      ...f,
      items: f.items.map(it => it.key === key ? { ...it, [field]: value } : it)
    }))
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))
  }

  function removeItem(key) {
    setForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter(it => it.key !== key) : f.items }))
  }

  function handleSelectTenant(tenantId) {
    if (!tenantId) return
    const t = tenants.find(x => x.id === tenantId)
    if (!t) return
    setSelectedTenantId(tenantId)
    setForm(f => ({
      ...f,
      customer_name: t.official_name || t.full_name || t.name || '',
      customer_vat_number: t.vat_number || '',
      customer_cr_number: t.cr_number || '',
      customer_address: t.address || '',
      customer_id_number: t.id_number || '',
      lease_id: '',
    }))
  }

  const subtotal = form.items.reduce((s, it) => s + lineAmounts(it).lineTotal, 0)
  const vatTotal = form.items.reduce((s, it) => s + lineAmounts(it).vatAmount, 0)
  const grandTotal = subtotal + vatTotal
  // Standard (B2B) invoices are picked automatically whenever the customer
  // has a VAT number on file — mirrors the same rule used server-side in
  // zatcaCompliance.js.
    const willBeStandardInvoice = Boolean(form.customer_vat_number.trim() || form.customer_cr_number.trim())

  function generateInvoiceNumber() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `DRAFT-${y}${m}${d}-${rand}`
  }

  async function handleSaveDraft() {
    setFormError(''); setFormSuccess('')
    if (!form.customer_name.trim()) { setFormError('يرجى إدخال اسم العميل'); return }
    const validItems = form.items.filter(it => it.description.trim() && Number(it.unit_price) > 0)
    if (validItems.length === 0) { setFormError('يرجى إضافة بند واحد على الأقل ببيان وسعر صحيحين'); return }

    setSaving(true)
    const invoicePayload = {
      organization_id: form.organization_id || null,
      invoice_number: generateInvoiceNumber(),
      invoice_type: form.invoice_type,
      status: 'draft',
      issue_date: form.issue_date || null,
      due_date: form.due_date || null,
      customer_name: form.customer_name || null,
      customer_vat_number: form.customer_vat_number || null,
      customer_cr_number: form.customer_cr_number || null,
      customer_city: form.customer_city || null,
      customer_address: form.customer_address || null,
      customer_id_number: form.customer_id_number || null,
      customer_id_type: form.customer_id_type || null,
      customer_phone: form.customer_phone || null,
      amount_paid: form.amount_paid ? Math.round(Number(form.amount_paid) * 100) / 100 : 0,
      lease_id: form.lease_id || null,
      subtotal: Math.round(subtotal * 100) / 100,
      vat_amount: Math.round(vatTotal * 100) / 100,
      total_amount: Math.round(grandTotal * 100) / 100,
    }

    const { data: inserted, error: invError } = await supabase.from('invoices').insert([invoicePayload]).select('id')
    if (invError) { setSaving(false); setFormError(invError.message); return }
    const invoiceId = inserted?.[0]?.id

    const itemRows = validItems.map((it, idx) => {
      const { lineTotal, vatAmount } = lineAmounts(it)
      return {
        invoice_id: invoiceId,
        description: it.description,
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        vat_rate: VAT_RATE,
        vat_amount: Math.round(vatAmount * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100,
        sort_order: idx,
      }
    })
    const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows)
    setSaving(false)
    if (itemsError) { setFormError(itemsError.message); return }

    setFormSuccess('تم حفظ الفاتورة كمسودة بنجاح')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
    fetchAll()
  }

  async function handleUpdateDraft() {
    setFormError(''); setFormSuccess('')
    if (!editingInvoiceId) return
    if (!form.customer_name.trim()) { setFormError('يرجى إدخال اسم العميل'); return }
    const validItems = form.items.filter(it => it.description.trim() && Number(it.unit_price) > 0)
    if (validItems.length === 0) { setFormError('يرجى إضافة بند واحد على الأقل ببيان وسعر صحيحين'); return }

    setSaving(true)
    const invoicePayload = {
      organization_id: form.organization_id || null,
      invoice_type: form.invoice_type,
      issue_date: form.issue_date || null,
      due_date: form.due_date || null,
      customer_name: form.customer_name || null,
      customer_vat_number: form.customer_vat_number || null,
      customer_cr_number: form.customer_cr_number || null,
      customer_city: form.customer_city || null,
      customer_address: form.customer_address || null,
      customer_id_number: form.customer_id_number || null,
      customer_id_type: form.customer_id_type || null,
      customer_phone: form.customer_phone || null,
      amount_paid: form.amount_paid ? Math.round(Number(form.amount_paid) * 100) / 100 : 0,
      lease_id: form.lease_id || null,
      subtotal: Math.round(subtotal * 100) / 100,
      vat_amount: Math.round(vatTotal * 100) / 100,
      total_amount: Math.round(grandTotal * 100) / 100,
    }

    const { error: invError } = await supabase.from('invoices').update(invoicePayload).eq('id', editingInvoiceId)
    if (invError) { setSaving(false); setFormError(invError.message); return }

    const { error: delError } = await supabase.from('invoice_items').delete().eq('invoice_id', editingInvoiceId)
    if (delError) { setSaving(false); setFormError(delError.message); return }

    const itemRows = validItems.map((it, idx) => {
      const { lineTotal, vatAmount } = lineAmounts(it)
      return {
        invoice_id: editingInvoiceId,
        description: it.description,
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
        vat_rate: VAT_RATE,
        vat_amount: Math.round(vatAmount * 100) / 100,
        line_total: Math.round(lineTotal * 100) / 100,
        sort_order: idx,
      }
    })
    const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows)
    setSaving(false)
    if (itemsError) { setFormError(itemsError.message); return }

    setFormSuccess('تم تحديث المسودة بنجاح')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
    fetchAll()
  }

  async function handleEditDraft(inv) {
    if (inv.status !== 'draft' || isReadOnly) return
    setFormError(''); setFormSuccess('')
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('sort_order')
    if (error) { setFormError(error.message); return }

    setForm({
      organization_id: inv.organization_id || '',
      invoice_type: inv.invoice_type || 'ضريبية مبسطة',
      issue_date: inv.issue_date || new Date().toISOString().slice(0, 10),
      due_date: inv.due_date || '',
      customer_name: inv.customer_name || '',
      customer_vat_number: inv.customer_vat_number || '',
      customer_cr_number: inv.customer_cr_number || '',
      customer_city: inv.customer_city || '',
      customer_address: inv.customer_address || '',
      customer_id_number: inv.customer_id_number || '',
      customer_id_type: inv.customer_id_type || '',
      customer_phone: inv.customer_phone || '',
      amount_paid: inv.amount_paid ? String(inv.amount_paid) : '',
      lease_id: inv.lease_id || '',
      items: (items && items.length > 0)
        ? items.map(it => ({
            key: Math.random().toString(36).slice(2),
            description: it.description || '',
            quantity: String(it.quantity ?? '1'),
            unit_price: String(it.unit_price ?? ''),
          }))
        : [emptyItem()],
    })
    const linkedLease = leases.find(l => l.id === inv.lease_id)
    setSelectedTenantId(linkedLease?.tenant_id || '')
    setEditingInvoiceId(inv.id)
    setEditingInvoiceNumber(inv.invoice_number)
    setTenantSearchText('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNewInvoice() {
    setFormError(''); setFormSuccess('')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
    setSelectedTenantId('')
  }

  async function handleDeleteDraft(inv) {
    if (inv.status !== 'draft' || isReadOnly) return
    const confirmed = window.confirm(`هل أنت متأكد من حذف المسودة رقم ${inv.invoice_number}؟ هذا الإجراء لا يمكن التراجع عنه.`)
    if (!confirmed) return

    setFormError(''); setFormSuccess('')
    const { error: itemsError } = await supabase.from('invoice_items').delete().eq('invoice_id', inv.id)
    if (itemsError) { setFormError(itemsError.message); return }

    const { error: invError } = await supabase.from('invoices').delete().eq('id', inv.id)
    if (invError) { setFormError(invError.message); return }

    if (editingInvoiceId === inv.id) {
      setEditingInvoiceId(null)
      setEditingInvoiceNumber('')
      setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
      setTenantSearchText('')
    }
    setFormSuccess('تم حذف المسودة بنجاح')
    fetchAll()
  }

  async function handleDownloadPdf(inv) {
    try {
      const response = await fetch(`/api/generate-invoice-pdf?invoiceId=${inv.id}`)
      if (!response.ok) throw new Error('فشل توليد PDF')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${inv.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('فشل تحميل PDF: ' + err.message)
    }
  }

  async function handlePrintInvoice(inv, mode = 'print') {
    const organization = organizations.find(o => o.id === inv.organization_id) || null
    const [itemsResult, qrDataUrl, settingsResult] = await Promise.all([
      supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('sort_order'),
      inv.qr_code ? QRCode.toDataURL(inv.qr_code, { width: 160 }).catch(() => null) : Promise.resolve(null),
      supabase.from('organization_settings').select('*').eq('organization_id', inv.organization_id).maybeSingle(),
    ])
    const items = itemsResult.data
    const settingsRow = settingsResult.data
    setPrintingInvoice({ invoice: inv, items: items || [], qrDataUrl, organization, orgSettings: settingsRow || null, mode })
  }

  async function handleOpenNoteForm(inv, noteType) {
    setNoteError(''); setNoteResult(null)
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('sort_order')
    if (error) { setNoteError(error.message); return }
    setNoteForm({
      invoice: inv,
      noteType,
      reason: '',
      items: (items || []).map(it => ({
        key: Math.random().toString(36).slice(2),
        description: it.description || '',
        quantity: String(it.quantity ?? '1'),
        unit_price: String(it.unit_price ?? ''),
      })),
    })
  }

  function updateNoteItem(key, field, value) {
    setNoteForm(f => ({
      ...f,
      items: f.items.map(it => it.key === key ? { ...it, [field]: value } : it)
    }))
  }

  function removeNoteItem(key) {
    setNoteForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter(it => it.key !== key) : f.items }))
  }

  async function handleSubmitNote() {
    if (!noteForm) return
    setNoteError(''); setNoteResult(null)
    const validItems = noteForm.items.filter(it => it.description.trim() && Number(it.unit_price) > 0)
    if (validItems.length === 0) { setNoteError('يرجى إبقاء بند واحد على الأقل ببيان وسعر صحيحين'); return }
    if (!noteForm.reason.trim()) { setNoteError('يرجى كتابة سبب الإشعار'); return }

    setNoteSaving(true)
    try {
      const inv = noteForm.invoice
      const organization = organizations.find(o => o.id === inv.organization_id) || null
      const response = await fetch('/api/zatca-credit-debit-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization,
          originalInvoice: {
            invoice_number: inv.invoice_number,
            customer_name: inv.customer_name,
            customer_vat_number: inv.customer_vat_number,
            customer_cr_number: inv.customer_cr_number,
            customer_city: inv.customer_city,
            customer_address: inv.customer_address,
          },
          noteType: noteForm.noteType,
          reason: noteForm.reason,
          items: validItems.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            vat_rate: VAT_RATE,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'فشل إصدار الإشعار')

      const qrDataUrl = await QRCode.toDataURL(data.qr, { width: 220 })
      setNoteResult({ ...data, qrDataUrl })

      if (data.compliance.passed) {
        const subtotal = validItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
        const vatAmount = subtotal * (VAT_RATE / 100)
        await supabase.from('invoices').insert([{
          organization_id: inv.organization_id || null,
          invoice_number: `${noteForm.noteType === 'debit_note' ? 'DN' : 'CN'}-${Date.now()}`,
          invoice_type: inv.invoice_type,
          document_type: noteForm.noteType,
          parent_invoice_id: inv.id,
          status: 'cleared',
          compliance_status: data.compliance.status,
          qr_code: data.qr,
          invoice_hash: data.invoice_hash,
          issue_date: new Date().toISOString().slice(0, 10),
          customer_name: inv.customer_name,
          customer_vat_number: inv.customer_vat_number,
          customer_cr_number: inv.customer_cr_number,
          customer_city: inv.customer_city,
          customer_address: inv.customer_address,
          customer_id_number: inv.customer_id_number,
          subtotal: Math.round(subtotal * 100) / 100,
          vat_amount: Math.round(vatAmount * 100) / 100,
          total_amount: Math.round((subtotal + vatAmount) * 100) / 100,
        }])
        fetchAll()
      }
    } catch (err) {
      setNoteError(err.message)
    } finally {
      setNoteSaving(false)
    }
  }

  async function handleZatcaCheck(inv) {
    setZatcaChecks(z => ({ ...z, [inv.id]: { loading: true, error: '', result: null } }))
    try {
      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', inv.id)
        .order('sort_order')
      if (itemsError) throw new Error(itemsError.message)
      if (!items || items.length === 0) throw new Error('لا توجد بنود بهذه الفاتورة')

      const organization = organizations.find(o => o.id === inv.organization_id) || null

      const response = await fetch('/api/zatca-compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization,
          invoice: {
            invoice_number: inv.invoice_number,
            issue_date: inv.issue_date,
            customer_name: inv.customer_name,
            customer_vat_number: inv.customer_vat_number,
            customer_cr_number: inv.customer_cr_number,
            customer_city: inv.customer_city,
            customer_address: inv.customer_address,
          },
          items: items.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            vat_rate: it.vat_rate,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'فشل فحص الامتثال')

      const qrDataUrl = await QRCode.toDataURL(data.qr, { width: 220 })

      setZatcaChecks(z => ({
        ...z,
        [inv.id]: { loading: false, error: '', result: { ...data, qrDataUrl } },
      }))

            await supabase.from('invoices').update({
        qr_code: data.qr,
        invoice_hash: data.invoice_hash,
        compliance_status: data.compliance.status,
        status: data.compliance.passed ? 'ready' : 'draft',
      }).eq('id', inv.id)
      fetchAll()
    } catch (err) {
      setZatcaChecks(z => ({ ...z, [inv.id]: { loading: false, error: err.message, result: null } }))
    }
  }

  // Standard (B2B) invoices are legally required to go through Clearance;
  // Simplified (B2C) go through Reporting — same rule used server-side.
  function submissionTypeFor(inv) {
    const standard = Boolean((inv.customer_vat_number || '').trim() || (inv.customer_cr_number || '').trim())
    return standard ? 'clearance' : 'reporting'
  }

  async function doProductionSubmit(inv, submissionType) {
    setProdSubmissions(s => ({ ...s, [inv.id]: { loading: true, error: '', result: null } }))
    try {
      const response = await fetch('/api/zatca-production-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: inv.id, submissionType }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'فشل الإرسال الفعلي للهيئة')

      const qrDataUrl = await QRCode.toDataURL(data.qr, { width: 220 })
      setProdSubmissions(s => ({ ...s, [inv.id]: { loading: false, error: '', result: { ...data, qrDataUrl } } }))
      fetchAll()
    } catch (err) {
      setProdSubmissions(s => ({ ...s, [inv.id]: { loading: false, error: err.message, result: null } }))
    }
  }

  function handleSendToZatca(inv) {
    if (isReadOnly) return
    const submissionType = submissionTypeFor(inv)
    if (zatcaEnvironment === 'production') {
      setProdConfirm({ invoice: inv, submissionType, confirmText: '' })
      return
    }
    doProductionSubmit(inv, submissionType)
  }

  async function handleConfirmProductionSubmit() {
    if (!prodConfirm || prodConfirm.confirmText !== 'تأكيد') return
    setProdConfirmSubmitting(true)
    await doProductionSubmit(prodConfirm.invoice, prodConfirm.submissionType)
    setProdConfirmSubmitting(false)
    setProdConfirm(null)
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'Cairo, sans-serif' }
  const labelStyle = { fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 4 }

  function statusBadge(s) {
  const map = {
    draft: { bg: '#FEF9E7', color: '#b7950b', label: 'مسودة' },
    ready: { bg: '#EAF4FB', color: '#2E86C1', label: 'جاهزة للإرسال' },
    pending_clearance: { bg: '#FDF2E3', color: '#d68910', label: 'قيد الاعتماد ⏳' },
    paused: { bg: '#F4F6F6', color: '#7f8c8d', label: 'متوقفة مؤقتاً ⏸️' },
    cleared: { bg: '#EAFAF1', color: '#27ae60', label: 'معتمدة 🔒' },
    submitted: { bg: '#EAFAF1', color: '#27ae60', label: 'مُرسلة (Reporting) 🔒' },
    rejected: { bg: '#FDEDEC', color: '#e74c3c', label: 'مرفوضة (يمكن إعادة الإرسال)' },
  }
  const cfg = map[s] || { bg: '#f3f4f6', color: '#6b7280', label: s || '—' }
  return <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
}

  return (
    <div dir="rtl" className="inv-page-root" style={{ fontFamily: 'Cairo, sans-serif', padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {zatcaEnvironment && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 9998, textAlign: 'center', padding: '8px 12px',
          borderRadius: 8, marginBottom: 18, fontWeight: 700, fontSize: 13,
          background: zatcaEnvironment === 'production' ? '#e74c3c' : '#eafaf1',
          color: zatcaEnvironment === 'production' ? '#fff' : '#27ae60',
          border: zatcaEnvironment === 'production' ? '2px solid #c0392b' : '1px solid #27ae60',
        }}>
          {zatcaEnvironment === 'production'
            ? '🔴 بيئة إنتاج حقيقية — كل إرسال ملزم رسمياً لهيئة الزكاة والضريبة'
            : `🧪 بيئة اختبار (${zatcaEnvironment === 'simulation' ? 'Simulation' : 'Sandbox'}) — لا يوجد أي إلزام رسمي على الإرسالات هنا`}
        </div>
      )}

      {prodConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10001,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 480, width: '100%', border: '2px solid #e74c3c' }}>
            <h3 style={{ margin: '0 0 12px', color: '#e74c3c' }}>🔴 تأكيد إرسال فعلي لهيئة الزكاة والضريبة</h3>
            <div style={{ fontSize: 13, lineHeight: 2, background: '#fdedec', padding: 12, borderRadius: 8, marginBottom: 14 }}>
              <div><strong>العميل:</strong> {prodConfirm.invoice.customer_name || '—'}</div>
              <div><strong>رقم الفاتورة:</strong> {prodConfirm.invoice.invoice_number}</div>
              <div><strong>الإجمالي:</strong> {Number(prodConfirm.invoice.total_amount || 0).toLocaleString()} ريال</div>
              <div><strong>نوع الإرسال:</strong> {prodConfirm.submissionType === 'clearance' ? 'Clearance (قياسية/B2B)' : 'Reporting (مبسّطة/B2C)'}</div>
            </div>
            <p style={{ color: '#e74c3c', fontWeight: 700, fontSize: 13, margin: '0 0 14px' }}>
              هذا إرسال حقيقي وملزم لهيئة الزكاة والضريبة ولا يمكن التراجع عنه بعد نجاحه.
            </p>
            <label style={labelStyle}>اكتب كلمة "تأكيد" لتفعيل زر الإرسال</label>
            <input
              type="text"
              value={prodConfirm.confirmText}
              onChange={e => setProdConfirm(c => ({ ...c, confirmText: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 16 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setProdConfirm(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmProductionSubmit}
                disabled={prodConfirm.confirmText !== 'تأكيد' || prodConfirmSubmitting}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, color: '#fff',
                  background: '#e74c3c',
                  cursor: (prodConfirm.confirmText !== 'تأكيد' || prodConfirmSubmitting) ? 'default' : 'pointer',
                  opacity: (prodConfirm.confirmText !== 'تأكيد' || prodConfirmSubmitting) ? 0.5 : 1,
                }}>
                {prodConfirmSubmitting ? 'جاري الإرسال...' : '📤 إرسال فعلي الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {settingsModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1B4D7A' }}>⚙️ إعدادات الفاتورة</h3>
            {settingsModal.loading ? (
              <p>جاري التحميل...</p>
            ) : (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 700, fontSize: 14 }}>
                  <input type="checkbox" checked={settingsModal.bank_details_enabled}
                    onChange={e => setSettingsModal(s => ({ ...s, bank_details_enabled: e.target.checked }))} />
                  إظهار بيانات الحساب البنكي بالفاتورة
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <div>
                    <label style={labelStyle}>اسم البنك</label>
                    <input type="text" value={settingsModal.bank_name} onChange={e => setSettingsModal(s => ({ ...s, bank_name: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>اسم الحساب</label>
                    <input type="text" value={settingsModal.account_name} onChange={e => setSettingsModal(s => ({ ...s, account_name: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>رقم الحساب</label>
                    <input type="text" value={settingsModal.account_number} onChange={e => setSettingsModal(s => ({ ...s, account_number: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>رقم الآيبان</label>
                    <input type="text" value={settingsModal.iban} onChange={e => setSettingsModal(s => ({ ...s, iban: e.target.value }))} style={inputStyle} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 700, fontSize: 14 }}>
                  <input type="checkbox" checked={settingsModal.notes_enabled}
                    onChange={e => setSettingsModal(s => ({ ...s, notes_enabled: e.target.checked }))} />
                  إظهار ملاحظات بالفاتورة
                </label>
                <label style={labelStyle}>نص الملاحظة</label>
                <textarea value={settingsModal.invoice_notes_ar} onChange={e => setSettingsModal(s => ({ ...s, invoice_notes_ar: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 70, marginBottom: 16, resize: 'vertical' }} />

                {settingsModal.error && <p style={{ color: '#e74c3c', fontWeight: 700 }}>{settingsModal.error}</p>}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setSettingsModal(null)}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
                    إلغاء
                  </button>
                  <button type="button" onClick={handleSaveSettings} disabled={settingsModal.saving}
                    style={{ padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, color: '#fff', background: '#1B4D7A', cursor: settingsModal.saving ? 'default' : 'pointer', opacity: settingsModal.saving ? 0.6 : 1 }}>
                    {settingsModal.saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {noteForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, maxWidth: 640, width: '100%',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <h3 style={{ margin: '0 0 4px', color: noteForm.noteType === 'debit_note' ? '#d68910' : '#8e44ad' }}>
              {noteForm.noteType === 'debit_note' ? 'إشعار مدين' : 'إشعار دائن'} — فاتورة {noteForm.invoice.invoice_number}
            </h3>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>
              البنود معبأة تلقائياً من الفاتورة الأصلية — عدّل أي بند أو احذفه حسب الحاجة قبل الإصدار
            </p>

            <label style={labelStyle}>سبب الإشعار *</label>
            <input
              type="text"
              value={noteForm.reason}
              onChange={e => setNoteForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="مثال: إلغاء جزء من الفاتورة، خصم متفق عليه..."
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            <div style={{ overflowX: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                    <th style={{ padding: '6px 8px', fontSize: 12, color: '#6b7280' }}>البيان</th>
                    <th style={{ padding: '6px 8px', fontSize: 12, color: '#6b7280', width: 80 }}>الكمية</th>
                    <th style={{ padding: '6px 8px', fontSize: 12, color: '#6b7280', width: 110 }}>سعر الوحدة</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {noteForm.items.map(it => (
                    <tr key={it.key}>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="text" value={it.description} onChange={e => updateNoteItem(it.key, 'description', e.target.value)} style={inputStyle} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" min="0" value={it.quantity} onChange={e => updateNoteItem(it.key, 'quantity', e.target.value)} style={inputStyle} />
                      </td>
                      <td style={{ padding: '4px 6px' }}>
                        <input type="number" min="0" value={it.unit_price} onChange={e => updateNoteItem(it.key, 'unit_price', e.target.value)} style={inputStyle} />
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                        <button type="button" onClick={() => removeNoteItem(it.key)} style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer' }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {noteError && <p style={{ color: '#e74c3c', fontWeight: 700 }}>{noteError}</p>}

            {noteResult && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f9fafb', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                <img src={noteResult.qrDataUrl} alt="ZATCA QR" width={90} height={90} style={{ borderRadius: 4, border: '1px solid #e5e7eb' }} />
                <div style={{ fontSize: 12 }}>
                  <span style={{
                    background: noteResult.compliance.passed ? '#EAFAF1' : '#FDEDEC',
                    color: noteResult.compliance.passed ? '#27ae60' : '#e74c3c',
                    padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-block',
                  }}>
                    {noteResult.compliance.passed ? 'PASS ✓' : 'FAIL ✕'} ({noteResult.compliance.status})
                  </span>
                  <div style={{ marginTop: 4, color: '#6b7280' }}>{noteResult.invoice_type} — تم حفظه كفاتورة معتمدة مرتبطة</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setNoteForm(null); setNoteResult(null); setNoteError('') }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
                {noteResult?.compliance?.passed ? 'إغلاق' : 'إلغاء'}
              </button>
              {!noteResult?.compliance?.passed && (
                <button
                  type="button"
                  onClick={handleSubmitNote}
                  disabled={noteSaving}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 700, color: '#fff',
                    background: noteForm.noteType === 'debit_note' ? '#d68910' : '#8e44ad',
                    cursor: noteSaving ? 'default' : 'pointer', opacity: noteSaving ? 0.6 : 1,
                  }}>
                  {noteSaving ? 'جاري الإصدار...' : 'إصدار الإشعار'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media print {
          @page { margin: 0; size: A4; }
          body * { visibility: hidden; }
          .inv-print-area, .inv-print-area * { visibility: visible; }
          .inv-print-area { position: fixed; inset: 0; }
          .inv-hide-print { display: none !important; }
          .inv-print-area table { page-break-inside: auto; }
          .inv-print-area thead { display: table-header-group; }
          .inv-print-area tr { page-break-inside: avoid; break-inside: avoid; }
          .inv-page-root { height: 0 !important; min-height: 0 !important; overflow: hidden !important; padding: 0 !important; margin: 0 !important; }
        }
      `}</style>

      {printingInvoice && (
        <div ref={printAreaRef} className="inv-print-area" style={{
          position: 'fixed', top: 0, left: 0, width: 794, maxWidth: '100%',
          background: '#fff', zIndex: 9999, padding: '38px 45px 32px',
          fontFamily: 'Tajawal, Cairo, sans-serif', direction: 'rtl',
          textAlign: 'right', wordSpacing: 'normal', letterSpacing: 'normal', textJustify: 'none',
        }}>
          <button className="inv-hide-print" onClick={() => setPrintingInvoice(null)}
            style={{ position: 'absolute', top: 16, left: 16, padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
            ✕ إغلاق
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, color: '#111', fontSize: 20 }}>{printingInvoice.organization?.name || 'فاتورة ضريبية'}</h2>
              {printingInvoice.organization?.phone && (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  رقم الجوال: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.organization.phone}</span>
                </div>
              )}
              {printingInvoice.organization?.address && (
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 1.6 }}>
                  {printingInvoice.organization.address.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'left' }}>
              {printingInvoice.qrDataUrl && (
                <img src={printingInvoice.qrDataUrl} alt="ZATCA QR" width={100} height={100} style={{ display: 'block', marginInlineStart: 'auto' }} />
              )}
              {printingInvoice.organization?.cr_number && (
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  السجل التجاري: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.organization.cr_number}</span>
                </div>
              )}
              {printingInvoice.organization?.vat_number && (
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  الرقم الضريبي: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.organization.vat_number}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', borderTop: '1px solid #333', borderBottom: '1px solid #333', padding: '6px 0', margin: '16px 0' }}>
            <h3 style={{ margin: 0, color: '#111', fontSize: 15, fontWeight: 700 }}>{printingInvoice.invoice.invoice_type}</h3>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 6px', color: '#111', fontSize: 13 }}>بيانات العميل</h4>
              <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                <div><strong>{printingInvoice.invoice.customer_name}</strong></div>
                {printingInvoice.invoice.customer_vat_number && (
                  <div>الرقم الضريبي: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.invoice.customer_vat_number}</span></div>
                )}
                {printingInvoice.invoice.customer_cr_number && (
                  <div>السجل التجاري: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.invoice.customer_cr_number}</span></div>
                )}
                {printingInvoice.invoice.customer_id_number && (
                  <div>
                    {printingInvoice.invoice.customer_id_type === 'iqama' ? 'رقم الإقامة' : printingInvoice.invoice.customer_id_type === 'national_id' ? 'رقم الهوية الوطنية' : 'رقم الهوية/الإقامة'}:{' '}
                    <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.invoice.customer_id_number}</span>
                  </div>
                )}
                {printingInvoice.invoice.customer_phone && (
                  <div>رقم الجوال: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.invoice.customer_phone}</span></div>
                )}
                {printingInvoice.invoice.customer_city && <div>المدينة: {printingInvoice.invoice.customer_city}</div>}
                {printingInvoice.invoice.customer_address && <div>العنوان: {printingInvoice.invoice.customer_address}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'left', fontSize: 13, color: '#6b7280' }}>
              <div>رقم الفاتورة: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.invoice.invoice_number}</span></div>
              <div>تاريخ الإصدار: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.invoice.issue_date || '—'}</span></div>
              {printingInvoice.invoice.due_date && (
                <div>تاريخ الاستحقاق: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.invoice.due_date}</span></div>
              )}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1a1a1a', color: '#fff', textAlign: 'right' }}>
                <th style={{ padding: '7px 8px', border: '1px solid #ccc' }}>#</th>
                <th style={{ padding: '7px 8px', border: '1px solid #ccc' }}>الوصف</th>
                <th style={{ padding: '7px 8px', border: '1px solid #ccc' }}>الكمية</th>
                <th style={{ padding: '7px 8px', border: '1px solid #ccc' }}>سعر الوحدة</th>
                <th style={{ padding: '7px 8px', border: '1px solid #ccc' }}>الضريبة 15%</th>
                <th style={{ padding: '7px 8px', border: '1px solid #ccc' }}>المجموع الفرعي بدون الضريبة</th>
                <th style={{ padding: '7px 8px', border: '1px solid #ccc' }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {printingInvoice.items.map((it, idx) => (
                <tr key={it.id} style={{ background: idx % 2 === 0 ? '#F5F5F5' : '#fff' }}>
                  <td style={{ padding: '7px 8px', border: '1px solid #ddd' }}>{idx + 1}</td>
                  <td style={{ padding: '7px 8px', border: '1px solid #ddd' }}>{it.description}</td>
                  <td style={{ padding: '7px 8px', border: '1px solid #ddd' }}>{it.quantity}</td>
                  <td style={{ padding: '7px 8px', border: '1px solid #ddd' }}>{Number(it.unit_price).toLocaleString()}</td>
                  <td style={{ padding: '7px 8px', border: '1px solid #ddd' }}>{Number(it.vat_amount).toLocaleString()}</td>
                  <td style={{ padding: '7px 8px', border: '1px solid #ddd' }}>{Number(it.line_total).toLocaleString()}</td>
                  <td style={{ padding: '7px 8px', border: '1px solid #ddd' }}>{(Number(it.line_total) + Number(it.vat_amount)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div style={{ padding: '10px 4px', minWidth: 240, fontSize: 12.5 }}>
              <div style={{ marginBottom: 3 }}>الإجمالي قبل الضريبة: {Number(printingInvoice.invoice.subtotal || 0).toLocaleString()} ريال</div>
              <div style={{ marginBottom: 3 }}>ضريبة القيمة المضافة (15%): {Number(printingInvoice.invoice.vat_amount || 0).toLocaleString()} ريال</div>
              <div style={{ borderTop: '1px solid #ccc', margin: '6px 0' }} />
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111' }}>الإجمالي النهائي: {Number(printingInvoice.invoice.total_amount || 0).toLocaleString()} ريال</div>
              <div style={{ borderTop: '1px solid #ccc', margin: '6px 0' }} />
              <div style={{ marginBottom: 3 }}>المستلم: {Number(printingInvoice.invoice.amount_paid || 0).toLocaleString()} ريال</div>
              <div>المتبقي: {(Number(printingInvoice.invoice.total_amount || 0) - Number(printingInvoice.invoice.amount_paid || 0)).toLocaleString()} ريال</div>
            </div>
          </div>

          {printingInvoice.orgSettings?.bank_details_enabled && (
            <div style={{ marginBottom: 18, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {printingInvoice.orgSettings.bank_name && (
                    <tr><td style={{ padding: '6px 10px', border: '1px solid #ddd', fontWeight: 700, background: '#F3F3F3', width: 130 }}>البنك</td><td style={{ padding: '6px 10px', border: '1px solid #ddd' }}>{printingInvoice.orgSettings.bank_name}</td></tr>
                  )}
                  {printingInvoice.orgSettings.account_name && (
                    <tr><td style={{ padding: '6px 10px', border: '1px solid #ddd', fontWeight: 700, background: '#F3F3F3' }}>اسم الحساب</td><td style={{ padding: '6px 10px', border: '1px solid #ddd' }}>{printingInvoice.orgSettings.account_name}</td></tr>
                  )}
                  {printingInvoice.orgSettings.account_number && (
                    <tr><td style={{ padding: '6px 10px', border: '1px solid #ddd', fontWeight: 700, background: '#F3F3F3' }}>رقم الحساب</td><td style={{ padding: '6px 10px', border: '1px solid #ddd' }}><span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.orgSettings.account_number}</span></td></tr>
                  )}
                  {printingInvoice.orgSettings.iban && (
                    <tr><td style={{ padding: '6px 10px', border: '1px solid #ddd', fontWeight: 700, background: '#F3F3F3' }}>رقم الآيبان</td><td style={{ padding: '6px 10px', border: '1px solid #ddd' }}><span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.orgSettings.iban}</span></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {printingInvoice.orgSettings?.notes_enabled && printingInvoice.orgSettings?.invoice_notes_ar && (
            <div style={{ marginBottom: 18, fontSize: 12, color: '#555', background: '#F7F7F7', padding: '8px 12px', borderRadius: 4, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              {printingInvoice.orgSettings.invoice_notes_ar}
            </div>
          )}

          <div style={{ borderTop: '1px solid #ccc', paddingTop: 10, marginTop: 4, fontSize: 10.5, color: '#888', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>* هذا المستند صادر من النظام الإلكتروني</div>
              <div><span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.invoice.issue_date || ''}</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {printingInvoice.organization?.phone && (
                  <>رقم الجوال: <span style={{ direction: 'ltr', unicodeBidi: 'plaintext', display: 'inline-block' }}>{printingInvoice.organization.phone}</span> — </>
                )}
                {printingInvoice.organization?.name}
              </div>
              <div>1/1</div>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onBack}
        style={{ padding: '8px 16px', marginBottom: '20px', cursor: 'pointer', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        ← رجوع للوحة التحكم
      </button>
      <h1 style={{ margin: '0 0 4px' }}>الفواتير الإلكترونية</h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px' }}>إنشاء فاتورة ضريبية جديدة وحفظها كمسودة</p>

      {status === 'loading' && <p>جاري التحميل...</p>}

      {status === 'success' && (
        <>
          {!isReadOnly && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 28, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#1B4D7A' }}>
                {editingInvoiceId ? `تعديل مسودة: ${editingInvoiceNumber}` : 'فاتورة جديدة'}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleOpenSettings}
                  style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 8, border: '1px solid #6b7280', background: '#fff', color: '#6b7280', fontWeight: 700 }}>
                  ⚙️ إعدادات الفاتورة
                </button>
                {editingInvoiceId && (
                  <button type="button" onClick={handleNewInvoice}
                    style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: 8, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontWeight: 700 }}>
                    + فاتورة جديدة
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>المنشأة</label>
                <select value={form.organization_id} onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))} style={inputStyle}>
                  <option value="">— اختر المنشأة —</option>
                  {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>نوع الفاتورة</label>
                <select value={form.invoice_type} onChange={e => setForm(f => ({ ...f, invoice_type: e.target.value }))} style={inputStyle}>
                  {INVOICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>تاريخ الإصدار</label>
                <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>تاريخ الاستحقاق (اختياري)</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
              <h3 style={{ fontSize: 15, color: '#1B4D7A', margin: 0 }}>بيانات العميل</h3>
              <span style={{
                background: willBeStandardInvoice ? '#EAF4FB' : '#FEF9E7',
                color: willBeStandardInvoice ? '#2E86C1' : '#b7950b',
                padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
              }}>
                فاتورة {willBeStandardInvoice ? 'قياسية (B2B)' : 'مبسّطة (B2C)'} عند فحص ZATCA
              </span>
            </div>
            <div style={{ marginBottom: 14, maxWidth: 340 }}>
              <label style={labelStyle}>اختيار مستأجر (اكتب للبحث)</label>
              <input
                type="text"
                list="tenant-options"
                value={tenantSearchText}
                onChange={e => {
                  const val = e.target.value
                  setTenantSearchText(val)
                  const match = tenants.find(t => (t.official_name || t.full_name || t.name || '') === val)
                  if (match) handleSelectTenant(match.id)
                }}
                placeholder="اكتب اسم المستأجر..."
                style={inputStyle}
              />
              <datalist id="tenant-options">
                {tenants.map(t => (
                  <option key={t.id} value={t.official_name || t.full_name || t.name || '(بدون اسم)'} />
                ))}
              </datalist>
            </div>
            <div style={{ marginBottom: 14, maxWidth: 340 }}>
              <label style={labelStyle}>اختيار العقد (اختياري — لربط الفاتورة بربعها بصفحة الإقرارات)</label>
              <select
                value={form.lease_id}
                onChange={e => setForm(f => ({ ...f, lease_id: e.target.value }))}
                disabled={!selectedTenantId}
                style={inputStyle}>
                <option value="">{selectedTenantId ? '— بدون عقد —' : 'اختر مستأجر أولاً'}</option>
                {leases.filter(l => l.tenant_id === selectedTenantId).map(l => (
                  <option key={l.id} value={l.id}>{l.lease_number || '(بدون رقم عقد)'}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
              <div>
                <label style={labelStyle}>اسم العميل *</label>
                <input type="text" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>رقم جوال العميل</label>
                <input type="text" value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>الرقم الضريبي للعميل</label>
                <input type="text" value={form.customer_vat_number} onChange={e => setForm(f => ({ ...f, customer_vat_number: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>السجل التجاري للعميل (CR)</label>
                <input type="text" value={form.customer_cr_number} onChange={e => setForm(f => ({ ...f, customer_cr_number: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>مدينة العميل</label>
                <input type="text" value={form.customer_city} onChange={e => setForm(f => ({ ...f, customer_city: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>عنوان العميل</label>
                <input type="text" value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>نوع الهوية</label>
                <select value={form.customer_id_type} onChange={e => setForm(f => ({ ...f, customer_id_type: e.target.value }))} style={inputStyle}>
                  <option value="">— اختر النوع —</option>
                  <option value="national_id">هوية وطنية</option>
                  <option value="iqama">إقامة</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>رقم الهوية / الإقامة</label>
                <input type="text" value={form.customer_id_number} onChange={e => setForm(f => ({ ...f, customer_id_number: e.target.value }))} style={inputStyle} />
              </div>
            </div>

            <h3 style={{ fontSize: 15, color: '#1B4D7A', margin: '0 0 10px' }}>بنود الفاتورة</h3>
            <div style={{ overflowX: 'auto', marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280' }}>البيان</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 90 }}>الكمية</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 130 }}>سعر الوحدة</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 120 }}>الإجمالي قبل الضريبة</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 110 }}>الضريبة 15%</th>
                    <th style={{ padding: '8px 10px', fontSize: 13, color: '#6b7280', width: 120 }}>الإجمالي شامل</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map(it => {
                    const { lineTotal, vatAmount, gross } = lineAmounts(it)
                    return (
                      <tr key={it.key} style={{ borderTop: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="text" value={it.description} onChange={e => updateItem(it.key, 'description', e.target.value)} style={inputStyle} placeholder="وصف البند" />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0" value={it.quantity} onChange={e => updateItem(it.key, 'quantity', e.target.value)} style={inputStyle} />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input type="number" min="0" value={it.unit_price} onChange={e => updateItem(it.key, 'unit_price', e.target.value)} style={inputStyle} />
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: 700 }}>{lineTotal.toLocaleString()} ريال</td>
                        <td style={{ padding: '6px 8px', color: '#8e44ad', fontWeight: 700 }}>{vatAmount.toLocaleString()} ريال</td>
                        <td style={{ padding: '6px 8px', color: '#27ae60', fontWeight: 700 }}>{gross.toLocaleString()} ريال</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <button type="button" onClick={() => removeItem(it.key)} title="حذف البند"
                            style={{ border: 'none', background: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16 }}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <button type="button" onClick={addItem}
              style={{ padding: '8px 16px', marginBottom: 20, cursor: 'pointer', borderRadius: 8, border: '1px solid #1B4D7A', background: '#fff', color: '#1B4D7A', fontWeight: 700 }}>
              + إضافة بند
            </button>

            <div style={{ marginBottom: 18, maxWidth: 240 }}>
              <label style={labelStyle}>المبلغ المستلم (اختياري)</label>
              <input type="number" min="0" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} style={inputStyle} placeholder="0" />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{ background: '#EBF5FB', padding: '10px 18px', borderRadius: 8, fontWeight: 700, color: '#1B4D7A' }}>
                الإجمالي قبل الضريبة: {subtotal.toLocaleString()} ريال
              </div>
              <div style={{ background: '#F4ECF7', padding: '10px 18px', borderRadius: 8, fontWeight: 700, color: '#8e44ad' }}>
                ضريبة القيمة المضافة (15%): {vatTotal.toLocaleString()} ريال
              </div>
              <div style={{ background: '#EAFAF1', padding: '10px 18px', borderRadius: 8, fontWeight: 700, color: '#27ae60' }}>
                الإجمالي شامل الضريبة: {grandTotal.toLocaleString()} ريال
              </div>
            </div>

            {formError && <p style={{ color: '#e74c3c', fontWeight: 700 }}>{formError}</p>}
            {formSuccess && <p style={{ color: '#27ae60', fontWeight: 700 }}>{formSuccess}</p>}

            <button onClick={editingInvoiceId ? handleUpdateDraft : handleSaveDraft} disabled={saving}
              style={{ padding: '10px 24px', cursor: saving ? 'default' : 'pointer', background: '#1B4D7A', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'جاري الحفظ...' : (editingInvoiceId ? '💾 تحديث المسودة' : '💾 حفظ كمسودة')}
            </button>
          </div>
          )}

          <h2 style={{ fontSize: 18, color: '#1B4D7A', margin: '0 0 12px' }}>آخر 20 فاتورة محفوظة</h2>
          <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'right' }}>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>رقم الفاتورة</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>النوع</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>العميل</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>تاريخ الإصدار</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>الإجمالي</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>الحالة</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>فحص ZATCA (تجريبي)</th>
                  <th style={{ padding: '10px 12px', fontSize: 13, color: '#6b7280' }}>طباعة</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>لا توجد فواتير محفوظة بعد</td></tr>
                )}
                {invoices.map(inv => (
                  <tr key={inv.id}
                    onClick={() => handleEditDraft(inv)}
                    title={inv.status === 'draft' && !isReadOnly ? 'اضغط لتعديل هذه المسودة' : undefined}
                    style={{
                      borderTop: '1px solid #f0f0f0',
                      background: editingInvoiceId === inv.id ? '#EBF5FB' : 'transparent',
                      cursor: inv.status === 'draft' && !isReadOnly ? 'pointer' : 'default',
                    }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{inv.invoice_number}</td>
                    <td style={{ padding: '10px 12px' }}>{inv.invoice_type}</td>
                    <td style={{ padding: '10px 12px' }}>{inv.customer_name || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{inv.issue_date || '—'}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1B4D7A' }}>{Number(inv.total_amount || 0).toLocaleString()} ريال</td>
                    <td style={{ padding: '10px 12px' }}>{statusBadge(inv.status)}</td>
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                                            {(inv.status === 'draft' || inv.status === 'ready' || inv.status === 'rejected' || inv.status === 'cleared') && !isReadOnly ? (
                                                                       <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                          {inv.status === 'draft' && (
                          <>
                          <button
                            type="button"
                            onClick={() => handleZatcaCheck(inv)}
                            disabled={zatcaChecks[inv.id]?.loading}
                            style={{
                              padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                              cursor: zatcaChecks[inv.id]?.loading ? 'default' : 'pointer',
                              borderRadius: 6, border: '1px solid #1B4D7A', background: '#fff',
                              color: '#1B4D7A', fontWeight: 700,
                              opacity: zatcaChecks[inv.id]?.loading ? 0.6 : 1,
                            }}>
                            {zatcaChecks[inv.id]?.loading ? 'جاري الفحص...' : '🔍 فحص/توليد QR (تجريبي)'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(inv)}
                            style={{
                              padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                              cursor: 'pointer', borderRadius: 6, border: '1px solid #e74c3c',
                              background: '#fff', color: '#e74c3c', fontWeight: 700,
                            }}>
                                                        🗑 حذف المسودة
                          </button>
                          </>
                          )}

                          {(inv.status === 'ready' || inv.status === 'rejected') && (
                            <button
                              type="button"
                              onClick={() => handleSendToZatca(inv)}
                              disabled={prodSubmissions[inv.id]?.loading}
                              style={{
                                padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                                cursor: prodSubmissions[inv.id]?.loading ? 'default' : 'pointer',
                                borderRadius: 6, border: '1px solid #27ae60',
                                background: '#fff', color: '#27ae60', fontWeight: 700,
                                opacity: prodSubmissions[inv.id]?.loading ? 0.6 : 1,
                              }}>
                              {prodSubmissions[inv.id]?.loading
                                ? 'جاري الإرسال...'
                                : `📤 إرسال للهيئة (${submissionTypeFor(inv) === 'clearance' ? 'Clearance' : 'Reporting'})`}
                            </button>
                          )}

                          {prodSubmissions[inv.id]?.error && (
                            <span style={{ color: '#e74c3c', fontSize: 12, maxWidth: 240 }}>{prodSubmissions[inv.id].error}</span>
                          )}

                          {prodSubmissions[inv.id]?.result && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f9fafb', padding: 8, borderRadius: 8 }}>
                              <img
                                src={prodSubmissions[inv.id].result.qrDataUrl}
                                alt="ZATCA QR"
                                width={72}
                                height={72}
                                style={{ borderRadius: 4, border: '1px solid #e5e7eb', flexShrink: 0 }}
                              />
                              <div style={{ fontSize: 12, maxWidth: 240 }}>
                                <span style={{
                                  background: prodSubmissions[inv.id].result.submission.passed ? '#EAFAF1' : '#FDEDEC',
                                  color: prodSubmissions[inv.id].result.submission.passed ? '#27ae60' : '#e74c3c',
                                  padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-block',
                                }}>
                                  {prodSubmissions[inv.id].result.submission.passed ? 'نجح الإرسال ✓' : 'فشل الإرسال ✕'} ({prodSubmissions[inv.id].result.submission.status})
                                </span>
                                <div style={{ marginTop: 4, color: '#6b7280' }}>
                                  البيئة: {prodSubmissions[inv.id].result.environment} — {prodSubmissions[inv.id].result.submission_type === 'clearance' ? 'Clearance' : 'Reporting'}
                                </div>
                                {prodSubmissions[inv.id].result.submission_log_id && (
                                  <div style={{ marginTop: 4, color: '#6b7280', wordBreak: 'break-all' }}>
                                    رقم سجل التدقيق: {prodSubmissions[inv.id].result.submission_log_id}
                                  </div>
                                )}
                                {prodSubmissions[inv.id].result.submission.messages.errors.length > 0 && (
                                  <details style={{ marginTop: 4 }}>
                                    <summary style={{ cursor: 'pointer', color: '#e74c3c' }}>عرض الأخطاء</summary>
                                    <ul style={{ margin: '4px 0 0', paddingInlineStart: 16 }}>
                                      {prodSubmissions[inv.id].result.submission.messages.errors.map((m, i) => (
                                        <li key={i}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>
                                      ))}
                                    </ul>
                                  </details>
                                )}
                              </div>
                            </div>
                          )}

                          {inv.status === 'cleared' && (!inv.document_type || inv.document_type === 'invoice') && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenNoteForm(inv, 'credit_note')}
                                style={{
                                  padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                                  cursor: 'pointer', borderRadius: 6, border: '1px solid #8e44ad',
                                  background: '#fff', color: '#8e44ad', fontWeight: 700,
                                }}>
                                📝 إشعار دائن
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenNoteForm(inv, 'debit_note')}
                                style={{
                                  padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                                  cursor: 'pointer', borderRadius: 6, border: '1px solid #d68910',
                                  background: '#fff', color: '#d68910', fontWeight: 700,
                                }}>
                                📝 إشعار مدين
                              </button>
                            </div>
                          )}

                          {zatcaChecks[inv.id]?.error && (
                            <span style={{ color: '#e74c3c', fontSize: 12, maxWidth: 240 }}>{zatcaChecks[inv.id].error}</span>
                          )}

                          {zatcaChecks[inv.id]?.result && (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f9fafb', padding: 8, borderRadius: 8 }}>
                              <img
                                src={zatcaChecks[inv.id].result.qrDataUrl}
                                alt="ZATCA QR"
                                width={72}
                                height={72}
                                style={{ borderRadius: 4, border: '1px solid #e5e7eb', flexShrink: 0 }}
                              />
                              <div style={{ fontSize: 12, maxWidth: 220 }}>
                                <span style={{
                                  background: '#EAF4FB', color: '#2E86C1',
                                  padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-block', marginInlineEnd: 6,
                                }}>
                                  {zatcaChecks[inv.id].result.invoice_type}
                                </span>
                                <span style={{
                                  background: zatcaChecks[inv.id].result.compliance.passed ? '#EAFAF1' : '#FDEDEC',
                                  color: zatcaChecks[inv.id].result.compliance.passed ? '#27ae60' : '#e74c3c',
                                  padding: '2px 8px', borderRadius: 10, fontWeight: 700, display: 'inline-block',
                                }}>
                                  {zatcaChecks[inv.id].result.compliance.passed ? 'PASS ✓' : 'FAIL ✕'} ({zatcaChecks[inv.id].result.compliance.status})
                                </span>
                                <div style={{ marginTop: 4, color: '#6b7280', wordBreak: 'break-all' }}>
                                  hash: {zatcaChecks[inv.id].result.invoice_hash.slice(0, 20)}...
                                </div>
                                {zatcaChecks[inv.id].result.compliance.messages.errors.length > 0 && (
                                  <details style={{ marginTop: 4 }}>
                                    <summary style={{ cursor: 'pointer', color: '#e74c3c' }}>عرض الأخطاء</summary>
                                    <ul style={{ margin: '4px 0 0', paddingInlineStart: 16 }}>
                                      {zatcaChecks[inv.id].result.compliance.messages.errors.map((m, i) => (
                                        <li key={i}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>
                                      ))}
                                    </ul>
                                  </details>
                                )}
                                {zatcaChecks[inv.id].result.compliance.messages.warnings.length > 0 && (
                                  <details style={{ marginTop: 4 }}>
                                    <summary style={{ cursor: 'pointer', color: '#b7950b' }}>عرض التحذيرات</summary>
                                    <ul style={{ margin: '4px 0 0', paddingInlineStart: 16 }}>
                                      {zatcaChecks[inv.id].result.compliance.messages.warnings.map((m, i) => (
                                        <li key={i}>{typeof m === 'string' ? m : JSON.stringify(m)}</li>
                                      ))}
                                    </ul>
                                  </details>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(inv, 'print')}
                          style={{
                            padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
                            borderRadius: 6, border: '1px solid #1B4D7A', background: '#fff',
                            color: '#1B4D7A', fontWeight: 700,
                          }}>
                          🖨 طباعة
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(inv)}
                          style={{
                            padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
                            borderRadius: 6, border: '1px solid #27ae60', background: '#fff',
                            color: '#27ae60', fontWeight: 700,
                          }}>
                          ⬇️ تحميل PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Invoices
async function handleSave() {
    if (!form.unit_number.trim()) { setFormError('رقم الوحدة مطلوب'); return }
    setSaving(true); setFormError('')
    
    const payload = {
      property_id: propertyId,
      unit_number: form.unit_number.trim(),
      unit_type: form.unit_type,
      status: form.status,
      notes: form.notes.trim() || null
    }
    
    if (form.floor !== '' && form.floor !== null) payload.floor = parseInt(form.floor)
    if (form.area_sqm !== '' && form.area_sqm !== null) payload.area_sqm = parseFloat(form.area_sqm)
    if (form.monthly_rent !== '' && form.monthly_rent !== null) payload.monthly_rent = parseFloat(String(form.monthly_rent).replace(/,/g, ''))

    let error
    if (editingId) {
      const res = await supabase.from('units').update(payload).eq('id', editingId)
      error = res.error
    } else {
      const res = await supabase.from('units').insert([payload])
      error = res.error
    }
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setShowForm(false); fetchAll()
  }
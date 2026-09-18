// Custom Standard (B2B) Tax Invoice class. zatca-xml-js only ships a
// Simplified/B2C invoice class publicly, so this reuses its internal
// parser + signing engine directly (same tax/line-item math — identical
// for both invoice types per ZATCA rules) with our own standard template.

import zatcaParserPkg from 'zatca-xml-js/lib/parser/index.js'
import { generateSignedXMLString } from './standardSigning.js'
import populateStandardTemplate, { ZATCAInvoiceTypes } from './standardTaxInvoiceTemplate.js'

const { XMLDocument } = zatcaParserPkg


if (!Number.prototype.toFixedNoRounding) {
  Number.prototype.toFixedNoRounding = function (n) {
    const reg = new RegExp('^-?\\d+(?:\\.\\d{0,' + n + '})?', 'g')
    const m = this.toString().match(reg)
    if (m?.length) {
      const a = m[0]
      const dot = a.indexOf('.')
      if (dot === -1) return a + '.' + '0'.repeat(n)
      const b = n - (a.length - dot) + 1
      return b > 0 ? a + '0'.repeat(b) : a
    }
    return '0.00'
  }
}

export class ZATCAStandardTaxInvoice {
  constructor({ invoice_xml_str, props }) {
    if (invoice_xml_str) {
      this.invoice_xml = new XMLDocument(invoice_xml_str)
      if (!this.invoice_xml) throw new Error('Error parsing invoice XML string.')
    } else {
      if (!props) throw new Error('Unable to create new XML invoice.')
           if (!props.buyer || !props.buyer.name || (!props.buyer.vat_number && !props.buyer.cr_number && !props.buyer.id_number)) {
        throw new Error('فاتورة قياسية (B2B) تتطلب بيانات المشتري: الاسم، ورقم ضريبي أو سجل تجاري على الأقل')
      }
      this.invoice_xml = new XMLDocument(populateStandardTemplate(props))
      this.parseLineItems(props.line_items ?? [], props)
    }
  }

  constructLineItemTotals = (line_item) => {
    let line_item_total_discounts = 0
    let line_item_total_taxes = 0
    let cacAllowanceCharges = []
    let cacClassifiedTaxCategories = []
    let cacTaxTotal = {}
    const VAT = {
      'cbc:ID': line_item.VAT_percent ? 'S' : 'O',
      'cbc:Percent': line_item.VAT_percent ? (line_item.VAT_percent * 100).toFixedNoRounding(2) : undefined,
      'cac:TaxScheme': { 'cbc:ID': 'VAT' },
    }
    cacClassifiedTaxCategories.push(VAT)
    line_item.discounts?.map((discount) => {
      line_item_total_discounts += discount.amount
      cacAllowanceCharges.push({
        'cbc:ChargeIndicator': 'false',
        'cbc:AllowanceChargeReason': discount.reason,
        'cbc:Amount': { '@_currencyID': 'SAR', '#text': discount.amount.toFixedNoRounding(2) },
      })
    })
    let line_item_subtotal = line_item.tax_exclusive_price * line_item.quantity - line_item_total_discounts
    line_item_subtotal = parseFloat(line_item_subtotal.toFixedNoRounding(2))
    line_item_total_taxes =
      parseFloat(line_item_total_taxes.toFixedNoRounding(2)) +
      parseFloat((line_item_subtotal * line_item.VAT_percent).toFixedNoRounding(2))
    line_item_total_taxes = parseFloat(line_item_total_taxes.toFixedNoRounding(2))
    line_item.other_taxes?.map((tax) => {
      line_item_total_taxes =
        parseFloat(line_item_total_taxes.toFixedNoRounding(2)) +
        parseFloat((tax.percent_amount * line_item_subtotal).toFixedNoRounding(2))
      line_item_total_taxes = parseFloat(line_item_total_taxes.toFixedNoRounding(2))
      cacClassifiedTaxCategories.push({
        'cbc:ID': 'S',
        'cbc:Percent': (tax.percent_amount * 100).toFixedNoRounding(2),
        'cac:TaxScheme': { 'cbc:ID': 'VAT' },
      })
    })
    cacTaxTotal = {
      'cbc:TaxAmount': { '@_currencyID': 'SAR', '#text': line_item_total_taxes.toFixedNoRounding(2) },
      'cbc:RoundingAmount': {
        '@_currencyID': 'SAR',
        '#text': (
          parseFloat(line_item_subtotal.toFixedNoRounding(2)) + parseFloat(line_item_total_taxes.toFixedNoRounding(2))
        ).toFixed(2),
      },
    }
    return {
      cacAllowanceCharges,
      cacClassifiedTaxCategories,
      cacTaxTotal,
      line_item_total_tax_exclusive: line_item_subtotal,
      line_item_total_taxes,
      line_item_total_discounts,
    }
  }

  constructLineItem = (line_item) => {
    const { cacAllowanceCharges, cacClassifiedTaxCategories, cacTaxTotal, line_item_total_tax_exclusive, line_item_total_taxes, line_item_total_discounts } =
      this.constructLineItemTotals(line_item)
    return {
      line_item_xml: {
        'cbc:ID': line_item.id,
        'cbc:InvoicedQuantity': { '@_unitCode': 'PCE', '#text': line_item.quantity },
        'cbc:LineExtensionAmount': { '@_currencyID': 'SAR', '#text': line_item_total_tax_exclusive.toFixedNoRounding(2) },
        'cac:TaxTotal': cacTaxTotal,
        'cac:Item': { 'cbc:Name': line_item.name, 'cac:ClassifiedTaxCategory': cacClassifiedTaxCategories },
        'cac:Price': {
          'cbc:PriceAmount': { '@_currencyID': 'SAR', '#text': line_item.tax_exclusive_price },
          'cac:AllowanceCharge': cacAllowanceCharges,
        },
      },
      line_item_totals: { taxes_total: line_item_total_taxes, discounts_total: line_item_total_discounts, subtotal: line_item_total_tax_exclusive },
    }
  }

  constructLegalMonetaryTotal = (tax_exclusive_subtotal, taxes_total) => ({
    'cbc:LineExtensionAmount': { '@_currencyID': 'SAR', '#text': tax_exclusive_subtotal.toFixedNoRounding(2) },
    'cbc:TaxExclusiveAmount': { '@_currencyID': 'SAR', '#text': tax_exclusive_subtotal.toFixedNoRounding(2) },
    'cbc:TaxInclusiveAmount': { '@_currencyID': 'SAR', '#text': parseFloat((tax_exclusive_subtotal + taxes_total).toFixed(2)) },
    'cbc:AllowanceTotalAmount': { '@_currencyID': 'SAR', '#text': 0 },
    'cbc:PrepaidAmount': { '@_currencyID': 'SAR', '#text': 0 },
    'cbc:PayableAmount': { '@_currencyID': 'SAR', '#text': parseFloat((tax_exclusive_subtotal + taxes_total).toFixed(2)) },
  })

  constructTaxTotal = (line_items) => {
    const cacTaxSubtotal = []
    const addTaxSubtotal = (taxable_amount, tax_amount, tax_percent) => {
      cacTaxSubtotal.push({
        'cbc:TaxableAmount': { '@_currencyID': 'SAR', '#text': taxable_amount.toFixedNoRounding(2) },
        'cbc:TaxAmount': { '@_currencyID': 'SAR', '#text': tax_amount.toFixedNoRounding(2) },
        'cac:TaxCategory': {
          'cbc:ID': { '@_schemeAgencyID': 6, '@_schemeID': 'UN/ECE 5305', '#text': tax_percent ? 'S' : 'O' },
          'cbc:Percent': (tax_percent * 100).toFixedNoRounding(2),
          'cbc:TaxExemptionReason': tax_percent ? undefined : 'Not subject to VAT',
          'cac:TaxScheme': { 'cbc:ID': { '@_schemeAgencyID': '6', '@_schemeID': 'UN/ECE 5153', '#text': 'VAT' } },
        },
      })
    }
    let taxes_total = 0
    line_items.map((line_item) => {
      const total_line_item_discount = line_item.discounts?.reduce((p, c) => p + c.amount, 0)
      const taxable_amount = line_item.tax_exclusive_price * line_item.quantity - (total_line_item_discount ?? 0)
      let tax_amount = line_item.VAT_percent * taxable_amount
      addTaxSubtotal(taxable_amount, tax_amount, line_item.VAT_percent)
      taxes_total += parseFloat(tax_amount.toFixedNoRounding(2))
      line_item.other_taxes?.map((tax) => {
        tax_amount = tax.percent_amount * taxable_amount
        addTaxSubtotal(taxable_amount, tax_amount, tax.percent_amount)
        taxes_total += parseFloat(tax_amount.toFixedNoRounding(2))
      })
    })
    taxes_total = parseFloat(taxes_total.toFixed(2))
    return [
      { 'cbc:TaxAmount': { '@_currencyID': 'SAR', '#text': taxes_total.toFixedNoRounding(2) }, 'cac:TaxSubtotal': cacTaxSubtotal },
      { 'cbc:TaxAmount': { '@_currencyID': 'SAR', '#text': taxes_total.toFixedNoRounding(2) } },
    ]
  }

  parseLineItems(line_items, props) {
    let total_taxes = 0
    let total_subtotal = 0
    let invoice_line_items = []
    line_items.map((line_item) => {
      const { line_item_xml, line_item_totals } = this.constructLineItem(line_item)
      total_taxes += parseFloat(line_item_totals.taxes_total.toFixedNoRounding(2))
      total_subtotal += parseFloat(line_item_totals.subtotal.toFixedNoRounding(2))
      invoice_line_items.push(line_item_xml)
    })
    total_taxes = parseFloat(total_taxes.toFixed(2))
    total_subtotal = parseFloat(total_subtotal.toFixed(2))
    if (props.cancelation) {
      this.invoice_xml.set('Invoice/cac:PaymentMeans', false, {
        'cbc:PaymentMeansCode': props.cancelation.payment_method,
        'cbc:InstructionNote': props.cancelation.reason ?? 'No note Specified',
      })
    }
    this.invoice_xml.set('Invoice/cac:TaxTotal', false, this.constructTaxTotal(line_items))
    this.invoice_xml.set('Invoice/cac:LegalMonetaryTotal', true, this.constructLegalMonetaryTotal(total_subtotal, total_taxes))
    invoice_line_items.map((line_item) => {
      this.invoice_xml.set('Invoice/cac:InvoiceLine', false, line_item)
    })
  }

  getXML() {
    return this.invoice_xml
  }

  sign(certificate_string, private_key_string) {
    return generateSignedXMLString({ invoice_xml: this.invoice_xml, certificate_string, private_key_string })
  }
}

export { ZATCAInvoiceTypes }
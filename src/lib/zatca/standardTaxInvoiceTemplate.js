// Standard (B2B) Tax Invoice XML template — mirrors zatca-xml-js's internal
// simplified_tax_invoice_template.js, but with InvoiceTypeCode "0100000"
// (Standard, per ZATCA's KSA-2 bitmask) and a fully-populated
// AccountingCustomerParty block, since ZATCA requires buyer VAT/CR/address
// details on Standard invoices (not required on Simplified/B2C ones).
//
// Buyer PartyTaxScheme (VAT number) is OMITTED entirely when the buyer has
// no VAT number (e.g. an unregistered establishment identified only by CR)
// — ZATCA's own validation message confirms this element is optional
// ("if it exists in the invoice..."), and an empty CompanyID fails
// validation (BR-KSA-44) rather than being treated as "not provided".

export const ZATCAPaymentMethods = {
  CASH: '10',
  CREDIT: '30',
  BANK_ACCOUNT: '42',
  BANK_CARD: '48',
}

export const ZATCAInvoiceTypes = {
  INVOICE: '388',
  DEBIT_NOTE: '383',
  CREDIT_NOTE: '381',
}

const template = `
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"><ext:UBLExtensions>SET_UBL_EXTENSIONS_STRING</ext:UBLExtensions>

    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>SET_INVOICE_SERIAL_NUMBER</cbc:ID>
    <cbc:UUID>SET_TERMINAL_UUID</cbc:UUID>
    <cbc:IssueDate>SET_ISSUE_DATE</cbc:IssueDate>
    <cbc:IssueTime>SET_ISSUE_TIME</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="0100000">SET_INVOICE_TYPE</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
       SET_BILLING_REFERENCE
    <cac:AdditionalDocumentReference>
        <cbc:ID>ICV</cbc:ID>
        <cbc:UUID>SET_INVOICE_COUNTER_NUMBER</cbc:UUID>
    </cac:AdditionalDocumentReference>
    <cac:AdditionalDocumentReference>
        <cbc:ID>PIH</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">SET_PREVIOUS_INVOICE_HASH</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>
    <cac:AdditionalDocumentReference>
        <cbc:ID>QR</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">SET_QR_CODE_DATA</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>
<cac:Signature>
        <cbc:ID>urn:oasis:names:specification:ubl:signature:Invoice</cbc:ID>
        <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>
    </cac:Signature>
    <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">SET_COMMERCIAL_REGISTRATION_NUMBER</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>SET_STREET_NAME</cbc:StreetName>
        <cbc:BuildingNumber>SET_BUILDING_NUMBER</cbc:BuildingNumber>
        <cbc:PlotIdentification>SET_PLOT_IDENTIFICATION</cbc:PlotIdentification>
        <cbc:CitySubdivisionName>SET_CITY_SUBDIVISION</cbc:CitySubdivisionName>
        <cbc:CityName>SET_CITY</cbc:CityName>
        <cbc:PostalZone>SET_POSTAL_NUMBER</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>SET_VAT_NUMBER</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>SET_VAT_NAME</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">SET_BUYER_CRN</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>SET_BUYER_STREET_NAME</cbc:StreetName>
        <cbc:BuildingNumber>SET_BUYER_BUILDING_NUMBER</cbc:BuildingNumber>
        <cbc:CitySubdivisionName>SET_BUYER_CITY_SUBDIVISION</cbc:CitySubdivisionName>
        <cbc:CityName>SET_BUYER_CITY</cbc:CityName>
        <cbc:PostalZone>SET_BUYER_POSTAL_NUMBER</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      SET_BUYER_TAX_SCHEME_BLOCK
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>SET_BUYER_NAME</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
    </cac:AccountingCustomerParty>
  <cac:Delivery>
    <cbc:ActualDeliveryDate>SET_SUPPLY_DATE</cbc:ActualDeliveryDate>
  </cac:Delivery>
</Invoice>
`

export default function populate(props) {
  let populated_template = template
  populated_template = populated_template.replace(
    'SET_INVOICE_TYPE',
    props.cancelation ? props.cancelation.cancelation_type : ZATCAInvoiceTypes.INVOICE
  )
  populated_template = populated_template.replace('SET_BILLING_REFERENCE', '')
  populated_template = populated_template.replace('SET_INVOICE_SERIAL_NUMBER', props.invoice_serial_number)
  populated_template = populated_template.replace('SET_TERMINAL_UUID', props.egs_info.uuid)
  populated_template = populated_template.replace('SET_ISSUE_DATE', props.issue_date)
  populated_template = populated_template.replace('SET_ISSUE_TIME', props.issue_time)
  populated_template = populated_template.replace('SET_PREVIOUS_INVOICE_HASH', props.previous_invoice_hash)
  populated_template = populated_template.replace('SET_INVOICE_COUNTER_NUMBER', props.invoice_counter_number.toString())
  populated_template = populated_template.replace('SET_COMMERCIAL_REGISTRATION_NUMBER', props.egs_info.CRN_number)
  populated_template = populated_template.replace('SET_STREET_NAME', props.egs_info.location.street)
  populated_template = populated_template.replace('SET_BUILDING_NUMBER', props.egs_info.location.building)
  populated_template = populated_template.replace('SET_PLOT_IDENTIFICATION', props.egs_info.location.plot_identification)
  populated_template = populated_template.replace('SET_CITY_SUBDIVISION', props.egs_info.location.city_subdivision)
  populated_template = populated_template.replace('SET_CITY', props.egs_info.location.city)
  populated_template = populated_template.replace('SET_POSTAL_NUMBER', props.egs_info.location.postal_zone)
  populated_template = populated_template.replace('SET_VAT_NUMBER', props.egs_info.VAT_number)
  populated_template = populated_template.replace('SET_VAT_NAME', props.egs_info.VAT_name)

  // Buyer — mandatory for Standard (B2B) invoices
  const buyer = props.buyer || {}
  populated_template = populated_template.replace('SET_BUYER_CRN', buyer.cr_number || '')
  populated_template = populated_template.replace('SET_BUYER_STREET_NAME', buyer.street || '')
  populated_template = populated_template.replace('SET_BUYER_BUILDING_NUMBER', buyer.building || '0000')
  populated_template = populated_template.replace('SET_BUYER_CITY_SUBDIVISION', buyer.city_subdivision || buyer.city || '')
  populated_template = populated_template.replace('SET_BUYER_CITY', buyer.city || '')
  populated_template = populated_template.replace('SET_BUYER_POSTAL_NUMBER', buyer.postal_zone || '00000')

  // Only emit the buyer's PartyTaxScheme (VAT number) block when a real VAT
  // number is present. An unregistered buyer (identified only by CR) must
  // NOT have this element at all — an empty CompanyID fails ZATCA's
  // 15-digit validation (BR-KSA-44) instead of being read as "not provided".
  const buyerTaxSchemeBlock = buyer.vat_number
    ? `<cac:PartyTaxScheme>
        <cbc:CompanyID>${buyer.vat_number}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>`
    : ''
  populated_template = populated_template.replace('SET_BUYER_TAX_SCHEME_BLOCK', buyerTaxSchemeBlock)

  populated_template = populated_template.replace('SET_BUYER_NAME', buyer.name || '')
  populated_template = populated_template.replace('SET_SUPPLY_DATE', props.supply_date || props.issue_date)
  return populated_template
}
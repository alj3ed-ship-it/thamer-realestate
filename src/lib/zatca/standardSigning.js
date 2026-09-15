// Vendored copy of zatca-xml-js's signing logic, adapted for the Standard
// (B2B) invoice. Identical to the library's internal signing/index.js
// EXCEPT the invoice-hash whitespace fix (see getInvoiceHash below), which
// now also patches the AccountingCustomerParty section — a block that's
// always empty on Simplified invoices (so the upstream library never had
// to handle it) but is fully populated here.

import * as xmldsigjsPkg from 'xmldsigjs'
import xmldomPkg from 'xmldom'
import { createHash, createSign, X509Certificate } from 'node:crypto'
import momentPkg from 'moment'
import x509Pkg from '@fidm/x509'
import parserPkg from 'zatca-xml-js/lib/parser/index.js'
import qrPkg from 'zatca-xml-js/lib/zatca/qr/index.js'
import ublSignExtPkg from 'zatca-xml-js/lib/zatca/templates/ubl_sign_extension_template.js'
import ublSignedPropsPkg from 'zatca-xml-js/lib/zatca/templates/ubl_extension_signed_properties_template.js'

const { XmlCanonicalizer } = xmldsigjsPkg
const DOMParser = xmldomPkg.default ? xmldomPkg.default.DOMParser : xmldomPkg.DOMParser
const { XMLDocument } = parserPkg
const { generateQR } = qrPkg
const buildUblSignExtension = ublSignExtPkg.default || ublSignExtPkg
const buildSignedProperties = ublSignedPropsPkg.default || ublSignedPropsPkg
const buildSignedPropertiesForSigning =
  ublSignedPropsPkg.defaultUBLExtensionsSignedPropertiesForSigning
const moment = momentPkg.default || momentPkg
const { Certificate } = x509Pkg.default || x509Pkg

const cleanUpCertificateString = (s) => s.replace('-----BEGIN CERTIFICATE-----\n', '').replace('-----END CERTIFICATE-----', '').trim()
const cleanUpPrivateKeyString = (s) => s.replace('-----BEGIN EC PRIVATE KEY-----\n', '').replace('-----END EC PRIVATE KEY-----', '').trim()

function getPureInvoiceString(invoice_xml) {
  const invoice_copy = new XMLDocument(invoice_xml.toString({ no_header: false }))
  invoice_copy.delete('Invoice/ext:UBLExtensions')
  invoice_copy.delete('Invoice/cac:Signature')
  invoice_copy.delete('Invoice/cac:AdditionalDocumentReference', { 'cbc:ID': 'QR' })
  const dom = new DOMParser().parseFromString(invoice_copy.toString({ no_header: false }))
  const canonicalizer = new XmlCanonicalizer(false, false)
  return canonicalizer.Canonicalize(dom)
}

function getInvoiceHash(invoice_xml) {
  let pure = getPureInvoiceString(invoice_xml)
  pure = pure.replace('<cbc:ProfileID>', '\n    <cbc:ProfileID>')
  pure = pure.replace('<cac:AccountingSupplierParty>', '\n    \n    <cac:AccountingSupplierParty>')
  
  return createHash('sha256').update(pure).digest('base64')
}

function getCertificateHash(certificate_string) {
  return Buffer.from(createHash('sha256').update(certificate_string).digest('hex')).toString('base64')
}

function createInvoiceDigitalSignature(invoice_hash, private_key_string) {
  const invoice_hash_bytes = Buffer.from(invoice_hash, 'base64')
  const cleaned = cleanUpPrivateKeyString(private_key_string)
  const wrapped = `-----BEGIN EC PRIVATE KEY-----\n${cleaned}\n-----END EC PRIVATE KEY-----`
  const sign = createSign('sha256')
  sign.update(invoice_hash_bytes)
  return Buffer.from(sign.sign(wrapped)).toString('base64')
}

function getCertificateInfo(certificate_string) {
  const cleaned = cleanUpCertificateString(certificate_string)
  const wrapped = `-----BEGIN CERTIFICATE-----\n${cleaned}\n-----END CERTIFICATE-----`
  const hash = getCertificateHash(cleaned)
  const x509 = new X509Certificate(wrapped)
  const cert = Certificate.fromPEM(Buffer.from(wrapped))
  return {
    hash,
    issuer: x509.issuer.split('\n').reverse().join(', '),
    serial_number: BigInt(`0x${x509.serialNumber}`).toString(10),
    public_key: cert.publicKeyRaw,
    signature: cert.signature,
  }
}

function signedPropertiesIndentationFix(signed_invoice_string) {
  let fixer = signed_invoice_string
  let lines = fixer.split('<ds:Object>')[1].split('</ds:Object>')[0].split('\n')
  let fixed = []
  lines.map((line) => fixed.push(line.slice(4, line.length)))
  lines = lines.slice(0, lines.length - 1)
  fixed = fixed.slice(0, fixed.length - 1)
  fixer = fixer.replace(lines.join('\n'), fixed.join('\n'))
  return fixer
}

export function generateSignedXMLString({ invoice_xml, certificate_string, private_key_string }) {
  const invoice_copy = new XMLDocument(invoice_xml.toString({ no_header: false }))
  const invoice_hash = getInvoiceHash(invoice_xml)
  const cert_info = getCertificateInfo(certificate_string)
  const digital_signature = createInvoiceDigitalSignature(invoice_hash, private_key_string)
  const qr = generateQR({
    invoice_xml,
    digital_signature,
    public_key: cert_info.public_key,
    certificate_signature: cert_info.signature,
  })
  const signed_properties_props = {
    sign_timestamp: moment(new Date()).format('YYYY-MM-DDTHH:mm:ss') + 'Z',
    certificate_hash: cert_info.hash,
    certificate_issuer: cert_info.issuer,
    certificate_serial_number: cert_info.serial_number,
  }
  const for_signing = buildSignedPropertiesForSigning(signed_properties_props)
  const signed_properties_xml = buildSignedProperties(signed_properties_props)
  let signed_properties_hash = createHash('sha256').update(Buffer.from(for_signing)).digest('hex')
  signed_properties_hash = Buffer.from(signed_properties_hash).toString('base64')
  const ubl_signature_xml_string = buildUblSignExtension(
    invoice_hash,
    signed_properties_hash,
    digital_signature,
    cleanUpCertificateString(certificate_string),
    signed_properties_xml
  )
  let unsigned = invoice_copy.toString({ no_header: false })
  unsigned = unsigned.replace('SET_UBL_EXTENSIONS_STRING', ubl_signature_xml_string)
  unsigned = unsigned.replace('SET_QR_CODE_DATA', qr)
  const signed_invoice = new XMLDocument(unsigned)
  let signed_invoice_string = signed_invoice.toString({ no_header: false })
  signed_invoice_string = signedPropertiesIndentationFix(signed_invoice_string)
  return { signed_invoice_string, invoice_hash, qr }
}
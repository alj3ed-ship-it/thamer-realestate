// Vercel serverless function. Lets the browser display which ZATCA
// environment (sandbox/simulation/production) this deployment is wired to,
// without ever guessing it client-side — the single source of truth stays
// process.env.ZATCA_ENVIRONMENT on the server.

import { getZatcaEnvironment } from '../src/lib/zatcaCompliance.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    return res.status(200).json({ environment: getZatcaEnvironment() })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

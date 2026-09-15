// api/zatca-production-csid.js
import { runProductionCsidOnboarding } from '../src/lib/zatcaCompliance.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await runProductionCsidOnboarding()
    return res.status(200).json(result)
  } catch (err) {
    console.error('Production CSID onboarding error:', err)
    return res.status(500).json({ error: err.message })
  }
}
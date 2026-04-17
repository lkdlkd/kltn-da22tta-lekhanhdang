const axios = require('axios')

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

/**
 * Call FastAPI recommend engine.
 * FastAPI only processes — no DB access.
 *
 * @param {'similar'|'wizard'} endpoint
 * @param {object} payload
 * @returns {Promise<object[]>} scored + sorted rooms
 */
async function callAI(endpoint, payload) {
  try {
    const { data } = await axios.post(`${AI_URL}/recommend/${endpoint}`, payload, {
      timeout: 6000,
      headers: { 'Content-Type': 'application/json' },
    })
    return data.rooms || []
  } catch (err) {
    // AI service down → caller handles fallback
    console.error(`[aiProxy] FastAPI /${endpoint} error:`, err.message)
    throw err
  }
}

module.exports = { callAI }

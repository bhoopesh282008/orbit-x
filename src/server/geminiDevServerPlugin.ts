import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

interface ChatRequestBody {
  query: string
  mode?: string
  context?: {
    player?: any
    mission?: any
    spacecraft?: any
    metrics?: any
    validation?: any
    simulation?: any
  }
}

export function geminiDevServerPlugin(): Plugin {
  return {
    name: 'orbitx-gemini-server',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (req.url === '/api/ai/chat' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })

          req.on('end', async () => {
            try {
              const data: ChatRequestBody = JSON.parse(body || '{}')
              const apiKey = process.env.GEMINI_API_KEY || ''
              const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

              if (!data.query || typeof data.query !== 'string') {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: false, error: 'Query is required.' }))
                return
              }

              // Build context-aware prompt
              const systemInstructions = `You are ORBIT-X AI, a senior Mission Engineering Assistant for the ORBIT-X space mission simulator.
You assist the Commander in analyzing spacecraft designs, identifying validation failures, calculating power balances and delta-v margins, recommending compatible component upgrades, and troubleshooting missions.
Be technically precise, concise, and helpful. Always format your responses clearly using Markdown.
Whenever suggesting specific component changes, provide an exact structured recommendation object using the application's actual component IDs so the user can preview and apply them.

Known component IDs:
- Buses: bus-small, bus-medium, bus-heavy
- Propulsion: prop-chemical, prop-ion, prop-electric
- Propellant Tanks: fuel-small, fuel-medium, fuel-large
- Power Generation: power-small, power-medium, power-high
- Energy Storage: energy-small, energy-medium, energy-large
- Communications: comm-low, comm-medium, comm-high, comm-deep
- Instruments: inst-camera, inst-spectrometer, inst-magnetometer, inst-radar

Response format:
Respond with a JSON object:
{
  "message": "Clear conversational analysis and explanation in markdown",
  "suggestions": ["Follow-up question or quick prompt 1", "Follow-up question 2"],
  "recommendations": [
    {
      "action": "replace_component" | "add_component" | "remove_component",
      "currentComponentId": "optional old component id",
      "recommendedComponentId": "new component id from catalogue",
      "reason": "Why this change solves the constraint",
      "estimatedImpact": {
        "massDeltaKg": number,
        "costDeltaCredits": number,
        "powerDeltaWatts": number,
        "deltaVDeltaMps": number
      }
    }
  ]
}`

              const prompt = `${systemInstructions}

CURRENT MISSION & SPACECRAFT CONTEXT:
${JSON.stringify(data.context || {}, null, 2)}

CHAT MODE: ${data.mode || 'GENERAL'}
COMMANDER QUERY:
${data.query}

Respond in the requested JSON format strictly without markdown code block backticks if possible, or standard JSON.`

              if (!apiKey) {
                // Realistic offline engineering analysis fallback
                const fallbackResponse = generateLocalEngineeringAnalysis(data.query, data.context)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true, data: fallbackResponse }))
                return
              }

              // Call Google Gemini API
              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                      temperature: 0.2,
                      responseMimeType: 'application/json',
                    },
                  }),
                }
              )

              if (!geminiRes.ok) {
                // If API quota or network error, fallback to deterministic aerospace guidance
                const fallback = generateLocalEngineeringAnalysis(data.query, data.context)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true, data: fallback }))
                return
              }

              const geminiData: any = await geminiRes.json()
              const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
              let parsed: any
              try {
                const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
                parsed = JSON.parse(cleaned)
              } catch (_) {
                parsed = {
                  message: rawText,
                  suggestions: ['Optimize my spacecraft', 'Check power balance', 'Why is delta-v low?'],
                  recommendations: [],
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, data: parsed }))
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: false, error: err.message || 'Internal AI Error' }))
            }
          })
          return
        }
        next()
      })
    },
  }
}

function generateLocalEngineeringAnalysis(query: string, ctx?: any) {
  const metrics = ctx?.metrics || {}
  const mission = ctx?.mission || {}
  const components = ctx?.spacecraft?.components || []
  const q = query.toLowerCase()

  const powerDeficit = (metrics.powerBalanceWatts ?? 0) < 0
  const isOverBudget = metrics.isOverBudget
  const isOverMass = metrics.isOverMassLimit
  const deltaVShortfall = (metrics.totalAvailableDeltaV ?? 0) < (metrics.requiredMissionDeltaV ?? 0)
  const missingInst = metrics.missingInstruments || []

  if (q.includes('power') || powerDeficit) {
    return {
      message: `### Spacecraft Power Balance Diagnosis\n\n- **Generation**: \`${metrics.powerGenerationWatts ?? 0} W\`\n- **Consumption**: \`${metrics.powerConsumptionWatts ?? 0} W\`\n- **Net Margin**: \`${metrics.powerBalanceWatts ?? 0} W\`\n\n${
        powerDeficit
          ? `Your solar generation is insufficient to support installed avionics and scientific payloads. Replace your current power array with **High-Efficiency Gallium Arsenide UltraFlex Panels** (+180 W) or install a larger secondary array.`
          : `Your electrical power bus is nominal with a positive surplus of **+${metrics.powerBalanceWatts ?? 0} W**.`
      }`,
      suggestions: ['Apply High-Efficiency Solar Array', 'Check battery capacity', 'Optimize spacecraft mass'],
      recommendations: powerDeficit
        ? [
            {
              action: 'replace_component',
              currentComponentId: components.find((c: any) => c.category === 'power')?.id,
              recommendedComponentId: 'power-high',
              reason: 'Eliminates electrical deficit with +180 W generation',
              estimatedImpact: {
                massDeltaKg: 14,
                costDeltaCredits: 12000,
                powerDeltaWatts: 180,
                deltaVDeltaMps: -25,
              },
            },
          ]
        : [],
    }
  }

  if (q.includes('delta-v') || q.includes('fuel') || deltaVShortfall) {
    return {
      message: `### Propulsion & Delta-v Analysis (Tsiolkovsky Evaluation)\n\n- **Available \\Delta v**: \`${metrics.totalAvailableDeltaV ?? 0} m/s\`\n- **Required for ${mission.name || 'Mission'}**: \`${metrics.requiredMissionDeltaV ?? 0} m/s\`\n\n${
        deltaVShortfall
          ? `Your spacecraft has a delta-v deficit of \`${(metrics.requiredMissionDeltaV ?? 0) - (metrics.totalAvailableDeltaV ?? 0)} m/s\`. Install a **Large Cryogenic Propellant Tank (fuel-large)** or upgrade to a high-Isp **High-Efficiency Hall Effect Ion Thruster** to maximize specific impulse.`
          : `Orbital maneuver margin is nominal with **${metrics.totalAvailableDeltaV ?? 0} m/s** available.`
      }`,
      suggestions: ['Upgrade to Large Propellant Tank', 'Switch to Ion Thruster', 'Check Launch Vehicle Sizing'],
      recommendations: deltaVShortfall
        ? [
            {
              action: 'replace_component',
              currentComponentId: components.find((c: any) => c.category === 'fuel')?.id,
              recommendedComponentId: 'fuel-large',
              reason: 'Increases reaction propellant mass to 1,600 kg',
              estimatedImpact: {
                massDeltaKg: 400,
                costDeltaCredits: 18000,
                powerDeltaWatts: 0,
                deltaVDeltaMps: 920,
              },
            },
          ]
        : [],
    }
  }

  if (q.includes('instrument') || missingInst.length > 0) {
    return {
      message: `### Scientific Payload Status\n\n${
        missingInst.length > 0
          ? `Critical failure detected: The following mandatory instruments are missing for **${mission.name || 'Mission'}**: **${missingInst.join(', ')}**. Launch authorization remains locked until these payloads are installed.`
          : `All mission mandatory scientific sensors are installed and verified.`
      }`,
      suggestions: ['Auto-equip required instruments', 'Analyze power consumption', 'Check payload envelope'],
      recommendations: missingInst.map((inst: string) => ({
        action: 'add_component',
        recommendedComponentId: `inst-${inst}`,
        reason: `Mandatory scientific sensor for ${mission.name}`,
        estimatedImpact: {
          massDeltaKg: 18,
          costDeltaCredits: 15000,
          powerDeltaWatts: -20,
          deltaVDeltaMps: -30,
        },
      })),
    }
  }

  // General Spacecraft Readiness
  return {
    message: `### Commander, ORBIT-X Engineering Scan Complete\n\n- **Wet Mass**: \`${metrics.totalMassKg ?? 0} kg\`\n- **Power Margin**: \`${(metrics.powerBalanceWatts ?? 0) >= 0 ? '+' : ''}${metrics.powerBalanceWatts ?? 0} W\`\n- **Available \\Delta v**: \`${metrics.totalAvailableDeltaV ?? 0} m/s\`\n- **Mission Readiness**: ${
      metrics.hasStructureBus && !powerDeficit && !isOverBudget && !isOverMass && missingInst.length === 0
        ? '**100% FLIGHT CERTIFIED (NOMINAL)**'
        : '**HOLD (Action Required)**'
    }\n\nI am monitoring all subsystem margins. What specific subsystem would you like to optimize or investigate?`,
    suggestions: ['Analyze My Spacecraft', 'Why Can’t I Launch?', 'Check Power Balance', 'Improve Delta-v'],
    recommendations: [],
  }
}

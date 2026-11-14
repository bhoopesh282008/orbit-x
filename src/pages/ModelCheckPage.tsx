import { useMemo } from 'react'
import { CheckCircle2, FlaskConical, TriangleAlert, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { MODEL_SIMPLIFICATIONS, runValidation, type ValidationResult } from '@/services/modelValidation'

const fmt = (n: number, digits = 2) => n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })

function referenceText(r: ValidationResult) {
  const d = r.digits ?? 2
  return Array.isArray(r.reference) ? `${fmt(r.reference[0], d)} – ${fmt(r.reference[1], d)}` : fmt(r.reference, d)
}

/** "Is the physics real?" — the game's models checked against published figures. */
export default function ModelCheckPage() {
  const results = useMemo(() => runValidation(), [])
  const passed = results.filter((r) => r.pass).length
  const groups = useMemo(() => Array.from(new Set(results.map((r) => r.group))), [results])
  const worst = results.reduce((m, r) => Math.max(m, Math.abs(r.errorPct)), 0)

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        eyebrow="Model accuracy"
        title="Is the physics real?"
        description="Each value below is computed live by the same code the game runs, then compared with a published real-world figure. Nothing is hard-coded to pass."
        icon={FlaskConical}
      />

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel-surface rounded-2xl p-5">
          <p className="eyebrow !text-[10px]">Within tolerance</p>
          <p className={cn('mt-2 font-mono text-3xl font-semibold', passed === results.length ? 'text-status-success' : 'text-status-warning')}>
            {passed}/{results.length}
          </p>
        </div>
        <div className="panel-surface rounded-2xl p-5">
          <p className="eyebrow !text-[10px]">Largest deviation</p>
          <p className="mt-2 font-mono text-3xl font-semibold">{fmt(worst, 1)}%</p>
          <p className="mt-1 text-xs text-text-muted">vs. reference value or edge of the accepted range</p>
        </div>
        <div className="panel-surface rounded-2xl p-5">
          <p className="eyebrow !text-[10px]">Sources</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            NASA fact sheets, US Standard Atmosphere 1976, Apollo & Mars 2020 flight data, Falcon 9 webcast telemetry.
          </p>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group} aria-label={group}>
          <h2 className="mb-2 text-lg font-semibold tracking-tight">{group}</h2>
          <div className="panel-surface overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th scope="col" className="px-4 py-3 font-medium text-text-muted">Quantity</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-text-muted">ORBIT-X</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-text-muted">Real world</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium text-text-muted">Error</th>
                  <th scope="col" className="px-4 py-3 font-medium text-text-muted">
                    <span className="sr-only">Result</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {results
                  .filter((r) => r.group === group)
                  .map((r) => (
                    <tr key={r.id} className="border-b border-white/[0.04] align-top last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text-primary">{r.quantity}</p>
                        <p className="mt-0.5 text-xs text-text-muted">{r.source}</p>
                        {r.note && <p className="mt-0.5 text-xs text-text-secondary">{r.note}</p>}
                        <p className="mt-0.5 font-mono text-[10.5px] text-text-muted/80">{r.model}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                        {fmt(r.ours, r.digits ?? 2)} <span className="text-text-muted">{r.unit}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                        {referenceText(r)} <span className="text-text-muted">{r.unit}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums">
                        {r.errorPct === 0 && Array.isArray(r.reference) ? (
                          <span className="text-text-muted">in range</span>
                        ) : (
                          <span>
                            {r.errorPct > 0 ? '+' : ''}
                            {fmt(r.errorPct, 1)}%
                          </span>
                        )}
                        <p className="text-[10.5px] text-text-muted">±{fmt(r.tolerance * 100, 0)}% allowed</p>
                      </td>
                      <td className="px-4 py-3">
                        {r.pass ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success">
                            <CheckCircle2 className="h-4 w-4" /> Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-status-danger">
                            <XCircle className="h-4 w-4" /> Off
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="panel-surface rounded-2xl p-5" aria-label="Known simplifications">
        <h2 className="flex items-center gap-2 font-semibold">
          <TriangleAlert className="h-4 w-4 text-status-warning" /> Where the model simplifies
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text-secondary">
          {MODEL_SIMPLIFICATIONS.map((s) => (
            <li key={s} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-text-muted" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  )
}

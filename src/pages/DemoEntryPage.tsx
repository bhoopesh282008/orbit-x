import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageLoading } from '@/components/ui/loading'
import { enterDemo } from '@/demo/judgeDemo'

/**
 * Judge demo links:
 *   /demo/mars/design          (path form)
 *   /?demo=mars&screen=design  (query form, redirected here)
 *   /demo/earth/launch?fail=short|breakup|power|scrub  (pre-broken design to show a failure mode)
 *   /demo/earth/design?crew=4  (co-op team of 2–4 on one screen)
 * Starts a password-less local session with a flight-ready design and opens the screen.
 */
export default function DemoEntryPage() {
  const { mission, screen } = useParams<{ mission?: string; screen?: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const target = enterDemo(
      mission ?? params.get('demo') ?? params.get('mission'),
      screen ?? params.get('screen'),
      params.get('fail'),
      params.get('crew')
    )
    navigate(target, { replace: true })
  }, [mission, screen, params, navigate])

  return <PageLoading />
}

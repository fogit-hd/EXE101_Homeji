import { useCallback, useEffect, useRef, useState } from 'react'
import { requestPasswordOtp, resetPasswordWithOtp } from '../../api/recovery'
import { getErrorMessage } from '../../lib/errors'

export function usePasswordRecovery() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const busy = useRef(false)
  const codeInput = useRef<HTMLInputElement>(null)
  const codeInputRef = useCallback((node: HTMLInputElement | null) => { codeInput.current = node }, [])
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  useEffect(() => { if (sent) codeInput.current?.focus() }, [sent])

  async function run(action: 'send' | 'reset') {
    if (busy.current) return
    if (action === 'reset' && password !== confirmation) { setError('Mật khẩu xác nhận không khớp.'); return }
    busy.current = true
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = action === 'send'
        ? await requestPasswordOtp(email.trim())
        : await resetPasswordWithOtp(email.trim(), code, password)
      setMessage(result.message)
      if (action === 'send') { setSent(true); setCooldown(60); setCode('') }
      else { setDone(true); setCode(''); setPassword(''); setConfirmation('') }
    } catch (err) { setError(getErrorMessage(err, 'Chưa xử lý được yêu cầu. Vui lòng thử lại.')) }
    finally { busy.current = false; setLoading(false) }
  }

  function changeEmail() {
    setSent(false); setCode(''); setPassword(''); setConfirmation(''); setError(''); setMessage('')
  }

  return { email, setEmail, code, setCode, password, setPassword, confirmation, setConfirmation,
    sent, done, cooldown, loading, error, message, codeInputRef, run, changeEmail }
}

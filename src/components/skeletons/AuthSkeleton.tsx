import { Sk, SkScreen } from './Skeleton'
import './AuthSkeleton.css'

export function AuthSkeleton({ mode = 'login' }: { mode?: 'login' | 'register' | 'verify' | 'recovery' }) {
  const login = mode === 'login', register = mode === 'register'
  const label = login ? 'Đang mở trang đăng nhập…' : register ? 'Đang mở trang đăng ký…' : mode === 'verify' ? 'Đang mở xác thực email…' : 'Đang mở khôi phục tài khoản…'
  return <SkScreen name="auth" label={label} className={`sk-auth sk-auth--${mode}`}>
    <div className="sk-auth__layout" aria-hidden="true">
      <div className="sk-auth__form">
        <div className="sk-row"><Sk w={32} h={32} r={8} /><Sk w={104} h={22} /></div>
        <Sk w="75%" h={40} className="sk-auth__title" /><Sk w="85%" h={14} />
        {login ? <Sk h={44} r={999} className="sk-auth__social" /> : null}
        {Array.from({ length: register ? 4 : 2 }, (_, i) => <div key={i} className="sk-stack sk-auth__field"><Sk w={100} h={12} /><Sk h={48} r={10} /></div>)}
        <Sk h={48} r={999} /><Sk w="65%" h={12} />
        <p className="sk-auth__status">{label}</p>
      </div>
      {login || register ? <div className="sk-auth__visual"><Sk h="100%" r={register ? 56 : 24} /></div> : null}
    </div>
  </SkScreen>
}

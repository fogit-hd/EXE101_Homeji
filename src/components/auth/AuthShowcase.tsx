import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { AuthSection } from '../../lib/authSections'
import { DURATION, EASE } from '../../lib/motionTokens'
import { AuthHomeGallery } from './AuthHomeGallery'

const COPY = {
  login: { title: 'Chào bạn trở về.', subtitle: 'Căn phòng đã lưu, những cuộc trò chuyện — mọi thứ vẫn ở đây.' },
  register: { title: 'Một người bạn mới.\nMột nơi để thuộc về.', subtitle: 'Tạo tài khoản để lưu phòng và liên hệ người đăng.' },
  'forgot-password': { title: 'Mình cùng tìm lại nhé.', subtitle: 'Đặt lại mật khẩu để trở về với những điều bạn đang tìm.' },
}
export function AuthShowcase({ section }: { section: AuthSection }) {
  const reduced = useReducedMotion()
  return <aside className="auth-showcase" aria-label="Một nơi để thuộc về">
    <AuthHomeGallery />
    <div className="auth-showcase__content">
      <div className="auth-showcase__copy">
        <AnimatePresence initial={false} mode="wait">
          <motion.div key={section} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -6 }}
            transition={{ duration: reduced ? 0 : DURATION.fast, ease: EASE.out }}>
            <h2>{COPY[section].title}</h2><p>{COPY[section].subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </aside>
}

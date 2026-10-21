import { MarketplaceLoadingSkeleton } from '../MarketplaceLoadingSkeleton'
import type { MarketplaceTab } from '../../lib/marketplaceNavigation'
import { Sk, SkCard, SkHeader, SkLines, SkScreen, SkTabs } from './Skeleton'
export { AuthSkeleton } from './AuthSkeleton'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

type HeadProps = { withHeader?: boolean }

function RoomCard() {
  return (
    <SkCard style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
      <Sk h={150} r={0} />
      <div className="sk-stack" style={{ padding: 14 }}>
        <Sk w="85%" h={14} />
        <Sk w="60%" h={12} />
        <Sk w={110} h={16} />
        <Sk w="70%" h={10} />
      </div>
    </SkCard>
  )
}

function RoomRow({ thumb = 96 }: { thumb?: number }) {
  return (
    <div className="sk-room-row">
      <Sk w={thumb} h={Math.round(thumb * 0.75)} r={12} />
      <SkLines widths={['80%', '50%', '35%']} />
    </div>
  )
}

function ListRow({ icon = 40, round = false, trailing = true }: { icon?: number; round?: boolean; trailing?: boolean }) {
  return (
    <div className="sk-row" style={{ flexWrap: 'nowrap', padding: '12px 4px', borderBottom: '1px solid #eef2f3' }}>
      <Sk w={icon} h={icon} r={round ? 999 : 12} />
      <SkLines widths={['55%', '82%']} />
      {trailing ? <Sk w={48} h={10} /> : null}
    </div>
  )
}

/* ---------- Trang chủ (hub) ---------- */
export function HubSkeleton() {
  return (
    <SkScreen name="hub" label="Đang tải trang chủ…">
      <SkHeader eyebrow titleWidth={300} actions={1} />
      <div className="sk-hub__hero">
        <div className="sk-stack"><Sk w={90} h={10} /><Sk w={280} h={24} className="sk-max" /><Sk w={360} h={12} className="sk-max" /></div>
        <Sk w={150} h={40} r={999} className="sk-hide-mobile" />
      </div>
      <div className="sk-row"><Sk w={120} h={12} /><Sk w={200} h={12} /></div>
      <HubBodySkeleton />
    </SkScreen>
  )
}

/** Data part of the hub only (header/hero already rendered by the hub). */
export function HubBodySkeleton() {
  return (
    <div className="sk-stack" style={{ gap: 18 }} aria-hidden="true">
      <div className="sk-grid sk-hub__promo">
        <div className="sk-hub__banner">
          <div className="sk-stack"><Sk w={110} h={10} /><Sk w="80%" h={30} /><Sk w="90%" h={12} /><Sk w={130} h={36} r={999} /></div>
          <Sk h={170} r={16} />
        </div>
        <SkCard><Sk w="60%" h={18} /><Sk w={40} h={10} />{range(5).map(i => <Sk key={i} w={`${80 - i * 8}%`} h={11} />)}</SkCard>
      </div>
      <div className="sk-grid sk-two-col">
        {range(2).map(i => <SkCard key={i}><div className="sk-header"><Sk w={170} h={16} /><Sk w={50} h={12} /></div><ListRow icon={36} round={i === 1} trailing={false} /></SkCard>)}
      </div>
      <div className="sk-grid sk-hub__lower">
        <SkCard>
          <div className="sk-header"><Sk w={180} h={18} /><Sk w={60} h={12} /></div>
          {range(3).map(i => <RoomRow key={i} />)}
        </SkCard>
        <div className="sk-stack" style={{ gap: 16 }}>
          <SkCard><Sk w={110} h={16} /><Sk w={60} h={30} /><Sk h={36} r={999} /></SkCard>
          <SkCard><Sk w={90} h={16} />{range(2).map(i => <RoomRow key={i} thumb={52} />)}</SkCard>
        </div>
      </div>
    </div>
  )
}

/* ---------- Tìm phòng / bản đồ ---------- */
export function ListingsSkeleton() {
  return (
    <SkScreen name="listings" label="Đang tải danh sách phòng…">
      <div className="sk-row"><Sk w={460} h={44} r={999} className="sk-max" /><Sk w={92} h={44} r={999} /></div>
      <div className="sk-row">{range(5).map(i => <Sk key={i} w={i === 0 ? 96 : 78} h={32} r={999} />)}</div>
      <div className="sk-grid sk-listings__body">
        <div className="sk-stack" style={{ gap: 12 }}>
          <Sk w={160} h={12} />
          {range(4).map(i => <SkCard key={i}><RoomRow thumb={112} /></SkCard>)}
        </div>
        <Sk className="sk-listings__map" />
      </div>
    </SkScreen>
  )
}

/* ---------- Chợ đồ ---------- */
export function MarketplaceSkeleton({ tab = 'food', withHeader = true }: HeadProps & { tab?: MarketplaceTab }) {
  return (
    <SkScreen name="marketplace" label="Đang tải chợ đồ…">
      {withHeader ? (
        <>
          <SkHeader eyebrow titleWidth={340} actions={1} />
          <div className="sk-row"><SkTabs count={4} pill={false} /></div>
          <div className="sk-row"><Sk w={150} h={34} r={999} /><Sk w={96} h={34} r={999} /></div>
        </>
      ) : null}
      <MarketplaceLoadingSkeleton tab={tab} />
    </SkScreen>
  )
}

/* ---------- Tin nhắn ---------- */
export function MessagesSkeleton() {
  return (
    <SkScreen name="messages" label="Đang tải hộp thư…" className="sk-messages">
      <div className="sk-messages__list">
        <div className="sk-header"><Sk w={110} h={22} /><Sk w={30} h={30} r={999} /></div>
        <Sk h={38} r={999} />
        <SkTabs count={3} />
        {range(6).map(i => <div key={i} className="sk-row" style={{ flexWrap: 'nowrap' }}><Sk w={42} h={42} r={999} /><SkLines widths={['60%', '88%']} /></div>)}
      </div>
      <div className="sk-messages__thread">
        <div className="sk-messages__bar"><Sk w={40} h={40} r={999} /><div className="sk-stack"><Sk w={160} h={14} /><Sk w={220} h={10} /></div></div>
        <div className="sk-messages__bubbles">
          <Sk w="38%" h={40} r={16} /><Sk w="52%" h={40} r={16} />
          <Sk w="44%" h={56} r={16} className="is-mine" />
          <Sk w="30%" h={40} r={16} /><Sk w="36%" h={40} r={16} className="is-mine" />
        </div>
        <div className="sk-messages__composer"><Sk h={44} r={999} /></div>
      </div>
    </SkScreen>
  )
}

/** Conversation list column only (inside the real messages layout). */
export function ConversationListSkeleton() {
  return (
    <SkScreen name="conversations" label="Đang tải hộp thư…">
      {range(6).map(i => <div key={i} className="sk-row" style={{ flexWrap: 'nowrap' }}><Sk w={42} h={42} r={999} /><SkLines widths={['60%', '88%']} /></div>)}
    </SkScreen>
  )
}

/* ---------- Thông báo ---------- */
export function NotificationsSkeleton({ withHeader = false, tabs = true }: HeadProps & { tabs?: boolean }) {
  return (
    <SkScreen name="notifications" label="Đang tải thông báo…">
      {withHeader ? <SkHeader titleWidth={180} actions={1} /> : null}
      {tabs ? <><SkTabs count={2} /><Sk w={70} h={10} /></> : null}
      <div>{range(6).map(i => <ListRow key={i} />)}</div>
    </SkScreen>
  )
}

/* ---------- Gói đăng ký / thanh toán ---------- */
export function PaymentsSkeleton({ withHeader = true }: HeadProps) {
  return (
    <SkScreen name="payments" label="Đang tải gói đăng ký…">
      {withHeader ? <SkHeader titleWidth={240} lead /> : null}
      <SkCard style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Sk w={44} h={44} r={12} /><SkLines widths={['30%', '55%']} /><Sk w={80} h={14} />
      </SkCard>
      <SkTabs count={2} />
      <div className="sk-grid sk-pay__plans">
        {range(4).map(i => (
          <SkCard key={i} style={{ minHeight: 280 }}>
            <Sk w="60%" h={16} /><Sk w="40%" h={10} /><Sk w="75%" h={30} /><Sk w="50%" h={10} />
            <div className="sk-stack" style={{ marginTop: 6 }}>{range(4).map(j => <Sk key={j} w={`${90 - j * 10}%`} h={10} />)}</div>
            <Sk h={38} r={999} style={{ marginTop: 'auto' }} />
          </SkCard>
        ))}
      </div>
      <SkCard style={{ gap: 0 }}>
        {range(5).map(i => <div key={i} className="sk-table-row"><Sk w="60%" h={12} /><Sk w="50%" h={12} /><Sk w="50%" h={12} /><Sk w="50%" h={12} /></div>)}
      </SkCard>
    </SkScreen>
  )
}

/* ---------- Tin của tôi ---------- */
export function MyPostsSkeleton({ withHeader = false }: HeadProps) {
  return (
    <SkScreen name="myPosts" label="Đang tải tin đã đăng…">
      {withHeader ? <SkHeader titleWidth={200} actions={3} /> : null}
      <Sk h={44} r={12} />
      <div className="sk-stack" style={{ gap: 12 }}>
        {range(4).map(i => (
          <SkCard key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Sk w={120} h={88} r={12} />
            <SkLines widths={['70%', '45%', '30%']} />
            <div className="sk-stack sk-hide-mobile" style={{ flex: 'none', alignItems: 'flex-end' }}><Sk w={84} h={24} r={999} /><Sk w={120} h={32} r={999} /></div>
          </SkCard>
        ))}
      </div>
    </SkScreen>
  )
}

/* ---------- Ở ghép ---------- */
export function InvitationsSkeleton({ withHeader = false }: HeadProps) {
  return (
    <SkScreen name="invitations" label="Đang tải ở ghép…">
      {withHeader ? <SkHeader eyebrow lead titleWidth={360} /> : null}
      <SkTabs count={3} />
      <div className="sk-grid sk-cards-3">
        {range(6).map(i => (
          <SkCard key={i}>
            <div className="sk-row" style={{ flexWrap: 'nowrap' }}><Sk w={52} h={52} r={999} /><SkLines widths={['60%', '40%']} /></div>
            <div className="sk-row">{range(3).map(j => <Sk key={j} w={64} h={22} r={999} />)}</div>
            <Sk w="90%" h={10} /><Sk w="70%" h={10} />
            <Sk h={36} r={999} />
          </SkCard>
        ))}
      </div>
    </SkScreen>
  )
}

/** Room-share posts inside the roommate workspace. */
export function RoommateRoomsSkeleton() {
  return (
    <SkScreen name="roommate-rooms" label="Đang tìm tin ghép…">
      <div className="sk-grid sk-cards-3">{range(3).map(i => <RoomCard key={i} />)}</div>
    </SkScreen>
  )
}

/* ---------- Hồ sơ ---------- */
export function ProfileSkeleton({ withHeader = true }: HeadProps) {
  return (
    <SkScreen name="profile" label="Đang tải hồ sơ…">
      {withHeader ? <SkHeader eyebrow lead titleWidth={260} /> : null}
      <div className="sk-row" style={{ flexWrap: 'nowrap' }}>
        <Sk w={72} h={72} r={999} />
        <div className="sk-stack"><Sk w={160} h={18} /><div className="sk-row"><Sk w={80} h={20} r={999} /><Sk w={60} h={20} r={999} /></div><Sk w={240} h={10} className="sk-max" /></div>
      </div>
      <div className="sk-grid sk-two-col"><Sk h={14} w="30%" style={{ justifySelf: 'center' }} /><Sk h={14} w="30%" style={{ justifySelf: 'center' }} /></div>
      <SkCard>
        <Sk w={150} h={16} />
        <div className="sk-grid sk-two-col">
          {range(6).map(i => <div key={i} className="sk-stack"><Sk w={90} h={10} /><Sk h={40} r={10} /></div>)}
        </div>
      </SkCard>
    </SkScreen>
  )
}

/* ---------- Tin đã lưu ---------- */
export function SavedSkeleton({ withHeader = false }: HeadProps) {
  return (
    <SkScreen name="saved" label="Đang tải tin đã lưu…">
      {withHeader ? <SkHeader eyebrow lead titleWidth={380} /> : null}
      <div className="sk-row"><Sk w={18} h={18} r={5} /><Sk w={200} h={12} /></div>
      <div className="sk-grid sk-cards-4">{range(4).map(i => <RoomCard key={i} />)}</div>
    </SkScreen>
  )
}

/* ---------- Lịch xem phòng ---------- */
export function AppointmentsSkeleton({ withHeader = true }: HeadProps) {
  return (
    <SkScreen name="appointments" label="Đang tải lịch hẹn…">
      {withHeader ? <SkHeader eyebrow titleWidth={320} actions={2} /> : null}
      <div className="sk-grid sk-appt">
        <div className="sk-stack" style={{ gap: 14 }}>
          <SkCard>
            <div className="sk-header"><Sk w={20} h={20} r={999} /><Sk w={120} h={14} /><Sk w={20} h={20} r={999} /></div>
            <div className="sk-cal">{range(35).map(i => <Sk key={i} h={26} r={8} />)}</div>
          </SkCard>
          <SkCard className="sk-hide-tablet"><Sk w={140} h={14} />{range(3).map(i => <Sk key={i} w={`${85 - i * 10}%`} h={11} />)}</SkCard>
        </div>
        <SkCard>
          <div className="sk-header"><Sk w={180} h={16} /><Sk w={70} h={10} /></div>
          {range(4).map(i => <ListRow key={i} icon={48} />)}
        </SkCard>
      </div>
    </SkScreen>
  )
}

/** Appointment list only (calendar already rendered). */
export function AppointmentListSkeleton() {
  return (
    <SkScreen name="appointment-list" label="Đang tải lịch hẹn…">
      <div>{range(3).map(i => <ListRow key={i} icon={48} />)}</div>
    </SkScreen>
  )
}

/* ---------- Tin tìm phòng ---------- */
export function WantedSkeleton({ withHeader = false, form = false }: HeadProps & { form?: boolean }) {
  return (
    <SkScreen name="wanted" label="Đang tải nhu cầu tìm phòng…">
      {withHeader ? <SkHeader titleWidth={220} actions={2} /> : null}
      {form ? <FormBody /> : (
        <>
          <SkCard><Sk h={38} r={10} /><Sk h={38} r={10} w="70%" /></SkCard>
          <SkTabs count={2} pill={false} />
          <div className="sk-stack" style={{ gap: 12 }}>
            {range(3).map(i => <SkCard key={i}><div className="sk-header"><Sk w="45%" h={16} /><Sk w={90} h={22} r={999} /></div><Sk w="80%" h={11} /><div className="sk-row">{range(3).map(j => <Sk key={j} w={70} h={22} r={999} />)}</div></SkCard>)}
          </div>
        </>
      )}
    </SkScreen>
  )
}

/* ---------- Nhật ký hoạt động ---------- */
export function ActivitiesSkeleton({ withHeader = false }: HeadProps) {
  return (
    <SkScreen name="activities" label="Đang tải nhật ký hoạt động…">
      {withHeader ? <SkHeader titleWidth={260} /> : null}
      <div className="sk-stack" style={{ gap: 8, flex: 'none' }}><Sk w={60} h={10} /><Sk w={200} h={36} r={10} /></div>
      <SkCard style={{ gap: 0 }}>{range(6).map(i => <ListRow key={i} icon={32} round />)}</SkCard>
    </SkScreen>
  )
}

/* ---------- Form đăng / sửa tin ---------- */
function FormBody() {
  return (
    <SkCard style={{ gap: 16 }}>
      <Sk w={220} h={20} />
      <div className="sk-grid sk-two-col">
        {range(6).map(i => <div key={i} className="sk-stack"><Sk w={100} h={10} /><Sk h={42} r={10} /></div>)}
      </div>
      <div className="sk-stack"><Sk w={100} h={10} /><Sk h={110} r={10} /></div>
      <div className="sk-row">{range(4).map(i => <Sk key={i} w={96} h={72} r={12} />)}</div>
      <Sk w={160} h={42} r={999} style={{ alignSelf: 'flex-end' }} />
    </SkCard>
  )
}

export function PostFormSkeleton({ withHeader = true }: HeadProps) {
  return (
    <SkScreen name="post-form" label="Đang tải biểu mẫu tin…">
      {withHeader ? <SkHeader eyebrow titleWidth={260} /> : null}
      <div className="sk-row">{range(4).map(i => <Sk key={i} w={110} h={8} r={999} />)}</div>
      <FormBody />
    </SkScreen>
  )
}

/* ---------- Chờ thanh toán ---------- */
export function PaymentWaitSkeleton() {
  return (
    <SkScreen name="payment-wait" label="Đang tải thanh toán…">
      <SkCard className="sk-center" style={{ alignItems: 'center', gap: 14 }}>
        <Sk w={180} h={20} /><Sk w={240} h={12} className="sk-max" />
        <Sk w={220} h={220} r={16} />
        <Sk w={140} h={26} /><Sk h={42} r={999} />
      </SkCard>
    </SkScreen>
  )
}

/* ---------- Quản trị ---------- */
export function AdminSkeleton({ withHeader = true }: HeadProps) {
  return (
    <SkScreen name="admin" label="Đang tải dữ liệu quản trị…">
      {withHeader ? <SkHeader eyebrow titleWidth={280} actions={2} /> : null}
      <div className="sk-grid sk-metrics">{range(4).map(i => <SkCard key={i}><Sk w="50%" h={10} /><Sk w="60%" h={26} /><Sk w="40%" h={10} /></SkCard>)}</div>
      <SkTabs count={4} />
      <SkCard style={{ gap: 0 }}>{range(6).map(i => <div key={i} className="sk-table-row"><Sk w="70%" h={12} /><Sk w="50%" h={12} /><Sk w="60%" h={22} r={999} /><Sk w="50%" h={30} r={999} /></div>)}</SkCard>
    </SkScreen>
  )
}

/* ---------- Chính sách / điều khoản ---------- */
export function LegalSkeleton() {
  return (
    <SkScreen name="legal" label="Đang tải nội dung…">
      <div style={{ maxWidth: 760, width: '100%', margin: '0 auto' }} className="sk-stack">
        <Sk w={300} h={30} className="sk-max" />
        {range(3).map(b => <div key={b} className="sk-stack" style={{ marginTop: 14 }}><Sk w={200} h={18} />{range(4).map(i => <Sk key={i} w={`${96 - i * 9}%`} h={11} />)}</div>)}
      </div>
    </SkScreen>
  )
}

/* ---------- Admin analytics block (toolbar, KPIs, map + trend panels, actions) ---------- */
export function AdminAnalyticsSkeleton() {
  return (
    <SkScreen name="admin-analytics" label="Đang tải dữ liệu điều hành…">
      <div className="sk-header">
        <div className="sk-stack"><Sk w={160} h={10} /><Sk w={260} h={22} className="sk-max" /></div>
        <div className="sk-row">{range(3).map(i => <Sk key={i} w={64} h={32} r={999} />)}</div>
      </div>
      <div className="sk-grid sk-metrics">{range(4).map(i => <SkCard key={i}><Sk w="55%" h={10} /><Sk w="45%" h={26} /><Sk w="70%" h={10} /></SkCard>)}</div>
      <div className="sk-grid sk-hub__lower">
        <SkCard><Sk w={90} h={10} /><Sk w={200} h={16} /><Sk h={260} r={12} /></SkCard>
        <SkCard><Sk w={80} h={10} /><Sk w={160} h={16} /><Sk h={150} r={12} />{range(4).map(i => <Sk key={i} w={`${90 - i * 15}%`} h={14} r={6} />)}</SkCard>
      </div>
      <SkCard><Sk w={130} h={10} /><Sk w={220} h={16} />{range(3).map(i => <ListRow key={i} icon={32} />)}</SkCard>
    </SkScreen>
  )
}

/* ---------- Roommate candidates under a saved post ---------- */
export function RoommateCandidatesSkeleton({ count = 2 }: { count?: number }) {
  return (
    <SkScreen name="roommate-candidates" label="Đang tải gợi ý người ở ghép…" className="sk-candidates">
      {range(count).map(i => (
        <SkCard key={i} style={{ padding: 12, gap: 8 }}>
          <Sk w="45%" h={14} />
          <Sk w="75%" h={10} />
          <Sk w={96} h={30} r={999} />
        </SkCard>
      ))}
    </SkScreen>
  )
}

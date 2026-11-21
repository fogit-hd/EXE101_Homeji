import type { CSSProperties, ReactNode } from 'react'
import { MarketplaceLoadingSkeleton } from '../MarketplaceLoadingSkeleton'
import type { MarketplaceTab } from '../../lib/marketplaceNavigation'
import { Sk, SkCard, SkHeader, SkLines, SkScreen, SkTabs } from './Skeleton'
export { AuthSkeleton } from './AuthSkeleton'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

type HeadProps = { withHeader?: boolean }

function Stack({ gap, className = '', style, children }: { gap?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return <div className={className ? `sk-stack ${className}` : 'sk-stack'} style={gap ? { gap, ...style } : style}>{children}</div>
}

function Row({ nowrap, className = '', style, children }: { nowrap?: boolean; className?: string; style?: CSSProperties; children: ReactNode }) {
  return <div className={className ? `sk-row ${className}` : 'sk-row'} style={nowrap ? { flexWrap: 'nowrap', ...style } : style}>{children}</div>
}

function Pills({ widths, h = 32, r = 999 }: { widths: (number | string)[]; h?: number; r?: number }) {
  return <>{widths.map((w, i) => <Sk key={i} w={w} h={h} r={r} />)}</>
}

function RoomCard() {
  return (
    <SkCard className="sk-room-card" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
      <Sk h={150} r={0} className="sk-room-card__media" />
      <div className="sk-stack sk-room-card__body" style={{ padding: 14 }}>
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
    <Row nowrap className="sk-list-row" style={{ padding: '12px 4px' }}>
      <Sk w={icon} h={icon} r={round ? 999 : 12} />
      <SkLines widths={['55%', '82%']} />
      {trailing ? <Sk w={48} h={10} /> : null}
    </Row>
  )
}

/* ---------- Trang chủ (hub) ---------- */
export function HubSkeleton() {
  return (
    <SkScreen name="hub" label="Đang tải trang chủ…">
      <SkHeader titleWidth={280} actions={0} />
      <Row><Sk w={64} h={14} /><Pills widths={[110, 128, 96]} r={8} /></Row>
      <HubBodySkeleton />
    </SkScreen>
  )
}

/** Data part of the hub only (header/recent bar already rendered by the hub). */
export function HubBodySkeleton() {
  return (
    <Stack gap={24} aria-hidden="true">
      <div className="sk-grid sk-hub__main">
        <Stack gap={16}>
          <div className="sk-header"><Sk w={180} h={22} /><Sk w={84} h={14} /></div>
          <div className="sk-grid sk-hub__rooms-grid">{range(4).map(i => <RoomCard key={i} />)}</div>
        </Stack>
        <Stack gap={20} className="sk-hub__rail">
          <div className="sk-hub__promo-rail">
            <Sk w={96} h={10} />
            <Sk w="82%" h={24} />
            <Sk w="66%" h={24} />
            <Sk w="62%" h={12} />
            <Sk w="54%" h={12} />
            <Sk w={132} h={34} r={999} style={{ marginTop: 'auto' }} />
          </div>
          <SkCard>
            <div className="sk-header"><Sk w={110} h={18} /><Sk w={76} h={12} /></div>
            {range(4).map(i => <RoomRow key={i} thumb={48} />)}
          </SkCard>
        </Stack>
      </div>
      <div className="sk-grid sk-two-col">
        {range(2).map(i => <SkCard key={i}><div className="sk-header"><Sk w={170} h={16} /><Sk w={50} h={12} /></div><ListRow icon={36} round={i === 1} trailing={false} /></SkCard>)}
      </div>
    </Stack>
  )
}

/* ---------- Tìm phòng / bản đồ ---------- */
export function ListingsSkeleton() {
  return (
    <SkScreen name="listings" label="Đang tải danh sách phòng…">
      <div className="sk-header sk-listings__toolbar">
        <Row><Pills widths={[76, 62, 84]} h={20} r={6} /></Row>
        <Row><Sk w={68} h={36} r={10} /><Sk w={86} h={36} r={10} className="sk-hide-mobile" /><Sk w={86} h={36} r={10} /></Row>
      </div>
      <Row className="sk-listings__chips">{range(6).map(i => <Sk key={i} w={i % 2 === 0 ? 84 : 74} h={34} r={999} />)}</Row>
      <div className="sk-grid sk-listings__body">
        <Sk className="sk-listings__map" />
        <Stack gap={12} className="sk-listings__panel">
          <Sk w={180} h={16} />
          {range(4).map(i => (
            <SkCard key={i} className="sk-listing-card">
              <Sk w={104} h={84} r={10} className="sk-listing-card__thumb" />
              <SkLines widths={['48%', '86%', '62%']} />
            </SkCard>
          ))}
        </Stack>
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
          <SkHeader eyebrow titleWidth={260} actions={2} />
          <Row><SkTabs count={4} pill={false} /></Row>
          <Row><Pills widths={[132, 92]} h={34} /></Row>
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
        {range(6).map(i => <Row key={i} nowrap><Sk w={42} h={42} r={999} /><SkLines widths={['60%', '88%']} /></Row>)}
      </div>
      <div className="sk-messages__thread">
        <div className="sk-messages__bar"><Sk w={40} h={40} r={999} /><Stack><Sk w={160} h={14} /><Sk w={220} h={10} /></Stack></div>
        <div className="sk-messages__bubbles">
          {([['38%', 40, false], ['52%', 40, false], ['44%', 56, true], ['30%', 40, false], ['36%', 40, true]] as const).map(([w, h, mine], i) => (
            <Sk key={i} w={w} h={h} r={16} className={mine ? 'is-mine' : ''} />
          ))}
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
      {range(6).map(i => <Row key={i} nowrap><Sk w={42} h={42} r={999} /><SkLines widths={['60%', '88%']} /></Row>)}
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
      <SkCard className="sk-pay__current">
        <Row nowrap style={{ flex: '1 1 240px' }}>
          <Sk w={44} h={44} r={12} />
          <Stack><Sk w={96} h={10} /><Sk w={168} h={18} className="sk-max" /><Sk w={240} h={11} className="sk-max" /></Stack>
        </Row>
        <Row><Sk w={120} h={32} r={999} /><Pills widths={[132, 92]} h={38} /></Row>
      </SkCard>
      <SkTabs count={2} />
      <div className="sk-grid sk-pay__plans">
        {range(4).map(i => (
          <SkCard key={i} style={{ minHeight: 280 }}>
            <Sk w="60%" h={16} /><Sk w="40%" h={10} /><Sk w="75%" h={30} /><Sk w="50%" h={10} />
            <Stack style={{ marginTop: 6 }}>{range(4).map(j => <Sk key={j} w={`${90 - j * 10}%`} h={10} />)}</Stack>
            <Sk h={38} r={999} style={{ marginTop: 'auto' }} />
          </SkCard>
        ))}
      </div>
    </SkScreen>
  )
}

/* ---------- Tin của tôi ---------- */
export function MyPostsSkeleton({ withHeader = false }: HeadProps) {
  return (
    <SkScreen name="myPosts" label="Đang tải tin đã đăng…">
      {withHeader ? <SkHeader titleWidth={200} actions={3} /> : null}
      <SkCard><Sk w="68%" h={14} className="sk-max" /></SkCard>
      <Stack gap={12}>
        {range(4).map(i => (
          <SkCard key={i} className="sk-owner-card">
            <Stack><Sk w={132} h={22} r={999} /><Sk w="74%" h={18} /><Sk w="58%" h={12} /><Sk w={116} h={10} /></Stack>
            <Row className="sk-owner-card__actions"><Pills widths={[108, 60, 74, 78]} /></Row>
          </SkCard>
        ))}
      </Stack>
    </SkScreen>
  )
}

/* ---------- Ở ghép ---------- */
export function InvitationsSkeleton({ withHeader = false }: HeadProps) {
  return (
    <SkScreen name="invitations" label="Đang tải ở ghép…">
      {withHeader ? <><SkHeader eyebrow lead titleWidth={360} /><SkTabs count={3} /></> : null}
      <div className="sk-grid sk-cards-3">
        {range(6).map(i => (
          <SkCard key={i}>
            <Row nowrap><Sk w={52} h={52} r={999} /><SkLines widths={['60%', '40%']} /></Row>
            <Row>{range(3).map(j => <Sk key={j} w={64} h={22} r={999} />)}</Row>
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
      <div className="sk-grid sk-cards-3">
        {range(3).map(i => (
          <SkCard key={i} className="sk-rm-card" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
            <div className="sk-rm-card__band">
              <Row nowrap style={{ justifyContent: 'space-between' }}>
                <Row nowrap style={{ flex: 1, minWidth: 0 }}>
                  <Sk w={40} h={40} r={999} />
                  <Stack><Sk w="75%" h={14} /><Sk w="55%" h={11} /></Stack>
                </Row>
                <Sk w={74} h={24} r={999} />
              </Row>
            </div>
            <Stack style={{ padding: 16 }}>
              <Sk w="82%" h={18} /><Sk w="95%" h={12} /><Sk w="68%" h={12} />
              <Row><Pills widths={[86, 72]} h={24} /></Row>
              <Stack style={{ marginTop: 4 }}><Sk w={120} h={11} /><Sk w={110} h={20} /></Stack>
            </Stack>
            <Row nowrap style={{ padding: '0 16px 16px' }}>
              {range(2).map(j => <Sk key={j} w="50%" h={40} r={12} style={{ flex: 1 }} />)}
            </Row>
          </SkCard>
        ))}
      </div>
    </SkScreen>
  )
}

/* ---------- Hồ sơ ---------- */
export function ProfileSkeleton({ withHeader = true }: HeadProps) {
  return (
    <SkScreen name="profile" label="Đang tải hồ sơ…">
      {withHeader ? (
        <div className="sk-profile__banner">
          <Row nowrap style={{ flex: 1, minWidth: 0 }}>
            <Sk w={84} h={84} r={24} className="sk-profile__avatar" />
            <Stack>
              <Sk w={92} h={11} /><Sk w={180} h={24} className="sk-max" />
              <Row><Pills widths={[82, 92]} h={22} /></Row>
            </Stack>
          </Row>
          <Sk w={104} h={14} className="sk-hide-mobile" />
        </div>
      ) : null}
      <Row nowrap><Sk w={36} h={36} r={999} /><Sk w={180} h={14} className="sk-max" /></Row>
      <div className="sk-grid sk-profile__details">
        <SkCard>
          <div className="sk-header">
            <Row nowrap><Sk w={36} h={36} r={11} /><Sk w={150} h={18} /></Row>
            <Sk w={84} h={36} r={9} />
          </div>
          <div className="sk-grid sk-two-col">
            {range(4).map(i => <Stack key={i}><Sk w={76} h={11} /><Sk w="82%" h={15} /></Stack>)}
          </div>
        </SkCard>
        <SkCard>
          <div className="sk-header">
            <Row nowrap><Sk w={36} h={36} r={11} /><Sk w={140} h={18} /></Row>
            <Sk w={64} h={22} r={6} />
          </div>
          <Stack>{range(4).map(i => <Stack key={i}><Sk w={96} h={11} /><Sk w="74%" h={14} /></Stack>)}</Stack>
          <Sk w={160} h={40} r={9} style={{ marginTop: 'auto' }} />
        </SkCard>
      </div>
      <div className="sk-grid sk-two-col sk-profile__links">
        {range(2).map(i => <SkCard key={i}><Row nowrap><Sk w={44} h={44} r={13} /><SkLines widths={['58%', '82%']} /></Row></SkCard>)}
      </div>
    </SkScreen>
  )
}

/* ---------- Tin đã lưu ---------- */
export function SavedSkeleton({ withHeader = false }: HeadProps) {
  return (
    <SkScreen name="saved" label="Đang tải tin đã lưu…">
      {withHeader ? <SkHeader eyebrow lead titleWidth={380} /> : null}
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
        <Stack gap={14}>
          <SkCard>
            <div className="sk-header"><Sk w={20} h={20} r={999} /><Sk w={120} h={14} /><Sk w={20} h={20} r={999} /></div>
            <div className="sk-cal">{range(35).map(i => <Sk key={i} h={26} r={8} />)}</div>
          </SkCard>
          <SkCard className="sk-hide-tablet"><Sk w={140} h={14} />{range(3).map(i => <Sk key={i} w={`${85 - i * 10}%`} h={11} />)}</SkCard>
        </Stack>
        <SkCard>
          <div className="sk-header"><Sk w={180} h={16} /><Sk w={70} h={10} /></div>
          <AppointmentListSkeleton />
        </SkCard>
      </div>
    </SkScreen>
  )
}

/** Appointment list only (calendar already rendered). */
export function AppointmentListSkeleton() {
  return (
    <SkScreen name="appointment-list" label="Đang tải lịch hẹn…">
      <Stack gap={14}>
        {range(3).map(i => (
          <div key={i} className="sk-appt-item">
            <Sk w={48} h={18} r={6} className="sk-appt-item__time" />
            <SkCard className="sk-appt-item__card">
              <Row className="sk-appt-item__row">
                <Sk w={84} h={64} r={10} className="sk-appt-item__thumb" />
                <Stack>
                  <Sk w={92} h={20} r={999} /><Sk w="76%" h={15} /><Sk w="55%" h={12} />
                  <Row><Pills widths={[84, 72]} h={28} /></Row>
                </Stack>
              </Row>
            </SkCard>
          </div>
        ))}
      </Stack>
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
          {withHeader ? <><SkCard><Sk h={38} r={10} /><Sk h={38} r={10} w="70%" /></SkCard><SkTabs count={2} pill={false} /></> : null}
          <Stack gap={12}>
            {range(3).map(i => <SkCard key={i}><div className="sk-header"><Sk w="45%" h={16} /><Sk w={90} h={22} r={999} /></div><Sk w="80%" h={11} /><Row>{range(3).map(j => <Sk key={j} w={70} h={22} r={999} />)}</Row></SkCard>)}
          </Stack>
        </>
      )}
    </SkScreen>
  )
}

/* ---------- Nhật ký hoạt động ---------- */
export function ActivitiesSkeleton({ withHeader = false }: HeadProps) {
  return (
    <SkScreen name="activities" label="Đang tải nhật ký hoạt động…">
      {withHeader ? <><SkHeader titleWidth={260} /><Stack gap={8} style={{ flex: 'none' }}><Sk w={60} h={10} /><Sk w={200} h={36} r={10} /></Stack></> : null}
      <SkCard style={{ gap: 0 }}>{range(6).map(i => <ListRow key={i} icon={32} round />)}</SkCard>
    </SkScreen>
  )
}

/* ---------- Form đăng / sửa tin ---------- */
function FormBody() {
  return (
    <SkCard style={{ gap: 16 }}>
      <Sk w={220} h={20} className="sk-max" />
      <div className="sk-grid sk-two-col">{range(6).map(i => <Stack key={i}><Sk w={100} h={10} /><Sk h={42} r={10} /></Stack>)}</div>
      <Stack><Sk w={100} h={10} /><Sk h={110} r={10} /></Stack>
      <Row>{range(4).map(i => <Sk key={i} w={96} h={72} r={12} />)}</Row>
      <Sk w={160} h={42} r={999} style={{ alignSelf: 'flex-end' }} />
    </SkCard>
  )
}

export function PostFormSkeleton({ withHeader = true }: HeadProps) {
  return (
    <SkScreen name="post-form" label="Đang tải biểu mẫu tin…">
      {withHeader ? <SkHeader eyebrow titleWidth={260} /> : null}
      <Row>{range(3).map(i => <Sk key={i} w={110} h={8} r={999} />)}</Row>
      <FormBody />
    </SkScreen>
  )
}

/* ---------- Chờ thanh toán ---------- */
export function PaymentWaitSkeleton() {
  return (
    <SkScreen name="payment-wait" label="Đang tải thanh toán…">
      <div className="sk-grid sk-pay-wait">
        <SkCard className="sk-pay-wait__main" style={{ gap: 18 }}>
          <div className="sk-header" style={{ alignItems: 'center' }}><Sk w={136} h={12} /><Sk w={76} h={22} r={999} /></div>
          <Stack style={{ alignItems: 'center' }}><Sk w={58} h={58} r={18} /><Sk w={110} h={12} /><Sk w={220} h={26} className="sk-max" /><Sk w="84%" h={13} /></Stack>
          <Sk h={76} r={14} />
          <Sk h={46} r={12} />
          <Stack><Sk h={44} r={999} /><div className="sk-grid sk-two-col"><Sk h={40} r={999} /><Sk h={40} r={999} /></div></Stack>
        </SkCard>
        <SkCard className="sk-pay-wait__details" style={{ gap: 14 }}>
          <Sk w={140} h={18} />
          {range(4).map(i => <Row key={i} nowrap style={{ justifyContent: 'space-between' }}><Sk w="38%" h={11} /><Sk w="44%" h={12} /></Row>)}
          <Sk h={48} r={12} style={{ marginTop: 6 }} />
        </SkCard>
      </div>
    </SkScreen>
  )
}

/* ---------- Quản trị ---------- */
function AdminQueueCards() {
  return (
    <Stack gap={14}>
      {range(4).map(i => (
        <SkCard key={i} className="sk-admin-card">
          <Stack>
            <Row><Sk w={88} h={22} r={999} /><Sk w={72} h={16} r={999} /></Row>
            <Sk w="72%" h={18} /><Sk w="56%" h={12} /><Sk w={120} h={28} r={8} />
          </Stack>
          <Stack gap={8} className="sk-admin-card__actions">
            <Sk w={96} h={34} r={10} /><Sk w={180} h={36} r={10} className="sk-max" /><Sk w={96} h={34} r={10} />
          </Stack>
        </SkCard>
      ))}
    </Stack>
  )
}

export function AdminSkeleton({ withHeader = true }: HeadProps) {
  return (
    <SkScreen name="admin" label="Đang tải dữ liệu quản trị…">
      {withHeader ? (
        <>
          <SkHeader eyebrow titleWidth={280} actions={2} />
          <div className="sk-grid sk-metrics">{range(4).map(i => <SkCard key={i}><Sk w="50%" h={10} /><Sk w="60%" h={26} /><Sk w="40%" h={10} /></SkCard>)}</div>
        </>
      ) : null}
      <AdminQueueCards />
    </SkScreen>
  )
}

/* ---------- Chính sách / điều khoản ---------- */
export function LegalSkeleton() {
  return (
    <SkScreen name="legal" label="Đang tải nội dung…">
      <Stack style={{ maxWidth: 760, width: '100%', margin: '0 auto' }}>
        <Sk w={300} h={30} className="sk-max" />
        {range(3).map(b => <Stack key={b} style={{ marginTop: 14 }}><Sk w={200} h={18} />{range(4).map(i => <Sk key={i} w={`${96 - i * 9}%`} h={11} />)}</Stack>)}
      </Stack>
    </SkScreen>
  )
}

/* ---------- Admin analytics block (toolbar, KPIs, map + trend panels, actions) ---------- */
export function AdminAnalyticsSkeleton() {
  return (
    <SkScreen name="admin-analytics" label="Đang tải dữ liệu điều hành…">
      <div className="sk-header">
        <Stack><Sk w={160} h={10} /><Sk w={260} h={22} className="sk-max" /></Stack>
        <Row>{range(3).map(i => <Sk key={i} w={64} h={32} r={999} />)}</Row>
      </div>
      <div className="sk-grid sk-metrics">{range(4).map(i => <SkCard key={i}><Sk w="55%" h={10} /><Sk w="45%" h={26} /><Sk w="70%" h={10} /></SkCard>)}</div>
      <div className="sk-grid sk-two-col">
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
          <Sk w="45%" h={14} /><Sk w="75%" h={10} /><Sk w={96} h={30} r={999} />
        </SkCard>
      ))}
    </SkScreen>
  )
}

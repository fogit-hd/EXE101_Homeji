import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import React, { act } from 'react'
import { JSDOM } from 'jsdom'
import { reactDomModule } from './helpers/react-dom-module.mjs'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const moduleUrl = source =>
  'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
const reactUrl = new URL('../node_modules/react/index.js', import.meta.url).href

const fixtureUrl = moduleUrl(`
export const ChatMessageSender = { User: 1, Assistant: 2 };
export const ChatbotNavigationActionKind = { OpenSection: 1, Navigate: 2 };
export const getChatbotPopupConfig = () => Promise.resolve({
  enabled: true,
  greeting: 'Chào bạn',
  suggestedPrompts: [],
  historyStorageEnabled: false,
  ...globalThis.__agentUi.config,
});
export const getMySubscription = async () => {
  globalThis.__agentUi.subscriptionCalls += 1;
  return globalThis.__agentUi.subscription;
};
export const getAgentSession = async () => {
  globalThis.__agentUi.getAgentSessionCalls += 1;
  return globalThis.__agentUi.sessionState;
};
export const resetAgentSession = async () => {
  globalThis.__agentUi.resetAgentSessionCalls += 1;
  globalThis.__agentUi.sessionState = null;
};
export const deleteChatbotConversation = async id => {
  globalThis.__agentUi.deleted.push(id);
};
export const sendChatbotMessage = (body, signal) => new Promise((resolve, reject) => {
  const entry = { body, signal, resolve, reject };
  globalThis.__agentUi.requests.push(entry);
  if (globalThis.__agentUi.onSend) {
    Promise.resolve(globalThis.__agentUi.onSend(body)).then(resolve, reject);
  }
});
export const useAuth = () => globalThis.__agentUi.auth;
export const useAuthModal = () => ({ isOpen: false, openAuthModal: () => { globalThis.__agentUi.authModalOpens += 1 } });
export const useNavigate = () => target => { globalThis.__agentUi.navigations.push(target); };
export const useLocation = () => ({ pathname: '/', search: '', hash: '' });
export const Link = () => null;
`)

const overrides = {
  '../../api': fixtureUrl,
  '../../contexts/AuthContext': fixtureUrl,
  '../../contexts/AuthModalContext.logic': fixtureUrl,
  'react-router-dom': fixtureUrl,
  '@lottiefiles/dotlottie-react': moduleUrl('export const DotLottieReact = () => null'),
  'motion/react': moduleUrl(
    `import React from '${reactUrl}'; export const motion = { div: React.forwardRef(({ initial, animate, transition, ...props }, ref) => React.createElement('div', { ...props, ref })) }`,
  ),
  '../../lib/errors': moduleUrl('export const getErrorMessage = (error, fallback) => error?.message || fallback'),
  '../../lib/marketplaceNavigation': moduleUrl('export const requestMarketplaceCart = () => {}; export const requestMarketplaceTab = () => {};'),
  '../../lib/nearbyChatIntent': moduleUrl('export const nearbyChatIntent = () => null'),
  './ChatbotMessageContent': moduleUrl(`import React from '${reactUrl}'; export const ChatbotMessageContent = ({ content }) => React.createElement('p', null, content)`),
  './ChatbotMediaComposer': moduleUrl('export const ChatbotMediaComposer = () => null; export const ChatbotMediaPreview = () => null'),
  '../games/GameLauncher': moduleUrl('export const GameLauncher = () => null'),
  '../ai/AgentPostPreview': moduleUrl('export const AgentPostPreview = () => null'),
  '../ai/AgentRoommateResults': moduleUrl('export const AgentRoommateResults = () => null'),
  '../ai/ChatbotLocationControl': moduleUrl('export const ChatbotLocationControl = () => null'),
  '../ai/ChatbotNearbyResults': moduleUrl('export const ChatbotNearbyResults = () => null'),
  '../ai/ChatbotSourceResults': moduleUrl('export const ChatbotSourceResults = () => null'),
  '../ai/AiSearchReview': moduleUrl('export const AiSearchReview = () => null'),
  '../ai/RentalContextCard': moduleUrl('export const RentalContextCard = () => null'),
  '../ai/FoodDiscoveryCard': moduleUrl('export const FoodDiscoveryCard = () => null'),
}

for (const [name, value] of Object.entries(overrides)) {
  if (name.startsWith('../../')) overrides['../' + name] = value
  if (name.startsWith('../ai/')) overrides['../' + name] = value
  if (name.startsWith('./Chatbot')) overrides['.' + name] = value
}

const { MapChatbot } = await import(reactDomModule(path.resolve('src/components/map/MapChatbot.tsx'), overrides))

async function setupEnvironment(initialState = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://homeji.test', pretendToBeVisual: true })
  const keys = [
    'window',
    'document',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLTextAreaElement',
    'navigator',
    'Element',
    'Node',
    'Event',
    'CustomEvent',
    'MouseEvent',
    'KeyboardEvent',
  ]
  const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const key of keys) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value: key === 'window' ? dom.window : dom.window[key],
    })
  }
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  dom.window.requestAnimationFrame = callback => { callback(0); return 1 }
  dom.window.cancelAnimationFrame = () => {}
  dom.window.HTMLElement.prototype.scrollIntoView = () => {}
  dom.window.confirm = msg => {
    globalThis.__agentUi.confirms.push(msg)
    return true
  }

  globalThis.__agentUi = {
    auth: { isAuthenticated: true, profile: { id: 'user-free-1' } },
    config: {},
    subscription: {
      plan: 'Basic',
      planName: 'Basic',
      isPremium: false,
      dailyAiLimit: 5,
      usedToday: 0,
      remainingToday: 5,
      basicBenefits: [],
      premiumBenefits: [],
      agentAccess: {
        isPremium: false,
        canUse: true,
        freeWeeklyLimit: 1,
        freeWeeklyUsed: 0,
        freeWeeklyRemaining: 1,
        hasActiveFreeSession: false,
        activeFreeSessionExpiresAt: null,
        nextFreeResetAt: null,
      },
    },
    sessionState: null,
    requests: [],
    deleted: [],
    navigations: [],
    confirms: [],
    subscriptionCalls: 0,
    getAgentSessionCalls: 0,
    resetAgentSessionCalls: 0,
    authModalOpens: 0,
    onSend: null,
    ...initialState,
  }

  const { createRoot } = await import('react-dom/client')
  let root = createRoot(document.getElementById('root'))
  return {
    get root() { return root },
    async remount(props = {}) {
      await act(() => root.unmount())
      root = createRoot(document.getElementById('root'))
      await renderOpen(root, props)
    },
    async cleanup() {
      await act(() => root.unmount())
      dom.window.close()
      delete globalThis.__agentUi
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor)
        else delete globalThis[key]
      }
    },
  }
}

async function renderOpen(root, props = {}) {
  await act(async () => {
    root.render(React.createElement(MapChatbot, { openRequestToken: 1, ...props }))
  })
  if (!document.querySelector('[data-homeji-ai-panel="open"]')) {
    await act(async () => {
      window.dispatchEvent(new CustomEvent('homeji-ai:toggle', { detail: { open: true } }))
    })
  }
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

const click = async element => {
  assert.ok(element, 'Expected target element to exist before click')
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

const composer = () => document.querySelector('[aria-label="Nhập tin nhắn cho Homeji"]')

const typeDraft = async (value, input = composer()) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set.call(input, value)
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
}

const keydown = async (element, options) => {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...options }))
  })
}

test('Free user sees 1 LƯỢT/TUẦN badge, enters Agent mode, sees GoalBar + QuickReplies, and sends quick reply with agentSessionId', async () => {
  const env = await setupEnvironment({
    onSend: body => {
      const turnIndex = globalThis.__agentUi.requests.length
      if (turnIndex === 1) {
        return {
          conversationId: '',
          agentSessionId: 'agent-sess-1',
          userMessage: { id: 'u1', sender: 1, content: body.message },
          assistantMessage: { id: 'a1', sender: 2, content: 'Bạn muốn tìm phòng ở khu vực nào tại TP.HCM và tầm giá bao nhiêu?' },
          actions: [],
          agentGoal: {
            title: 'Tìm phòng trọ phù hợp ngân sách',
            status: 'awaiting_clarification',
            facts: { 'Số người': '2 người' },
            missingInfo: ['Khu vực', 'Ngân sách'],
            expiresAt: '2026-11-21T10:30:00Z',
          },
          quickReplies: [
            { label: 'Thủ Đức dưới 3tr', value: 'Tìm phòng ở Thủ Đức giá dưới 3 triệu' },
            { label: 'Quận 9 gần ĐHQG', value: 'Tìm phòng ở Quận 9 gần ĐHQG' },
          ],
          agentAccess: {
            isPremium: false,
            canUse: true,
            freeWeeklyLimit: 1,
            freeWeeklyUsed: 1,
            freeWeeklyRemaining: 0,
            hasActiveFreeSession: true,
            activeFreeSessionExpiresAt: '2026-11-21T10:30:00Z',
            nextFreeResetAt: '2026-11-28T00:00:00Z',
          },
        }
      }
      return {
        conversationId: '',
        agentSessionId: 'agent-sess-1',
        userMessage: { id: 'u2', sender: 1, content: body.message },
        assistantMessage: { id: 'a2', sender: 2, content: 'Đã ghi nhận khu vực Thủ Đức dưới 3 triệu cho 2 người.' },
        actions: [],
        agentGoal: {
          title: 'Tìm phòng trọ Thủ Đức dưới 3 triệu',
          status: 'active',
          facts: { 'Khu vực': 'Thủ Đức', 'Ngân sách': 'Dưới 3 triệu' },
          missingInfo: [],
          expiresAt: '2026-11-21T10:30:00Z',
        },
        quickReplies: [],
      }
    },
  })

  try {
    await renderOpen(env.root)
    const newChatBtn = document.querySelector('[aria-label="Cuộc trò chuyện mới"]')
    assert.ok(newChatBtn)
    await click(newChatBtn)
    assert.equal(document.querySelector('.homeji-assistant__reset'), null, 'Empty conversation should not prompt confirmation banner')
    assert.equal(document.activeElement, composer())

    const agentSwitch = [...document.querySelectorAll('button')].find(btn => btn.textContent.includes('Agent'))
    assert.ok(agentSwitch, 'Expected Agent switch button to render')
    assert.equal(agentSwitch.disabled, false)
    assert.match(agentSwitch.textContent, /1 LƯỢT\/TUẦN/)

    await click(agentSwitch)
    assert.equal(agentSwitch.getAttribute('aria-pressed'), 'true')

    await typeDraft('Tìm giúp mình phòng cho 2 người')
    await keydown(composer(), { key: 'Enter' })

    const req1 = globalThis.__agentUi.requests[0]
    assert.equal(req1.body.postingAgent, true)
    assert.match(agentSwitch.textContent, /ĐANG DÙNG FREE/)
    assert.equal(globalThis.__agentUi.subscriptionCalls, 1, 'Expected reply.agentAccess to update badge without extra /api/subscriptions/me fetch')

    const goalBar = document.querySelector('[aria-label="Mục tiêu hiện tại của Agent"]')
    assert.ok(goalBar, 'Expected AgentGoalBar to render')
    assert.match(goalBar.textContent, /Cần bạn trả lời thêm/)
    assert.match(goalBar.textContent, /Tìm phòng trọ phù hợp ngân sách/)
    assert.match(goalBar.textContent, /Số người:\s*2 người/)

    const quickReplyGroup = document.querySelector('[aria-label="Trả lời nhanh"]')
    assert.ok(quickReplyGroup, 'Expected quick replies group to render')
    const quickReplyBtn = [...quickReplyGroup.querySelectorAll('button')].find(btn => btn.textContent.includes('Thủ Đức dưới 3tr'))
    assert.ok(quickReplyBtn, 'Expected quick reply button')

    await click(quickReplyBtn)
    const req2 = globalThis.__agentUi.requests[1]
    assert.equal(req2.body.postingAgent, true)
    assert.equal(req2.body.agentSessionId, 'agent-sess-1')
    assert.equal(req2.body.message, 'Tìm phòng ở Thủ Đức giá dưới 3 triệu')
    assert.match(document.body.textContent, /Đã ghi nhận khu vực Thủ Đức/)
  } finally {
    await env.cleanup()
  }
})

test('Page reload hydrates Working Memory via getAgentSession even with saveHistory off and preserves GoalBar and QuickReplies', async () => {
  const env = await setupEnvironment({
    sessionState: {
      active: true,
      sessionId: 'restored-sess-99',
      goal: {
        title: 'Tìm phòng Bình Thạnh ban công',
        status: 'awaiting_clarification',
        facts: { 'Khu vực': 'Bình Thạnh', 'Tiện ích': 'Ban công' },
        missingInfo: ['Ngân sách tối đa'],
        expiresAt: '2026-11-21T11:00:00Z',
      },
      quickReplies: [
        { label: 'Dưới 4 triệu', value: 'Ngân sách tối đa 4 triệu/tháng' },
      ],
      turns: [
        { id: 't1', conversationId: 'restored-sess-99', sender: 1, content: 'Mình cần phòng ở Bình Thạnh có ban công', createdAt: '2026-11-21T09:30:00Z' },
        { id: 't2', conversationId: 'restored-sess-99', sender: 2, content: 'Ngân sách tối đa mỗi tháng của bạn là bao nhiêu?', createdAt: '2026-11-21T09:30:05Z' },
      ],
      expiresAt: '2026-11-21T11:00:00Z',
    },
    subscription: {
      plan: 'Basic',
      planName: 'Basic',
      isPremium: false,
      dailyAiLimit: 5,
      usedToday: 0,
      remainingToday: 5,
      basicBenefits: [],
      premiumBenefits: [],
      agentAccess: {
        isPremium: false,
        canUse: true,
        freeWeeklyLimit: 1,
        freeWeeklyUsed: 1,
        freeWeeklyRemaining: 0,
        hasActiveFreeSession: true,
        activeFreeSessionExpiresAt: '2026-11-21T11:00:00Z',
        nextFreeResetAt: '2026-11-28T00:00:00Z',
      },
    },
  })

  try {
    await renderOpen(env.root)
    assert.ok(globalThis.__agentUi.getAgentSessionCalls >= 1)

    const agentSwitch = [...document.querySelectorAll('button')].find(btn => btn.textContent.includes('Agent'))
    assert.equal(agentSwitch.getAttribute('aria-pressed'), 'true')
    assert.match(agentSwitch.textContent, /ĐANG DÙNG FREE/)

    const goalBar = document.querySelector('[aria-label="Mục tiêu hiện tại của Agent"]')
    assert.ok(goalBar, 'Expected hydrated AgentGoalBar after reload')
    assert.match(goalBar.textContent, /Tìm phòng Bình Thạnh ban công/)
    assert.match(goalBar.textContent, /Khu vực:\s*Bình Thạnh/)
    assert.match(document.body.textContent, /Ngân sách tối đa mỗi tháng của bạn là bao nhiêu\?/)

    const quickReplyBtn = [...document.querySelectorAll('[aria-label="Trả lời nhanh"] button')][0]
    assert.ok(quickReplyBtn)
    await click(quickReplyBtn)

    const sent = globalThis.__agentUi.requests[0]
    assert.equal(sent.body.postingAgent, true)
    assert.equal(sent.body.agentSessionId, 'restored-sess-99')
    assert.equal(sent.body.saveHistory, false)
    await act(async () => sent.resolve({
      conversationId: '',
      agentSessionId: 'restored-sess-99',
      userMessage: { id: 'u-hydrated', sender: 1, content: sent.body.message },
      assistantMessage: { id: 'a-hydrated', sender: 2, content: 'Đang tìm phòng Bình Thạnh tối đa 4 triệu.' },
      actions: [],
      agentGoal: globalThis.__agentUi.sessionState.goal,
      quickReplies: [],
    }))

    // Verify reset clears GoalBar and calls resetAgentSession()
    const resetBtn = document.querySelector('.agent-goal-bar__reset')
    assert.ok(resetBtn)
    await click(resetBtn)
    const confirmResetBtn = [...document.querySelectorAll('.homeji-assistant__reset button')].find(btn => btn.textContent.includes('Bắt đầu cuộc trò chuyện mới'))
    assert.ok(confirmResetBtn, 'Expected confirmation button for resetting free weekly Agent session')
    await click(confirmResetBtn)
    assert.equal(globalThis.__agentUi.resetAgentSessionCalls, 1)
    assert.equal(document.querySelector('[aria-label="Mục tiêu hiện tại của Agent"]'), null)
  } finally {
    await env.cleanup()
  }
})

test('Exhausted Free user sees disabled Agent button with HẾT LƯỢT and Nâng cấp CTA', async () => {
  const env = await setupEnvironment({
    subscription: {
      plan: 'Basic',
      planName: 'Basic',
      isPremium: false,
      dailyAiLimit: 5,
      usedToday: 0,
      remainingToday: 5,
      basicBenefits: [],
      premiumBenefits: [],
      agentAccess: {
        isPremium: false,
        canUse: false,
        freeWeeklyLimit: 1,
        freeWeeklyUsed: 1,
        freeWeeklyRemaining: 0,
        hasActiveFreeSession: false,
        activeFreeSessionExpiresAt: null,
        nextFreeResetAt: '2026-11-27T08:00:00Z',
      },
    },
  })

  try {
    await renderOpen(env.root)
    const agentSwitch = [...document.querySelectorAll('button')].find(btn => btn.textContent.includes('Agent'))
    assert.ok(agentSwitch)
    assert.equal(agentSwitch.disabled, true)
    assert.match(agentSwitch.textContent, /HẾT LƯỢT/)

    const upgradeBtn = [...document.querySelectorAll('button')].find(btn => btn.textContent.trim() === 'Nâng cấp')
    assert.ok(upgradeBtn, 'Expected Nâng cấp CTA button when weekly quota is exhausted')
  } finally {
    await env.cleanup()
  }
})

test('Normal Chat tab stays isolated with postingAgent false and no AgentGoalBar', async () => {
  const env = await setupEnvironment({
    onSend: body => ({
      conversationId: '',
      userMessage: { id: 'u1', sender: 1, content: body.message },
      assistantMessage: { id: 'a1', sender: 2, content: 'Trả lời chat thường.' },
      actions: [],
      agentGoal: null,
      quickReplies: [],
    }),
  })

  try {
    await renderOpen(env.root)
    const agentSwitch = [...document.querySelectorAll('button')].find(btn => btn.textContent.includes('Agent'))
    assert.equal(agentSwitch.getAttribute('aria-pressed'), 'false')

    await typeDraft('Hỏi cách xem bản đồ')
    await keydown(composer(), { key: 'Enter' })

    const req = globalThis.__agentUi.requests[0]
    assert.equal(req.body.postingAgent, false)
    assert.equal(req.body.agentSessionId, undefined)
    assert.equal(document.querySelector('[aria-label="Mục tiêu hiện tại của Agent"]'), null)
    assert.match(document.body.textContent, /Trả lời chat thường\./)
  } finally {
    await env.cleanup()
  }
})

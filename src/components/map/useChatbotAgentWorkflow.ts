import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AgentPostDraft } from '../../api/chatbotAgent'
import type { AgentGoal, AgentSessionState } from '../../api/types'

type AgentMessage = { agentDraft?: AgentPostDraft | null }
type AgentReply = {
  agentRequested?: boolean
  agentDraft?: AgentPostDraft | null
  upgradeRequired?: boolean
  agentSessionId?: string | null
  agentGoal?: AgentGoal | null
}

type Options = {
  messages: readonly AgentMessage[]
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  sheetMode: boolean
}

/** Owns the Agent mode, short-lived working memory goal, and user-reviewed post draft. */
export function useChatbotAgentWorkflow({ messages, expanded, setExpanded, sheetMode }: Options) {
  const [agentMode, setAgentMode] = useState(false)
  const [agentSessionId, setAgentSessionId] = useState<string | undefined>()
  const [agentGoal, setAgentGoal] = useState<AgentGoal | null>(null)
  const [draftWorkspaceId, setDraftWorkspaceId] = useState<string | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [agentDraftId, setAgentDraftId] = useState<string | undefined>()
  const workspaceCloseRef = useRef<HTMLButtonElement>(null)
  const workspaceDraft = messages.find(message => message.agentDraft?.id === draftWorkspaceId)?.agentDraft
  const draftOverlay = Boolean(workspaceDraft && workspaceOpen && (sheetMode || !expanded))

  useEffect(() => {
    if (draftOverlay) workspaceCloseRef.current?.focus()
  }, [draftOverlay, draftWorkspaceId])

  const acceptReply = useCallback((reply: AgentReply, postingAgent: boolean) => {
    const stayInAgent = reply.agentRequested === true || Boolean(reply.agentDraft) || (postingAgent && !reply.upgradeRequired)
    setAgentMode(stayInAgent)
    if (reply.agentSessionId) {
      setAgentSessionId(reply.agentSessionId)
    }
    if (reply.agentGoal !== undefined) {
      setAgentGoal(reply.agentGoal ?? null)
    }
    if (reply.agentDraft) {
      setAgentDraftId(reply.agentDraft.id)
      setDraftWorkspaceId(reply.agentDraft.id)
      setWorkspaceOpen(true)
      setExpanded(true)
    } else if (reply.upgradeRequired) {
      setAgentDraftId(undefined)
    }
  }, [setExpanded])

  const hydrateSession = useCallback((session: AgentSessionState, autoEnableAgent: boolean) => {
    setAgentSessionId(session.sessionId)
    setAgentGoal(session.goal)
    if (session.activeDraft && !session.activeDraft.publishedPostId) {
      setAgentDraftId(session.activeDraft.id)
      setDraftWorkspaceId(session.activeDraft.id)
    }
    if (autoEnableAgent) {
      setAgentMode(true)
    }
  }, [])

  const openDraftWorkspace = useCallback((draftId: string) => {
    setDraftWorkspaceId(draftId)
    setWorkspaceOpen(true)
    setExpanded(true)
  }, [setExpanded])

  const finishDraft = useCallback((draftId: string) => {
    setAgentDraftId(current => current === draftId ? undefined : current)
  }, [])

  const closeDraftWorkspace = useCallback(() => setWorkspaceOpen(false), [])

  const reset = useCallback((keepMode = false) => {
    setAgentDraftId(undefined)
    setAgentSessionId(undefined)
    setAgentGoal(null)
    if (!keepMode) setAgentMode(false)
    setDraftWorkspaceId(null)
    setWorkspaceOpen(false)
  }, [])

  return useMemo(() => ({
    agentMode,
    setAgentMode,
    agentSessionId,
    agentGoal,
    setAgentGoal,
    agentDraftId,
    workspaceDraft,
    draftWorkspaceId,
    workspaceOpen,
    draftOverlay,
    workspaceCloseRef,
    acceptReply,
    hydrateSession,
    openDraftWorkspace,
    finishDraft,
    closeDraftWorkspace,
    reset,
  }), [
    agentMode,
    agentSessionId,
    agentGoal,
    agentDraftId,
    workspaceDraft,
    draftWorkspaceId,
    workspaceOpen,
    draftOverlay,
    acceptReply,
    hydrateSession,
    openDraftWorkspace,
    finishDraft,
    closeDraftWorkspace,
    reset,
  ])
}

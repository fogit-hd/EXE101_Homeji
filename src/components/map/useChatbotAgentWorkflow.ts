import { useCallback, useEffect, useRef, useState } from 'react'
import type { AgentPostDraft } from '../../api/chatbotAgent'

type AgentMessage = { agentDraft?: AgentPostDraft | null }
type AgentReply = { agentRequested?: boolean; agentDraft?: AgentPostDraft | null; upgradeRequired?: boolean }

type Options = {
  messages: readonly AgentMessage[]
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  sheetMode: boolean
}

/** Owns the Agent mode and its short-lived, user-reviewed post draft. */
export function useChatbotAgentWorkflow({ messages, expanded, setExpanded, sheetMode }: Options) {
  const [agentMode, setAgentMode] = useState(false)
  const [draftWorkspaceId, setDraftWorkspaceId] = useState<string | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [agentDraftId, setAgentDraftId] = useState<string | undefined>()
  const workspaceCloseRef = useRef<HTMLButtonElement>(null)
  const workspaceDraft = messages.find(message => message.agentDraft?.id === draftWorkspaceId)?.agentDraft
  const draftOverlay = Boolean(workspaceDraft && workspaceOpen && (sheetMode || !expanded))

  useEffect(() => {
    if (draftOverlay) workspaceCloseRef.current?.focus()
  }, [draftOverlay, draftWorkspaceId])

  const acceptReply = (reply: AgentReply, postingAgent: boolean) => {
    setAgentMode(reply.agentRequested === true || Boolean(reply.agentDraft) || (postingAgent && !reply.upgradeRequired))
    if (reply.agentDraft) {
      setAgentDraftId(reply.agentDraft.id)
      setDraftWorkspaceId(reply.agentDraft.id)
      setWorkspaceOpen(true)
      setExpanded(true)
    } else if (reply.upgradeRequired) {
      setAgentDraftId(undefined)
    }
  }

  const openDraftWorkspace = (draftId: string) => {
    setDraftWorkspaceId(draftId)
    setWorkspaceOpen(true)
    setExpanded(true)
  }

  const finishDraft = (draftId: string) => {
    setAgentDraftId(current => current === draftId ? undefined : current)
  }

  const closeDraftWorkspace = useCallback(() => setWorkspaceOpen(false), [])

  const reset = () => {
    setAgentDraftId(undefined)
    setAgentMode(false)
    setDraftWorkspaceId(null)
    setWorkspaceOpen(false)
  }

  return {
    agentMode,
    setAgentMode,
    agentDraftId,
    workspaceDraft,
    draftWorkspaceId,
    workspaceOpen,
    draftOverlay,
    workspaceCloseRef,
    acceptReply,
    openDraftWorkspace,
    finishDraft,
    closeDraftWorkspace,
    reset,
  }
}

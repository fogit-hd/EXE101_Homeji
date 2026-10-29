import { createContext, useContext } from 'react'

export type VoiceContext = { startCall: (conversationId: string, name: string) => void; busy: boolean; ready: boolean }
export const VoiceCalls = createContext<VoiceContext>({ startCall: () => {}, busy: false, ready: false })
export const useVoiceCalls = () => useContext(VoiceCalls)

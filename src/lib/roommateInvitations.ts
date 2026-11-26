import { RoommateInvitationStatus } from '../api/types'
import type { RoommateInvitation } from '../api/types'

export function isPendingReceivedInvitation(invitation: Pick<RoommateInvitation, 'status' | 'receiverId'>, userId: string | undefined): boolean {
  return Boolean(userId) && invitation.receiverId === userId && invitation.status === RoommateInvitationStatus.Pending
}

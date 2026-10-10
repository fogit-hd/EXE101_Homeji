import type { RoommateInvitation } from '../../api/types'

export function upsertRoommateInvitation(current: readonly RoommateInvitation[], invitation: RoommateInvitation): RoommateInvitation[] {
  return [...current.filter(item => item.id !== invitation.id), invitation]
}

/** A snapshot started before a successful invitation must not undo that newer server acknowledgement. */
export function reconcileRoommateInvitations(
  snapshot: RoommateInvitation[], current: readonly RoommateInvitation[], snapshotRevision: number,
  mutationRevisions: ReadonlyMap<string, number>,
): RoommateInvitation[] {
  const merged = new Map(snapshot.map(item => [item.id, item]))
  for (const item of current) {
    if ((mutationRevisions.get(item.id) ?? 0) <= snapshotRevision) continue
    const incoming = merged.get(item.id)
    if (!incoming || Date.parse(item.updatedAt) >= Date.parse(incoming.updatedAt)) merged.set(item.id, item)
  }
  return [...merged.values()]
}

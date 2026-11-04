export type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  /** Irreversible or money-moving actions: keeps initial focus on cancel. */
  danger?: boolean
}

export type ConfirmRequest = ConfirmOptions & { resolve: (accepted: boolean) => void }

let present: ((request: ConfirmRequest) => void) | null = null

export function registerConfirmPresenter(presenter: (request: ConfirmRequest) => void) {
  present = presenter
  return () => { if (present === presenter) present = null }
}

/** Promise-based replacement for window.confirm, rendered by ConfirmDialogHost. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    if (present) present({ ...options, resolve })
    else resolve(window.confirm(options.message ? `${options.title}\n${options.message}` : options.title))
  })
}

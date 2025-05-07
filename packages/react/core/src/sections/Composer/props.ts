import {ComposerStatus} from '@shared/components/Composer/props'
import {ReactElement} from 'react'

export type ComposerProps = {

    // State and option props
    status: ComposerStatus
    prompt?: string
    placeholder?: string
    autoFocus?: boolean
    hideStopButton?: boolean

    hasValidInput?: boolean
    submitShortcut?: 'Enter' | 'CommandEnter'

    // Event Handlers
    onChange: (value: string) => void
    onSubmit: () => void
    onCancel: () => void

    // UI Overrides
    Loader: ReactElement
}

export type RemixComposerProps = {

    // State and option props
    status: ComposerStatus
    prompt?: string
    placeholder?: string
    autoFocus?: boolean
    hideStopButton?: boolean
    remixAiMethodList?: Array<string>

    hasValidInput?: boolean
    submitShortcut?: 'Enter' | 'CommandEnter'

    // Event Handlers
    onChange: (value: string) => void
    onSubmit: () => void
    onCancel: () => void

    // Actions
    addContextFiles?: (action: 'currentFile' | 'workspace'|'openedFiles') => Promise<void>

    // UI Overrides
    Loader: ReactElement
}

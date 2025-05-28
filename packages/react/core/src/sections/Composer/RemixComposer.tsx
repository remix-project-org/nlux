/* eslint-disable @typescript-eslint/no-explicit-any */
 
import {className as compComposerClassName} from '@shared/components/Composer/create'
import {ComposerStatus} from '@shared/components/Composer/props'
import {
    statusClassName as compComposerStatusClassName,
} from '@shared/components/Composer/utils/applyNewStatusClassName'
import {isSubmitShortcutKey} from '@shared/utils/isSubmitShortcutKey'
import React,{ChangeEvent, Dispatch, KeyboardEvent, useEffect, useMemo, useReducer, useRef} from 'react'
import {CancelIconComp} from '../../components/CancelIcon/CancelIconComp'
import {SendIconComp} from '../../components/SendIcon/SendIconComp'
import {RemixComposerProps} from './props'
import { initialState, PromptAction, promptReducer, PromptState } from './composer-reducers/reducer'

const submittingPromptStatuses: Array<ComposerStatus> = [
    'submitting-prompt',
    'submitting-edit',
    'submitting-conversation-starter',
    'submitting-external-message',
]

export function RenderIf({ condition, children }: { condition: boolean, children: JSX.Element }) {
  return condition ? children : null
}

export function RenderIfNot({ condition, children }: { condition: boolean, children: JSX.Element }) {
  return condition ? null : children
}

export const openedAllFilesHelper = async (props: RemixComposerProps, promptDispatch: Dispatch<PromptAction>, promptState: PromptState) => {
  if (!props.pluginMethodCall) return
  const result = await props.pluginMethodCall('fileManager', 'getOpenedFiles', {} as any)
  if (result !== null && result !== undefined) {
    await props.pluginMethodCall('remixAI', 'setContextFiles', { context: 'openedFiles' })
    promptDispatch({ type: 'ALL_OPENED_FILES', payload: { files: Object.keys(result), selection: 'allOpenedFiles', selectContext: !promptState.selectContext } })
  } else {
    props.pluginMethodCall('notification', 'alert', {
      id: 'noOpenedFiles',
      message: <div>
        <p>No opened files found</p>
        <p>Please open a file to add to the context</p>
        <p>You can open a file by clicking on the file in the file explorer</p>
      </div>
    })
  }
}

export const currentFileHelper = async (props: RemixComposerProps, promptDispatch: Dispatch<PromptAction>, promptState: PromptState) => {
  if (!props.pluginMethodCall) return
  const result = await props.pluginMethodCall('fileManager', 'getCurrentFile', {} as any)
  if (result !== null && result !== undefined) {
    await props.pluginMethodCall('remixAI', 'setContextFiles', { context: 'currentFile' })
    promptDispatch({
      type: 'CURRENT_FILE',
      payload: {
        file: result,
        selection: 'currentFile',
        selectContext: !promptState.selectContext
      }
    })
  } else {
    props.pluginMethodCall('notification', 'alert', {
      id: 'noFileSelected',
      message: <div>
        <p>No file selected</p>
        <p>Please select a file file Explorer</p>
      </div>
    })
  }

}


export const RemixComposerComp = (props: RemixComposerProps) => {
  const compClassNameFromStats = compComposerStatusClassName[props.status] || ''
  const className = `${compComposerStatusClassName} ${compClassNameFromStats}`
  const disableTextarea = submittingPromptStatuses.includes(props.status);
  const disableButton = !props.hasValidInput || props.status === 'waiting' || submittingPromptStatuses.includes(
      props.status);
  const showSendIcon = props.status === 'typing' || props.status === 'waiting';
  const hideCancelButton = props.hideStopButton === true;
  const showCancelButton = !hideCancelButton && (submittingPromptStatuses.includes(props.status) || props.status
      === 'waiting')
  
      const [promptState, promptDispatch] = useReducer(promptReducer, initialState)

      const pluginMethodCall = props.pluginMethodCall

      const removeFile = async (file: string) => {
        if (pluginMethodCall) {
          await pluginMethodCall('remixAI', 'setContextFiles', { context: 'none' })
          promptDispatch({ type: 'REMOVE_FILE', payload: file })
        }
      }
      const removeAllFiles = async () => {
        if (pluginMethodCall) {
          await pluginMethodCall('remixAI', 'setContextFiles', { context: 'none' })
          promptDispatch({ type: 'REMOVE_ALL_FILES' })
        }
      }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
      if (props.status === 'typing' && props.autoFocus && textareaRef.current) {
          textareaRef.current.focus();
      }
  }, [props.status, props.autoFocus, textareaRef.current]);

  const handleChange = useMemo(() => (e: ChangeEvent<HTMLTextAreaElement>) => {
      props.onChange?.(e.target.value);
  }, [props.onChange]);

  const handleSubmit = useMemo(() => () => {
      props.onSubmit?.();
  }, [props.onSubmit]);

  const handleKeyDown = useMemo(() => (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (isSubmitShortcutKey(e, props.submitShortcut)) {
          e.preventDefault();
          handleSubmit();
      }
  }, [handleSubmit, props.submitShortcut]);

  useEffect(() => {
      if (!textareaRef.current) {
          return;
      }
      const adjustHeight = () => {
          const textarea = textareaRef.current;
          if (textarea) {
              textarea.style.height = 'auto'; // Reset height
              textarea.style.height = `${textarea.scrollHeight}px`; // Set new height based on content
          }
      };
      textareaRef.current.addEventListener('input', adjustHeight);
      return () => {
          textareaRef.current?.removeEventListener('input', adjustHeight);
      };

  }, [textareaRef.current]);

  return (
      <div className={`${className} w-100`} id="inner-composer-container">
        {promptState.selectContext && <div className="d-flex flex-column border w-100 px-3 pt-3 align-items-start justify-content-center align-self-start">
        <div className="text-uppercase mb-2 ml-2">Add context files</div>
        <ul className="list-unstyled">
          <li>
            <div className="d-flex ml-2 custom-control custom-radio">
              <input
                className="custom-control-input"
                type="radio"
                name="feature"
                value="currentFile"
                id="currentFile"
                onChange={() => {
                  console.log('changed current file')
                  currentFileHelper(props!, promptDispatch, promptState)
                }}
                checked={promptState.currentSelection === 'currentFile'}
              />
              <label className="form-check-label custom-control-label" htmlFor="currentFile" data-id="currentFile-context-option">
                Current file
              </label>
            </div>
          </li>
          <li>
            <div className="d-flex ml-2 custom-control custom-radio">
              <input className="custom-control-input" type="radio" name="feature" value="allOpenedFiles" id="allOpenedFiles" onChange={() => {
                console.log('changed opened All Files')
                openedAllFilesHelper(props!, promptDispatch, promptState)
              }} checked={promptState.currentSelection === 'allOpenedFiles'} />
              <label className="form-check-label custom-control-label" htmlFor="allOpenedFiles" data-id="allOpenedFiles-context-option">
                All opened files
              </label>
            </div>
          </li>
          <li>
            <div className="d-flex ml-2 custom-control custom-radio">
              <input className="custom-control-input" type="radio" name="workspace-context"
                value={promptState.currentSelection} id="workspace" onChange={ async () => {
                  if (!props.pluginMethodCall) return
                    await props.pluginMethodCall('remixAI', 'setContextFiles', { context: 'workspace' })
                    promptDispatch({ type: 'WORKSPACE', payload: { files: '@workspace', selection: 'workspace', selectContext: !promptState.selectContext } })
                }} checked={promptState.currentSelection === 'workspace'} />
              <label className="form-check-label custom-control-label" htmlFor="workspace" data-id="workspace-context-option">
                Workspace
              </label>
            </div>
          </li>
        </ul>
      </div>}
        <div id="composer-textarea-holder" className="bg-light d-flex flex-column w-100 p-3">
        <div className="mb-3">
          <button
            className="btn bg-dark btn-sm text-secondary"
            onClick={() => promptDispatch({ type: 'ADD_CONTEXT', payload: !promptState.selectContext })}
          >{"@ Add context"}</button>
          <button
            className="btn bg-dark ml-2 btn-sm text-secondary"
            onClick={() => {
              if (props.pluginMethodCall) {
                props.pluginMethodCall('templateSelection', 'aiWorkspaceGenerate', {})
              }
            }}
          >{"@ Generate Workspace"}</button>
        </div>
        <div className="mb-3 w-100" data-id="composer-textarea">
          <textarea
              tabIndex={0}
              data-id="composer-textarea-input"
              ref={textareaRef}
              disabled={disableTextarea}
              placeholder={props.placeholder ?? 'Ask me anything, use button to add context...'}
              value={props.prompt}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              aria-label={props.placeholder}
              rows={2}
              className="form-control bg-light"
          />
          <div id="composer-buttons" className="d-none">
            {!showCancelButton && (
                <button
                    tabIndex={0}
                    disabled={disableButton}
                    onClick={() => props.onSubmit()}
                    aria-label="Send"
                >
                    {showSendIcon && <SendIconComp/>}
                    {!showSendIcon && props.Loader}
                </button>
            )}
            {showCancelButton && (
                <button
                    tabIndex={0}
                    onClick={props.onCancel}
                    aria-label="Cancel"
                >
                    <CancelIconComp/>
                </button>
            )}
          </div>
        </div>
          <RenderIf condition={promptState.files.length > 0}>
          <div id="context-holder" className="d-flex gap-2 text-white justify-content-start align-items-center flex-wrap text-success py-3 border-warning overflow-y-scroll">
            {Array.isArray(promptState.files) ? Array.from(new Set(promptState.files.slice(0, 4))).map((file: string, index: number) => {
              return (
                <span key={index} className="badge badge-info text-success p-1 rounded m-1 text-truncate">
                  {file} <i className="fas fa-times" style={{ cursor: 'pointer' }} onClick={() => removeFile(file)}></i>
                </span>
              )
            }) : (
              <span className="badge badge-info text-success p-1 rounded m-1" onClick={() => removeFile(promptState.files as string)}>
                {promptState.files} <i className="fas fa-times" style={{ cursor: 'pointer' }} onClick={() => removeFile(promptState.files as string)}></i>
              </span>
            )}
            <RenderIf condition={promptState.files.length > 4 && promptState.files !== '@workspace'}>
              <>
                <span className="badge badge-info text-success p-1 rounded m-1">
                  {promptState.files.length - 4} more file{promptState.files.length - 4 > 1 ? 's' : ''}
                </span>
                <span style={{ cursor: 'pointer' }} className="badge badge-info text-success p-1 rounded m-1" onClick={() => removeAllFiles()}>
                Remove all <i className="fas fa-times"></i>
                </span>
              </>
            </RenderIf>
          </div>
        </RenderIf>
        </div>
      </div>
  )
}
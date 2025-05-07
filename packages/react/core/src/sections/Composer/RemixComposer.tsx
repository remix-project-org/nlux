import {className as compComposerClassName} from '@shared/components/Composer/create'
import {ComposerStatus} from '@shared/components/Composer/props'
import {
    statusClassName as compComposerStatusClassName,
} from '@shared/components/Composer/utils/applyNewStatusClassName'
import {isSubmitShortcutKey} from '@shared/utils/isSubmitShortcutKey'
import {ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState} from 'react'
import {CancelIconComp} from '../../components/CancelIcon/CancelIconComp'
import {SendIconComp} from '../../components/SendIcon/SendIconComp'
import {RemixComposerProps} from './props'

const submittingPromptStatuses: Array<ComposerStatus> = [
    'submitting-prompt',
    'submitting-edit',
    'submitting-conversation-starter',
    'submitting-external-message',
]

export const RemixComposerComp = (props: RemixComposerProps) => {
  const compClassNameFromStats = compComposerStatusClassName[props.status] || ''
  const className = `${compComposerStatusClassName} ${compClassNameFromStats}`
  const [selectContext, setSelectContext] = useState(false)
  const disableTextarea = submittingPromptStatuses.includes(props.status);
  const disableButton = !props.hasValidInput || props.status === 'waiting' || submittingPromptStatuses.includes(
      props.status);
  const showSendIcon = props.status === 'typing' || props.status === 'waiting';
  const hideCancelButton = props.hideStopButton === true;
  const showCancelButton = !hideCancelButton && (submittingPromptStatuses.includes(props.status) || props.status
      === 'waiting');

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
      <div className={className}>
        {selectContext && <div className="d-flex flex-column border w-100 px-3 pt-3 align-items-start justify-content-center align-self-start">
        <div className="text-uppercase mb-2 ml-2">Add context files</div>
        <ul className="list-unstyled">
          <li>
            <div className="d-flex ml-2 custom-control custom-radio">
              <input className="custom-control-input" type="radio" name="feature" value="currentFile" id="currentFile" onChange={() => {}} />
              <label className="form-check-label custom-control-label" htmlFor="currentFile" data-id="currentFile-context-option">
                {/* <FormattedMessage id="filePanel.mintable" /> */}
                Current file
              </label>
            </div>
          </li>
          <li>
            <div className="d-flex ml-2 custom-control custom-radio">
              <input className="custom-control-input" type="radio" name="feature" value="allOpenedFiles" id="allOpenedFiles" onChange={() => {}} />
              <label className="form-check-label custom-control-label" htmlFor="allOpenedFiles" data-id="allOpenedFiles-context-option">
                {/* <FormattedMessage id="filePanel.mintable" /> */}
                All opened files
              </label>
            </div>
          </li>
          <li>
            <div className="d-flex ml-2 custom-control custom-radio">
              <input className="custom-control-input" type="radio" name="workspace-context" value="workspace" id="workspace" onChange={() => {}} />
              <label className="form-check-label custom-control-label" htmlFor="workspace" data-id="workspace-context-option">
                {/* <FormattedMessage id="filePanel.mintable" /> */}
                Workspace
              </label>
            </div>
          </li>
        </ul>
      </div>}
        <div className="bg-light d-flex flex-column w-100 p-3">
        <div className="mb-3">
          <button
            className="btn bg-dark btn-sm text-secondary"
            onClick={() => setSelectContext(!selectContext)}
          >{"@ Add context"}</button>
        </div>
          <textarea
              tabIndex={0}
              ref={textareaRef}
              disabled={disableTextarea}
              placeholder={props.placeholder}
              value={props.prompt}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              aria-label={props.placeholder}
              className="form-control bg-light"
          />
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
          <div id="context-holder" className="d-flex flex-row text-white justify-content-start align-items-center flex-wrap text-success">
            <span className="bg-info p-1 rounded">file1.sol <i className="fas fa-times"></i></span>
            <span className="bg-info p-1 rounded ml-2">file2.sol <i className="fas fa-times"></i></span>
            <span className="bg-info p-1 rounded ml-2">file3.sol <i className="fas fa-times"></i></span>
          </div>
        </div>
      </div>
  )
}
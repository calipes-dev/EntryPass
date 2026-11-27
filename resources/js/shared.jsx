import { useEffect, useRef, useState } from 'react'

let csrfToken = document.querySelector('meta[name="csrf-token"]').content

export function setCsrfToken(value) {
  csrfToken = value
}

export async function request(path, data) {
  const response = await fetch('/data' + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  if (response.status === 401) {
    window.location.assign('/entrypass-staff')
    throw new Error('Sign in to continue.')
  }
  if (response.status === 419) throw new Error('This session expired. Refresh the page and try again.')
  if (response.status === 204) return null
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(response.status >= 500 ? 'The server could not complete this request.' : (result.message || 'Request failed.'))
    error.fields = result.errors
    throw error
  }
  return result
}

export function useData(path) {
  const [state, setState] = useState({ path })
  useEffect(() => {
    if (!path) return
    let active = true
    request(path).then(
      data => { if (active) setState({ path, data }) },
      error => { if (active) setState({ path, error: error.message }) },
    )
    return () => { active = false }
  }, [path])
  return state.path === path ? state : {}
}

const manila = { timeZone: 'Asia/Manila' }
const dateFormat = new Intl.DateTimeFormat('en-PH', { ...manila, dateStyle: 'long' })
const timeFormat = new Intl.DateTimeFormat('en-US', { ...manila, hour: 'numeric', minute: '2-digit', hour12: true })
const fullFormat = new Intl.DateTimeFormat('en-US', { ...manila, dateStyle: 'medium', timeStyle: 'short', hour12: true })
export const displayDate = value => fullFormat.format(new Date(value))

export function EventTime({ event }) {
  const start = new Date(event.starts_at)
  const end = new Date(event.ends_at)
  const sameDay = dateFormat.format(start) === dateFormat.format(end)
  return <>{dateFormat.format(start)} at {timeFormat.format(start)} to {!sameDay && dateFormat.format(end) + ' at '}{timeFormat.format(end)} PHT</>
}

export function Notice({ children, color = 'danger' }) {
  return <div className={'alert alert-' + color} role={color === 'danger' ? 'alert' : 'status'}>{children}</div>
}

export function LoadState({ error }) {
  return error ? <Notice>{error}</Notice> : <p role="status" className="text-secondary">Loading.</p>
}

export function Page({ title, subtitle, children, narrow = false }) {
  return <section className={narrow ? 'narrow' : ''}>
    <h1>{title}</h1>
    {subtitle && <p className="text-secondary mb-4">{subtitle}</p>}
    {children}
  </section>
}

export function Field({ name, label, errors, type = 'text', ...props }) {
  const error = errors?.[name]?.[0]
  return <div className="mb-3">
    <label className="form-label" htmlFor={name}>{label}</label>
    {type === 'textarea'
      ? <textarea id={name} name={name} className={'form-control' + (error ? ' is-invalid' : '')}
          aria-describedby={error ? name + '-error' : undefined} aria-invalid={!!error} rows="3" {...props} />
      : <input id={name} name={name} type={type} className={'form-control' + (error ? ' is-invalid' : '')}
          aria-describedby={error ? name + '-error' : undefined} aria-invalid={!!error} {...props} />}
    {error && <div id={name + '-error'} className="invalid-feedback">{error}</div>}
  </div>
}

export function useForm(path, onSuccess) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const element = event.currentTarget
      const data = Object.fromEntries(new FormData(element))
      await onSuccess(await request(path, data), element)
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, errors: error?.fields, submit }
}

export function RegistrationSubmit({ busy, disabled, children }) {
  return <>
    <button type="submit" className="btn btn-primary" disabled={busy || disabled}>
      {busy ? <>
        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
        Confirming…
      </> : children}
    </button>
    <span className="visually-hidden" role="status">
      {busy ? 'Confirming your registration and processing the confirmation email.' : ''}
    </span>
  </>
}

export function FormError({ form }) {
  if (!form.error) return null
  if (form.errors?.registration) return <Notice>{form.errors.registration[0]}</Notice>
  if (form.errors?.waitlist) return <Notice color="warning">{form.errors.waitlist[0]}</Notice>
  return !form.errors && <Notice>{form.error.message}</Notice>
}

export function ActionDialog({ title, children, close, confirm, label, busy }) {
  const ref = useRef(null)
  useEffect(() => { ref.current.showModal() }, [])
  return <dialog ref={ref} className="seat-dialog" aria-label={title}
    onCancel={e => { e.preventDefault(); if (!busy) close() }}>
    <h2 className="h4">{title}</h2>
    <div className="mb-4">{children}</div>
    <div className="d-flex justify-content-end gap-2">
      <button autoFocus className="btn btn-outline-secondary" disabled={busy} onClick={close}>{confirm ? 'Go back' : 'Close'}</button>
      {confirm && <button className="btn btn-danger" disabled={busy} onClick={confirm}>{label}</button>}
    </div>
  </dialog>
}

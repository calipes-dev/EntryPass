import { useRef, useState } from 'react'
import { Camera } from './camera'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ActionDialog, displayDate, EventTime, Field, FormError, LoadState, Notice, Page, request, setCsrfToken, useData, useForm } from './shared'

export function StaffLogin() {
  const form = useForm('/staff/login', result => {
    setCsrfToken(result.csrfToken)
    window.location.replace('/staff')
  })
  return <section className="panel login-card">
    <h1>Staff sign-in</h1>
    <p className="text-secondary mb-4">Sign in to manage events and check in attendees.</p>
    <form noValidate onSubmit={form.submit}>
      <FormError form={form} />
      <Field name="username" label="Username" autoComplete="username" errors={form.errors} />
      <Field name="password" label="Password" type="password" autoComplete="current-password" errors={form.errors} />
      <button className="btn btn-primary" disabled={form.busy}>Sign in</button>
    </form>
  </section>
}

export function StaffHome() {
  const { data, error } = useData('/staff/events')
  if (!data) return <LoadState error={error} />
  const { organizer, events } = data
  return <Page title={organizer ? 'Dashboard' : 'Door check-in'} subtitle="Choose an event to continue.">
    {events.length === 0 ? <p className="panel">No events yet.</p> :
      <div className="row g-3">{events.map(event => <div key={event.id} className="col-md-6">
        <article className="panel h-100">
          <h2 className="h5">{event.title}</h2>
          <p className="event-meta mb-1"><EventTime event={event} /></p>
          <p className="text-capitalize">{event.status} · {event.registrations_count} / {event.capacity} registered</p>
          {organizer && <EventCounts event={event} />}
          <div className="d-flex flex-wrap gap-2">
            {organizer && <>
              <Link className="btn btn-outline-primary" to={'/staff/events/' + event.id + '/edit'}>Edit</Link>
              <Link className="btn btn-outline-primary" to={'/staff/events/' + event.id + '/attendees'}>Attendees</Link>
            </>}
            {event.status !== 'draft' && <Link className="btn btn-primary" to={'/staff/events/' + event.id + '/check-in'}>Check in</Link>}
          </div>
        </article>
      </div>)}</div>}
  </Page>
}

function EventCounts({ event }) {
  return <ul className="list-unstyled d-flex flex-wrap column-gap-3 row-gap-1 small">
    <li><strong>{event.confirmed_count}</strong> confirmed</li>
    <li><strong>{event.checked_in_count}</strong> checked in</li>
    <li><strong>{event.waitlisted_count}</strong> waitlisted</li>
    <li><strong>{event.cancelled_count}</strong> cancelled</li>
    {event.has_started && <li><strong>{event.confirmed_count}</strong> no-shows</li>}
  </ul>
}

function dateInput(value) {
  if (!value) return ''
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]))
  return parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute
}

export function EditEvent() {
  const { id } = useParams()
  const { data: event, error } = useData(id ? '/staff/events/' + id : null)
  const navigate = useNavigate()
  const form = useForm(id ? '/staff/events/' + id : '/staff/events', () => navigate('/staff'))
  if (id && !event) return <LoadState error={error} />

  return <Page title={id ? 'Edit event' : 'Create event'} subtitle="Enter dates and times in Cebu time.">
    <form className="panel event-editor" noValidate onSubmit={form.submit}>
      <div className="event-editor-wide"><FormError form={form} /></div>
      <Field name="title" label="Event title" defaultValue={event?.title} errors={form.errors} />
      <Field name="venue" label="Venue" defaultValue={event?.venue} errors={form.errors} />
      <div className="event-editor-wide">
        <Field name="description" label="Description" type="textarea" defaultValue={event?.description} errors={form.errors} />
      </div>
      <Field name="starts_at" label="Starts at (PHT)" type="datetime-local" defaultValue={dateInput(event?.starts_at)} errors={form.errors} />
      <Field name="ends_at" label="Ends at (PHT)" type="datetime-local" defaultValue={dateInput(event?.ends_at)} errors={form.errors} />
      <Field name="capacity" label="Capacity" type="number" min="1" defaultValue={event?.capacity} errors={form.errors} />
      <div>
        <label className="form-label" htmlFor="status">Status</label>
        <select className="form-select mb-3" id="status" name="status" defaultValue={event?.status || 'draft'}>
          <option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option>
        </select>
        {form.errors?.status && <Notice>{form.errors.status[0]}</Notice>}
      </div>
      <div className="event-editor-wide">
        <button className="btn btn-primary me-3" disabled={form.busy}>Save event</button>
        <Link to="/staff">Cancel</Link>
      </div>
    </form>
  </Page>
}

export function CheckIn() {
  const { id } = useParams()
  const { data, error } = useData('/staff/events')
  const navigate = useNavigate()
  const inputForm = useRef(null)
  const inFlight = useRef(false)
  const [result, setResult] = useState(null)
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const [camera, setCamera] = useState(false)
  const [count, setCount] = useState(null)
  const events = data?.events.filter(event => event.status !== 'draft')
  const selected = events?.find(event => String(event.id) === id)

  async function check(code) {
    if (!selected || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setResult(null)
    setProblem('')
    try {
      const response = await request('/staff/events/' + id + '/check-in', { ticket_code: code })
      setResult(response)
      if (response.status === 'checked_in') setCount(response)
      inputForm.current?.reset()
      inputForm.current?.elements.ticket_code.focus()
    } catch (failure) {
      setProblem(failure.fields?.ticket_code?.[0] || failure.message)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  if (!data) return <LoadState error={error} />
  if (!selected) return <Page title="Event unavailable"><Link to="/staff">Back to staff events</Link></Page>
  const totals = count || selected
  const results = {
    checked_in: ['success', 'Checked in · ' + result?.full_name],
    already_checked_in: ['warning', result?.checked_in_at ? 'Already checked in · ' + displayDate(result.checked_in_at) + ' PHT' : 'Already checked in'],
    invalid: ['danger', 'Invalid ticket'],
    wrong_day: ['danger', 'Check-in is only available on the event day (Cebu time).'],
    waitlisted: ['danger', 'On waitlist — not confirmed'],
    cancelled: ['danger', 'Cancelled'],
  }

  return <Page title="Check in an attendee" narrow>
    <Link to="/staff">Back to staff events</Link>
    <div className="panel mt-3">
      <label className="form-label" htmlFor="event-choice">Event</label>
      <select className="form-select mb-3" id="event-choice" value={id} disabled={busy}
        onChange={event => navigate('/staff/events/' + event.target.value + '/check-in')}>
        {events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}
      </select>
      <p className="fw-semibold" aria-live="polite">{totals.checked_in_count} / {totals.registrations_count} checked in</p>
      {camera ? <Camera scan={check} onReady={() => setResult(null)} onClose={() => setCamera(false)} /> :
        <button type="button" className="btn btn-outline-primary mb-3" onClick={() => setCamera(true)}>Open QR camera</button>}
      <form noValidate ref={inputForm} onSubmit={event => {
        event.preventDefault()
        check(new FormData(event.currentTarget).get('ticket_code'))
      }}>
        <Field name="ticket_code" label="Ticket code" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
        <button className="btn btn-primary mb-3" disabled={busy}>Check in</button>
      </form>
      {problem && <Notice>{problem}</Notice>}
      {result && <Notice color={results[result.status][0]}>{results[result.status][1]}</Notice>}
    </div>
  </Page>
}

export function Attendees() {
  const { id } = useParams()
  const path = '/staff/events/' + id
  const [revision, setRevision] = useState(0)
  const { data, error } = useData(path + '/attendees?revision=' + revision)
  const [search, setSearch] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)

  const [dialog, setDialog] = useState(null)

  async function change(action, person) {
    setDialog(null)
    setBusy(true)
    setProblem('')
    try {
      await request(person ? path + '/registrations/' + person.id + '/' + action : path + '/promote', {})
      setRevision(value => value + 1)
    } catch (failure) {
      setProblem(failure.fields?.registration?.[0] || failure.message)
    } finally {
      setBusy(false)
    }
  }

  if (!data) return <LoadState error={error} />
  const { event, attendees } = data
  const term = search.trim().toLowerCase()
  const matching = attendees.filter(person => [person.full_name, person.ticket_code].some(value => value.toLowerCase().includes(term)))
  return <Page title={event.title} subtitle="Attendee list">
    <Link to="/staff">Back to staff events</Link>
    <div className="panel mt-3">
      <div className="d-flex flex-wrap gap-3 mb-2">
        <strong>{event.registrations_count} / {event.capacity} registered</strong>
        <strong>{event.checked_in_count} / {event.registrations_count} checked in</strong>
      </div>
      <EventCounts event={event} />
      <div className="d-flex flex-wrap gap-2 mb-3">
        <a className="btn btn-outline-primary" href={'/data' + path + '/export'}>Export CSV</a>
        <button className="btn btn-primary" disabled={busy || !event.waitlisted_count || event.capacity <= event.registrations_count || event.status !== 'published' || Date.parse(event.ends_at) <= Date.now()}
          onClick={() => change('promote')}>Promote first waitlisted attendee</button>
      </div>
      {problem && <Notice>{problem}</Notice>}
      <Field name="search" label="Search by name or ticket code" type="search" value={search} onChange={event => setSearch(event.target.value)} />
      <p className="attendee-scroll-hint small text-secondary mb-2">Scroll sideways to see all attendee details.</p>
      <div className="table-responsive attendee-table" role="region" aria-label="Attendee details" tabIndex={0}>
        <table className="table align-middle mb-0">
          <thead><tr>{['Name', 'Email', 'Mobile', 'Ticket code', 'Registered at (PHT)', 'Status', 'Actions'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{matching.map(person => <tr key={person.id}>
            <td>{person.full_name}</td><td>{person.email}</td><td>{person.mobile}</td>
            <td><button className="code-preview" aria-label={`View full ticket code for ${person.full_name}`} onClick={() => setDialog({action:"code", person})}>{person.ticket_code.slice(0, 7)}…{person.ticket_code.slice(-4)}</button></td><td>{displayDate(person.registered_at)}</td>
            <td className="text-capitalize">{person.status.replace('_', ' ')}</td>
            <td>
              {person.status === 'checked_in' && <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => setDialog({action:'undo', person})}>Undo check-in</button>}
              {['confirmed', 'waitlisted'].includes(person.status) && <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => setDialog({action:'cancel', person})}>Cancel</button>}
            </td>
          </tr>)}</tbody>
        </table>
      </div>
      {dialog && (dialog.action === 'code'
        ? <ActionDialog title="Ticket code" close={() => setDialog(null)}>
            <p>{dialog.person.full_name}</p><code className="ticket-code">{dialog.person.ticket_code}</code>
          </ActionDialog>
        : <ActionDialog title={dialog.action === 'cancel' ? 'Cancel registration?' : 'Undo check-in?'}
            close={() => setDialog(null)} confirm={() => change(dialog.action, dialog.person)}
            label={dialog.action === 'cancel' ? 'Cancel registration' : 'Undo check-in'}>
            {dialog.action === 'cancel' ? 'Cancel the registration' : 'Reverse the check-in'} for <strong>{dialog.person.full_name}</strong> at {event.title}?
          </ActionDialog>)}
      {!matching.length && <p className="text-secondary mt-3 mb-0">{term ? 'No matching attendees.' : 'No registrations yet.'}</p>}
    </div>
  </Page>
}

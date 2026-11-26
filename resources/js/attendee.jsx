import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Seats } from './seats'
import QRCode from 'qrcode'
import { Icon } from './icons'
import { EventTime, Field, FormError, LoadState, Notice, Page, request, useData, useForm } from './shared'

function Availability({ event }) {
  if (Date.parse(event.ends_at) <= Date.now()) return <span className="availability full">Ended</span>
  const left = Math.max(0, event.capacity - event.registrations_count)
  return <span className={'availability ' + (left ? '' : 'full')}>{left ? left + ' of ' + event.capacity + ' spots left' : 'Full · 0/' + event.capacity + ' spots left'}</span>
}

export function EventList() {
  const { data, error } = useData('/events')
  return <>
    <header className="hero">
      <p className="hero-kicker">Free events in Cebu</p>
      <h1>Find your next event.</h1>
      <p>Reserve a spot and show your QR ticket at the door.</p>
    </header>
    <div className="d-flex align-items-baseline justify-content-between gap-3 mb-3">
      <h2 className="h4 m-0">Upcoming events</h2>
      <span className="small text-secondary">Cebu time (PHT)</span>
    </div>
    {!data ? <LoadState error={error} /> : data.length === 0 ? <p className="panel">No upcoming events yet.</p> :
      <div className="row g-3">
        {data.map(event => <div key={event.id} className="col-md-6">
          <article className="panel h-100 d-flex flex-column align-items-start">
            <Availability event={event} />
            <h3 className="h5 mt-3">{event.title}</h3>
            <p className="event-meta mb-1"><EventTime event={event} /></p>
            <p className="event-meta mb-4">{event.venue}</p>
            <Link className="btn btn-outline-primary icon-link mt-auto" to={'/events/' + event.id}>View event <Icon name="forward" /></Link>
          </article>
        </div>)}
      </div>}
  </>
}

export function EventDetails() {
  const { id } = useParams()
  const { data: event, error } = useData('/events/' + id)
  const [ticket, setTicket] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const form = useForm('/events/' + id + '/register', setTicket)

  if (!event) return <LoadState error={error} />
  const ended = Date.parse(event.ends_at) <= Date.now()
  const waitlist = event.registrations_count >= event.capacity || event.waitlisted_count > 0 || !!form.errors?.waitlist
  return <Page title={event.title}>
    <Link className="icon-link" to="/"><Icon name="back" />All events</Link>
    <div className="panel mt-3">
      {Number(event.capacity) !== 30 && <Availability event={event} />}
      <p className="mt-3">{event.description}</p>
      <p className="event-meta mb-1"><EventTime event={event} /></p>
      <p className="event-meta mb-3">{event.venue}</p>
      {(Number(event.capacity) !== 30 || waitlist) && <button className="btn btn-primary" disabled={ended || waitlist} onClick={() => setShowForm(true)} aria-expanded={showForm}>Register</button>}
      {waitlist && !ended && <button className="btn btn-outline-primary ms-2" onClick={() => setShowForm(true)} aria-expanded={showForm}>Join waitlist</button>}
    </div>
    {Number(event.capacity) === 30 && <Seats waitlisted={event.waitlisted_count > 0} event={event} onTicket={setTicket}/>}
    {ticket && <TicketDialog ticket={ticket} close={() => setTicket(null)} />}
    {showForm && <form className="panel mt-3" noValidate onSubmit={form.submit}>
      <h2 className="h5 mb-3">{waitlist ? 'Join the waitlist' : 'Reserve your spot'}</h2>
      <input type="hidden" name="join_waitlist" value={waitlist ? '1' : '0'} />
      <FormError form={form} />
      <Field name="full_name" label="Full name" autoComplete="name" errors={form.errors} />
      <Field name="email" label="Email address" type="email" autoComplete="email" errors={form.errors} />
      <Field name="mobile" label="Mobile number" type="tel" autoComplete="tel-national" placeholder="09171234567" errors={form.errors} />
      <button className="btn btn-primary" disabled={form.busy || ended}>{waitlist ? 'Join waitlist' : 'Get my ticket'}</button>
    </form>}
  </Page>
}

function TicketDialog({ ticket, close }) {
  const ref = useRef(null)
  useEffect(() => { ref.current.showModal() }, [])
  return <dialog ref={ref} className="seat-dialog ticket-dialog" aria-label="Your ticket" onClose={close}>
    <div className="d-flex align-items-center justify-content-between mb-3">
      <strong>{ticket.status === 'waitlisted' ? 'Added to waitlist' : 'Reservation confirmed'}</strong>
      <button autoFocus type="button" className="btn btn-outline-secondary" onClick={() => ref.current.close()}>Close</button>
    </div>
    <div className="ticket-scroll" tabIndex="0" aria-label="Ticket details"><Ticket ticket={ticket}/></div>
  </dialog>
}

function Ticket({ ticket }) {
  const ticketElement = useRef(null)
  function download() {
    const documentCopy = document.implementation.createHTMLDocument('EntryPass ticket')
    documentCopy.documentElement.lang = 'en'
    const style = documentCopy.createElement('style')
    style.textContent = 'body{font:18px system-ui;color:#12372a;text-align:center;margin:3rem auto;max-width:600px;padding:1rem}p{overflow-wrap:anywhere}img{max-width:100%;height:auto}'
    documentCopy.head.append(style)
    documentCopy.body.append(ticketElement.current.cloneNode(true))
    const url = URL.createObjectURL(new Blob(['<!doctype html>', documentCopy.documentElement.outerHTML], {type:'text/html;charset=utf-8'}))
    const link = document.createElement('a')
    link.href = url
    link.download = ticket.ticket_code + '.html'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
  const valid = ticket.status === 'confirmed' || ticket.status === 'checked_in'
  const [qr, setQr] = useState(null)
  const [qrError, setQrError] = useState(false)
  useEffect(() => {
    if (!valid) return
    let active = true
    QRCode.toDataURL(ticket.ticket_code, { width: 240, margin: 4, errorCorrectionLevel: 'M' }).then(
      url => { if (active) setQr(url) },
      () => { if (active) setQrError(true) },
    )
    return () => { active = false }
  }, [ticket.ticket_code, valid])

  return <Page title="Your ticket" narrow>
    <div className="panel ticket mt-3" ref={ticketElement}>
      <h2 className="h4">{ticket.event.title}</h2>
      <p className="event-meta mb-1"><EventTime event={ticket.event} /></p>
      <p className="event-meta">{ticket.event.venue}</p>
      {ticket.status === 'waitlisted' && <Notice color="warning">You are #{ticket.waitlist_position} on the waitlist.</Notice>}
      {ticket.status === 'cancelled' && <Notice color="secondary">Registration cancelled.</Notice>}
      {ticket.status === 'checked_in' && <Notice color="success">Checked in.</Notice>}
      {valid && <div className="qr-area">
        {qr ? <img src={qr} width="240" height="240" alt="QR code containing your ticket code" /> :
          <p className="m-3">{qrError ? 'Show the ticket code to staff.' : 'Generating QR code.'}</p>}
      </div>}
      <p className="fw-semibold mt-3 mb-1">{ticket.full_name}</p>
      {ticket.seat && <p>Seat <strong>{ticket.seat}</strong> · FREE<br/>{ticket.email} · {ticket.mobile}</p>}
      <code className="ticket-code">{ticket.ticket_code}</code>
    </div>
    {valid && qr && <button className="btn btn-primary mt-3" onClick={download}>Download free ticket</button>}
    <p className="text-secondary mt-3">Keep a copy of this code. You can use it with your email to recover your ticket.</p>
    <Link to="/">Browse events</Link>
  </Page>
}

export function TicketLookup() {
  const [params] = useSearchParams()
  const [ticket, setTicket] = useState(null)
  const cancelDialog = useRef(null)
  const [identity, setIdentity] = useState(null)
  const [cancelError, setCancelError] = useState('')
  const [busy, setBusy] = useState(false)
  const form = useForm('/tickets/lookup', (result, element) => {
    setIdentity(Object.fromEntries(new FormData(element)))
    setTicket(result)
  })

  async function cancel() {
    if (busy) return
    setBusy(true)
    setCancelError('')
    try {
      setTicket(await request('/tickets/cancel', identity))
    } catch (error) {
      setCancelError(error.message)
    } finally {
      cancelDialog.current?.close()
      setBusy(false)
    }
  }

  if (ticket) return <>
    <Ticket ticket={ticket} />
    <dialog ref={cancelDialog} className="seat-dialog" aria-labelledby="cancel-title" onCancel={e => { if (busy) e.preventDefault() }}>
      <h2 id="cancel-title" className="h4">Cancel your registration?</h2>
      <p>Your ticket for <strong>{ticket.event.title}</strong> will be cancelled.{ticket.seat && <> Seat {ticket.seat} will become available again.</>}</p>
      <div className="d-flex flex-wrap gap-2">
        <button autoFocus className="btn btn-outline-secondary" disabled={busy} onClick={() => cancelDialog.current.close()}>Keep registration</button>
        <button className="btn btn-danger" disabled={busy} onClick={cancel}>{busy ? "Cancelling…" : "Yes, cancel registration"}</button>
      </div>
    </dialog>
    <div className="narrow mt-3">
      {cancelError && <Notice>{cancelError}</Notice>}
      {['confirmed', 'waitlisted'].includes(ticket.status) && <button className="btn btn-outline-danger me-2" onClick={() => cancelDialog.current.showModal()} disabled={busy}>Cancel registration</button>}
      <button className="btn btn-outline-secondary" onClick={() => { setTicket(null); setCancelError('') }} disabled={busy}>Find another ticket</button>
    </div>
  </>
  return <Page title="Find your ticket" subtitle="Enter your ticket code and registration email." narrow>
    <form className="panel" noValidate onSubmit={form.submit}>
      <FormError form={form} />
      <Field name="ticket_code" label="Ticket code" defaultValue={params.get('code') || ''} autoCapitalize="characters" spellCheck={false} errors={form.errors} />
      <Field name="email" label="Email address" type="email" autoComplete="email" errors={form.errors} />
      <button className="btn btn-primary" disabled={form.busy}>Find ticket</button>
    </form>
  </Page>
}

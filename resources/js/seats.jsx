import { useEffect, useRef, useState } from 'react'
import { Field, Notice, request, useForm } from './shared'

const rows = [
  [150, [355,440,525,610,696,972,1060,1146,1231,1318]],
  [386, [344,432,521,608,697,973,1061,1149,1238,1326]],
  [633, [345,433,521,609,698,973,1061,1150,1239,1327]],
]
const chairs = rows.flatMap(([y, centers], row) => centers.map((x, i) => ({
  x, y, id: 'ABCDEF'[row * 2 + Math.floor(i / 5)] + (i % 5 + 1),
})))

function Reservation({ event, seat, unavailable, cancel, confirm }) {
  const dialog = useRef(null)
  const form = useForm('/events/' + event.id + '/register', confirm)
  useEffect(() => { dialog.current.showModal() }, [])
  return <dialog ref={dialog} className="seat-dialog" aria-labelledby="reserve-heading" onCancel={e => { e.preventDefault(); if (!form.busy) cancel() }}>
    <form onSubmit={form.submit}>
      <h2 id="reserve-heading">Reserve seat {seat}</h2>
      <p>{event.title} · Admission <strong>FREE</strong></p>
      <input type="hidden" name="seat" value={seat}/>
      <Field required name="full_name" label="Full name" maxLength={150} autoComplete="name" errors={form.errors}/>
      <Field required type="email" name="email" label="Email address" autoComplete="email" errors={form.errors}/>
      <Field required type="tel" name="mobile" label="Contact number" placeholder="09171234567" pattern="09[0-9]{9}" autoComplete="tel-national" errors={form.errors}/>
      {unavailable && <Notice>This seat is no longer available.</Notice>}
      {form.error && <Notice>{Object.values(form.errors || {}).flat().join(' ') || form.error.message}</Notice>}
      <button className="btn btn-primary" disabled={form.busy || unavailable}>Confirm reservation</button>
      <button type="button" className="btn btn-light ms-2" disabled={form.busy} onClick={cancel}>Cancel</button>
    </form>
  </dialog>
}

export function Seats({ event, onTicket, waitlisted }) {
  const [occupied, setOccupied] = useState(event.occupied_seats)
  const [selected, select] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [offline, setOffline] = useState(false)
  const viewport = useRef(null)
  const revision = useRef(0)
  useEffect(() => {
    let active = true, timer
    async function update() {
      const version = revision.current
      try {
        const fresh = await request('/events/' + event.id)
        if (active && version === revision.current) { setOccupied(fresh.occupied_seats); setOffline(false) }
      } catch { if (active) setOffline(true) }
      if (active) timer = setTimeout(update, 3000)
    }
    update()
    return () => { active = false; clearTimeout(timer) }
  }, [event.id])
  function confirm(ticket) {
    revision.current++
    setOccupied(previous => [...new Set([...previous, ticket.seat])])
    select(null)
    onTicket(ticket)
  }
  const ended = Date.parse(event.ends_at) <= Date.now()
  return <section className="panel mt-3">
    <h2 className="h4">Choose your seat</h2>
    <p>30 seats · {30 - occupied.length} available · {occupied.length} occupied · Selected {selected || '—'} · Admission <strong>FREE</strong></p>
    <progress className="seat-progress" value={occupied.length} max="30" aria-label="Reservation progress"/>
    {occupied.length === 30 && <Notice color="warning">Fully Booked</Notice>}
    {offline && <Notice color="warning">Reconnecting to seat availability…</Notice>}
    <div className="map-tools"><small>Empty chair · Available　 <b className="text-success">Green · Selected</b>　 Seated figure · Occupied</small>
      <div className="btn-group"><button className="btn btn-light" aria-label="Zoom out" disabled={zoom===1} onClick={()=>setZoom(zoom-.5)}>−</button><button className="btn btn-light" onClick={()=>{setZoom(1);viewport.current.scrollTo(0,0)}}>Reset view</button><button className="btn btn-light" aria-label="Zoom in" disabled={zoom===3} onClick={()=>setZoom(zoom+.5)}>+</button></div></div>
    <div className="map-window" ref={viewport}><div className="room-map" style={{width:zoom*100+'%'}}>
      {chairs.map(({id,x,y}) => <button key={id} className={'room-chair '+(selected===id?'selected':'')} style={{left:x/1672*100+'%',top:y/941*100+'%'}} title={id} aria-label={id+' '+(occupied.includes(id)?'occupied':'available')} disabled={ended || offline || waitlisted || occupied.includes(id)} onClick={()=>select(id)}>
        {occupied.includes(id) && <img src="/attendee.png" alt=""/>}<span>{id}</span>
      </button>)}
    </div></div>
    {selected && <Reservation event={event} seat={selected} unavailable={ended || offline || occupied.includes(selected)} cancel={()=>select(null)} confirm={confirm}/>}
  </section>
}

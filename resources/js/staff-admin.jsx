import { useState } from 'react'
import { Link } from 'react-router-dom'
import { displayDate, Field, FormError, LoadState, Notice, Page, useData, useForm } from './shared'

export function Audit() {
  const { data, error } = useData('/staff/audit')
  if (!data) return <LoadState error={error} />
  return <Page title="Audit log" subtitle="Latest 200 actions. All times are in Cebu time.">
    <Link to="/staff">Back to staff events</Link>
    <div className="panel mt-3 table-responsive audit-table" role="region" aria-label="Audit log entries" tabIndex={0}>
      <table className="table">
        <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th></tr></thead>
        <tbody>{data.map(entry => <tr key={entry.id}>
          <td>{displayDate(entry.created_at)}</td><td>{entry.staff_name || 'Attendee'}</td>
          <td>{entry.action}</td><td>{entry.target_type} #{entry.target_id}</td>
        </tr>)}</tbody>
      </table>
      {!data.length && <p className="mb-0">No actions recorded yet.</p>}
    </div>
  </Page>
}

export function Accounts() {
  const [revision, setRevision] = useState(0)
  const { data, error } = useData('/staff/accounts?revision=' + revision)
  const form = useForm('/staff/accounts', (_, element) => {
    element.reset()
    setRevision(value => value + 1)
  })
  return <Page title="Staff accounts" subtitle="Manage who can organize events and check in attendees.">
    <div className="accounts-grid">
    <section className="panel">
      <h2 className="h5">Current accounts {data && <small className="account-count">{data.length}</small>}</h2>
      {data ? <ul className="account-list">{data.map(account => <li key={account.id}>
        <span className="account-avatar" aria-hidden="true">{account.name.slice(0,1).toUpperCase()}</span>
        <div><strong>{account.name}</strong><small>@{account.username}</small></div>
        <span className="account-role">{account.role === 'organizer' ? 'Organizer' : 'Door staff'}</span>
      </li>)}</ul> : <LoadState error={error} />}
    </section>
    <form className="panel" noValidate onSubmit={form.submit}>
      <h2 className="h5 mb-3">Create an account</h2>
      {revision > 0 && !form.error && <Notice color="success">Staff account created.</Notice>}
      <FormError form={form} />
      <Field name="name" label="Name" errors={form.errors} />
      <Field name="username" label="Username" errors={form.errors} />
      <Field name="password" label="Password (at least 12 characters)" type="password" autoComplete="new-password" errors={form.errors} />
      <label className="form-label" htmlFor="role">Role</label>
      <select className="form-select mb-3" id="role" name="role">
        <option value="door_staff">Door staff</option><option value="organizer">Organizer</option>
      </select>
      {form.errors?.role && <Notice>{form.errors.role[0]}</Notice>}
      <button className="btn btn-primary" disabled={form.busy}>Create staff account</button>
    </form>
    </div>
  </Page>
}

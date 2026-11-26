const paths = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  add: 'M4 6h16v15H4zM8 3v5m8-5v5m-8 6h8m-4-4v8',
  audit: 'M5 3h14v18H5zM8 8h8m-8 4h8m-8 4h5',
  logout: 'M10 4H4v16h6m-1-8h12m-5-5 5 5-5 5',
  calendar: 'M7 3v4m10-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 9h2m4 0h2m-8 3h2',
  ticket: 'M5 6h14a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5V8a2 2 0 0 1 2-2Zm10 3v1m0 4v1',
  staff: 'M12 22s8-3 8-10V6l-8-3-8 3v6c0 7 8 10 8 10Zm-3-10 2 2 4-4',
  forward: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
}

export function Icon({ name }) {
  return <svg className="ui-icon" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d={paths[name]} />
  </svg>
}

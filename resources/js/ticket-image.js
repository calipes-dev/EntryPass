import QRCode from 'qrcode'

const date = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila',
})

export async function downloadTicket(ticket) {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  const context = canvas.getContext('2d')
  const details = [
    ticket.event.title,
    ticket.event.venue,
    'Starts: ' + date.format(new Date(ticket.event.starts_at)) + ' PHT',
    'Ends: ' + date.format(new Date(ticket.event.ends_at)) + ' PHT',
    ticket.full_name,
    ticket.seat ? 'Seat ' + ticket.seat + ' · Free admission' : 'Free admission',
    ticket.ticket_code,
  ]

  context.font = '24px sans-serif'
  const lines = []
  for (const detail of details) {
    let line = ''
    for (const character of detail) {
      if (context.measureText(line + character).width > 640) {
        lines.push(line)
        line = ''
      }
      line += character
    }
    lines.push(line)
  }

  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, ticket.ticket_code, { scale: 10, margin: 4, errorCorrectionLevel: 'M' })
  canvas.height = 140 + lines.length * 36 + qr.height
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#15372a'
  context.textAlign = 'center'
  context.font = 'bold 36px sans-serif'
  context.fillText('EntryPass ticket', 360, 60)
  context.font = '24px sans-serif'
  lines.forEach((line, index) => context.fillText(line, 360, 110 + index * 36))

  context.drawImage(qr, (720 - qr.width) / 2, 110 + lines.length * 36)
  const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!png) throw new Error('PNG encoding failed.')
  const url = URL.createObjectURL(png)
  const link = document.createElement('a')
  link.href = url
  link.download = ticket.ticket_code + '.png'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

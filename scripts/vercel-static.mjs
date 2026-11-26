import { cp, mkdir } from 'node:fs/promises'

await mkdir('dist', { recursive: true })
for (const asset of ['build', 'Chairs.png', 'attendee.png', 'entrypass-mark.svg']) {
  await cp('public/' + asset, 'dist/' + asset, { recursive: true })
}

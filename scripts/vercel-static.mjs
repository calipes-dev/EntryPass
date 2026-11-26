import { cp, mkdir } from 'node:fs/promises'

await mkdir('dist', { recursive: true })
for (const asset of ['build', 'room-map-960.jpg', 'room-map-1672.jpg', 'entrypass-mark.svg']) {
  await cp('public/' + asset, 'dist/' + asset, { recursive: true })
}

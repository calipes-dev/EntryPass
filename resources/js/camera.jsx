import { useEffect, useRef, useState } from 'react'
import { Notice } from './shared'

export function Camera({ scan, onReady, onClose }) {
  const element = useRef(null)
  const callbacks = useRef({ scan, onReady })
  const [error, setError] = useState('')
  useEffect(() => { callbacks.current = { scan, onReady } }, [scan, onReady])
  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Camera scanning requires HTTPS or localhost. You can still enter a code manually.')
      return
    }

    let active = true
    let scanner
    let running = false
    let scanning = false
    const target = element.current
    async function stop() {
      if (!running) return
      running = false
      try { await scanner.stop() } finally { scanner.clear() }
    }
    async function start() {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (!active) return
        scanner = new Html5Qrcode(target.id, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] })
        await scanner.start({ facingMode: 'environment' }, { fps: 10 }, async decoded => {
          if (!active || !running || scanning) return
          scanning = true
          scanner.pause(true)
          try {
            await callbacks.current.scan(decoded)
            await new Promise(resolve => setTimeout(resolve, 2000))
          } finally {
            scanning = false
            if (active && running) {
              callbacks.current.onReady()
              scanner.resume()
            }
          }
        })
        running = true
        if (!active) await stop()
      } catch {
        if (active) setError('Could not open the camera. Check camera permissions or enter the code manually.')
      }
    }

    start()
    return () => {
      active = false
      stop().catch(() => {})
    }
  }, [])

  return <div className="mb-3">
    <button type="button" className="btn btn-outline-secondary mb-2" onClick={onClose}>Close camera</button>
    {error && <Notice>{error}</Notice>}
    <div id="qr-camera-preview" ref={element} className="overflow-hidden" />
  </div>
}

"use client"

// Transport pencetakan ke printer thermal ESC/POS.
// Jujur soal dukungan: Web Bluetooth TIDAK mendukung printer SPP classic,
// jadi tidak ada dukungan palsu di sini. Prioritas: Web Serial → file .bin.

export type PrintCapability = "serial" | "file" | "bluetooth-bridge"

export interface PrintResult {
  ok: boolean
  message: string
}

export function detectCapabilities(): { serial: boolean; bluetoothBridge: boolean; file: true } {
  const hasSerial = typeof navigator !== "undefined" && "serial" in navigator
  return {
    serial: !!hasSerial,
    bluetoothBridge: false, // tidak tersedia di web — harus via aplikasi pendamping
    file: true,
  }
}

async function writeSerial(bytes: Uint8Array): Promise<PrintResult> {
  try {
    const nav = navigator as Navigator & {
      serial: {
        requestPort(options?: { filters?: unknown[] }): Promise<{ open(o: { baudRate: number }): Promise<void>; writable: WritableStream | null }>
      }
    }
    const port = await nav.serial.requestPort()
    await port.open({ baudRate: 9600 })
    const writer = port.writable?.getWriter()
    if (!writer) {
      return { ok: false, message: "Port serial tidak dapat ditulis." }
    }
    await writer.write(bytes)
    writer.releaseLock()
    return { ok: true, message: "Struk dikirim ke printer via USB/serial." }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Gagal mencetak via serial." }
  }
}

function downloadFile(bytes: Uint8Array, filename: string): PrintResult {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return { ok: true, message: `File ${filename} disimpan. Buka di aplikasi pencetak perangkat Anda.` }
}

export async function printBytes(bytes: Uint8Array, invoiceNumber: string): Promise<PrintResult> {
  const caps = detectCapabilities()
  if (caps.serial) {
    const res = await writeSerial(bytes)
    if (res.ok) return res
  }
  return downloadFile(bytes, `${invoiceNumber}.bin`)
}

export function printBluetoothHint(): PrintResult {
  return {
    ok: false,
    message:
      "Web Bluetooth tidak mendukung printer thermal klasik (SPP). Gunakan aplikasi pendamping vendor printer di perangkat Anda, atau transfer file .bin ke aplikasi tersebut.",
  }
}

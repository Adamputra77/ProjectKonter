// Encoder ESC/POS murni (tanpa DOM) — dapat diuji dengan Vitest.
// Sesuai standar ESC/POS untuk printer thermal 58mm/80mm.

export const PAPER_58MM = 32
export const PAPER_80MM = 42

export type Align = "left" | "center" | "right"
export type TextStyle = "normal" | "bold" | "title" | "subtitle"

export interface ReceiptLine {
  text: string
  align?: Align
  style?: TextStyle
  empty?: boolean
}

function push(buf: number[], ...bytes: number[]) {
  buf.push(...bytes)
}

function alignBytes(align: Align) {
  switch (align) {
    case "center":
      return [0x1b, 0x61, 0x01]
    case "right":
      return [0x1b, 0x61, 0x02]
    default:
      return [0x1b, 0x61, 0x00]
  }
}

function styleBytes(style: TextStyle) {
  const reset = [0x1b, 0x21, 0x00, 0x1b, 0x45, 0x00]
  switch (style) {
    case "bold":
      return [...reset, 0x1b, 0x45, 0x01]
    case "title":
      // Double height + bold
      return [...reset, 0x1b, 0x21, 0x10, 0x1b, 0x45, 0x01]
    case "subtitle":
      // Double width + bold
      return [...reset, 0x1b, 0x21, 0x20, 0x1b, 0x45, 0x01]
    default:
      return reset
  }
}

/** Encode satu baris receipt (text + style + align) menjadi byte ESC/POS. */
export function encodeLine(line: ReceiptLine): Uint8Array {
  const buf: number[] = []
  push(buf, ...alignBytes(line.align ?? "left"))
  push(buf, ...styleBytes(line.style ?? "normal"))
  for (const ch of line.text) {
    buf.push(ch.codePointAt(0) ?? 0x20)
  }
  push(buf, 0x0a)
  return new Uint8Array(buf)
}

/** Encode daftar baris menjadi satu dokumen ESC/POS lengkap. */
export function encodeReceipt(lines: ReceiptLine[]): Uint8Array {
  const buf: number[] = [0x1b, 0x40] // INIT
  for (const line of lines) {
    const bytes = encodeLine(line)
    for (const b of bytes) buf.push(b)
  }
  push(buf, 0x1b, 0x64, 0x03) // feed 3
  push(buf, 0x1d, 0x56, 0x42, 0x00) // full cut
  return new Uint8Array(buf)
}

/** Garis pemisah selebar kolom. */
export function dashedLine(char = "-", width = PAPER_58MM): ReceiptLine {
  return { text: char.repeat(width) }
}

/** Potong teks agar muat di lebar kolom (mempertimbangkan karakter lebar). */
export function fitWidth(text: string, width: number): string {
  let count = 0
  let result = ""
  for (const ch of text) {
    const w = ch.codePointAt(0)! > 0xff ? 2 : 1
    if (count + w > width) break
    result += ch
    count += w
  }
  return result
}

/**
 * Layout dua kolom: kiri = nama, kanan = harga.
 * Nama dipangkas supaya harga selalu muat di kanan.
 */
export function twoColumn(name: string, right: string, width = PAPER_58MM, pad = 1): ReceiptLine {
  const rightW = [...right].reduce((n, c) => n + (c.codePointAt(0)! > 0xff ? 2 : 1), 0)
  const nameFit = fitWidth(name, width - rightW - pad)
  const rightC = [...right].length
  const padCount = Math.max(width - [...nameFit].length - rightC, 1)
  return { text: nameFit + " ".repeat(padCount) + right }
}

/** Pad teks ke tengah selebar width (untuk preview konsol / test). */
export function centerText(text: string, width = PAPER_58MM): string {
  const len = [...text].reduce((n, c) => n + (c.codePointAt(0)! > 0xff ? 2 : 1), 0)
  const left = Math.max(Math.floor((width - len) / 2), 0)
  return " ".repeat(left) + text
}

// ---------------------------------------------------------------------------
// QR Code (ESC/POS command) — untuk invoice di struk
// ---------------------------------------------------------------------------

export function encodeQRCode(model: "1" | "2", size: number, errorLevel: "L" | "M" | "Q" | "H", data: string): Uint8Array {
  const buf: number[] = []
  // Function 165: set model
  push(buf, 0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, model === "1" ? 0x31 : 0x32, 0x00)
  // Function 167: set size (1-16)
  push(buf, 0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size)
  // Function 169: set error level (48+L/M/Q/H)
  push(buf, 0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30 + errorLevel.charCodeAt(0))
  // Function 180: store data
  const len = data.length + 3
  const pL = len & 0xff
  const pH = (len >> 8) & 0xff
  push(buf, 0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30)
  for (const ch of data) buf.push(ch.charCodeAt(0) & 0xff)
  // Function 181: print
  push(buf, 0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30)
  return new Uint8Array(buf)
}

// ---------------------------------------------------------------------------
// Test print (garis lengkap untuk uji printer)
// ---------------------------------------------------------------------------

export function buildTestReceipt(width = PAPER_58MM): ReceiptLine[] {
  const d = dashedLine("=", width)
  return [
    d,
    { text: "TES PRINTER KONTER", align: "center", style: "title" },
    { text: "Struk ini menguji printer", align: "center" },
    { text: "ESC/POS thermal 58mm", align: "center" },
    d,
    { text: "Teks tebal", style: "bold" },
    { text: "Teks normal" },
    { text: "Angka: 1 2 3 4 5", align: "right" },
    d,
    { text: "Kiri", align: "left" },
    { text: "Tengah", align: "center" },
    { text: "Kanan", align: "right" },
    d,
    { text: "Selesai. Selamat berjualan!", align: "center" },
    d,
  ]
}

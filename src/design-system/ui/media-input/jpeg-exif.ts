const SCAN_BYTES = 256 * 1024
const MARKER_PREFIX = 0xff
const START_OF_IMAGE = 0xd8
const START_OF_SCAN = 0xda
const APP1 = 0xe1
const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
const TIFF_OFFSET = 10
const ORIENTATION_TAG = 0x0112
const IFD_ENTRY_BYTES = 12
const UPRIGHT = 1

const hasExifHeader = (bytes: Uint8Array, offset: number): boolean =>
  EXIF_HEADER.every((value, index) => bytes[offset + index] === value)

const isJpeg = (bytes: Uint8Array): boolean =>
  bytes[0] === MARKER_PREFIX && bytes[1] === START_OF_IMAGE

const toUpright = (segment: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> => {
  const view = new DataView(segment.buffer, segment.byteOffset, segment.byteLength)
  if (segment.byteLength < TIFF_OFFSET + 8) {
    return segment
  }
  const isLittleEndian = view.getUint16(TIFF_OFFSET) === 0x4949
  const ifdStart = TIFF_OFFSET + view.getUint32(TIFF_OFFSET + 4, isLittleEndian)
  if (ifdStart + 2 > segment.byteLength) {
    return segment
  }
  const entries = view.getUint16(ifdStart, isLittleEndian)
  Array.from({ length: entries }, (_, index) => ifdStart + 2 + index * IFD_ENTRY_BYTES)
    .filter((entry) => entry + IFD_ENTRY_BYTES <= segment.byteLength)
    .filter((entry) => view.getUint16(entry, isLittleEndian) === ORIENTATION_TAG)
    .forEach((entry) => view.setUint16(entry + 8, UPRIGHT, isLittleEndian))
  return segment
}

const findExifSegment = (bytes: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> | null => {
  const cursor = { offset: 2 }
  while (cursor.offset + 4 <= bytes.byteLength && bytes[cursor.offset] === MARKER_PREFIX) {
    const marker = bytes[cursor.offset + 1]
    if (marker === START_OF_SCAN) {
      return null
    }
    const length = ((bytes[cursor.offset + 2] ?? 0) << 8) | (bytes[cursor.offset + 3] ?? 0)
    const end = cursor.offset + 2 + length
    if (marker === APP1 && hasExifHeader(bytes, cursor.offset + 4) && end <= bytes.byteLength) {
      return toUpright(bytes.slice(cursor.offset, end))
    }
    cursor.offset = end
  }
  return null
}

export const readJpegExif = async (file: Blob): Promise<Uint8Array<ArrayBuffer> | null> => {
  const bytes = new Uint8Array(await file.slice(0, SCAN_BYTES).arrayBuffer())
  return isJpeg(bytes) ? findExifSegment(bytes) : null
}

export const withJpegExif = async (jpeg: Blob, segment: Uint8Array<ArrayBuffer>): Promise<Blob> => {
  const bytes = new Uint8Array(await jpeg.arrayBuffer())
  if (!isJpeg(bytes)) {
    return jpeg
  }
  return new Blob([bytes.slice(0, 2), segment, bytes.slice(2)], { type: 'image/jpeg' })
}

type MeasureText = (text: string, fontSize: number, bold: boolean) => number

// Excel column widths use character units; text measurement uses CSS pixels.
export function createTextMeasurer(): MeasureText {
  const context = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  return (text, fontSize, bold) => {
    if (context) {
      context.font = `${bold ? 'bold ' : ''}${fontSize}pt Tahoma`
      return context.measureText(text).width
    }
    return Array.from(text.replace(/\p{Mark}/gu, '')).length * fontSize * 0.85
  }
}

export function calculateRowHeight(
  text: string, widthPixels: number, measure: MeasureText,
  minimum = 30, fontSize = 10, bold = false,
): number {
  const available = Math.max(1, widthPixels - 14)
  let lines = 0
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = ''
    lines += 1
    for (const character of paragraph) {
      if (line && measure(line + character, fontSize, bold) > available) {
        lines += 1
        line = character
      } else {
        line += character
      }
    }
  }
  // Extra space covers Excel's word wrapping and font differences across devices.
  return Math.max(minimum, Math.ceil(lines * fontSize * 1.6 + 12))
}

export const columnWidthPixels = (width: number) => width * 7 + 5

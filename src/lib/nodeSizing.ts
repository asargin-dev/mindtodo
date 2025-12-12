import type { TodoNode } from '@/types'
import { isRootNode } from '@/lib/rootNode'

export interface NodeSize {
  width: number
  height: number
}

export function getNodeSize(
  node: TodoNode,
  connectedCount: number,
  titleOverride?: string,
): NodeSize {
  const root = isRootNode(node)
  const title = titleOverride ?? node.title ?? ''
  const normalizedTitle = title.trim()

  const baseWidth = root ? Math.max(200, 180 + connectedCount * 20) : 160
  const minWidth = root ? 200 : 184
  const maxWidth = root ? 400 : 320

  const topPadding = 48
  const bottomPadding = 20
  const buttonAreaHeight = root ? 92 : 76
  const titlePaddingY = 20
  const editingBuffer = titleOverride !== undefined ? 12 : 0

  if (!normalizedTitle) {
    const width = Math.max(minWidth, baseWidth)
    const height = topPadding + 24 + titlePaddingY + buttonAreaHeight + bottomPadding + editingBuffer
    return { width, height: Math.max(width, height) }
  }

  const fontSize = root ? 20 : 18
  const lineHeight = fontSize * 1.5
  const avgCharWidth = fontSize * 0.52

  const words = normalizedTitle.split(/\s+/)
  const longestWord = words.reduce((max, word) => Math.max(max, word.length), 0)
  const totalLength = normalizedTitle.length
  const wordCount = words.length

  const longestWordWidth = longestWord * avgCharWidth
  const minWidthForWord = Math.ceil(longestWordWidth / 0.75) + 48

  let targetWidth = baseWidth
  if (wordCount <= 2 && totalLength <= 16) {
    const singleLineWidth = totalLength * avgCharWidth
    targetWidth = Math.max(baseWidth, Math.ceil(singleLineWidth / 0.75) + 48)
  } else {
    const idealCharsPerLine = 12
    const estimatedLines = Math.ceil(totalLength / idealCharsPerLine)
    const charsPerLine = Math.ceil(totalLength / Math.min(estimatedLines, 3))
    const lineWidthCalc = charsPerLine * avgCharWidth
    targetWidth = Math.max(baseWidth, Math.ceil(lineWidthCalc / 0.75) + 48)
  }

  targetWidth = Math.max(targetWidth, minWidthForWord)
  const finalWidth = Math.max(minWidth, Math.min(maxWidth, targetWidth))

  const containerPaddingX = 32 // NodeComponent: px-4
  const titleMaxWidthRatio = titleOverride !== undefined ? 0.75 : root ? 0.85 : 0.8
  const titleInnerPaddingX = titleOverride !== undefined ? 24 : 0 // editor: px-3
  const textAreaWidth = Math.max(
    40,
    (finalWidth - containerPaddingX) * titleMaxWidthRatio - titleInnerPaddingX,
  )
  let lineCount = 1
  let currentLineWidth = 0
  const spaceWidth = avgCharWidth

  for (const word of words) {
    const wordWidth = word.length * avgCharWidth
    if (wordWidth > textAreaWidth) {
      if (currentLineWidth > 0) {
        lineCount++
        currentLineWidth = 0
      }

      const extraLines = Math.ceil(wordWidth / textAreaWidth)
      lineCount += extraLines - 1
      const remainder = wordWidth % textAreaWidth
      currentLineWidth = remainder === 0 ? textAreaWidth : remainder
      continue
    }

    if (currentLineWidth === 0) {
      currentLineWidth = wordWidth
    } else if (currentLineWidth + spaceWidth + wordWidth <= textAreaWidth) {
      currentLineWidth += spaceWidth + wordWidth
    } else {
      lineCount++
      currentLineWidth = wordWidth
    }
  }

  const titleHeight = lineCount * lineHeight
  const totalHeight =
    topPadding + titleHeight + titlePaddingY + buttonAreaHeight + bottomPadding + editingBuffer
  const minHeight = root ? 160 : 150
  const finalHeight = Math.max(minHeight, Math.ceil(totalHeight) + 12)

  return { width: finalWidth, height: finalHeight }
}

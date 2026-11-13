import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force'
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'
import type { ClusterWord } from '../../shared/schemas.ts'
import type { SavedWord } from './savedWords.ts'

const NODE_HEIGHT = 50
const TICKS = 240
const FIT_MARK_WIDTH = 20
const NODE_GAP = 4
const SEPARATION_PASSES = 60

const FULL_WIDTH = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

export function estimateNodeWidth(term: string, romanization: string) {
  const termWidth = [...term].reduce((sum, char) => sum + (FULL_WIDTH.test(char) ? 19 : 11), 0)
  return Math.max(termWidth, romanization.length * 7.4) + 24
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export interface Point {
  x: number
  y: number
}

interface QuadrantNode extends SimulationNodeDatum {
  id: string
  targetX: number
  targetY: number
  halfWidth: number
}

/**
 * Places words by their axis scores, then nudges overlapping words apart.
 * Nodes are wider than they are tall, so the simulation runs with y stretched,
 * which makes its circular collision act like an ellipse on screen.
 */
export function layoutQuadrant(
  words: ClusterWord[],
  width: number,
  height: number,
): Map<string, Point> {
  // The extra width leaves room for a fit mark, so turning on a context doesn't cause overlaps.
  const widths = words.map((word) => estimateNodeWidth(word.term, word.romanization) + FIT_MARK_WIDTH)
  const stretch = Math.max(...widths) / NODE_HEIGHT
  const marginX = Math.max(...widths) / 2 + 6
  const marginY = NODE_HEIGHT / 2 + 6

  const nodes: QuadrantNode[] = words.map((word, index) => {
    const targetX = marginX + ((word.formality + 1) / 2) * (width - marginX * 2)
    const targetY = (marginY + ((1 - word.emotion) / 2) * (height - marginY * 2)) * stretch
    return { id: word.term, targetX, targetY, x: targetX, y: targetY, halfWidth: widths[index] / 2 }
  })

  const simulation = forceSimulation(nodes)
    .force('x', forceX<QuadrantNode>((node) => node.targetX).strength(0.35))
    .force('y', forceY<QuadrantNode>((node) => node.targetY).strength(0.35))
    .force('collide', forceCollide<QuadrantNode>((node) => node.halfWidth + 5).iterations(3))
    .stop()

  for (let tick = 0; tick < TICKS; tick++) {
    simulation.tick()
    for (const node of nodes) {
      node.x = clamp(node.x!, node.halfWidth + 2, width - node.halfWidth - 2)
      node.y = clamp(node.y!, marginY * stretch, (height - marginY) * stretch)
    }
  }

  const boxes: Box[] = nodes.map((node) => ({
    id: node.id,
    x: node.x!,
    y: node.y! / stretch,
    halfWidth: node.halfWidth,
  }))
  separateBoxes(boxes, width, height)
  return new Map(boxes.map((box) => [box.id, { x: box.x, y: box.y }]))
}

interface Box extends Point {
  id: string
  halfWidth: number
}

/**
 * The ellipses above only approximate each word's rectangle, and narrow words
 * get too little vertical room. This pushes any remaining overlaps apart along
 * whichever axis needs the smaller move.
 */
function separateBoxes(boxes: Box[], width: number, height: number) {
  const halfHeight = NODE_HEIGHT / 2
  for (let pass = 0; pass < SEPARATION_PASSES; pass++) {
    let moved = false
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        const overlapX = a.halfWidth + b.halfWidth + NODE_GAP - Math.abs(a.x - b.x)
        const overlapY = NODE_HEIGHT + NODE_GAP - Math.abs(a.y - b.y)
        if (overlapX <= 0 || overlapY <= 0) continue
        moved = true
        if (overlapX < overlapY) {
          const shift = (overlapX / 2) * (a.x <= b.x ? 1 : -1)
          a.x -= shift
          b.x += shift
        } else {
          const shift = (overlapY / 2) * (a.y <= b.y ? 1 : -1)
          a.y -= shift
          b.y += shift
        }
      }
    }
    for (const box of boxes) {
      box.x = clamp(box.x, box.halfWidth + 2, width - box.halfWidth - 2)
      box.y = clamp(box.y, halfHeight + 2, height - halfHeight - 2)
    }
    if (!moved) return
  }
}

export interface SenseGroup {
  key: string
  word: string
  senseLabel: string
  emoji: string
  members: string[]
}

export function groupBySense(words: SavedWord[]): SenseGroup[] {
  const groups = new Map<string, SenseGroup>()
  for (const word of words) {
    for (const source of word.sources) {
      const key = `${source.word}::${source.senseLabel}`
      const group = groups.get(key) ?? { ...source, key, members: [] }
      group.members.push(word.term)
      groups.set(key, group)
    }
  }
  return [...groups.values()]
}

export interface Bubble extends Point {
  key: string
  radius: number
}

export interface GraphLayout {
  words: Map<string, Point>
  hubs: Map<string, Point>
  links: { from: Point; to: Point; key: string }[]
  bubbles: Bubble[]
}

interface GraphNode extends SimulationNodeDatum {
  id: string
  radius: number
}

const hubId = (key: string) => `hub:${key}`
const wordId = (term: string) => `word:${term}`

/**
 * Each English sense gets a hub linked to its saved words. A word saved from
 * two senses links to both hubs, which is what joins separate searches.
 */
export function layoutPersonalMap(
  words: SavedWord[],
  groups: SenseGroup[],
  width: number,
  height: number,
): GraphLayout {
  const nodes: GraphNode[] = [
    ...groups.map((group) => ({ id: hubId(group.key), radius: 62 })),
    ...words.map((word) => ({
      id: wordId(word.term),
      radius: estimateNodeWidth(word.term, word.romanization) / 2 + 4,
    })),
  ]
  const links: SimulationLinkDatum<GraphNode>[] = groups.flatMap((group) =>
    group.members.map((term) => ({ source: hubId(group.key), target: wordId(term) })),
  )

  const simulation = forceSimulation(nodes)
    .force('link', forceLink<GraphNode, SimulationLinkDatum<GraphNode>>(links).id((node) => node.id).distance(118))
    .force('charge', forceManyBody().strength(-380))
    .force('center', forceCenter(width / 2, height / 2))
    .force('x', forceX(width / 2).strength(0.05))
    .force('y', forceY(height / 2).strength(0.07))
    .force('collide', forceCollide<GraphNode>((node) => node.radius))
    .stop()

  for (let tick = 0; tick < TICKS; tick++) {
    simulation.tick()
    for (const node of nodes) {
      node.x = clamp(node.x!, node.radius + 4, width - node.radius - 4)
      node.y = clamp(node.y!, 34, height - 34)
    }
  }

  const positions = new Map(nodes.map((node) => [node.id, { x: node.x!, y: node.y! }]))
  const radii = new Map(nodes.map((node) => [node.id, node.radius]))

  return {
    words: new Map(words.map((word) => [word.term, positions.get(wordId(word.term))!])),
    hubs: new Map(groups.map((group) => [group.key, positions.get(hubId(group.key))!])),
    links: groups.flatMap((group) =>
      group.members.map((term) => ({
        key: `${group.key}|${term}`,
        from: positions.get(hubId(group.key))!,
        to: positions.get(wordId(term))!,
      })),
    ),
    bubbles: groups.map((group) => {
      const ids = [hubId(group.key), ...group.members.map(wordId)]
      const points = ids.map((id) => positions.get(id)!)
      const x = points.reduce((sum, point) => sum + point.x, 0) / points.length
      const y = points.reduce((sum, point) => sum + point.y, 0) / points.length
      const radius = Math.max(
        ...ids.map((id) => {
          const point = positions.get(id)!
          return Math.hypot(point.x - x, point.y - y) + radii.get(id)! * 0.8
        }),
      )
      return { key: group.key, x, y, radius }
    }),
  }
}

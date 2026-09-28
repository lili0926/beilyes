import { midiToNote } from './pitchDetector.js'
import {
  buildPitchRibbonEdges,
  groupPitchRibbonEdges,
  perceptualPitchBand,
  pitchAxisForWindow,
  pitchAxisPlacement,
  pitchEdgeFitsAxis,
  pitchRangeLabel,
  selectPitchOverflowMarkers,
  selectSparsePitchRhythmMarkers,
  stablePitchWindow,
} from './pitchDisplay.js'

export const REFERENCE_PITCH_GRAPH = Object.freeze({
  windowMs: 20_000,
  width: 300,
  height: 154,
  left: 31,
  right: 7,
  top: 10,
  bottom: 12,
})

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value))
}

export function normalizeReferencePitchFrames(value) {
  if (!Array.isArray(value)) return []
  return value
    .map(frame => ({
      t: Number(frame?.t_ms),
      hz: Number(frame?.hz),
      confidence: clamp(Number.isFinite(Number(frame?.confidence)) ? Number(frame.confidence) : 0, 0, 1),
    }))
    .filter(frame => Number.isFinite(frame.t) && frame.t >= 0 && Number.isFinite(frame.hz) && frame.hz > 0)
    .sort((left, right) => left.t - right.t)
}

function edgeAt(edges, positionMs) {
  if (!edges.length) return null
  let low = 0
  let high = edges.length - 1
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (edges[middle].to.t < positionMs) low = middle + 1
    else high = middle
  }
  const edge = edges[low]
  return edge && positionMs >= edge.from.t && positionMs <= edge.to.t ? edge : null
}

function ridgeRunPath(edges) {
  if (!edges.length) return ''
  const first = edges[0].from
  return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${edges.map(edge => (
    `L ${edge.to.x.toFixed(2)} ${edge.to.y.toFixed(2)}`
  )).join(' ')}`
}

function pointForGeometry(graph, frame) {
  const placement = pitchAxisPlacement(frame, graph.minMidi, graph.maxMidi)
  return {
    x: graph.left + clamp((frame.t - graph.start) / graph.windowMs, 0, 1) * graph.usableWidth,
    y: graph.top + placement.ratio * graph.usableHeight,
    t: frame.t,
    confidence: frame.confidence,
    hz: frame.hz,
    midi: placement.midi,
    overflow: placement.overflow,
  }
}

/** Build everything that stays fixed while the cursor remains in one page. */
export function buildReferencePitchGraphGeometry(
  frames,
  positionMs,
  durationMs,
  energySegments = [],
  stableBand = null,
) {
  const dimensions = REFERENCE_PITCH_GRAPH
  const { start, end } = stablePitchWindow(positionMs, durationMs, { windowMs: dimensions.windowMs })
  const focused = frames.filter(frame => frame.t >= start && frame.t <= end)
  const band = stableBand?.frames?.length ? stableBand : perceptualPitchBand(frames)
  const { minMidi, maxMidi } = pitchAxisForWindow(frames, focused, band)
  const graph = {
    start,
    end,
    focused,
    minMidi,
    maxMidi,
    windowMs: dimensions.windowMs,
    width: dimensions.width,
    height: dimensions.height,
    left: dimensions.left,
    right: dimensions.right,
    top: dimensions.top,
    bottom: dimensions.bottom,
    usableWidth: dimensions.width - dimensions.left - dimensions.right,
    usableHeight: dimensions.height - dimensions.top - dimensions.bottom,
  }
  const rows = []
  const rowStep = Math.max(3, Math.ceil((maxMidi - minMidi) / 36) * 3)
  for (let midi = Math.floor(maxMidi / rowStep) * rowStep; midi >= minMidi; midi -= rowStep) {
    rows.push({
      midi,
      y: graph.top + ((maxMidi - midi) / Math.max(1, maxMidi - minMidi)) * graph.usableHeight,
      label: midi % 12 === 0 ? midiToNote(midi) : '',
    })
  }
  const ridgeEdges = buildPitchRibbonEdges(focused, {
    maxGapMs: 900,
    solidGapMs: 420,
    maxJumpSemitones: 7.5,
  }).filter(edge => pitchEdgeFitsAxis(edge, minMidi, maxMidi)).map(edge => ({
    ...edge,
    from: pointForGeometry(graph, edge.from),
    to: pointForGeometry(graph, edge.to),
  }))
  const ridgeRuns = groupPitchRibbonEdges(ridgeEdges).map(run => ({
    ...run,
    path: ridgeRunPath(run.edges),
    confidence: run.edges.reduce((total, edge) => total + edge.confidence, 0) / run.edges.length,
  }))
  const connectedTimes = new Set(ridgeEdges.flatMap(edge => [edge.from.t, edge.to.t]))
  const isolatedPoints = focused.filter(frame => (
    Number(frame.confidence) >= 0.55 && !connectedTimes.has(Number(frame.t ?? frame.t_ms))
  )).map(frame => pointForGeometry(graph, frame)).filter(point => !point.overflow)
  const rhythmMarkers = selectSparsePitchRhythmMarkers(
    focused,
    energySegments,
    start,
    end,
    { limit: 5, minGapMs: 3000 },
  ).map(marker => ({
    ...pointForGeometry(graph, marker.frame),
    strength: marker.strength,
  })).filter(marker => !marker.overflow)
  const overflowMarkers = selectPitchOverflowMarkers(focused, minMidi, maxMidi).map(marker => ({
    ...pointForGeometry(graph, marker.frame),
    direction: marker.overflow,
    note: midiToNote(marker.midi),
  }))
  return {
    ...graph,
    rows,
    ridgeEdges,
    ridgeRuns,
    isolatedPoints,
    rhythmMarkers,
    overflowMarkers,
    hasFrames: focused.length > 0,
    rangeLabel: pitchRangeLabel(minMidi, maxMidi),
    focusCoverage: band.coverage,
  }
}

/** The only graph work intended to run for every animation frame. */
export function referencePitchPlayhead(graph, positionMs) {
  const position = Number(positionMs) || 0
  const cursorX = graph.left + clamp(
    (position - graph.start) / graph.windowMs,
    0,
    1,
  ) * graph.usableWidth
  const edge = edgeAt(graph.ridgeEdges || [], position)
  if (!edge) {
    return { cursorX, currentPitch: null, currentPoint: null, visualBridge: false }
  }
  const span = Math.max(1, edge.to.t - edge.from.t)
  const ratio = clamp((position - edge.from.t) / span, 0, 1)
  const midi = edge.from.midi + (edge.to.midi - edge.from.midi) * ratio
  const hz = 440 * (2 ** ((midi - 69) / 12))
  const visualBridge = Boolean(edge.bridge) && ratio > 0 && ratio < 1
  const confidence = visualBridge
    ? null
    : edge.from.confidence + (edge.to.confidence - edge.from.confidence) * ratio
  return {
    cursorX,
    currentPitch: {
      t: position,
      hz,
      confidence,
    },
    currentPoint: {
      x: edge.from.x + (edge.to.x - edge.from.x) * ratio,
      y: edge.from.y + (edge.to.y - edge.from.y) * ratio,
    },
    visualBridge,
  }
}

/** Referential cache used by the component and the synthetic call-count test. */
export function createReferencePitchGeometryCache(
  builder = ({ frames, positionMs, durationMs, energySegments, stableBand }) => (
    buildReferencePitchGraphGeometry(frames, positionMs, durationMs, energySegments, stableBand)
  ),
) {
  let cached = null
  return ({ frames, positionMs, durationMs, energySegments, stableBand }) => {
    const window = stablePitchWindow(positionMs, durationMs, {
      windowMs: REFERENCE_PITCH_GRAPH.windowMs,
    })
    if (
      cached
      && cached.frames === frames
      && cached.energySegments === energySegments
      && cached.stableBand === stableBand
      && cached.start === window.start
      && cached.end === window.end
    ) return cached.value
    const value = builder({ frames, positionMs, durationMs, energySegments, stableBand })
    cached = {
      frames,
      energySegments,
      stableBand,
      start: window.start,
      end: window.end,
      value,
    }
    return value
  }
}

import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import test from 'node:test'

import {
  buildReferencePitchGraphGeometry,
  createReferencePitchGeometryCache,
  referencePitchPlayhead,
} from './referencePitchGraph.js'
import { perceptualPitchBand } from './pitchDisplay.js'

function hzForMidi(midi) {
  return 440 * (2 ** ((midi - 69) / 12))
}

function fixtureFrames() {
  return Array.from({ length: 1200 }, (_, index) => ({
    t: index * 32,
    hz: hzForMidi(60 + Math.sin(index / 35) * 4),
    confidence: 0.82,
  }))
}

test('playhead follows drawn lines, marks short bridges, and disappears across long gaps', () => {
  const frames = [
    { t: 0, hz: hzForMidi(60), confidence: 0.9 },
    { t: 200, hz: hzForMidi(62), confidence: 0.88 },
    { t: 800, hz: hzForMidi(67), confidence: 0.84 },
    { t: 2000, hz: hzForMidi(69), confidence: 0.91 },
    { t: 2200, hz: hzForMidi(70), confidence: 0.9 },
  ]
  const graph = buildReferencePitchGraphGeometry(
    frames,
    0,
    20_000,
    [],
    perceptualPitchBand(frames),
  )

  const solid = referencePitchPlayhead(graph, 100)
  assert.ok(solid.currentPoint)
  assert.ok(Number.isFinite(solid.currentPitch.confidence))
  assert.equal(solid.visualBridge, false)
  assert.ok(Math.abs(solid.currentPoint.x - (graph.left + 100 / graph.windowMs * graph.usableWidth)) < 0.001)

  const bridge = referencePitchPlayhead(graph, 500)
  const bridgeEdge = graph.ridgeEdges.find(edge => edge.bridge)
  assert.ok(bridgeEdge)
  assert.ok(bridge.currentPoint)
  assert.equal(bridge.visualBridge, true)
  assert.equal(bridge.currentPitch.confidence, null)
  assert.ok(Math.abs(bridge.currentPoint.y - ((bridgeEdge.from.y + bridgeEdge.to.y) / 2)) < 0.001)

  const measuredBridgeEndpoint = referencePitchPlayhead(graph, 800)
  assert.equal(measuredBridgeEndpoint.visualBridge, false)
  assert.ok(Number.isFinite(measuredBridgeEndpoint.currentPitch.confidence))

  const blank = referencePitchPlayhead(graph, 1400)
  assert.equal(blank.currentPitch, null)
  assert.equal(blank.currentPoint, null)
  assert.ok(blank.cursorX > bridge.cursorX)
})

test('reliable high and low passages fit the page and isolated extremes remain visible', () => {
  const normal = Array.from({length: 40}, (_, i) => ({t:i * 100,hz:hzForMidi(60),confidence:.9}))
  const high = [{t:5000,hz:hzForMidi(96),confidence:.9},{t:5200,hz:hzForMidi(97),confidence:.9}]
  const low = {t:7000,hz:hzForMidi(33),confidence:.9}
  const graph = buildReferencePitchGraphGeometry([...normal,...high,low], 0, 40000)
  assert.equal(graph.overflowMarkers.length, 0)
  assert.ok(graph.maxMidi >= 99 && graph.minMidi <= 31)
  assert.ok(graph.ridgeEdges.some(edge => edge.from.t === 5000 && edge.to.t === 5200))
  assert.ok(graph.isolatedPoints.some(point => point.t === 7000 && point.y < graph.height - graph.bottom))
  const point = referencePitchPlayhead(graph, 5100).currentPoint
  assert.ok(point && point.y > graph.top && point.y < graph.height - graph.bottom)
  assert.ok(graph.rows.length <= 14)
  const nextPage = buildReferencePitchGraphGeometry([...normal,...high,low], 20000, 40000)
  assert.ok(nextPage.maxMidi < graph.maxMidi)
})

test('same-window cursor updates reuse one geometry build', () => {
  const frames = fixtureFrames()
  const energySegments = []
  const stableBand = perceptualPitchBand(frames)
  const positions = Array.from({ length: 120 }, (_, index) => 1000 + index * 120)

  const beforeStarted = performance.now()
  positions.forEach(positionMs => {
    buildReferencePitchGraphGeometry(frames, positionMs, 60_000, energySegments, stableBand)
  })
  const beforeMs = performance.now() - beforeStarted

  let builds = 0
  const cachedGeometry = createReferencePitchGeometryCache(args => {
    builds += 1
    return buildReferencePitchGraphGeometry(
      args.frames,
      args.positionMs,
      args.durationMs,
      args.energySegments,
      args.stableBand,
    )
  })
  const afterStarted = performance.now()
  const geometries = positions.map(positionMs => cachedGeometry({
    frames,
    positionMs,
    durationMs: 60_000,
    energySegments,
    stableBand,
  }))
  positions.forEach((positionMs, index) => referencePitchPlayhead(geometries[index], positionMs))
  const afterMs = performance.now() - afterStarted

  assert.equal(builds, 1)
  assert.ok(geometries.every(geometry => geometry === geometries[0]))

  cachedGeometry({
    frames,
    positionMs: 20_001,
    durationMs: 60_000,
    energySegments,
    stableBand,
  })
  assert.equal(builds, 2)

  console.log(JSON.stringify({
    kind: 'synthetic_same_window_comparison',
    positionUpdates: positions.length,
    beforeGeometryBuilds: positions.length,
    afterGeometryBuilds: 1,
    beforeMs: Number(beforeMs.toFixed(2)),
    afterMs: Number(afterMs.toFixed(2)),
    note: 'Synthetic call-count/timing only; not a phone browser Performance recording.',
  }))
})

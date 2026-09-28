import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPerceptualPitchContour,
  buildPitchActivityBins,
  buildPitchRibbonEdges,
  buildReferencePitchContour,
  buildSeparatedVocalPitchContour,
  combinedPitchAxis,
  groupPitchRibbonEdges,
  perceptualPitchBand,
  pitchAxisForWindow,
  pitchAxisPlacement,
  pitchEdgeFitsAxis,
  selectSparsePitchRhythmMarkers,
  selectPitchOverflowMarkers,
  splitPitchSegments,
  stablePitchWindow,
} from './pitchDisplay.js'

function hzForMidi(midi) {
  return 440 * (2 ** ((midi - 69) / 12))
}

function midiForHz(hz) {
  return 69 + 12 * Math.log2(hz / 440)
}

test('persistent pitch band ignores a smaller octave-away island', () => {
  const frames = []
  for (let index = 0; index < 40; index += 1) {
    frames.push({ t: index * 250, hz: hzForMidi(60 + (index % 5)), confidence: 0.72 })
  }
  for (let index = 0; index < 12; index += 1) {
    frames.push({ t: (index + 40) * 250, hz: hzForMidi(40 + (index % 5)), confidence: 0.8 })
  }

  const band = perceptualPitchBand(frames)

  assert.ok(band.coverage > 0.7)
  assert.ok(band.focusLowMidi >= 59.9)
  assert.ok(band.maxMidi - band.minMidi <= 16)
})

test('perceptual contour folds detector octave flips into one audible register', () => {
  const contour = buildPerceptualPitchContour([
    { t: 0, hz: hzForMidi(57), confidence: 0.82 },
    { t: 250, hz: hzForMidi(69), confidence: 0.86 },
    { t: 500, hz: hzForMidi(57), confidence: 0.8 },
    { t: 750, hz: hzForMidi(69), confidence: 0.88 },
  ])
  const midis = contour.map(frame => 69 + 12 * Math.log2(frame.hz / 440))

  assert.equal(contour.length, 4)
  assert.ok(Math.max(...midis) - Math.min(...midis) < 0.2)
  assert.ok(contour.some(frame => frame.octave_adjusted))
})

test('perceptual contour does not bridge a long detector silence', () => {
  const contour = buildPerceptualPitchContour([
    { t: 0, hz: hzForMidi(60) },
    { t: 250, hz: hzForMidi(61) },
    { t: 2500, hz: hzForMidi(72) },
  ])
  const segments = splitPitchSegments(contour, 1150, 6.5)

  assert.equal(segments.length, 2)
})

test('reference pitch window stays fixed while the cursor moves inside a page', () => {
  assert.deepEqual(stablePitchWindow(1000, 65_000), { start: 0, end: 20_000 })
  assert.deepEqual(stablePitchWindow(19_900, 65_000), { start: 0, end: 20_000 })
  assert.deepEqual(stablePitchWindow(20_000, 65_000), { start: 20_000, end: 40_000 })
  assert.deepEqual(stablePitchWindow(64_000, 65_000), { start: 45_000, end: 65_000 })
})

test('a sustained high phrase expands the fixed page axis instead of being flattened', () => {
  const lowerSongFrames = Array.from({ length: 80 }, (_, index) => ({
    t: index * 250,
    hz: hzForMidi(60 + (index % 4)),
    confidence: 0.88,
  }))
  const highPageFrames = Array.from({ length: 16 }, (_, index) => ({
    t: 20_000 + index * 250,
    hz: hzForMidi(76 + index * 0.5),
    confidence: 0.9,
  }))
  const stableBand = perceptualPitchBand([...lowerSongFrames, ...highPageFrames])
  const axis = pitchAxisForWindow(
    [...lowerSongFrames, ...highPageFrames],
    highPageFrames,
    stableBand,
  )

  assert.ok(axis.maxMidi >= 83.4)
  assert.ok(axis.maxMidi - axis.minMidi <= 36)
  assert.ok(highPageFrames.every(frame => !pitchAxisPlacement(frame, axis.minMidi, axis.maxMidi).overflow))
})

test('isolated out-of-range notes become an explicit marker and never a flat ridge edge', () => {
  const frames = [
    { t: 0, hz: hzForMidi(76), confidence: 0.9 },
    { t: 250, hz: hzForMidi(80), confidence: 0.92 },
  ]
  const edge = { from: frames[0], to: frames[1] }
  const markers = selectPitchOverflowMarkers(frames, 55, 69)

  assert.equal(pitchEdgeFitsAxis(edge, 55, 69), false)
  assert.equal(markers.length, 1)
  assert.equal(markers[0].overflow, 'high')
  assert.ok(markers[0].midi > 79.9)
})

test('a far reliable page note expands the axis instead of remaining an arrow', () => {
  const stableFrames = Array.from({ length: 24 }, (_, index) => ({
    t: index * 250,
    hz: hzForMidi(60 + (index % 3)),
    confidence: 0.88,
  }))
  const outlier = { t: 6100, hz: hzForMidi(104), confidence: 0.94 }
  const windowFrames = [...stableFrames, outlier]
  const stableBand = perceptualPitchBand(stableFrames)
  const axis = pitchAxisForWindow(windowFrames, windowFrames, stableBand)
  const markers = selectPitchOverflowMarkers(windowFrames, axis.minMidi, axis.maxMidi)

  assert.equal(pitchAxisPlacement(outlier, axis.minMidi, axis.maxMidi).overflow, null)
  assert.ok(axis.maxMidi >= 106)
  assert.equal(markers.length, 0)
})

test('perceptual smoothing covers the same time span at 250ms and 32ms cadence', () => {
  const makeFrames = stepMs => Array.from(
    { length: Math.floor(2048 / stepMs) + 1 },
    (_, index) => {
      const t = index * stepMs
      return { t, hz: hzForMidi(Math.abs(t - 1024) <= 96 ? 62 : 60), confidence: 0.9 }
    },
  )
  const sparse = buildPerceptualPitchContour(makeFrames(256))
  const dense = buildPerceptualPitchContour(makeFrames(32))
  const sparseCenter = sparse.find(frame => frame.t === 1024)
  const denseCenter = dense.find(frame => frame.t === 1024)

  assert.ok(sparseCenter)
  assert.ok(denseCenter)
  assert.ok(Math.abs(midiForHz(sparseCenter.hz) - midiForHz(denseCenter.hz)) < 0.05)
  assert.ok(midiForHz(denseCenter.hz) < 61.5)
})

test('separated-vocal contour preserves a real dense note step and glide', () => {
  const frames = Array.from({ length: 41 }, (_, index) => ({
    t: index * 32,
    hz: hzForMidi(index < 16 ? 60 : 67 + (index - 16) * 0.08),
    confidence: 0.9,
  }))
  const contour = buildReferencePitchContour(frames, 'separated_vocal_pyin')

  assert.equal(contour.length, frames.length)
  assert.ok(midiForHz(contour[15].hz) < 60.1)
  assert.ok(midiForHz(contour[16].hz) > 66.9)
  assert.ok(midiForHz(contour.at(-1).hz) > midiForHz(contour[16].hz) + 1.8)
})

test('separated-vocal contour removes only a brief octave tracker excursion', () => {
  const frames = Array.from({ length: 20 }, (_, index) => ({
    t: index * 32,
    hz: hzForMidi(index === 10 ? 72 : 60),
    confidence: 0.9,
  }))
  const contour = buildSeparatedVocalPitchContour(frames)

  assert.equal(contour.length, frames.length - 1)
  assert.ok(contour.every(frame => midiForHz(frame.hz) < 60.1))
})

test('dense separated-vocal ribbon keeps a short silence and breaks a long silence', () => {
  const frames = [
    { t: 0, hz: hzForMidi(60), confidence: 0.9 },
    { t: 32, hz: hzForMidi(60.2), confidence: 0.9 },
    { t: 352, hz: hzForMidi(61), confidence: 0.9 },
    { t: 384, hz: hzForMidi(61.2), confidence: 0.9 },
    { t: 1600, hz: hzForMidi(62), confidence: 0.9 },
  ]
  const edges = buildPitchRibbonEdges(frames, { maxGapMs: 900, solidGapMs: 420 })

  assert.equal(edges.length, 3)
  assert.equal(edges.some(edge => edge.from.t === 384 && edge.to.t === 1600), false)
})

test('two independently stable singing bands can share one comparison axis', () => {
  const reference = perceptualPitchBand([
    { t: 0, hz: hzForMidi(60) },
    { t: 250, hz: hzForMidi(62) },
    { t: 500, hz: hzForMidi(64) },
  ])
  const singer = perceptualPitchBand([
    { t: 0, hz: hzForMidi(48) },
    { t: 250, hz: hzForMidi(50) },
    { t: 500, hz: hzForMidi(52) },
  ])

  const axis = combinedPitchAxis([reference, singer])

  assert.ok(axis.minMidi <= 46)
  assert.ok(axis.maxMidi >= 66)
})

test('octave-like discontinuities break a line instead of drawing a vertical jump', () => {
  const segments = splitPitchSegments([
    { t: 0, hz: hzForMidi(60) },
    { t: 250, hz: hzForMidi(61) },
    { t: 500, hz: hzForMidi(49) },
    { t: 750, hz: hzForMidi(50) },
  ], 900)

  assert.equal(segments.length, 2)
  assert.deepEqual(segments.map(segment => segment.length), [2, 2])
})

test('a plausible sparse gap becomes a faded ridge bridge while an octave jump stays broken', () => {
  const edges = buildPitchRibbonEdges([
    { t: 0, hz: hzForMidi(60), confidence: 0.8 },
    { t: 1100, hz: hzForMidi(62), confidence: 0.75 },
    { t: 1300, hz: hzForMidi(74), confidence: 0.9 },
  ])

  assert.equal(edges.length, 1)
  assert.equal(edges[0].bridge, true)
  assert.ok(edges[0].salience > 0.35)
})

test('dense ribbon persistence uses the full millisecond neighborhood, not twelve frames', () => {
  const frames = Array.from({ length: 79 }, (_, index) => {
    const t = (index - 39) * 32
    const centralDifferentPitch = Math.abs(t) <= 384 && t !== 0 && t !== 32
    return { t, hz: hzForMidi(centralDifferentPitch ? 63 : 60), confidence: 0.9 }
  })
  const edge = buildPitchRibbonEdges(frames).find(item => item.from.t === 0 && item.to.t === 32)

  assert.ok(edge)
  assert.ok(edge.persistence > 0.9)
})

test('adjacent ridge edges become a continuous run instead of separate sample strokes', () => {
  const edges = buildPitchRibbonEdges([
    { t: 0, hz: hzForMidi(60), confidence: 0.82 },
    { t: 250, hz: hzForMidi(61), confidence: 0.8 },
    { t: 500, hz: hzForMidi(62), confidence: 0.84 },
    { t: 750, hz: hzForMidi(74), confidence: 0.9 },
    { t: 1000, hz: hzForMidi(63), confidence: 0.81 },
    { t: 1250, hz: hzForMidi(64), confidence: 0.83 },
  ])

  const runs = groupPitchRibbonEdges(edges)

  assert.equal(edges.length, 3)
  assert.deepEqual(runs.map(run => run.edges.length), [2, 1])
})

test('a plausible sparse bridge gets its own styled run without opening a coordinate gap', () => {
  const edges = buildPitchRibbonEdges([
    { t: 0, hz: hzForMidi(60), confidence: 0.82 },
    { t: 250, hz: hzForMidi(61), confidence: 0.8 },
    { t: 1350, hz: hzForMidi(62), confidence: 0.78 },
    { t: 1600, hz: hzForMidi(63), confidence: 0.83 },
  ])

  const runs = groupPitchRibbonEdges(edges)

  assert.deepEqual(runs.map(run => run.edges.length), [1, 1, 1])
  assert.deepEqual(runs.map(run => run.bridge), [false, true, false])
  assert.equal(runs[0].edges[0].to.t, runs[1].edges[0].from.t)
  assert.equal(runs[1].edges[0].to.t, runs[2].edges[0].from.t)
})

test('rhythm hints stay sparse even across a very active twenty-second window', () => {
  const frames = Array.from({ length: 81 }, (_, index) => ({
    t: index * 250,
    hz: hzForMidi(60 + Math.sin(index / 8)),
    confidence: 0.7 + (index % 7) * 0.04,
  }))
  const markers = selectSparsePitchRhythmMarkers(frames, [{
    start_ms: 0,
    end_ms: 20_001,
    level: 86,
    onsets_per_second: 2.1,
  }], 0, 20_000)

  assert.ok(markers.length > 2)
  assert.ok(markers.length <= 6)
  assert.ok(markers.every((marker, index) => (
    index === 0 || marker.time - markers[index - 1].time >= 2600
  )))
})

test('rhythm hints are omitted when the profile has no credible onset activity', () => {
  const markers = selectSparsePitchRhythmMarkers([
    { t: 1000, hz: hzForMidi(60), confidence: 0.9 },
  ], [{
    start_ms: 0,
    end_ms: 20_000,
    onsets_per_second: 0.2,
  }], 0, 20_000)

  assert.deepEqual(markers, [])
})

test('active full mix remains visible as complexity even without a stable pitch winner', () => {
  const bins = buildPitchActivityBins([], [{
    start_ms: 0,
    end_ms: 20_000,
    level: 86,
    onsets_per_second: 2.2,
  }], 0, 20_000, 8)

  assert.ok(bins.every(bin => bin.coverage === 0))
  assert.ok(bins.every(bin => bin.activity > 0.7))
  assert.ok(bins.every(bin => bin.complexity > 0.7))
})

test('activity coverage represents voiced time equally at sparse and dense cadence', () => {
  const sparse = buildPitchActivityBins([
    { t: 125, hz: hzForMidi(60), confidence: 0.9 },
    { t: 375, hz: hzForMidi(60), confidence: 0.9 },
  ], [], 0, 1000, 1)[0]
  const dense = buildPitchActivityBins(
    Array.from({ length: 16 }, (_, index) => ({
      t: 16 + index * 32,
      hz: hzForMidi(60),
      confidence: 0.9,
    })),
    [],
    0,
    1000,
    1,
  )[0]

  assert.ok(Math.abs(sparse.coverage - dense.coverage) < 0.02)
  assert.ok(sparse.coverage > 0.48 && sparse.coverage < 0.52)
})

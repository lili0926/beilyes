import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPitchRibbonEdges,
  buildReferencePitchContour,
} from './pitchDisplay.js'

function hzForMidi(midi) {
  return 440 * (2 ** ((midi - 69) / 12))
}

function centsError(actualHz, expectedHz) {
  return Math.abs(1200 * Math.log2(actualHz / expectedHz))
}

test('known step and glide retain their annotated pitch instead of a second algorithm as truth', () => {
  const annotated = Array.from({ length: 121 }, (_, index) => {
    const midi = index < 40
      ? 60
      : index < 80
        ? 67
        : 67 + ((index - 80) / 40) * 5
    return { t: index * 32, hz: hzForMidi(midi), confidence: 0.94 }
  })
  const contour = buildReferencePitchContour(annotated, 'separated_vocal_pyin')
  const errors = contour.map((frame, index) => centsError(frame.hz, annotated[index].hz))

  assert.equal(contour.length, annotated.length)
  assert.ok(Math.max(...errors) < 0.001)
  assert.ok(contour[39].hz < contour[40].hz)
  assert.ok(contour.at(-1).hz > contour[80].hz)
})

test('known silence remains a gap and is not bridged as a continuous melody', () => {
  const annotated = []
  for (let t = 0; t <= 3000; t += 32) {
    if (t >= 960 && t <= 1984) continue
    annotated.push({ t, hz: hzForMidi(t < 960 ? 60 : 64), confidence: 0.93 })
  }
  const contour = buildReferencePitchContour(annotated, 'separated_vocal_pyin')
  const edges = buildPitchRibbonEdges(contour, { maxGapMs: 900, solidGapMs: 420 })

  assert.equal(contour.some(frame => frame.t >= 960 && frame.t <= 1984), false)
  assert.equal(edges.some(edge => edge.from.t < 960 && edge.to.t > 1984), false)
})

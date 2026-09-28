import { hzToMidi, midiToNote } from './pitchDetector.js'

const PRIMARY_BAND_SEMITONES = 12
const WIDE_BAND_SEMITONES = 18
const PRIMARY_BAND_MIN_COVERAGE = 0.62
const DEFAULT_MIN_AXIS_SPAN = 14
const DEFAULT_MAX_AXIS_SPAN = 24
const AXIS_PADDING_SEMITONES = 2
const DEFAULT_FRAME_SUPPORT_MS = 250

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value))
}

function frameWeight(frame) {
  const confidence = Number(frame?.confidence)
  return Number.isFinite(confidence) ? 0.55 + clamp(confidence, 0, 1) * 0.45 : 0.82
}

function pitchItems(frames) {
  return (Array.isArray(frames) ? frames : [])
    .map(frame => ({ frame, midi: hzToMidi(Number(frame?.hz)), weight: frameWeight(frame) }))
    .filter(item => Number.isFinite(item.midi))
    .sort((left, right) => left.midi - right.midi)
}

function densestBand(items, width) {
  let right = 0
  let weight = 0
  let best = { items: [], weight: 0 }
  for (let left = 0; left < items.length; left += 1) {
    while (right < items.length && items[right].midi - items[left].midi <= width) {
      weight += items[right].weight
      right += 1
    }
    const count = right - left
    if (
      weight > best.weight + 0.0001
      || (Math.abs(weight - best.weight) <= 0.0001 && count > best.items.length)
    ) {
      best = { items: items.slice(left, right), weight }
    }
    weight -= items[left].weight
  }
  return best
}

function fitAxis(items, { minSpan = DEFAULT_MIN_AXIS_SPAN, maxSpan = DEFAULT_MAX_AXIS_SPAN } = {}) {
  if (!items.length) return { minMidi: 53, maxMidi: 67 }
  const values = items.map(item => item.midi)
  const observedLow = Math.min(...values)
  const observedHigh = Math.max(...values)
  let minMidi = Math.floor(observedLow - AXIS_PADDING_SEMITONES)
  let maxMidi = Math.ceil(observedHigh + AXIS_PADDING_SEMITONES)

  if (maxMidi - minMidi < minSpan) {
    const center = (observedLow + observedHigh) / 2
    minMidi = Math.floor(center - minSpan / 2)
    maxMidi = minMidi + minSpan
  }
  if (maxMidi - minMidi > maxSpan) {
    const center = values[Math.floor(values.length / 2)]
    minMidi = Math.floor(center - maxSpan / 2)
    maxMidi = minMidi + maxSpan
  }
  return { minMidi, maxMidi }
}

/**
 * Focus a graph on the pitch band that persists in the ear instead of letting
 * isolated bass/harmonic octave estimates stretch the whole vertical axis.
 */
export function perceptualPitchBand(frames, options = {}) {
  const items = pitchItems(frames)
  if (!items.length) {
    return {
      frames: [],
      minMidi: 53,
      maxMidi: 67,
      focusLowMidi: null,
      focusHighMidi: null,
      coverage: 0,
    }
  }

  let selected = items
  if (items.length >= 6) {
    const primary = densestBand(items, PRIMARY_BAND_SEMITONES)
    selected = primary.items.length / items.length >= PRIMARY_BAND_MIN_COVERAGE
      ? primary.items
      : densestBand(items, WIDE_BAND_SEMITONES).items
  }
  const axis = fitAxis(selected, options)
  return {
    frames: selected
      .map(item => item.frame)
      .sort((left, right) => Number(left?.t) - Number(right?.t)),
    ...axis,
    focusLowMidi: selected[0]?.midi ?? null,
    focusHighMidi: selected[selected.length - 1]?.midi ?? null,
    coverage: selected.length / items.length,
  }
}

function median(values) {
  if (!values.length) return NaN
  const ordered = [...values].sort((left, right) => left - right)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2
}

function lowerTimeBound(frames, target) {
  let low = 0
  let high = frames.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (frameTime(frames[middle]) < target) low = middle + 1
    else high = middle
  }
  return low
}

function upperTimeBound(frames, target) {
  let low = 0
  let high = frames.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (frameTime(frames[middle]) <= target) low = middle + 1
    else high = middle
  }
  return low
}

function timeWindowBounds(frames, time, radiusMs) {
  const radius = Math.max(0, Number(radiusMs) || 0)
  return [
    lowerTimeBound(frames, time - radius),
    upperTimeBound(frames, time + radius),
  ]
}

function frameSupportInterval(frames, index, maxSupportMs = DEFAULT_FRAME_SUPPORT_MS) {
  const time = frameTime(frames[index])
  const halfCap = Math.max(0, Number(maxSupportMs) || 0) / 2
  const previousTime = frameTime(frames[index - 1])
  const nextTime = frameTime(frames[index + 1])
  const previousGap = Number.isFinite(previousTime) && previousTime < time
    ? time - previousTime
    : Number.isFinite(nextTime) && nextTime > time ? nextTime - time : halfCap * 2
  const nextGap = Number.isFinite(nextTime) && nextTime > time
    ? nextTime - time
    : Number.isFinite(previousTime) && previousTime < time ? time - previousTime : halfCap * 2
  return {
    start: time - Math.min(halfCap, previousGap / 2),
    end: time + Math.min(halfCap, nextGap / 2),
  }
}

function overlapMs(leftStart, leftEnd, rightStart, rightEnd) {
  return Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart))
}

function removeShortPitchSpikes(frames, maxSpikeMs) {
  const keep = frames.map(() => true)
  for (let start = 1; start < frames.length - 1; start += 1) {
    const leftMidi = hzToMidi(Number(frames[start - 1].hz))
    const firstMidi = hzToMidi(Number(frames[start].hz))
    if (!Number.isFinite(leftMidi) || !Number.isFinite(firstMidi)
      || Math.abs(firstMidi - leftMidi) <= 6.5) continue
    for (let end = start + 1; end < frames.length; end += 1) {
      if (frameTime(frames[end]) - frameTime(frames[start - 1]) > maxSpikeMs) break
      const rightMidi = hzToMidi(Number(frames[end].hz))
      if (!Number.isFinite(rightMidi) || Math.abs(rightMidi - leftMidi) > 3.5) continue
      const isSpike = frames.slice(start, end).every(frame => {
        const midi = hzToMidi(Number(frame.hz))
        return Number.isFinite(midi)
          && Math.abs(midi - leftMidi) > 6.5
          && Math.abs(midi - rightMidi) > 6.5
      })
      if (isSpike) {
        for (let cursor = start; cursor < end; cursor += 1) keep[cursor] = false
        start = end - 1
      }
      break
    }
  }
  return frames.filter((_, index) => keep[index])
}

/**
 * Turn independent full-mix pitch winners into the relative contour a listener
 * can actually follow. Autocorrelation often alternates between one note and
 * its harmonic/bass octave; fold those equivalent estimates into the persistent
 * register, prefer temporal continuity, then remove one-frame spikes. This does
 * not claim vocal isolation—it only stops detector octave errors becoming the
 * main visual story.
 */
export function buildPerceptualPitchContour(frames, {
  resetGapMs = 1200,
  maxInstantJumpSemitones = 8,
  spikeWindowMs = 900,
  smoothingWindowMs = 560,
} = {}) {
  const ordered = (Array.isArray(frames) ? frames : [])
    .filter(frame => Number.isFinite(frameTime(frame)) && Number(frame?.hz) > 0)
    .sort((left, right) => frameTime(left) - frameTime(right))
  if (ordered.length < 2) return ordered

  const persistent = perceptualPitchBand(ordered).frames
  const persistentMidis = persistent.map(frame => hzToMidi(Number(frame.hz))).filter(Number.isFinite)
  const registerCenter = median(persistentMidis)
  if (!Number.isFinite(registerCenter)) return ordered

  const folded = []
  let previousMidi = NaN
  let previousTime = NaN
  for (const frame of ordered) {
    const time = frameTime(frame)
    const rawMidi = hzToMidi(Number(frame.hz))
    if (!Number.isFinite(rawMidi)) continue
    if (Number.isFinite(previousTime) && time - previousTime > resetGapMs) previousMidi = NaN

    const candidates = [-36, -24, -12, 0, 12, 24, 36]
      .map(offset => rawMidi + offset)
      .filter(midi => Math.abs(midi - registerCenter) <= 13)
    if (!candidates.length) continue
    const target = Number.isFinite(previousMidi) ? previousMidi : registerCenter
    let selected = candidates[0]
    let bestCost = Infinity
    candidates.forEach(candidate => {
      const continuityCost = Math.abs(candidate - target)
      const registerCost = Math.abs(candidate - registerCenter) * 0.2
      const cost = continuityCost + registerCost
      if (cost < bestCost) {
        bestCost = cost
        selected = candidate
      }
    })
    const gap = Number.isFinite(previousTime) ? time - previousTime : Infinity
    if (Number.isFinite(previousMidi)
      && gap <= 520
      && Math.abs(selected - previousMidi) > maxInstantJumpSemitones) continue
    folded.push({
      ...frame,
      t: time,
      hz: 440 * (2 ** ((selected - 69) / 12)),
      raw_hz: Number(frame.hz),
      octave_adjusted: Math.abs(selected - rawMidi) >= 11.5,
    })
    previousMidi = selected
    previousTime = time
  }

  const withoutSpikes = removeShortPitchSpikes(folded, Math.max(0, Number(spikeWindowMs) || 0))

  return withoutSpikes.map((frame, index) => {
    const [start, end] = timeWindowBounds(withoutSpikes, frame.t, smoothingWindowMs)
    const local = withoutSpikes
      .slice(start, end)
      .map(other => hzToMidi(other.hz))
      .filter(Number.isFinite)
    const current = hzToMidi(frame.hz)
    const localMedian = median(local)
    const smoothed = Number.isFinite(localMedian) && Math.abs(localMedian - current) <= 4.5
      ? current * 0.68 + localMedian * 0.32
      : current
    return { ...frame, hz: 440 * (2 ** ((smoothed - 69) / 12)) }
  })
}

/**
 * Keep trusted separated-vocal pYIN motion nearly raw. Unlike the full-mix
 * detector, this source must not be folded into a preferred octave or median
 * smoothed: real note changes, slides, and vibrato are product information.
 * Only a very short excursion that returns to the surrounding pitch is
 * removed as a likely tracker octave glitch.
 */
export function buildSeparatedVocalPitchContour(frames, { spikeWindowMs = 160 } = {}) {
  const ordered = (Array.isArray(frames) ? frames : [])
    .filter(frame => Number.isFinite(frameTime(frame)) && Number(frame?.hz) > 0)
    .sort((left, right) => frameTime(left) - frameTime(right))
  return removeShortPitchSpikes(ordered, Math.max(0, Number(spikeWindowMs) || 0))
}

export function buildReferencePitchContour(frames, source) {
  return source === 'separated_vocal_pyin'
    ? buildSeparatedVocalPitchContour(frames)
    : buildPerceptualPitchContour(frames)
}

export function combinedPitchAxis(bands, options = {}) {
  const selectedFrames = (Array.isArray(bands) ? bands : [])
    .flatMap(band => Array.isArray(band?.frames) ? band.frames : [])
  return fitAxis(pitchItems(selectedFrames), {
    minSpan: options.minSpan ?? DEFAULT_MIN_AXIS_SPAN,
    maxSpan: options.maxSpan ?? 36,
  })
}

/**
 * Keep one axis per fixed page, but fit every reliable point in that page.
 * The robust song/page focus provides a readable baseline, not a hard crop.
 * Cursor movement alone never changes this range. Even a sparse extreme
 * is shown at its height rather than being replaced by an overflow arrow.
 */
export function pitchAxisForWindow(allFrames, windowFrames, stableBand = null, options = {}) {
  const songBand = stableBand?.frames?.length
    ? stableBand
    : perceptualPitchBand(allFrames, options)
  const pageBand = perceptualPitchBand(windowFrames, options)
  if (!pageBand.frames.length) {
    return { minMidi: songBand.minMidi, maxMidi: songBand.maxMidi }
  }
  const axis = combinedPitchAxis([songBand, pageBand], {
    minSpan: options.minSpan ?? DEFAULT_MIN_AXIS_SPAN,
    maxSpan: options.maxSpan ?? 36,
  })
  for (const item of pitchItems(windowFrames)) {
    const confidence = Number(item.frame?.confidence)
    if (!Number.isFinite(confidence) || confidence < 0.55) continue
    axis.minMidi = Math.min(axis.minMidi, Math.floor(item.midi - AXIS_PADDING_SEMITONES))
    axis.maxMidi = Math.max(axis.maxMidi, Math.ceil(item.midi + AXIS_PADDING_SEMITONES))
  }
  return axis
}

export function pitchAxisPlacement(frame, minMidi, maxMidi) {
  const midi = hzToMidi(Number(frame?.hz))
  if (!Number.isFinite(midi) || !Number.isFinite(minMidi) || !Number.isFinite(maxMidi) || maxMidi <= minMidi) {
    return { midi, ratio: NaN, overflow: null, overflowSemitones: 0 }
  }
  const overflow = midi > maxMidi ? 'high' : midi < minMidi ? 'low' : null
  const boundary = overflow === 'high' ? maxMidi : overflow === 'low' ? minMidi : midi
  return {
    midi,
    ratio: clamp((maxMidi - boundary) / (maxMidi - minMidi), 0, 1),
    overflow,
    overflowSemitones: overflow === 'high' ? midi - maxMidi : overflow === 'low' ? minMidi - midi : 0,
  }
}

export function pitchEdgeFitsAxis(edge, minMidi, maxMidi) {
  return Boolean(edge?.from && edge?.to)
    && !pitchAxisPlacement(edge.from, minMidi, maxMidi).overflow
    && !pitchAxisPlacement(edge.to, minMidi, maxMidi).overflow
}

export function pitchRangeLabel(lowMidi, highMidi) {
  if (!Number.isFinite(lowMidi) || !Number.isFinite(highMidi)) return ''
  return `${midiToNote(lowMidi)}–${midiToNote(highMidi)}`
}

export function splitPitchSegments(frames, maxGapMs, maxJumpSemitones = 7.5) {
  const segments = []
  let segment = []
  ;(Array.isArray(frames) ? frames : []).forEach(frame => {
    const previous = segment[segment.length - 1]
    const gap = previous ? Number(frame?.t) - Number(previous?.t) : 0
    const jump = previous
      ? Math.abs(hzToMidi(Number(frame?.hz)) - hzToMidi(Number(previous?.hz)))
      : 0
    if (previous && (gap > maxGapMs || !Number.isFinite(jump) || jump > maxJumpSemitones)) {
      if (segment.length) segments.push(segment)
      segment = []
    }
    segment.push(frame)
  })
  if (segment.length) segments.push(segment)
  return segments
}

function frameTime(frame) {
  const value = Number(frame?.t ?? frame?.t_ms)
  return Number.isFinite(value) ? value : NaN
}

/**
 * Collapse a run of reliable out-of-range frames into one boundary marker.
 * The most extreme frame represents the run, so an excursion is disclosed
 * without drawing several different pitches as one false horizontal note.
 */
export function selectPitchOverflowMarkers(frames, minMidi, maxMidi, {
  minConfidence = 0.55,
  mergeGapMs = 700,
  limit = 8,
} = {}) {
  const candidates = (Array.isArray(frames) ? frames : [])
    .map(frame => {
      const placement = pitchAxisPlacement(frame, minMidi, maxMidi)
      return {
        frame,
        t: frameTime(frame),
        confidence: clamp(Number(frame?.confidence) || 0, 0, 1),
        ...placement,
      }
    })
    .filter(item => (
      Number.isFinite(item.t)
      && item.overflow
      && item.confidence >= minConfidence
    ))
    .sort((left, right) => left.t - right.t)

  const groups = []
  candidates.forEach(candidate => {
    const group = groups[groups.length - 1]
    if (group && group.overflow === candidate.overflow && candidate.t - group.lastTime <= mergeGapMs) {
      group.lastTime = candidate.t
      if (candidate.overflowSemitones > group.marker.overflowSemitones) group.marker = candidate
      return
    }
    groups.push({
      overflow: candidate.overflow,
      lastTime: candidate.t,
      marker: candidate,
    })
  })
  return groups.slice(0, Math.max(0, Math.min(12, Number(limit) || 0))).map(group => group.marker)
}

/**
 * Keep the plotted song segment fixed while its playback cursor moves. A
 * continuously sliding window changes every x coordinate on every clock tick
 * and makes a stable melody look as if it is being redrawn.
 */
export function stablePitchWindow(positionMs, durationMs, { windowMs = 20_000 } = {}) {
  const width = Math.max(1000, Number(windowMs) || 20_000)
  const duration = Math.max(width, Number(durationMs) || 0)
  const position = clamp(Number(positionMs) || 0, 0, duration)
  const maxStart = Math.max(0, duration - width)
  const pageStart = Math.floor(position / width) * width
  const start = Math.min(maxStart, pageStart)
  return { start, end: start + width }
}

/**
 * Build short ridge edges instead of an all-or-nothing polyline.  A longer
 * but plausible gap becomes a faded bridge; octave-like jumps still break.
 * Width/opacity can then follow confidence and local persistence per edge.
 */
export function buildPitchRibbonEdges(frames, {
  maxGapMs = 1700,
  solidGapMs = 720,
  maxJumpSemitones = 7.5,
  neighborhoodMs = 1250,
  persistenceMs = 1750,
  maxFrameSupportMs = DEFAULT_FRAME_SUPPORT_MS,
} = {}) {
  const ordered = (Array.isArray(frames) ? frames : [])
    .filter(frame => Number.isFinite(frameTime(frame)) && Number(frame?.hz) > 0)
    .sort((left, right) => frameTime(left) - frameTime(right))
  const supportIntervals = ordered.map((_, index) => (
    frameSupportInterval(ordered, index, maxFrameSupportMs)
  ))
  const localPersistence = ordered.map((frame) => {
    const time = frameTime(frame)
    const midi = hzToMidi(Number(frame.hz))
    const [start, end] = timeWindowBounds(ordered, time, neighborhoodMs)
    const windowStart = time - Math.max(0, Number(neighborhoodMs) || 0)
    const windowEnd = time + Math.max(0, Number(neighborhoodMs) || 0)
    let supportedMs = 0
    for (let cursor = start; cursor < end; cursor += 1) {
      const other = ordered[cursor]
      if (Math.abs(hzToMidi(Number(other.hz)) - midi) <= 2.4) {
        const support = supportIntervals[cursor]
        supportedMs += overlapMs(support.start, support.end, windowStart, windowEnd)
      }
    }
    return clamp(supportedMs / Math.max(1, Number(persistenceMs) || 1), 0, 1)
  })
  const edges = []
  for (let index = 1; index < ordered.length; index += 1) {
    const from = ordered[index - 1]
    const to = ordered[index]
    const gapMs = frameTime(to) - frameTime(from)
    const jump = Math.abs(hzToMidi(Number(to.hz)) - hzToMidi(Number(from.hz)))
    if (gapMs <= 0 || gapMs > maxGapMs || !Number.isFinite(jump) || jump > maxJumpSemitones) continue
    const confidence = clamp((frameWeight(from) + frameWeight(to) - 1.1) / 0.9, 0, 1)
    const persistence = (localPersistence[index - 1] + localPersistence[index]) / 2
    const bridge = gapMs > solidGapMs
    const salience = clamp(confidence * 0.46 + persistence * 0.54, 0, 1)
    edges.push({ from, to, gapMs, jumpSemitones: jump, confidence, persistence, salience, bridge })
  }
  return edges
}

/**
 * Merge adjacent ribbon edges into continuous runs so the rendered contour
 * reads as a flowing phrase rather than a chain of individual samples.
 * Real gaps and rejected octave-like jumps still begin a new run.
 */
export function groupPitchRibbonEdges(edges) {
  const runs = []
  ;(Array.isArray(edges) ? edges : []).forEach(edge => {
    if (!edge?.from || !edge?.to) return
    const previousRun = runs[runs.length - 1]
    const previousEdge = previousRun?.edges?.[previousRun.edges.length - 1]
    const continues = previousEdge
      && frameTime(previousEdge.to) === frameTime(edge.from)
      && Boolean(previousEdge.bridge) === Boolean(edge.bridge)
    if (continues) {
      previousRun.edges.push(edge)
      return
    }
    runs.push({ edges: [edge] })
  })
  return runs.map(run => ({
    ...run,
    bridge: run.edges.every(edge => Boolean(edge.bridge)),
  }))
}

/**
 * Pick a handful of stable contour points inside onset-active regions.  The
 * profile only carries onset density, not an exact drum transcript, so these
 * are intentionally sparse rhythm hints rather than claimed beat timestamps.
 */
export function selectSparsePitchRhythmMarkers(
  frames,
  energySegments,
  startMs,
  endMs,
  {
    limit = 6,
    minGapMs = 2600,
    minOnsetsPerSecond = 0.45,
  } = {},
) {
  const start = Number(startMs) || 0
  const end = Math.max(start + 1, Number(endMs) || start + 1)
  const safeLimit = Math.max(0, Math.min(8, Math.round(Number(limit) || 0)))
  if (!safeLimit) return []
  const segments = (Array.isArray(energySegments) ? energySegments : [])
    .map(segment => ({
      startMs: Number(segment?.start_ms),
      endMs: Number(segment?.end_ms),
      onsetsPerSecond: Number(segment?.onsets_per_second),
    }))
    .filter(segment => (
      Number.isFinite(segment.startMs)
      && Number.isFinite(segment.endMs)
      && segment.endMs > segment.startMs
      && Number.isFinite(segment.onsetsPerSecond)
      && segment.onsetsPerSecond >= minOnsetsPerSecond
    ))
  if (!segments.length) return []

  const candidates = (Array.isArray(frames) ? frames : []).flatMap(frame => {
    const time = frameTime(frame)
    if (!Number.isFinite(time) || time < start || time > end) return []
    const overlapping = segments.filter(segment => time >= segment.startMs && time < segment.endMs)
    if (!overlapping.length) return []
    const onsetsPerSecond = Math.max(...overlapping.map(segment => segment.onsetsPerSecond))
    const confidence = clamp(Number(frame?.confidence) || 0, 0, 1)
    if (confidence < 0.45) return []
    return [{
      frame,
      time,
      onsetsPerSecond,
      strength: clamp(onsetsPerSecond / 2.4, 0, 1) * (0.42 + confidence * 0.58),
    }]
  })
  candidates.sort((left, right) => right.strength - left.strength || left.time - right.time)

  const selected = []
  for (const candidate of candidates) {
    if (selected.every(item => Math.abs(item.time - candidate.time) >= minGapMs)) {
      selected.push(candidate)
      if (selected.length >= safeLimit) break
    }
  }
  return selected.sort((left, right) => left.time - right.time)
}

/**
 * Combine stable-pitch coverage with the sidecar's full-mix energy/onset
 * outline.  High activity with little stable F0 is intentionally represented
 * as complexity, not as an invented melody point.
 */
export function buildPitchActivityBins(
  frames,
  energySegments,
  startMs,
  endMs,
  count = 40,
) {
  const safeCount = Math.max(1, Math.min(120, Math.round(Number(count) || 40)))
  const start = Number(startMs) || 0
  const end = Math.max(start + 1, Number(endMs) || start + 1)
  const width = (end - start) / safeCount
  const validFrames = (Array.isArray(frames) ? frames : [])
    .filter(frame => Number.isFinite(frameTime(frame)) && frameTime(frame) >= start && frameTime(frame) <= end)
    .sort((left, right) => frameTime(left) - frameTime(right))
  const supportIntervals = validFrames.map((_, index) => frameSupportInterval(validFrames, index))
  const segments = (Array.isArray(energySegments) ? energySegments : []).filter(segment => (
    Number.isFinite(Number(segment?.start_ms))
    && Number.isFinite(Number(segment?.end_ms))
    && Number(segment.end_ms) > Number(segment.start_ms)
  ))
  return Array.from({ length: safeCount }, (_, index) => {
    const binStart = start + index * width
    const binEnd = index === safeCount - 1 ? end : binStart + width
    const binFrames = validFrames.filter(frame => frameTime(frame) >= binStart && frameTime(frame) < binEnd)
    const coveredMs = validFrames.reduce((total, _frame, frameIndex) => {
      const support = supportIntervals[frameIndex]
      return total + overlapMs(support.start, support.end, binStart, binEnd)
    }, 0)
    const coverage = clamp(coveredMs / Math.max(1, binEnd - binStart), 0, 1)
    const confidence = binFrames.length
      ? binFrames.reduce((total, frame) => total + clamp(Number(frame?.confidence) || 0, 0, 1), 0) / binFrames.length
      : 0
    const overlapping = segments.filter(segment => (
      Number(segment.end_ms) > binStart && Number(segment.start_ms) < binEnd
    ))
    const energy = overlapping.length
      ? clamp(overlapping.reduce((total, segment) => total + Number(segment.level || 0), 0) / overlapping.length / 100, 0, 1)
      : coverage * confidence
    const onset = overlapping.length
      ? clamp(overlapping.reduce((total, segment) => total + Number(segment.onsets_per_second || 0), 0) / overlapping.length / 2.4, 0, 1)
      : 0
    const clarity = clamp(coverage * (0.35 + confidence * 0.65), 0, 1)
    const activity = clamp(energy * 0.6 + onset * 0.25 + coverage * 0.15, 0, 1)
    const complexity = clamp(onset * 0.48 + Math.max(0, energy - clarity) * 0.62, 0, 1)
    return { index, startMs: binStart, endMs: binEnd, coverage, confidence, clarity, energy, onset, activity, complexity }
  })
}

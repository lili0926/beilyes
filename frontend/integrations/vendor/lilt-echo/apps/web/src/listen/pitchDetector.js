// Lightweight, dependency-free F0 helpers shared by live music features.
//
// The detector deliberately works on a short microphone window. It is not a
// song-key detector: accompaniment and room echo can contain many pitches at
// once, while this is tuned for the single, dominant voice a singer produces.

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function hzToMidi(hz) {
  const value = Number(hz)
  if (!Number.isFinite(value) || value <= 0) return null
  return 69 + 12 * Math.log2(value / 440)
}

export function midiToNote(midi) {
  const value = Number(midi)
  if (!Number.isFinite(value)) return ''
  const rounded = Math.round(value)
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`
}

export function hzToNote(hz) {
  return midiToNote(hzToMidi(hz))
}

export function centsFromNearestNote(hz) {
  const midi = hzToMidi(hz)
  if (midi === null) return null
  return Math.round((midi - Math.round(midi)) * 100)
}

export function signalRms(samples) {
  if (!samples?.length) return 0
  let sum = 0
  for (let index = 0; index < samples.length; index += 1) {
    sum += samples[index] * samples[index]
  }
  return Math.sqrt(sum / samples.length)
}

/**
 * Estimate the fundamental frequency of a mostly monophonic signal.
 *
 * Normalized autocorrelation is inexpensive enough for a mobile browser when
 * sampled at ~9 Hz, and unlike an FFT peak it gives a useful musical F0 for a
 * sustained sung note. Samples are walked at a stride of two to keep the UI
 * responsive on older iPhones.
 */
export function detectPitch(samples, sampleRate, options = {}) {
  const minHz = Number(options.minHz) || 70
  const maxHz = Number(options.maxHz) || 1050
  const minConfidence = Number(options.minConfidence) || 0.58
  const configuredMinRms = Number(options.minRms)
  const minRms = Number.isFinite(configuredMinRms) && configuredMinRms >= 0 ? configuredMinRms : 0.008
  const stride = Math.max(1, Math.floor(Number(options.stride) || 2))
  const length = samples?.length || 0
  const rate = Number(sampleRate)
  if (!length || !Number.isFinite(rate) || rate <= 0 || minHz <= 0 || maxHz <= minHz) return null

  let mean = 0
  for (let index = 0; index < length; index += 1) mean += samples[index]
  mean /= length

  let energy = 0
  for (let index = 0; index < length; index += 1) {
    const value = samples[index] - mean
    energy += value * value
  }
  const rms = Math.sqrt(energy / length)
  // This rejects silence and quiet HVAC/background noise before the expensive
  // correlation loop, and avoids drawing a misleading random pitch line.
  if (rms < minRms) return null

  const minLag = Math.max(2, Math.floor(rate / maxHz))
  const maxLag = Math.min(length - 3, Math.ceil(rate / minHz))
  if (maxLag <= minLag + 2) return null

  const scores = new Float32Array(maxLag + 1)
  let bestLag = 0
  let bestScore = -1
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0
    let leftEnergy = 0
    let rightEnergy = 0
    for (let index = 0; index + lag < length; index += stride) {
      const left = samples[index] - mean
      const right = samples[index + lag] - mean
      correlation += left * right
      leftEnergy += left * left
      rightEnergy += right * right
    }
    const score = correlation / Math.sqrt(leftEnergy * rightEnergy || 1)
    scores[lag] = score
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }
  if (bestScore < minConfidence || !bestLag) return null

  // A clean tone has equally strong autocorrelation peaks at its harmonics.
  // Prefer the first local peak close to the global one so a 440 Hz note does
  // not occasionally get rendered as a lower octave.
  const nearBest = Math.max(minConfidence, bestScore * 0.92)
  let selectedLag = bestLag
  for (let lag = minLag + 1; lag < maxLag; lag += 1) {
    if (scores[lag] >= nearBest && scores[lag] >= scores[lag - 1] && scores[lag] >= scores[lag + 1]) {
      selectedLag = lag
      break
    }
  }

  // Parabolic interpolation makes the displayed Hertz value much less jumpy
  // than integer-lag output, without pretending to have studio precision.
  const previous = scores[selectedLag - 1] || scores[selectedLag]
  const current = scores[selectedLag]
  const next = scores[selectedLag + 1] || current
  const denominator = previous - 2 * current + next
  const offset = denominator ? Math.max(-0.5, Math.min(0.5, (previous - next) / (2 * denominator))) : 0
  const hz = rate / (selectedLag + offset)
  if (!Number.isFinite(hz) || hz < minHz || hz > maxHz) return null

  return { hz, confidence: bestScore, rms }
}

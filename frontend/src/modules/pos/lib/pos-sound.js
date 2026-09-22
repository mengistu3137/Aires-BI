function createAudioContext() {
  if (typeof window === 'undefined') return null

  const AudioContextImpl = window.AudioContext || window.webkitAudioContext
  if (!AudioContextImpl) return null

  try {
    return new AudioContextImpl()
  } catch {
    return null
  }
}

function playTone(sequence, { duration = 120, type = 'sine', volume = 0.06 } = {}) {
  const audioContext = createAudioContext()
  if (!audioContext) return

  const startAt = audioContext.currentTime

  sequence.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency
    gainNode.gain.value = volume

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    const offset = index * (duration / 1000) * 0.75
    const endAt = startAt + offset + duration / 1000

    gainNode.gain.setValueAtTime(volume, startAt + offset)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt)

    oscillator.start(startAt + offset)
    oscillator.stop(endAt)
  })
}

export function playTapSound() {
  playTone([520], { duration: 70, type: 'triangle', volume: 0.03 })
}

export function playSuccessSound() {
  playTone([520, 740, 1040], { duration: 110, type: 'triangle', volume: 0.05 })
}

export function playErrorSound() {
  playTone([280, 220], { duration: 150, type: 'sawtooth', volume: 0.04 })
}

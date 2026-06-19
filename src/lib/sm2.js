/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * Quality ratings:
 * 0-2: Incorrect (reset streak)
 * 3-5: Correct (varying degrees of confidence)
 */

export const SM2_DEFAULTS = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
}

export function calculateSM2(quality, current = SM2_DEFAULTS) {
  let { easeFactor, interval, repetitions } = current

  // Quality 0-2 = incorrect, reset
  if (quality < 3) {
    return {
      easeFactor,
      interval: 0,
      repetitions: 0,
      nextDue: new Date(), // Due immediately
    }
  }

  // Correct answer - update based on SM-2
  repetitions += 1

  if (repetitions === 1) {
    interval = 1
  } else if (repetitions === 2) {
    interval = 6
  } else {
    interval = Math.round(interval * easeFactor)
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )

  const nextDue = new Date()
  nextDue.setDate(nextDue.getDate() + interval)

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextDue,
  }
}

/**
 * Get cards due for review, prioritized by overdue status and ease factor
 */
export function getCardsForSession(progress, cards, sessionSize) {
  const now = new Date()
  
  // Sort cards by priority
  const sortedCards = [...cards].sort((a, b) => {
    const progressA = progress[a.id] || {}
    const progressB = progress[b.id] || {}
    
    const dueA = progressA.next_due ? new Date(progressA.next_due) : new Date(0)
    const dueB = progressB.next_due ? new Date(progressB.next_due) : new Date(0)
    
    // First, prioritize overdue cards
    const overdueA = dueA <= now
    const overdueB = dueB <= now
    
    if (overdueA && !overdueB) return -1
    if (!overdueA && overdueB) return 1
    
    // Then, prioritize cards never seen
    const seenA = progressA.times_shown || 0
    const seenB = progressB.times_shown || 0
    
    if (seenA === 0 && seenB > 0) return -1
    if (seenA > 0 && seenB === 0) return 1
    
    // Then by due date
    return dueA - dueB
  })
  
  return sortedCards.slice(0, sessionSize)
}

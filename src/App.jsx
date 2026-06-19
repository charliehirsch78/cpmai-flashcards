import { useState, useEffect, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import Session from './components/Session'
import { 
  getDeviceId, 
  isSupabaseConfigured,
  syncProgressToCloud,
  fetchProgressFromCloud,
  saveSessionToCloud,
  fetchSessionsFromCloud
} from './lib/supabase'
import cardsData from './data/cards.json'

function App() {
  const [view, setView] = useState('dashboard') // 'dashboard' | 'session'
  const [sessionSize, setSessionSize] = useState(10)
  const [sessionCards, setSessionCards] = useState([])
  const [deviceId] = useState(() => getDeviceId())
  const [syncStatus, setSyncStatus] = useState('idle') // 'idle' | 'syncing' | 'synced' | 'error'
  const [lastSyncTime, setLastSyncTime] = useState(null)
  
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem(`cpmai_progress_${deviceId}`)
    return saved ? JSON.parse(saved) : {}
  })
  const [sessionHistory, setSessionHistory] = useState(() => {
    const saved = localStorage.getItem(`cpmai_sessions_${deviceId}`)
    return saved ? JSON.parse(saved) : []
  })
  
  const cards = cardsData.cards
  const cloudEnabled = isSupabaseConfigured()

  // Sync from cloud on mount
  useEffect(() => {
    if (cloudEnabled) {
      syncFromCloud()
    }
  }, [cloudEnabled])

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`cpmai_progress_${deviceId}`, JSON.stringify(progress))
  }, [progress, deviceId])

  // Save session history to localStorage
  useEffect(() => {
    localStorage.setItem(`cpmai_sessions_${deviceId}`, JSON.stringify(sessionHistory))
  }, [sessionHistory, deviceId])

  // Sync from cloud
  const syncFromCloud = useCallback(async () => {
    if (!cloudEnabled) return
    
    setSyncStatus('syncing')
    try {
      // Fetch progress
      const progressResult = await fetchProgressFromCloud(deviceId)
      if (progressResult.success && progressResult.data) {
        // Merge cloud data with local (cloud wins for conflicts based on last_shown)
        setProgress(prev => {
          const merged = { ...prev }
          Object.entries(progressResult.data).forEach(([cardId, cloudData]) => {
            const local = prev[cardId]
            if (!local || !local.last_shown || 
                (cloudData.last_shown && new Date(cloudData.last_shown) > new Date(local.last_shown))) {
              merged[cardId] = cloudData
            }
          })
          return merged
        })
      }

      // Fetch sessions
      const sessionsResult = await fetchSessionsFromCloud(deviceId)
      if (sessionsResult.success && sessionsResult.data) {
        setSessionHistory(prev => {
          // Merge unique sessions
          const existingIds = new Set(prev.map(s => s.id))
          const newSessions = sessionsResult.data.filter(s => !existingIds.has(s.id))
          return [...newSessions, ...prev].slice(0, 100)
        })
      }

      setSyncStatus('synced')
      setLastSyncTime(new Date())
    } catch (error) {
      console.error('Sync from cloud failed:', error)
      setSyncStatus('error')
    }
  }, [cloudEnabled, deviceId])

  // Sync to cloud
  const syncToCloud = useCallback(async () => {
    if (!cloudEnabled) return
    
    setSyncStatus('syncing')
    try {
      await syncProgressToCloud(deviceId, progress)
      setSyncStatus('synced')
      setLastSyncTime(new Date())
    } catch (error) {
      console.error('Sync to cloud failed:', error)
      setSyncStatus('error')
    }
  }, [cloudEnabled, deviceId, progress])

  const startSession = (size) => {
    setSessionSize(size)
    
    // Get cards for session using SM-2 prioritization
    const now = new Date()
    const sortedCards = [...cards].sort((a, b) => {
      const pa = progress[a.id] || {}
      const pb = progress[b.id] || {}
      
      // Prioritize: unseen > overdue > by due date
      const seenA = pa.times_shown || 0
      const seenB = pb.times_shown || 0
      if (seenA === 0 && seenB > 0) return -1
      if (seenA > 0 && seenB === 0) return 1
      
      const dueA = pa.next_due ? new Date(pa.next_due) : new Date(0)
      const dueB = pb.next_due ? new Date(pb.next_due) : new Date(0)
      return dueA - dueB
    })
    
    setSessionCards(sortedCards.slice(0, size))
    setView('session')
  }

  const endSession = async (results) => {
    // Update progress based on results
    const newProgress = { ...progress }
    
    results.forEach(({ cardId, correct, skipped }) => {
      const current = newProgress[cardId] || {
        correct_streak: 0,
        times_shown: 0,
        times_correct: 0,
        ease_factor: 2.5,
        interval_days: 0,
      }
      
      if (skipped) {
        // Don't update if skipped
        return
      }
      
      const timesShown = (current.times_shown || 0) + 1
      const timesCorrect = (current.times_correct || 0) + (correct ? 1 : 0)
      let correctStreak = correct ? (current.correct_streak || 0) + 1 : 0
      
      // Calculate SM-2 values
      const quality = correct ? 4 : 1 // Simplified: correct=4, incorrect=1
      let easeFactor = current.ease_factor || 2.5
      let interval = current.interval_days || 0
      let repetitions = correctStreak
      
      if (!correct) {
        interval = 0
        repetitions = 0
      } else {
        if (repetitions === 1) interval = 1
        else if (repetitions === 2) interval = 6
        else interval = Math.round(interval * easeFactor)
        
        easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      }
      
      const nextDue = new Date()
      nextDue.setDate(nextDue.getDate() + interval)
      
      newProgress[cardId] = {
        correct_streak: correctStreak,
        times_shown: timesShown,
        times_correct: timesCorrect,
        ease_factor: Math.round(easeFactor * 100) / 100,
        interval_days: interval,
        next_due: nextDue.toISOString(),
        last_shown: new Date().toISOString(),
      }
    })
    
    setProgress(newProgress)
    
    // Record session
    const sessionResult = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      cards_shown: results.length,
      cards_correct: results.filter(r => r.correct && !r.skipped).length,
      cards_incorrect: results.filter(r => !r.correct && !r.skipped).length,
      cards_skipped: results.filter(r => r.skipped).length,
    }
    setSessionHistory([sessionResult, ...sessionHistory].slice(0, 100))
    
    // Sync to cloud if enabled
    if (cloudEnabled) {
      await syncProgressToCloud(deviceId, newProgress)
      await saveSessionToCloud(deviceId, sessionResult)
      setLastSyncTime(new Date())
    }
    
    setView('dashboard')
  }

  if (view === 'session') {
    return (
      <Session 
        cards={sessionCards} 
        onEnd={endSession}
        progress={progress}
      />
    )
  }

  return (
    <Dashboard 
      cards={cards}
      progress={progress}
      sessionHistory={sessionHistory}
      onStartSession={startSession}
      domains={cardsData.metadata.domains}
      cloudEnabled={cloudEnabled}
      syncStatus={syncStatus}
      lastSyncTime={lastSyncTime}
      onSync={syncToCloud}
    />
  )
}

export default App

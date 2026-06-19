import { useState } from 'react'
import { BookOpen, Trophy, Target, TrendingUp, Play, Cloud, CloudOff, RefreshCw } from 'lucide-react'

const DOMAIN_COLORS = {
  'I': 'bg-blue-500',
  'II': 'bg-green-500', 
  'III': 'bg-amber-500',
  'IV': 'bg-purple-500',
  'V': 'bg-red-500',
}

const DOMAIN_LABELS = {
  'I': 'Responsible AI',
  'II': 'Business Needs',
  'III': 'Data Needs',
  'IV': 'Model Dev',
  'V': 'Operationalize',
}

function getMilestones(cards, progress) {
  const totalCards = cards.length
  const seenCards = Object.keys(progress).length
  const masteredCards = Object.values(progress).filter(p => p.correct_streak >= 3).length
  
  return [
    { 
      name: '25% Deck Seen', 
      achieved: seenCards >= totalCards * 0.25,
      progress: Math.min(100, (seenCards / (totalCards * 0.25)) * 100)
    },
    { 
      name: '50% Deck Seen', 
      achieved: seenCards >= totalCards * 0.5,
      progress: Math.min(100, (seenCards / (totalCards * 0.5)) * 100)
    },
    { 
      name: '75% Deck Seen', 
      achieved: seenCards >= totalCards * 0.75,
      progress: Math.min(100, (seenCards / (totalCards * 0.75)) * 100)
    },
    { 
      name: '100% Deck Seen', 
      achieved: seenCards >= totalCards,
      progress: Math.min(100, (seenCards / totalCards) * 100)
    },
    { 
      name: '10% Mastered (3x correct)', 
      achieved: masteredCards >= totalCards * 0.1,
      progress: Math.min(100, (masteredCards / (totalCards * 0.1)) * 100)
    },
    { 
      name: '25% Mastered', 
      achieved: masteredCards >= totalCards * 0.25,
      progress: Math.min(100, (masteredCards / (totalCards * 0.25)) * 100)
    },
    { 
      name: '50% Mastered', 
      achieved: masteredCards >= totalCards * 0.5,
      progress: Math.min(100, (masteredCards / (totalCards * 0.5)) * 100)
    },
  ]
}

function getDomainStats(cards, progress, domains) {
  return domains.map(domain => {
    const domainCards = cards.filter(c => c.domain === domain.id)
    const seen = domainCards.filter(c => progress[c.id]?.times_shown > 0).length
    const mastered = domainCards.filter(c => progress[c.id]?.correct_streak >= 3).length
    const totalCorrect = domainCards.reduce((sum, c) => sum + (progress[c.id]?.times_correct || 0), 0)
    const totalShown = domainCards.reduce((sum, c) => sum + (progress[c.id]?.times_shown || 0), 0)
    
    return {
      ...domain,
      total: domainCards.length,
      seen,
      mastered,
      accuracy: totalShown > 0 ? Math.round((totalCorrect / totalShown) * 100) : 0,
    }
  })
}

export default function Dashboard({ cards, progress, sessionHistory, onStartSession, domains, cloudEnabled, syncStatus, lastSyncTime, onSync }) {
  const [selectedSize, setSelectedSize] = useState(10)
  
  const totalCards = cards.length
  const seenCards = Object.keys(progress).filter(id => progress[id]?.times_shown > 0).length
  const masteredCards = Object.values(progress).filter(p => p.correct_streak >= 3).length
  const totalCorrect = Object.values(progress).reduce((sum, p) => sum + (p.times_correct || 0), 0)
  const totalShown = Object.values(progress).reduce((sum, p) => sum + (p.times_shown || 0), 0)
  const overallAccuracy = totalShown > 0 ? Math.round((totalCorrect / totalShown) * 100) : 0
  
  const milestones = getMilestones(cards, progress)
  const domainStats = getDomainStats(cards, progress, domains)
  
  const recentSessions = sessionHistory.slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            PMI-CPMAI Study Cards
          </h1>
          <p className="text-slate-400 mt-2">Master the CPMAI Methodology</p>
          
          {/* Sync Status */}
          <div className="flex items-center justify-center gap-2 mt-3">
            {cloudEnabled ? (
              <button 
                onClick={onSync}
                disabled={syncStatus === 'syncing'}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Cloud size={14} className="text-green-400" />
                )}
                <span>
                  {syncStatus === 'syncing' ? 'Syncing...' : 
                   syncStatus === 'synced' ? `Synced ${lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : ''}` :
                   syncStatus === 'error' ? 'Sync failed' : 'Cloud sync enabled'}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CloudOff size={14} />
                <span>Local only</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <BookOpen size={18} />
              <span className="text-sm">Cards Seen</span>
            </div>
            <div className="text-2xl font-bold">{seenCards} / {totalCards}</div>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(seenCards / totalCards) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Trophy size={18} />
              <span className="text-sm">Mastered (3x)</span>
            </div>
            <div className="text-2xl font-bold">{masteredCards} / {totalCards}</div>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(masteredCards / totalCards) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Target size={18} />
              <span className="text-sm">Accuracy</span>
            </div>
            <div className="text-2xl font-bold">{overallAccuracy}%</div>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${overallAccuracy >= 70 ? 'bg-green-500' : overallAccuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${overallAccuracy}%` }}
              />
            </div>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <TrendingUp size={18} />
              <span className="text-sm">Total Reviews</span>
            </div>
            <div className="text-2xl font-bold">{totalShown}</div>
            <div className="text-sm text-slate-400 mt-2">{totalCorrect} correct</div>
          </div>
        </div>

        {/* Start Session */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-semibold mb-4">Start a Study Session</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {[10, 20, 30, 50].map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedSize === size 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {size} cards
              </button>
            ))}
          </div>
          <button
            onClick={() => onStartSession(selectedSize)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-semibold transition-all"
          >
            <Play size={20} />
            Start {selectedSize}-Card Session
          </button>
        </div>

        {/* Domain Breakdown */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-semibold mb-4">Progress by Domain</h2>
          <div className="space-y-4">
            {domainStats.map(domain => (
              <div key={domain.id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${DOMAIN_COLORS[domain.id]}`} />
                    <span className="text-sm font-medium">
                      Domain {domain.id}: {DOMAIN_LABELS[domain.id]}
                    </span>
                    <span className="text-xs text-slate-400">({domain.weight}%)</span>
                  </div>
                  <span className="text-sm text-slate-400">
                    {domain.seen}/{domain.total} seen • {domain.accuracy}% accuracy
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${DOMAIN_COLORS[domain.id]}`}
                    style={{ width: `${(domain.seen / domain.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-semibold mb-4">🏆 Milestones</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {milestones.map((milestone, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg border ${
                  milestone.achieved 
                    ? 'bg-green-900/30 border-green-700 text-green-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <div className="text-sm font-medium">{milestone.name}</div>
                {!milestone.achieved && (
                  <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-slate-500 h-1.5 rounded-full"
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                )}
                {milestone.achieved && <div className="text-lg mt-1">✓</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
            <div className="space-y-2">
              {recentSessions.map(session => (
                <div 
                  key={session.id}
                  className="flex justify-between items-center p-3 bg-slate-800 rounded-lg"
                >
                  <span className="text-sm text-slate-400">
                    {new Date(session.date).toLocaleDateString()} {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-400">{session.cards_correct} ✓</span>
                    <span className="text-red-400">{session.cards_incorrect} ✗</span>
                    {session.cards_skipped > 0 && (
                      <span className="text-slate-400">{session.cards_skipped} skipped</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

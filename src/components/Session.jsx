import { useState, useCallback } from 'react'
import { ArrowRight, SkipForward, X, CheckCircle, XCircle, BookOpen } from 'lucide-react'
import Card from './Card'

const DOMAIN_COLORS = {
  'I': 'bg-blue-500',
  'II': 'bg-green-500', 
  'III': 'bg-amber-500',
  'IV': 'bg-purple-500',
  'V': 'bg-red-500',
}

const DOMAIN_NAMES = {
  'I': 'Support Responsible and Trustworthy AI Efforts',
  'II': 'Identify Business Needs and Solutions',
  'III': 'Identify Data Needs',
  'IV': 'Manage AI Model Development and Evaluation',
  'V': 'Operationalize AI Solution',
}

export default function Session({ cards, onEnd, progress }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState([]) // { cardId, correct, skipped }
  const [skipped, setSkipped] = useState([]) // Cards to revisit
  const [showingFeedback, setShowingFeedback] = useState(false)
  const [lastAnswer, setLastAnswer] = useState(null) // { correct, selectedOption }
  const [sessionComplete, setSessionComplete] = useState(false)
  
  // Build the queue: cards + skipped cards at end
  const queue = [...cards, ...skipped]
  const currentCard = queue[currentIndex]
  const isRevisit = currentIndex >= cards.length
  
  const handleAnswer = useCallback((selectedOption) => {
    const correct = selectedOption === currentCard.correct
    setLastAnswer({ correct, selectedOption })
    
    // For concept cards, always move forward (they're always "correct")
    if (currentCard.type === 'concept') {
      setResults(prev => [...prev, { cardId: currentCard.id, correct: true, skipped: false }])
      moveToNext()
      return
    }
    
    // For questions, show feedback
    setShowingFeedback(true)
    
    // If correct, auto-advance after brief delay
    if (correct) {
      setResults(prev => [...prev, { cardId: currentCard.id, correct: true, skipped: false }])
      setTimeout(() => {
        setShowingFeedback(false)
        moveToNext()
      }, 1000)
    }
  }, [currentCard])
  
  const handleContinueAfterIncorrect = () => {
    setResults(prev => [...prev, { cardId: currentCard.id, correct: false, skipped: false }])
    setShowingFeedback(false)
    moveToNext()
  }
  
  const handleSkip = () => {
    // Add to skipped queue (will appear at end)
    if (!skipped.find(c => c.id === currentCard.id)) {
      setSkipped(prev => [...prev, currentCard])
    }
    setResults(prev => [...prev, { cardId: currentCard.id, correct: false, skipped: true }])
    moveToNext()
  }
  
  const moveToNext = () => {
    setLastAnswer(null)
    if (currentIndex + 1 >= queue.length) {
      setSessionComplete(true)
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }
  
  const handleEndSession = () => {
    // Dedupe results by cardId, keeping last result
    const deduped = results.reduce((acc, r) => {
      acc[r.cardId] = r
      return acc
    }, {})
    onEnd(Object.values(deduped))
  }
  
  // Calculate progress bar segments
  const totalCards = cards.length
  const segments = results.slice(0, totalCards).map((r, i) => {
    const card = cards.find(c => c.id === r.cardId) || cards[i]
    if (r.skipped) return 'skipped'
    if (card?.type === 'concept') return 'concept'
    return r.correct ? 'correct' : 'incorrect'
  })
  
  // Session complete screen
  if (sessionComplete) {
    const correct = results.filter(r => r.correct && !r.skipped).length
    const incorrect = results.filter(r => !r.correct && !r.skipped).length
    const skippedCount = results.filter(r => r.skipped).length
    const accuracy = results.length > 0 
      ? Math.round((correct / (correct + incorrect)) * 100) 
      : 0
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800/50 rounded-2xl p-8 max-w-md w-full border border-slate-700 text-center">
          <h2 className="text-2xl font-bold mb-6">Session Complete! 🎉</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-green-900/30 rounded-xl p-4 border border-green-700">
              <div className="text-3xl font-bold text-green-400">{correct}</div>
              <div className="text-sm text-green-300">Correct</div>
            </div>
            <div className="bg-red-900/30 rounded-xl p-4 border border-red-700">
              <div className="text-3xl font-bold text-red-400">{incorrect}</div>
              <div className="text-sm text-red-300">Incorrect</div>
            </div>
            <div className="bg-slate-700 rounded-xl p-4 border border-slate-600">
              <div className="text-3xl font-bold text-slate-300">{skippedCount}</div>
              <div className="text-sm text-slate-400">Skipped</div>
            </div>
          </div>
          
          <div className="mb-8">
            <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              {accuracy}%
            </div>
            <div className="text-slate-400 mt-1">Accuracy</div>
          </div>
          
          {/* Progress bar visualization */}
          <div className="flex gap-1 mb-8 justify-center flex-wrap">
            {segments.map((seg, i) => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-sm ${
                  seg === 'correct' ? 'bg-green-500' :
                  seg === 'incorrect' ? 'bg-red-500' :
                  seg === 'concept' ? 'bg-amber-400' :
                  'bg-slate-600'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={handleEndSession}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }
  
  if (!currentCard) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header with progress */}
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handleEndSession}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="text-sm text-slate-400">
            {currentIndex + 1} of {queue.length}
            {isRevisit && <span className="text-amber-400 ml-2">(revisiting)</span>}
          </div>
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm"
          >
            Skip <SkipForward size={16} />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {Array.from({ length: totalCards }).map((_, i) => {
            const seg = segments[i]
            const isCurrent = i === Math.min(currentIndex, totalCards - 1)
            return (
              <div 
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${
                  seg === 'correct' ? 'bg-green-500' :
                  seg === 'incorrect' ? 'bg-red-500' :
                  seg === 'concept' ? 'bg-amber-400' :
                  seg === 'skipped' ? 'bg-slate-600' :
                  isCurrent ? 'bg-blue-400' : 'bg-slate-700'
                }`}
              />
            )
          })}
        </div>
        
        {/* Domain badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-3 h-3 rounded-full ${DOMAIN_COLORS[currentCard.domain]}`} />
          <span className="text-sm text-slate-400">
            Domain {currentCard.domain}: {DOMAIN_NAMES[currentCard.domain]}
          </span>
        </div>
        
        {/* Card content */}
        <Card 
          card={currentCard}
          onAnswer={handleAnswer}
          showingFeedback={showingFeedback}
          lastAnswer={lastAnswer}
        />
        
        {/* Feedback overlay for incorrect answers */}
        {showingFeedback && lastAnswer && !lastAnswer.correct && (
          <div className="mt-6 bg-red-900/30 border border-red-700 rounded-xl p-6">
            <div className="flex items-center gap-2 text-red-400 mb-4">
              <XCircle size={24} />
              <span className="font-semibold text-lg">Not quite!</span>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-slate-400 mb-1">Correct answer:</div>
              <div className="text-green-400 font-medium">
                {currentCard.options?.find(o => o.id === currentCard.correct)?.text}
              </div>
            </div>
            
            {currentCard.explanation && (
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <BookOpen size={16} />
                  <span className="text-sm font-medium">Explanation</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {currentCard.explanation}
                </p>
              </div>
            )}
            
            <button
              onClick={handleContinueAfterIncorrect}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}
        
        {/* Success feedback overlay */}
        {showingFeedback && lastAnswer?.correct && (
          <div className="mt-6 bg-green-900/30 border border-green-700 rounded-xl p-6 flex items-center justify-center gap-3">
            <CheckCircle size={32} className="text-green-400" />
            <span className="text-green-400 text-xl font-semibold">Correct!</span>
          </div>
        )}
      </div>
    </div>
  )
}

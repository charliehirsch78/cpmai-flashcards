import { useState, useMemo } from 'react'
import { CheckCircle, Circle, BookOpen } from 'lucide-react'

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function Card({ card, onAnswer, showingFeedback, lastAnswer }) {
  const [selected, setSelected] = useState(null)
  
  // Randomize options on first render of this card
  const shuffledOptions = useMemo(() => {
    if (card.type === 'concept' || !card.options) return []
    return shuffleArray(card.options)
  }, [card.id, card.type, card.options])
  
  const handleSelect = (optionId) => {
    if (showingFeedback) return // Don't allow changes during feedback
    setSelected(optionId)
  }
  
  const handleSubmit = () => {
    if (!selected) return
    onAnswer(selected)
    setSelected(null)
  }
  
  // Concept card - just content, no question
  if (card.type === 'concept') {
    return (
      <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 border border-amber-700/50 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 text-amber-400 mb-4">
          <BookOpen size={20} />
          <span className="text-sm font-medium">Concept Card</span>
        </div>
        
        <div className="prose prose-invert prose-sm max-w-none">
          <div 
            className="text-slate-200 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ 
              __html: card.content
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                .replace(/\n•/g, '\n<span class="text-amber-400">•</span>')
                .replace(/\n(\d+\.)/g, '\n<span class="text-amber-400">$1</span>')
            }}
          />
        </div>
        
        {card.explanation && (
          <div className="mt-4 pt-4 border-t border-amber-700/30 text-sm text-amber-300/70">
            {card.explanation}
          </div>
        )}
        
        <button
          onClick={() => onAnswer('concept')}
          className="mt-6 w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-semibold transition-all"
        >
          Got it — Continue
        </button>
      </div>
    )
  }
  
  // Question card
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 md:p-8">
      {/* Question text */}
      <div className="text-lg md:text-xl font-medium text-white mb-6 leading-relaxed">
        {card.content}
      </div>
      
      {/* Options */}
      <div className="space-y-3 mb-6">
        {shuffledOptions.map((option) => {
          const isSelected = selected === option.id
          const isCorrect = option.id === card.correct
          const wasSelected = lastAnswer?.selectedOption === option.id
          
          let bgColor = 'bg-slate-700/50 hover:bg-slate-700'
          let borderColor = 'border-slate-600'
          let textColor = 'text-slate-200'
          
          if (showingFeedback) {
            if (isCorrect) {
              bgColor = 'bg-green-900/40'
              borderColor = 'border-green-500'
              textColor = 'text-green-300'
            } else if (wasSelected && !lastAnswer?.correct) {
              bgColor = 'bg-red-900/40'
              borderColor = 'border-red-500'
              textColor = 'text-red-300'
            }
          } else if (isSelected) {
            bgColor = 'bg-blue-900/40'
            borderColor = 'border-blue-500'
            textColor = 'text-blue-200'
          }
          
          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={showingFeedback}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${bgColor} ${borderColor} ${textColor} ${showingFeedback ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {showingFeedback && isCorrect ? (
                  <CheckCircle size={20} className="text-green-400" />
                ) : isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                ) : (
                  <Circle size={20} className="text-slate-500" />
                )}
              </div>
              <div>
                <span className="font-medium text-slate-400 mr-2">{option.id.toUpperCase()}.</span>
                {option.text}
              </div>
            </button>
          )
        })}
      </div>
      
      {/* Submit button (only show if not in feedback mode) */}
      {!showingFeedback && (
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            selected 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white cursor-pointer' 
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          Check Answer
        </button>
      )}
    </div>
  )
}

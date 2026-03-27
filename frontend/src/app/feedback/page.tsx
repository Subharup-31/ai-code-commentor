'use client';
import { useState } from 'react';
import Navigation from '@/components/commgen/Navigation';
import { Star, Frown, Meh, Smile, SmilePlus, HeartHandshake } from 'lucide-react';

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [emoji, setEmoji] = useState<number | null>(null);

  const emojis = [
    { id: 1, icon: Frown, color: 'text-red-400', hoverColor: 'hover:text-red-300', bg: 'bg-red-500/10' },
    { id: 2, icon: Meh, color: 'text-orange-400', hoverColor: 'hover:text-orange-300', bg: 'bg-orange-500/10' },
    { id: 3, icon: Smile, color: 'text-yellow-400', hoverColor: 'hover:text-yellow-300', bg: 'bg-yellow-500/10' },
    { id: 4, icon: SmilePlus, color: 'text-emerald-400', hoverColor: 'hover:text-emerald-300', bg: 'bg-emerald-500/10' },
    { id: 5, icon: HeartHandshake, color: 'text-[#a855f7]', hoverColor: 'hover:text-[#c084fc]', bg: 'bg-[#a855f7]/10' },
  ];

  return (
    <div className="bg-[#020617] min-h-screen text-white overflow-hidden flex flex-col items-center">
      <Navigation />
      
      <main className="flex-1 w-full flex flex-col items-center justify-center px-6 pt-32 pb-24 relative z-10">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#a855f7]/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
         
         <div className="relative z-10 w-full max-w-lg bg-[#09090b]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl flex flex-col items-center text-center">
            <h1 className="text-4xl font-black font-heading mb-4 text-white">How did we do?</h1>
            <p className="text-white/60 mb-10">Your feedback helps shape the future of COMMGEN.</p>
            
            {/* Stars */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 p-2 cursor-pointer"
                >
                  <Star 
                    className={`w-10 h-10 ${star <= (hoverRating || rating) ? 'fill-[#facc15] text-[#facc15]' : 'text-white/20'}`} 
                  />
                </button>
              ))}
            </div>

            {/* Emojis */}
            <div className="flex items-center justify-center gap-6 mb-10">
              {emojis.map((emj) => (
                <button
                  key={emj.id}
                  onClick={() => setEmoji(emj.id)}
                  className={`p-3 rounded-full transition-all duration-300 cursor-pointer ${emoji === emj.id ? emj.bg + ' scale-110 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <emj.icon className={`w-8 h-8 ${emoji === emj.id ? emj.color : 'text-white/40 ' + emj.hoverColor}`} />
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="w-full text-left mb-6">
              <label className="block text-sm font-medium text-white/70 mb-2">Tell us more</label>
              <textarea 
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 outline-none focus:border-[#a855f7] transition-colors resize-none"
                placeholder="What do you love? What could improve?"
              ></textarea>
            </div>

            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-[#10b981] to-[#a855f7] text-white font-bold hover:opacity-90 transition-opacity cursor-pointer">
              Submit Feedback
            </button>
         </div>
      </main>
    </div>
  );
}

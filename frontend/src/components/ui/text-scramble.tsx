"use client"

import { useState, useCallback, useRef, useEffect } from "react"

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*"

interface TextScrambleProps {
  text: string
  className?: string
}

export function TextScramble({ text, className = "" }: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(text)
  const [isHovering, setIsHovering] = useState(false)
  const [isScrambling, setIsScrambling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameRef = useRef(0)

  const scramble = useCallback(() => {
    setIsScrambling(true)
    frameRef.current = 0
    const duration = text.length * 4 // slightly longer for better visibility

    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      frameRef.current++

      const progress = frameRef.current / duration
      const revealedLength = Math.floor(progress * text.length)

      const newText = text
        .split("")
        .map((char, i) => {
          if (char === " ") return " "
          if (i < revealedLength) return text[i]
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        })
        .join("")

      setDisplayText(newText)

      if (frameRef.current >= duration) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setDisplayText(text)
        setIsScrambling(false)
      }
    }, 40)
  }, [text])

  const handleMouseEnter = () => {
    setIsHovering(true)
    scramble()
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
  }

  // Looping Trigger
  useEffect(() => {
    // Initial start
    const startTimer = setTimeout(() => {
      scramble()
    }, 500)

    // Repeated loop
    const loopInterval = setInterval(() => {
      scramble()
    }, 5000) // Scramble every 5 seconds (animation duration + pause)

    return () => {
      clearTimeout(startTimer)
      clearInterval(loopInterval)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [scramble])

  return (
    <div
      className={`group relative inline-flex flex-col cursor-pointer select-none ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="relative font-mono text-4xl font-black tracking-[0.2em] uppercase">
        {displayText.split("").map((char, i) => (
          <span
            key={i}
            className={`inline-block transition-all duration-200 ${
              isScrambling && char !== text[i] ? "text-yellow-400 scale-110" : "text-white"
            }`}
            style={{
              transitionDelay: `${i * 15}ms`,
            }}
          >
            {char}
          </span>
        ))}
      </span>

      {/* Animated underline */}
      <span className="relative h-[2px] w-full mt-3 overflow-hidden">
        <span
          className={`absolute inset-0 bg-yellow-400 transition-transform duration-500 ease-out origin-left ${
            isHovering || isScrambling ? "scale-x-100" : "scale-x-0"
          }`}
        />
        <span className="absolute inset-0 bg-white/10" />
      </span>

      {/* Subtle glow on hover/scramble */}
      <span
        className={`absolute -inset-6 rounded-lg bg-yellow-400/5 transition-opacity duration-300 -z-10 ${
          isHovering || isScrambling ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  )
}

import React, { useState, useEffect } from 'react';

const Typewriter = ({ text, speed = 10 }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    // 1. Reset text immediately when input changes
    setDisplayedText('');
    
    // 2. Safety Check: Ensure text is a valid string
    let safeText = "";
    if (Array.isArray(text)) {
      safeText = text.join("\n\n"); // Handle arrays (bullet points)
    } else if (typeof text === 'object' && text !== null) {
      safeText = JSON.stringify(text); // Handle objects
    } else {
      safeText = String(text || ""); // Handle strings/null/undefined
    }

    if (!safeText) return;

    // 3. The Typing Logic
    let i = 0;
    const timer = setInterval(() => {
      if (i < safeText.length) {
        // CRITICAL FIX: Use substring instead of charAt accumulation.
        // This prevents characters from being skipped or duplicated due to React Strict Mode.
        setDisplayedText(safeText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  // Preserve line breaks/formatting
  return <span style={{ whiteSpace: 'pre-line' }}>{displayedText}</span>;
};

export default Typewriter;
import { useEffect, useState, useRef } from 'react';

/**
 * AnimatedCounter component for KPI numbers with smooth easing count-up transition.
 * Handles numbers, floats, currency formatting and percentages gracefully.
 */
export default function AnimatedCounter({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 2,
  className = ''
}) {
  // Extract numerical value if a formatted string was passed
  const numericValue = typeof value === 'number' 
    ? value 
    : parseFloat(String(value).replace(/[^0-9.-]+/g, '')) || 0;

  const [displayValue, setDisplayValue] = useState(0);
  const startTimestampRef = useRef(null);
  const previousValueRef = useRef(0);

  useEffect(() => {
    let animationFrameId;
    const startVal = previousValueRef.current;
    const endVal = numericValue;
    const change = endVal - startVal;

    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const step = (timestamp) => {
      if (!startTimestampRef.current) startTimestampRef.current = timestamp;
      const progress = Math.min((timestamp - startTimestampRef.current) / duration, 1);
      const easeProgress = easeOutExpo(progress);

      const current = startVal + change * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
        previousValueRef.current = endVal;
        startTimestampRef.current = null;
      }
    };

    startTimestampRef.current = null;
    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [numericValue, duration]);

  const safeValue = isNaN(displayValue) ? 0 : displayValue;
  const formattedNumber = typeof value === 'string' && isNaN(Number(value)) && !value.includes('%')
    ? safeValue.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : safeValue.toFixed(decimals);

  return (
    <span className={`inline-block font-mono transition-transform duration-300 ${className}`}>
      {prefix}
      {formattedNumber}
      {suffix}
    </span>
  );
}

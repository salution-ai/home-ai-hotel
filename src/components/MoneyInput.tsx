'use client'

import { useState, useEffect } from 'react';
import { Input } from './ui/input';

interface MoneyInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  suffix?: string; // Optional suffix like "/giờ", "/ngày"
}

export function MoneyInput({ id, value, onChange, placeholder, className, required, suffix }: MoneyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [suggestions, setSuggestions] = useState<number[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Format number with thousand separators
  const formatMoney = (num: string): string => {
    const cleanNum = num.replace(/\D/g, '');
    if (!cleanNum) return '';
    return parseInt(cleanNum).toLocaleString('vi-VN');
  };

  // Generate smart suggestions based on input
  const generateSuggestions = (input: string): number[] => {
    const cleanNum = input.replace(/\D/g, '');
    if (!cleanNum || cleanNum.length === 0) return [];

    const num = parseInt(cleanNum);
    const suggestions: number[] = [];

    // Generate multiple suggestions based on magnitude
    if (cleanNum.length === 1) {
      // Single digit: suggest x0.000 and x00.000
      suggestions.push(num * 10000); // 50.000
      suggestions.push(num * 100000); // 500.000
      suggestions.push(num * 1000000); // 5.000.000
    } else if (cleanNum.length === 2) {
      // Two digits: suggest x00.000 and x.000.000
      suggestions.push(num * 10000); // 300.000
      suggestions.push(num * 100000); // 3.000.000
    } else if (cleanNum.length === 3) {
      // Three digits: suggest x00.000 and x.000.000
      suggestions.push(num * 1000); // 300.000
      suggestions.push(num * 10000); // 3.000.000
    } else if (cleanNum.length === 4) {
      // Four digits
      suggestions.push(num * 1000); // x.000.000
    } else {
      // For longer inputs, show the current value
      suggestions.push(num);
    }

    // Filter out duplicates and sort
    return [...new Set(suggestions)].filter(s => s > 0).sort((a, b) => a - b);
  };

  // Update display value when value prop changes
  useEffect(() => {
    if (value) {
      // Clean the value first to remove any formatting that might have been passed
      const cleanValue = value.toString().replace(/\D/g, '');
      if (cleanValue) {
        setDisplayValue(formatMoney(cleanValue));
      } else {
        setDisplayValue('');
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cleanValue = inputValue.replace(/\D/g, '');
    
    // Update parent with clean number
    onChange(cleanValue);
    
    // Update display with formatted number
    setDisplayValue(formatMoney(cleanValue));
    
    // Generate and show suggestions
    if (cleanValue && cleanValue.length > 0 && cleanValue.length <= 4) {
      const newSuggestions = generateSuggestions(cleanValue);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: number) => {
    const suggestionStr = suggestion.toString();
    onChange(suggestionStr);
    setDisplayValue(formatMoney(suggestionStr));
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    // Show suggestions if there's a value and it's short enough
    if (value && value.length > 0 && value.length <= 4) {
      const newSuggestions = generateSuggestions(value);
      if (newSuggestions.length > 0) {
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      }
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow click
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder ? formatMoney(placeholder) : ''}
          className={className}
          required={required}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            ₫{suffix}
          </span>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors first:rounded-t-md last:rounded-b-md"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSuggestionClick(suggestion);
              }}
            >
              <span className="font-medium">{suggestion.toLocaleString('vi-VN')}</span>
              <span className="text-xs text-gray-500 ml-2">₫{suffix || ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';

const quotes = {
  morning: [
    "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
    "A reader lives a thousand lives before he dies . . . The man who never reads lives only one.",
    "Today a reader, tomorrow a leader.",
  ],
  afternoon: [
    "Reading is to the mind what exercise is to the body.",
    "A book is a dream that you hold in your hand.",
    "There is more treasure in books than in all the pirate's loot on Treasure Island.",
  ],
  night: [
    "The night is the hardest time to be alive and 4am knows all my secrets.",
    "Reading gives us someplace to go when we have to stay where we are.",
    "Sleep is good, he said, and books are better.",
  ],
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 18) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
};

const getQuote = () => {
  const hour = new Date().getHours();
  let timeOfDay: 'morning' | 'afternoon' | 'night';

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'night';
  }

  const quoteList = quotes[timeOfDay];
  return quoteList[Math.floor(Math.random() * quoteList.length)];
};

export function QuoteOfTheDay() {
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');

  useEffect(() => {
    setGreeting(getGreeting());
    setQuote(getQuote());
  });

  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
      <div className="flex">
        <div className="py-1">
          <Lightbulb className="h-5 w-5 text-yellow-500 mr-3" />
        </div>
        <div>
          <p className="font-bold">{greeting}</p>
          <p className="text-sm">{quote}</p>
        </div>
      </div>
    </div>
  );
}

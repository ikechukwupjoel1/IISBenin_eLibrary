import React, { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';

const content = {
  morning: [
    "The more that you read, the more things you will know. The more that you learn, the more places you'll go.",
    "A reader lives a thousand lives before he dies . . . The man who never reads lives only one.",
    "Today a reader, tomorrow a leader.",
    "A book is a gift you can open again and again.",
    "The journey of a lifetime starts with the turning of a page.",
    "Did you know? The world's smallest book is 'Teeny Ted from Turnip Town'.",
    "Did you know? The fear of running out of reading material is called 'Abibliophobia'.",
  ],
  afternoon: [
    "Reading is to the mind what exercise is to the body.",
    "A book is a dream that you hold in your hand.",
    "There is more treasure in books than in all the pirate's loot on Treasure Island.",
    "Books are a uniquely portable magic.",
    "To learn to read is to light a fire; every word spelled out is a spark.",
    "Did you know? Reading for just six minutes can reduce stress levels by 68%.",
    "Did you know? The name 'Wendy' was created for J.M. Barrie's book 'Peter Pan'.",
  ],
  night: [
    "The night is the hardest time to be alive and 4am knows all my secrets.",
    "Reading gives us someplace to go when we have to stay where we are.",
    "Sleep is good, he said, and books are better.",
    "A book is a version of the world. If you do not like it, ignore it; or offer your own version in return.",
    "Fairy tales are more than true: not because they tell us that dragons exist, but because they tell us that dragons can be beaten.",
    "Did you know? The average adult reads between 200 to 400 words per minute.",
    "Did you know? People in Iceland read more books per capita than any other country.",
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

const getContent = () => {
  const hour = new Date().getHours();
  let timeOfDay: 'morning' | 'afternoon' | 'night';

  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 18) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'night';
  }

  const contentList = content[timeOfDay];
  return contentList[Math.floor(Math.random() * contentList.length)];
};

export function QuoteOfTheDay() {
  const [greeting, setGreeting] = useState('');
  const [quote, setQuote] = useState('');

  useEffect(() => {
    setGreeting(getGreeting());
    setQuote(getContent());
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

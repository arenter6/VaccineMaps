var david_quotes = [
  "Here for a long time not a good time.",
  "David likes to go hiking, watching movies and programming.",
  "Pro tip: refresh the page to receive more free wisdom.",
  "David is a 2nd year CS student at UCSC. His favorite pre-covid activity was to program.",
  "Are you still refreshing the page?",
  "Ending the pandemic, beginning the Pangdemic",
  "Hey, stop reading this and go outside!",
  "Are you vaccinated yet?",
  "Made you look.",
  "If you are reading this, chances are that you are not blind.",
  "Is your birthday this year? If so, happy birthday!",
  "Fun fact: If you google \"241543903\" and go to images you'll get a surprise!",
];

document.getElementById('david-quote-of-the-day').innerHTML = david_quotes[Math.floor(Math.random()*david_quotes.length)];

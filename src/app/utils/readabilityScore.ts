export function calculateReadabilityScore(text: string): number {
  // Remove extra whitespace and split into sentences
  const sentences = text.trim().split(/[.!?]+/).filter(Boolean);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const syllables = countSyllables(text);

  // Calculate Flesch-Kincaid Grade Level
  const averageWordsPerSentence = words.length / sentences.length;
  const averageSyllablesPerWord = syllables / words.length;
  
  // Flesch-Kincaid formula: 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
  const score = 206.835 - (1.015 * averageWordsPerSentence) - (84.6 * averageSyllablesPerWord);
  
  return Math.min(100, Math.max(0, score)); // Clamp between 0 and 100
}

function countSyllables(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  return words.reduce((total, word) => total + countWordSyllables(word), 0);
}

function countWordSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  // Remove common silent endings
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');

  // Count vowel groups
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
} 
import { ExtractedSegment } from "./interfaces/extracted-text.interface";
import { Range } from "./types/range.type";

/**
 * Normalizes and sorts ranges in ascending order by start index.
 * Ensures that for each range [a, b], a <= b
 *
 * @param {Range[]} ranges - Array of start and end indices of words to be highlighted
 * @returns {Range[]} The provided ranges sorted from smallest to largest
 */
function normalizeRanges(ranges: Range[]): Range[] {
  return ranges.map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as Range).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/**
 * Removes duplicate ranges from the array
 *
 * @param {Range[]} ranges - Array of start and end indices of words to be highlighted
 * @returns {Range[]} The provided ranges without duplicates
 */
function removeDuplicates(ranges: Range[]): Range[] {
  return [...new Map(ranges.map((range) => [JSON.stringify(range), range])).values()];
}

/**
 * Merges overlapping or adjacent ranges
 * e.g. [[3,5], [4,7]] => [[3,7]]
 *
 * @param {Range[]} ranges - Array of start and end indices of words to be highlighted
 * @returns {Range[]} The provided ranges with merged values
 */
function mergeRanges(ranges: Range[]): Range[] {
  if (!ranges.length) return [];

  return ranges.reduce<Range[]>((merged, [start, end]) => {
    if (!merged.length) {
      return [[start, end]];
    }

    const [lastStart, lastEnd]: number[] = merged[merged.length - 1];

    // Overlap or direct adjacency
    if (start <= lastEnd) {
      merged[merged.length - 1] = [lastStart, Math.max(lastEnd, end)];
    } else {
      merged.push([start, end]);
    }

    return merged;
  }, []);
}

/**
 * Protects against XSS attacks by escaping HTML special characters
 *
 * @param {string} textToEscape - The full text from which the highlight is to be created
 * @returns {string} Input text with replaced HTML special characters
 */
function escapeHtml(textToEscape: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return textToEscape.replace(/[&<>"']/g, (match) => htmlEscapes[match]);
}

/**
 * Extracts context before and after a highlighted section
 *
 * @param {string} text - The full text from which the highlight is to be created
 * @param {Range} param1 - The range tuple [start, end]
 * @param {number} index - The index from the array, used to insert [...]
 * @returns {ExtractedSegment} - The extracted text blocks in ExtractedSegment format for further processing
 */
function extractTextSegment(text: string, [start, end]: Range, index: number): ExtractedSegment {
  const target: string = text.slice(start, end).trim();

  // Word before the highlight with punctuation
  const beforeText: string = text.slice(0, start);
  // The regex /(?:\b\w+[.,!?]*)\W*$/ matches a word (\w+) at the end of the string, optionally ending with punctuation ([.,!?]*), followed by optional whitespace or non-word characters (\W*)
  const beforeMatch: RegExpMatchArray | null = beforeText.match(/(?:\b\w+[.,!?]*)\W*$/);
  const previous: string | null = beforeMatch ? beforeMatch[0].trim() : null;

  // Word or punctuation afterward
  const afterText = text.slice(end);
  // The regex /^\W*([.,!?])|^\W*(\w+)/ matches either a punctuation mark ([.,!?]) after optional non-word characters (\W*), or a word (\w+) also after optional non-word characters
  const afterMatch: RegExpMatchArray | null = afterText.match(/^\W*([.,!?])|^\W*(\w+)/);

  const nextPunctuation: string | null = afterMatch?.[1] || null;
  const nextWord: string | null = afterMatch?.[2] || null;
  const next: string | null = nextPunctuation || nextWord;

  // Build context
  let context: string = "";

  if (index > 0) {
    context += "[...] ";
  }

  // Word before the highlight
  if (previous) {
    context += previous;
  }

  context += ` <em>${target}</em>`;

  // Word after the highlight
  if (next) {
    // If punctuation follows, do not add a space
    context += /[.,!?]/.test(next) ? next : ` ${next}`;
  }

  // Check if there's more text after the highlighted segment
  const hasMoreContent: boolean = next ? text.slice(text.indexOf(next, end) + next.length).trim().length > 0 : false;

  // Add ellipsis at the end if more text follows and this is not the last segment
  if (hasMoreContent) {
    context += " [...] ";
  }

  return {
    range: [start, end],
    target,
    previous,
    next,
    context: context.replace(/\s+/g, " ").trim(),
  };
}

/**
 * Highlights the specified text with <em> tags at the defined positions
 *
 * @param {string} text - The text to be processed
 * @param {Range[]} ranges - Array of start and end indices of words to be highlighted
 * @returns {string} The text with HTML highlighting
 */
function highlightText(text: string, ranges: Range[]): string {
  if (!text || !ranges.length) {
    return "";
  }

  let result: string = "";
  let lastIndex: number = 0;

  for (const [start, end] of ranges) {
    const rangeText: string = text.slice(start, end);

    // Skip empty highlights
    if (!rangeText.length) {
      continue;
    }

    result += text.slice(lastIndex, start);

    result += `<em>${rangeText}</em>`;
    lastIndex = end;
  }

  result += text.slice(lastIndex);

  return result;
}

/**
 * Creates a shortened text excerpt with highlighted sections in context
 *
 * @param {string} text - The text to be processed
 * @param {Range[]} ranges - Array of start and end indices of words to be highlighted
 * @returns {string} The shortened text with HTML highlighting
 */
function excerptHighlighting(text: string, ranges: Range[]): string {
  if (!text || !ranges.length) {
    return "";
  }

  const segments: ExtractedSegment[] = ranges.map((range, index) => extractTextSegment(text, range, index));

  // Combine extracted contexts
  return segments
    .reduce((output, segment, index) => {
      const nextSegment: ExtractedSegment = segments[index + 1];

      // Add current context
      output += segment.context;

      // Avoid duplicate ellipsis between adjacent segments
      if (nextSegment) {
        nextSegment.context = nextSegment.context.replace(/^\[...\]\s+/, " ");
      }

      return output;
    }, "")
    .trim();
}

/**
 * Main function for text highlighting
 *
 * @param {string} textToHighlight - The text to be processed
 * @param {Range[]} ranges - Array of [start, end] ranges to be highlighted
 * @param {boolean} createExcerpt - Should the text be shortened or not?
 * @returns {string} The highlighted text with or without excerpt
 */
function highlightTextRanges(textToHighlight: string, ranges: Range[], createExcerpt: boolean = false): string {
  if (!textToHighlight) {
    throw new Error("No text provided to highlight");
  }

  if (!ranges.length) {
    throw new Error("No ranges provided for highlighting");
  }

  // Range processing pipeline
  const processedRanges: Range[] = [normalizeRanges, removeDuplicates, mergeRanges].reduce(
    (result, fn) => fn(result),
    ranges
  );

  // XSS protection
  const escapedText: string = escapeHtml(textToHighlight).trim();

  // If the end of the range reaches the end of the text, we must recalculate the length after escaping
  if (processedRanges[0][1] === textToHighlight.length) {
    processedRanges[0][1] = escapedText.length;
  }

  // Should the entire text be highlighted or just an excerpt?
  return createExcerpt
    ? excerptHighlighting(escapedText, processedRanges)
    : highlightText(escapedText, processedRanges);
}

/**
 * Demo function to illustrate the output values
 *
 */
function demoHighlighting(): void {
  const text: string =
    "Dies ist die erste Markierung und dies ist die zweite Markierung! Hierauf folgt eine weitere Markierung, welche markiert wird.";
  const ranges: Range[] = [
    [19, 29],
    [54, 64],
    [93, 103],
    [121, 125],
  ];
  // Full text with highlights
  console.log("Full text with highlights");
  console.group();
  console.log(highlightTextRanges(text, ranges));
  console.groupEnd();

  console.log("");

  // Shortened excerpt with highlights
  console.log("Shortened excerpt with highlights");
  console.group();
  console.log(highlightTextRanges(text, [...ranges, [0, 4]], true));
  console.groupEnd();
}

/*******************/
/* Function call   */
/*******************/

demoHighlighting();

/************/
/* Exports */
/***********/

export { highlightTextRanges, mergeRanges, normalizeRanges, removeDuplicates };

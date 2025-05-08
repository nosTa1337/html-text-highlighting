# Text Highlighter with Context Extraction

Providing a text highlighting mechanism that:

- Escapes HTML to prevent XSS attacks
- Normalizes, deduplicates, and merges overlapping or adjacent ranges
- Highlights words or phrases using `<em>` tags
- Possibility to give a excerpt around the highlighted text

## Features

✅ Safe HTML escaping  
✅ Range normalization and merging  
✅ Full-text and excerpt-based highlighting

## Example Output

```ts
  const text: string =
    "Dies ist die erste Markierung und dies ist die zweite Markierung! Hierauf folgt eine weitere Markierung, welche markiert wird.";
  const ranges: Range[] = [
    [19, 29],
    [54, 64],
    [93, 103],
    [121, 125],
  ];

highlightTextRanges(text, ranges);           // Full text with <em> highlights
highlightTextRanges(text, ranges, true);     // Short excerpt with context and <em> highlights

Full text with highlights
  Dies ist die erste <em>Markierung</em> und dies ist die zweite <em>Markierung</em>! Hierauf folgt eine weitere <em>Markierung</em>, welche markiert <em>wird</em>.

Shortened excerpt with highlights
  <em>Dies</em> ist [...] erste <em>Markierung</em> und [...] zweite <em>Markierung</em>! [...] weitere <em>Markierung</em>, [...] markiert <em>wird</em>.
```

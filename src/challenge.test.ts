import { highlightTextRanges, mergeRanges, normalizeRanges, removeDuplicates } from "./challenge";
import { Range } from "./types/range.type";

describe("highlightTextRanges", () => {
  test("throws error for empty text", () => {
    expect(() => highlightTextRanges("", [[0, 4]])).toThrow("No text provided to highlight");
  });

  test("throws error for empty ranges", () => {
    expect(() => highlightTextRanges("Text", [])).toThrow("No ranges provided for highlighting");
  });

  test("correctly highlights the entire text", () => {
    const text =
      "Dies ist die erste Markierung und dies ist die zweite Markierung! Hierauf folgt eine weitere Markierung, welche markiert wird.";
    const ranges: Range[] = [
      [19, 29],
      [54, 64],
      [93, 103],
      [121, 125],
    ];

    const result = highlightTextRanges(text, ranges);
    expect(result).toBe(
      "Dies ist die erste <em>Markierung</em> und dies ist die zweite <em>Markierung</em>! Hierauf folgt eine weitere <em>Markierung</em>, welche markiert <em>wird</em>."
    );
  });

  test("normalizes and sorts ranges", () => {
    const text = "abc def ghi";
    const ranges: Range[] = [
      [10, 9], // becomes [9,10]
      [4, 4], // empty range
      [0, 3],
    ];
    const result = highlightTextRanges(text, ranges);
    expect(result).toBe("<em>abc</em> def g<em>h</em>i");
  });

  test("merges overlapping ranges", () => {
    const text = "abcdefghij";
    const ranges: Range[] = [
      [1, 4],
      [3, 6],
    ]; // results in [1,6]
    const result = highlightTextRanges(text, ranges);
    expect(result).toBe("a<em>bcdef</em>ghij");
  });

  test("removes duplicate ranges", () => {
    const text = "abcdefgh";
    const ranges: Range[] = [
      [1, 3],
      [1, 3], // duplicate
    ];
    const result = highlightTextRanges(text, ranges);
    expect(result).toBe("a<em>bc</em>defgh");
  });

  test("escapes HTML special characters", () => {
    const text = '<script>alert("XSS")</script>';
    const ranges: Range[] = [[0, text.length]];
    const result = highlightTextRanges(text, ranges);
    expect(result).toBe("<em>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</em>");
  });

  test("returns shortened excerpt with context", () => {
    const text = "Hello world! This is a sample text for testing purposes.";
    const ranges: Range[] = [
      [6, 11],
      [35, 38],
    ];
    const result = highlightTextRanges(text, ranges, true);
    expect(result).toBe("Hello <em>world</em>! [...] text <em>for</em> testing [...]");
  });
});

/**************/
/*** Ranges ***/
/**************/

describe("Text Range Utilities", () => {
  describe("normalizeRanges", () => {
    it("should normalize and sort ranges ascending", () => {
      const input: Range[] = [
        [5, 3],
        [2, 8],
        [10, 6],
      ];
      const result: Range[] = normalizeRanges(input);
      expect(result).toEqual([
        [2, 8], // reordered
        [3, 5], // normalized
        [6, 10], // normalized
      ]);
    });
  });

  describe("removeDuplicates", () => {
    it("should remove duplicate ranges", () => {
      const input: Range[] = [
        [3, 5],
        [5, 7],
        [3, 5], // duplicate
        [8, 10],
      ];
      const result: Range[] = removeDuplicates(input);
      expect(result).toEqual([
        [3, 5],
        [5, 7],
        [8, 10],
      ]);
    });

    it("should make no changes if no duplicates are present", () => {
      const input: Range[] = [
        [3, 5],
        [5, 7],
        [8, 10],
      ];
      const result: Range[] = removeDuplicates(input);
      expect(result).toEqual(input);
    });
  });

  describe("mergeRanges", () => {
    it("should merge overlapping ranges", () => {
      const input: Range[] = [
        [3, 5],
        [4, 7], // overlaps
        [8, 10],
      ];
      const result: Range[] = mergeRanges(input);
      expect(result).toEqual([
        [3, 7],
        [8, 10],
      ]);
    });

    it("should merge adjacent ranges", () => {
      const input: Range[] = [
        [1, 3],
        [3, 5], // adjacent
        [6, 8],
      ];
      const result: Range[] = mergeRanges(input);
      expect(result).toEqual([
        [1, 5],
        [6, 8],
      ]);
    });

    it("should not change non-overlapping, non-adjacent ranges", () => {
      const input: Range[] = [
        [1, 3],
        [5, 7],
        [8, 10],
      ];
      const result: Range[] = mergeRanges(input);
      expect(result).toEqual(input);
    });
  });

  describe("normalizeRanges, removeDuplicates, mergeRanges", () => {
    it("should normalize, deduplicate, and merge", () => {
      const input: Range[] = [
        [10, 8], // unsorted
        [3, 5],
        [5, 3], // duplicate
        [6, 2], // overlaps + reversed
      ];
      const result: Range[] = [normalizeRanges, removeDuplicates, mergeRanges].reduce(
        (result, fn) => fn(result),
        input
      );

      expect(result).toEqual([
        [2, 6],
        [8, 10],
      ]);
    });
  });
});

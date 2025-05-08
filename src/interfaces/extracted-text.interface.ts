import { Range } from "../types/range.type";

export interface ExtractedSegment {
  range: Range;
  target: string;
  previous: string | null;
  next: string | null;
  context: string;
}

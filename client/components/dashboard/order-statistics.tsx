"use client";

import { ChevronDown, CalendarDays, BarChart3 } from "lucide-react";

const TIME_LABELS = ["12 mp", "12 pm", "02 pm", "12 am", "10 am", "8 am", "6 am", "4 am", "2 am"];

const DAYS = ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"];

// Heatmap data: true = orange (#fe9f43), false = light orange (#ffe3cb)
const HEATMAP = [
  [false, false, false, false, false, false, false, false, false, false], // Mon
  [false, false, false, false, false, false, false, false, false, false], // Tue
  [false, false, false, false, false, false, false, false, false, false], // Wed
  [false, false, false, false, false, true,  true,  true,  false, false], // Thur
  [false, true,  false, false, false, false, false, false, false, false], // Fri
  [true,  false, false, false, false, true,  false, false, false, false], // Sat
  [true,  false, false, false, false, true,  false, false, false, false], // Sun
];

// Manually set blocks from Figma metadata (which blocks are highlighted)
// Mon: row5, row8, row9 = positions 4,7,8 (0-indexed)
// Tue: row5, row8, row9 = positions 4,7,8
// Wed: row5, row8, row9 = positions 4,7,8
// Thur: row8 = position 7
// Fri: row1, row6 = positions 1,5
// Sat: row1, row6 = positions 1,5 (row1 = position 0, actually row1 is index 1)
// Sun: row1, row6 = positions 1,5

const MANUAL_HEATMAP: boolean[][] = DAYS.map((_, di) =>
  Array.from({ length: 9 }, (_, ti) => {
    // Figma: Mon(4,7,8), Tue(4,7,8), Wed(4,7,8), Thur(7), Fri(1,5), Sat(0,5), Sun(0,5)
    if (di <= 2) return ti === 4 || ti === 7 || ti === 8;
    if (di === 3) return ti === 7;
    if (di === 4) return ti === 1 || ti === 5;
    if (di >= 5) return ti === 0 || ti === 5;
    return false;
  })
);

export function OrderStatistics() {
  return (
    <div className="border border-border rounded-lg h-full">
      <div className="border-b border-border px-5 py-[15px] flex items-center gap-2">
        <div className="bg-[#ededfb] dark:bg-[#1a1a3a] rounded-lg p-2">
          <BarChart3 className="h-4 w-4 text-[#3538cd]" />
        </div>
        <h3 className="text-lg font-bold text-card-foreground flex-1">
          Order Statistics
        </h3>
        <div className="flex items-center gap-1.5 border border-border rounded px-3 py-1.5">
          <CalendarDays className="h-3 w-3 text-card-foreground" />
          <span className="text-xs font-semibold text-card-foreground">Weekly</span>
          <ChevronDown className="h-3 w-3 text-card-foreground" />
        </div>
      </div>
      <div className="p-5">
        <div className="flex gap-2 relative">
          <div className="flex flex-col gap-[11px] justify-end pb-[27px]">
            {TIME_LABELS.map((label) => (
              <span key={label} className="text-sm font-medium text-muted-foreground text-center whitespace-nowrap h-[29.2px] flex items-center justify-center">
                {label}
              </span>
            ))}
          </div>
          <div className="flex flex-1 gap-[5px]">
            {DAYS.map((day, di) => (
              <div key={day} className="flex-1 flex flex-col gap-[5px] justify-end">
                {Array.from({ length: 9 }, (_, ti) => (
                  <div
                    key={ti}
                    className={`h-[29.2px] rounded-[4px] w-full transition-colors ${
                      MANUAL_HEATMAP[di]?.[ti]
                        ? "bg-[#fe9f43] dark:bg-[#fe9f43]"
                        : "bg-[#ffe3cb] dark:bg-[#4a3520]"
                    }`}
                  />
                ))}
                <span className="text-sm font-medium text-muted-foreground text-center w-full">
                  {day}
                </span>
              </div>
            ))}
          </div>
          {/* Tooltip */}
          <div className="absolute left-[55.83px] top-[57px] bg-card border border-border rounded px-2 py-1 shadow-sm">
            <p className="text-xs text-card-foreground whitespace-nowrap">297 Orders</p>
          </div>
        </div>
      </div>
    </div>
  );
}

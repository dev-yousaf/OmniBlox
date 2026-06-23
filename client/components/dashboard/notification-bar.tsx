"use client";

import { Info, X } from "lucide-react";

interface NotificationBarProps {
  visible: boolean;
  onDismiss: () => void;
}

export function NotificationBar({ visible, onDismiss }: NotificationBarProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center justify-between bg-[#fcefea] dark:bg-[#3d2a23] rounded-lg px-[10px] py-[10px]">
      <div className="flex items-center gap-[10px]">
        <Info className="h-3.5 w-3.5 text-[#e04f16] shrink-0" />
        <p className="text-sm text-[#646b72] dark:text-[#c0c8d4]">
          Your Product{" "}
          <span className="font-semibold text-[#e04f16]">Apple Iphone 15 is running Low,</span>
          {" "}already below 5 Pcs.,{" "}
          <span className="font-semibold text-[#e04f16] underline">Add Stock</span>
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 ml-4 p-0.5 rounded-full hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
      >
        <X className="h-3.5 w-3.5 text-[#e04f16]" />
      </button>
    </div>
  );
}

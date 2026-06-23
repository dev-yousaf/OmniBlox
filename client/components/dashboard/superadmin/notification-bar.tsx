"use client";

interface NotificationBarProps {
  newCompaniesToday: number;
  visible: boolean;
  onDismiss: () => void;
}

export function SuperadminNotificationBar({ newCompaniesToday, visible, onDismiss }: NotificationBarProps) {
  if (!visible) return null;

  return (
    <div className="bg-[#fe9f43] rounded-[5px] p-[40px] relative overflow-hidden flex items-center gap-[10px]">
      <div className="flex-1">
        <p className="text-[24px] font-bold text-white leading-[36px]">
          Welcome Back, Super Admin
        </p>
        <p className="text-[14px] text-[#f9fafb] leading-[21px]">
          {newCompaniesToday} New Companies Subscribed Today !!!
        </p>
      </div>
      <div className="flex gap-[10px] items-start shrink-0">
        <button className="bg-[#212529] text-white text-[13px] font-medium px-[16px] py-[8px] rounded-[5px] leading-[16px]">
          Companies
        </button>
        <button className="bg-[#f8f9fa] text-[#212b36] text-[13px] font-medium px-[16px] py-[8px] rounded-[5px] leading-[16px]">
          All Packages
        </button>
        <button
          onClick={onDismiss}
          className="text-white/70 hover:text-white ml-2"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

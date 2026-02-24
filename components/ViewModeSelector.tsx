"use client";

import { VIEW_MODE_LABELS, VIEW_MODES, ViewModeId } from "@/constants";

interface ViewModeSelectorProps {
  viewMode: ViewModeId;
  onViewModeChange: (mode: ViewModeId) => void;
}

export function ViewModeSelector({
  viewMode,
  onViewModeChange,
}: ViewModeSelectorProps) {
  const modes: { value: ViewModeId; label: string }[] = [
    {
      value: VIEW_MODES.COMBINED,
      label: VIEW_MODE_LABELS[VIEW_MODES.COMBINED],
    },
    {
      value: VIEW_MODES.POLYMARKET,
      label: VIEW_MODE_LABELS[VIEW_MODES.POLYMARKET],
    },
    { value: VIEW_MODES.KALSHI, label: VIEW_MODE_LABELS[VIEW_MODES.KALSHI] },
  ];

  return (
    <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onViewModeChange(mode.value)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === mode.value
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

"use client";

import {
  CONNECTION_STATUS,
  CONNECTION_STATUS_LABELS,
  UI_LABELS,
  VENUE_DISPLAY_NAMES,
  VenueId,
  VENUES,
} from "@/constants";
import { useAppSelector } from "@/store/hooks";
import { ConnectionStatus as ConnectionStatusType } from "@/types/orderbook";
import { useEffect, useState } from "react";

interface VenueStatusProps {
  venue: VenueId;
  name: string;
}

function VenueStatus({ venue, name }: VenueStatusProps) {
  const connectionState = useAppSelector((state) => state.connection[venue]);
  const orderBook = useAppSelector((state) => state.orderBook[venue]);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<number | null>(null);

  // Update time since last update every second
  useEffect(() => {
    const updateTime = () => {
      if (orderBook.lastUpdated) {
        setTimeSinceUpdate(
          Math.round((Date.now() - orderBook.lastUpdated) / 1000),
        );
      } else {
        setTimeSinceUpdate(null);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [orderBook.lastUpdated]);

  const statusConfig: Record<
    ConnectionStatusType,
    { color: string; label: string; pulse: boolean }
  > = {
    [CONNECTION_STATUS.CONNECTING]: {
      color: "bg-yellow-500",
      label: CONNECTION_STATUS_LABELS[CONNECTION_STATUS.CONNECTING],
      pulse: true,
    },
    [CONNECTION_STATUS.CONNECTED]: {
      color: "bg-green-500",
      label: CONNECTION_STATUS_LABELS[CONNECTION_STATUS.CONNECTED],
      pulse: false,
    },
    [CONNECTION_STATUS.DISCONNECTED]: {
      color: "bg-gray-500",
      label: CONNECTION_STATUS_LABELS[CONNECTION_STATUS.DISCONNECTED],
      pulse: false,
    },
    [CONNECTION_STATUS.ERROR]: {
      color: "bg-red-500",
      label: CONNECTION_STATUS_LABELS[CONNECTION_STATUS.ERROR],
      pulse: true,
    },
  };

  const config = statusConfig[connectionState.status];

  return (
    <div className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div className="relative">
          <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
          {config.pulse && (
            <div
              className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping`}
            />
          )}
        </div>

        {/* Venue name */}
        <div>
          <div className="text-white font-medium">{name}</div>
          <div className="text-xs text-gray-500">{config.label}</div>
        </div>
      </div>

      {/* Last update */}
      <div className="text-right">
        {orderBook.lastUpdated && (
          <>
            <div className="text-sm text-gray-400">
              {orderBook.bids.length + orderBook.asks.length} {UI_LABELS.LEVELS}
            </div>
            <div className="text-xs text-gray-500">
              {timeSinceUpdate !== null && timeSinceUpdate < 60
                ? `${timeSinceUpdate}s ago`
                : timeSinceUpdate !== null
                  ? `${Math.round(timeSinceUpdate / 60)}m ago`
                  : UI_LABELS.NEVER}
            </div>
          </>
        )}
        {connectionState.errorMessage && (
          <div className="text-xs text-red-400 mt-1">
            {connectionState.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConnectionStatus() {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          {UI_LABELS.DATA_SOURCES}
        </h3>
      </div>

      <div className="p-3 space-y-2">
        <VenueStatus
          venue={VENUES.POLYMARKET}
          name={VENUE_DISPLAY_NAMES[VENUES.POLYMARKET]}
        />
        <VenueStatus
          venue={VENUES.KALSHI}
          name={VENUE_DISPLAY_NAMES[VENUES.KALSHI]}
        />
      </div>
    </div>
  );
}

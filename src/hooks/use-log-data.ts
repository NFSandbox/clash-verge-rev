import useSWRSubscription from "swr/subscription";
import { useEnableLog } from "../services/states";
import { createSockette } from "../utils/websocket";
import { useClashInfo } from "./use-clash";
import dayjs from "dayjs";
import { getClashLogs } from "../services/cmds";

const MAX_LOG_NUM = 1000;

/**
 * Try parse and extract more detailed info from log string returned by clash core.
 *
 * @param logStr The string need to be parsed.
 * @returns `ILogItemDetail` object if parsed success, else `undefined`
 */
function parseLogDataString(logStr: string): ILogItemDetail | undefined {
  try {
    const regex =
      /\[(?<connType>[^\]]+?)\]\s+(?<source>[^\s]+?)(?:\((?<processName>[^\)]+?)\))?\s*?-->\s*?(?<target>[^\s]+?)\s+?match\s+?(?<match>[^\s]+?)(?:\((?<matchDetail>[^\)]+?)\))?\s+?using\s+?(?<using>.+?)$/;
    const match = logStr.match(regex);

    if (!match || !match.groups) {
      return undefined; // If the log string doesn't match the pattern
    }

    return {
      connType: match.groups.connType,
      source: match.groups.source,
      target: match.groups.target,
      processName: match.groups.processName, // Optional, could be undefined
      match: match.groups.match,
      matchDetail: match.groups.matchDetail, // Optional, could be undefined
      using: match.groups.using,
    };
  } catch (e) {
    return undefined;
  }
}

export const useLogData = () => {
  const { clashInfo } = useClashInfo();

  const [enableLog] = useEnableLog();
  !enableLog || !clashInfo;

  return useSWRSubscription<ILogItem[], any, "getClashLog" | null>(
    enableLog && clashInfo ? "getClashLog" : null,
    (_key, { next }) => {
      const { server = "", secret = "" } = clashInfo!;

      // populate the initial logs
      getClashLogs().then(
        (logs) => next(null, logs),
        (err) => next(err)
      );

      const s = createSockette(
        `ws://${server}/logs?token=${encodeURIComponent(secret)}`,
        {
          onmessage(event) {
            const data = JSON.parse(event.data) as ILogItem;

            // try use regex to extract more detailed log info
            const detailedData: ILogItem = {
              ...data,
              detail: parseLogDataString(data.payload),
            };

            // append new log item on socket message
            next(null, (l = []) => {
              const time = dayjs().format("MM-DD HH:mm:ss");

              if (l.length >= MAX_LOG_NUM) l.shift();
              return [...l, { ...detailedData, time }];
            });
          },
          onerror(event) {
            this.close();
            next(event);
          },
        }
      );

      return () => {
        s.close();
      };
    },
    {
      fallbackData: [],
      keepPreviousData: true,
    }
  );
};

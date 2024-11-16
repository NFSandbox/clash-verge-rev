import { useEffect } from "react";
import { useEnableLog } from "../services/states";
import { createSockette } from "../utils/websocket";
import { useClashInfo } from "./use-clash";
import dayjs from "dayjs";
import { create } from "zustand";

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

export type LogLevel = "warning" | "info" | "debug" | "error" | "all";

interface ILogItem {
  time?: string;
  type: string;
  payload: string;
  [key: string]: any;
}

const buildWSUrl = (server: string, secret: string, logLevel: LogLevel) => {
  const baseUrl = `ws://${server}/logs`;
  const params = new URLSearchParams();

  if (secret) {
    params.append("token", secret);
  }
  if (logLevel === "all") {
    params.append("level", "debug");
  } else {
    params.append("level", logLevel);
  }
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

interface LogStore {
  logs: Record<LogLevel, ILogItem[]>;
  clearLogs: (level?: LogLevel) => void;
  appendLog: (level: LogLevel, log: ILogItem) => void;
}

const useLogStore = create<LogStore>(
  (set: (fn: (state: LogStore) => Partial<LogStore>) => void) => ({
    logs: {
      warning: [],
      info: [],
      debug: [],
      error: [],
      all: [],
    },
    clearLogs: (level?: LogLevel) =>
      set((state: LogStore) => ({
        logs: level
          ? { ...state.logs, [level]: [] }
          : { warning: [], info: [], debug: [], error: [], all: [] },
      })),
    appendLog: (level: LogLevel, log: ILogItem) =>
      set((state: LogStore) => {
        const currentLogs = state.logs[level];
        const newLogs =
          currentLogs.length >= MAX_LOG_NUM
            ? [...currentLogs.slice(1), log]
            : [...currentLogs, log];
        return { logs: { ...state.logs, [level]: newLogs } };
      }),
  })
);

export const useLogData = (logLevel: LogLevel) => {
  const { clashInfo } = useClashInfo();
  const [enableLog] = useEnableLog();
  const { logs, appendLog } = useLogStore();

  useEffect(() => {
    if (!enableLog || !clashInfo) return;

    const { server = "", secret = "" } = clashInfo;
    const wsUrl = buildWSUrl(server, secret, logLevel);

    let isActive = true;
    const socket = createSockette(wsUrl, {
      onmessage(event) {
        if (!isActive) return;
        const data = JSON.parse(event.data) as ILogItem;
        const time = dayjs().format("MM-DD HH:mm:ss");

        // try use regex to extract more detailed log info
        const detailedData: ILogItem = {
          ...data,
          detail: parseLogDataString(data.payload),
        };

        appendLog(logLevel, { ...detailedData, time });
      },
      onerror() {
        if (!isActive) return;
        socket.close();
      },
    });

    return () => {
      isActive = false;
      socket.close();
    };
  }, [clashInfo, enableLog, logLevel]);

  return logs[logLevel];
};

// 导出清空日志的方法
export const clearLogs = (level?: LogLevel) => {
  useLogStore.getState().clearLogs(level);
};

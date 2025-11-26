
interface LogData {
  level: "INFO" | "ERROR" | "WARN";
  message: string;
  timestamp: string;
  [key: string]: any;
}

function log(level: "INFO" | "ERROR" | "WARN", message: string, data: object = {}) {
  const logObject: LogData = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  console.log(JSON.stringify(logObject));
}

export const logger = {
  info: (message: string, data: object = {}) => log("INFO", message, data),
  error: (message: string, data: object = {}) => log("ERROR", message, data),
  warn: (message: string, data: object = {}) => log("WARN", message, data),
};

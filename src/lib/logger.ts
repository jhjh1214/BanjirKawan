type Level = "debug" | "info" | "warn" | "error";

type Context = Record<string, unknown>;

function emit(level: Level, msg: string, context?: Context) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...context,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, context?: Context) => emit("debug", msg, context),
  info: (msg: string, context?: Context) => emit("info", msg, context),
  warn: (msg: string, context?: Context) => emit("warn", msg, context),
  error: (msg: string, context?: Context) => emit("error", msg, context),
};

import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logDir = './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function createLogger(destination: string) {
  return pino({
    level: 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      pid: false
    },
    transport: {
      targets: [
        {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:mm:ss',
            ignore: 'pid,hostname'
          },
          level: 'info'
        },
        {
          target: 'pino/file',
          options: {
            destination,
            mkdir: true
          },
          level: 'info'
        }
      ]
    }
  });
}

const logger = createLogger(path.join(logDir, 'bot.log'));

const guildLoggers = new Map<string, ReturnType<typeof createLogger>>();

export function getLoggerForGuild(guildId: string): ReturnType<typeof createLogger> {
  let guildLogger = guildLoggers.get(guildId);
  if (!guildLogger) {
    guildLogger = createLogger(path.join(logDir, 'guilds', guildId, 'bot.log'));
    guildLoggers.set(guildId, guildLogger);
  }
  return guildLogger;
}

export default logger;

import pino from 'pino';
import fs from 'fs';
import path from 'path';

const logDir = './logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = pino({
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
          destination: path.join(logDir, 'bot.log'),
          mkdir: true
        },
        level: 'info'
      }
    ]
  }
});

export default logger;

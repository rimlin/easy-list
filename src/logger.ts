import { Environment } from 'enums/environment';
import { CurrentEnvironment } from 'config/environment';

const addZero = (val) => val < 10 ? '0' + val : val;

const getLogHead = (sourceModule) => {
  const date = new Date();
  const time = `${addZero(date.getHours())}:${addZero(date.getMinutes())}:${addZero(date.getSeconds())}`

  return `${time} ${sourceModule}:`;
}

const allowedModules = [];

export class Logger {
  static debug(sourceModule, ...args) {
    if (CurrentEnvironment === Environment.PRODUCTION) {
      return;
    }

    if (allowedModules.length > 0) {
      if (allowedModules.includes(sourceModule) === false) {
        return;
      }
    }

    Function.prototype.apply.call(console.log, console, [getLogHead(sourceModule), ...args]);
  }

  static error(sourceModule, ...args) {
    Function.prototype.apply.call(console.error, console, [getLogHead(sourceModule), ...args]);
  }
}

import * as readlineSync from 'node:readline';
import readline from 'node:readline/promises';
import type { Interface as ReadlineInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export const colors = {
  reset: '\u001B[0m',
  dim: '\u001B[2m',
  red: '\u001B[31m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  blue: '\u001B[34m',
  cyan: '\u001B[36m',
  bold: '\u001B[1m',
};

export function colorize(color: keyof typeof colors, value: string): string {
  return `${colors[color]}${value}${colors.reset}`;
}

export async function withReadline<T>(
  work: (rl: ReadlineInterface) => Promise<T>,
): Promise<T> {
  const rl = readline.createInterface({ input, output });
  try {
    return await work(rl);
  } finally {
    rl.close();
  }
}

export async function promptText(
  rl: ReadlineInterface,
  label: string,
  defaultValue: string,
): Promise<string> {
  const answer = await rl.question(
    `${colorize('cyan', label)} ${colorize('dim', `(${defaultValue})`)} `,
  );

  return answer.trim() || defaultValue;
}

export async function promptConfirm(
  rl: ReadlineInterface,
  label: string,
  defaultValue: boolean,
): Promise<boolean> {
  const defaultLabel = defaultValue ? 'Y/n' : 'y/N';
  const answer = await rl.question(
    `${colorize('cyan', label)} ${colorize('dim', `(${defaultLabel})`)} `,
  );
  const normalized = answer.trim().toLowerCase();

  if (!normalized) {
    return defaultValue;
  }

  return normalized === 'y' || normalized === 'yes';
}

export async function promptSelect(
  label: string,
  options: Array<{ value: string; label: string }>,
): Promise<string> {
  if (!input.isTTY || !output.isTTY) {
    return options[0]?.value ?? '';
  }

  const selected = await runArrowSelect(label, options);
  output.write('\n');
  return selected;
}

async function runArrowSelect(
  label: string,
  options: Array<{ value: string; label: string }>,
): Promise<string> {
  return new Promise((resolve) => {
    let index = 0;

    const render = () => {
      readlineSync.cursorTo(output, 0);
      readlineSync.clearScreenDown(output);
      output.write(`${colorize('bold', label)}\n`);
      options.forEach((option, optionIndex) => {
        const prefix = optionIndex === index ? colorize('green', '>') : ' ';
        const text =
          optionIndex === index
            ? colorize('green', option.label)
            : option.label;
        output.write(`${prefix} ${text}\n`);
      });
      output.write(
        `${colorize('dim', 'Use up/down arrows, then press Enter.')}\n`,
      );
    };

    const cleanup = () => {
      if (input.isTTY) {
        input.setRawMode(false);
      }
      input.off('data', onData);
    };

    const onData = (buffer: Buffer) => {
      const key = buffer.toString('utf8');

      if (key === '\u0003') {
        cleanup();
        process.exit(130);
      }

      if (key === '\r') {
        const selected = options[index]?.value ?? '';
        cleanup();
        resolve(selected);
        return;
      }

      if (key === '\u001B[A') {
        index = index === 0 ? options.length - 1 : index - 1;
        render();
        return;
      }

      if (key === '\u001B[B') {
        index = index === options.length - 1 ? 0 : index + 1;
        render();
      }
    };

    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
    render();
  });
}

import { spawn } from 'node:child_process';

const [, , port, command, ...args] = process.argv;

if (!port || !command) {
  console.error(
    'Usage: node scripts/run-with-port.mjs <port> <command> [...args]',
  );
  process.exit(1);
}

function quoteShellArgument(value) {
  if (value.length === 0) {
    return '""';
  }

  if (!/[\s"&|<>^]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

const commandLine = [command, ...args].map(quoteShellArgument).join(' ');

const child = spawn(commandLine, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: String(port),
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

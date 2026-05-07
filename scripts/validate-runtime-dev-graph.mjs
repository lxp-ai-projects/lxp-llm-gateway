import { spawn } from 'node:child_process';

const EXPECTED_RUNTIME_TASKS = new Set([
  '@lxp/admin-api#dev',
  '@lxp/admin-web#dev',
  '@lxp/gateway-api#dev',
]);

function runTurboDryJson() {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === 'win32'
        ? spawn(
            'cmd.exe',
            [
              '/d',
              '/s',
              '/c',
              'pnpm.cmd exec turbo run dev --filter=@lxp/admin-web --dry=json',
            ],
            {
              stdio: ['ignore', 'pipe', 'pipe'],
            },
          )
        : spawn(
            'pnpm',
            ['exec', 'turbo', 'run', 'dev', '--filter=@lxp/admin-web', '--dry=json'],
            {
              stdio: ['ignore', 'pipe', 'pipe'],
            },
          );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Turbo dry run failed with exit code ${code}.\n${stderr || stdout}`,
          ),
        );
        return;
      }

      resolve(stdout);
    });

    child.on('error', reject);
  });
}

function normalizeTaskIds(payload) {
  return new Set((payload.tasks ?? []).map((task) => task.taskId));
}

function formatTaskList(taskIds) {
  return [...taskIds].sort().map((taskId) => `- ${taskId}`).join('\n');
}

const stdout = await runTurboDryJson();
const payload = JSON.parse(stdout);
const actualTaskIds = normalizeTaskIds(payload);

const unexpectedTaskIds = [...actualTaskIds].filter(
  (taskId) => !EXPECTED_RUNTIME_TASKS.has(taskId),
);
const missingTaskIds = [...EXPECTED_RUNTIME_TASKS].filter(
  (taskId) => !actualTaskIds.has(taskId),
);

if (unexpectedTaskIds.length > 0 || missingTaskIds.length > 0) {
  const message = [
    'Runtime dev graph drift detected.',
    '',
    'Expected tasks:',
    formatTaskList(EXPECTED_RUNTIME_TASKS),
    '',
    'Actual tasks:',
    formatTaskList(actualTaskIds),
  ].join('\n');

  throw new Error(message);
}

console.log('Runtime dev graph is stable.');
console.log(formatTaskList(actualTaskIds));

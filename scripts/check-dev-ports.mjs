import net from 'node:net';

const REQUIRED_PORTS = [
  { port: 3001, service: 'gateway-api' },
  { port: 3002, service: 'admin-api' },
  { port: 3003, service: 'admin-web' },
];

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error) {
        resolve(error.code !== 'EADDRINUSE');
        return;
      }

      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

const unavailablePorts = [];

for (const entry of REQUIRED_PORTS) {
  const available = await canListen(entry.port);
  if (!available) {
    unavailablePorts.push(entry);
  }
}

if (unavailablePorts.length > 0) {
  console.error('Unable to start local dev because required ports are already in use:\n');
  for (const entry of unavailablePorts) {
    console.error(`- ${entry.service}: ${entry.port}`);
  }
  console.error(
    '\nFree these ports first. This avoids Vite silently moving admin-web to a different port while the APIs fail on 3001/3002.',
  );
  process.exit(1);
}

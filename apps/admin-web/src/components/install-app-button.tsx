import { ActionIcon, Button } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useState } from 'react';

import { usePwaInstall } from '../lib/use-pwa-install';

export function InstallAppButton() {
  const { canInstall, promptInstall } = usePwaInstall();
  const [isPrompting, setIsPrompting] = useState(false);

  if (!canInstall) {
    return null;
  }

  async function handleInstall() {
    setIsPrompting(true);
    try {
      await promptInstall();
    } finally {
      setIsPrompting(false);
    }
  }

  return (
    <>
      <Button
        visibleFrom="sm"
        leftSection={<IconDownload size={16} />}
        loading={isPrompting}
        onClick={() => void handleInstall()}
        variant="light"
      >
        Install app
      </Button>
      <ActionIcon
        aria-label="Install app"
        hiddenFrom="sm"
        loading={isPrompting}
        onClick={() => void handleInstall()}
        variant="light"
      >
        <IconDownload size={16} />
      </ActionIcon>
    </>
  );
}

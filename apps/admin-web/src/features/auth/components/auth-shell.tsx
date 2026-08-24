import { Container } from '@mantine/core';
import type { PropsWithChildren } from 'react';

import { LanguageSelector } from '../../../components/language-selector';
import { AnimatedWaveBackground } from './animated-wave-background';

export function AuthShell({ children }: PropsWithChildren) {
  return (
    <main className="auth-page" data-testid="auth-shell">
      <AnimatedWaveBackground />
      <div className="auth-language-selector">
        <LanguageSelector compact />
      </div>
      <Container className="auth-shell-container" size={1180}>
        {children}
      </Container>
    </main>
  );
}

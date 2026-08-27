'use client';

import { useApplyTheme, useTheme } from '@/hooks/useTheme';

/**
 * Keeps the document in step with the appearance preference for as long as the
 * app is open — including the moment a scheduled night theme turns over while
 * a session is running.
 *
 * Renders nothing; it exists purely for the effect. The first paint is already
 * themed by the inline script in the layout.
 */
export function ThemeController() {
  const { theme, isLoaded } = useTheme();
  useApplyTheme(theme, isLoaded);
  return null;
}

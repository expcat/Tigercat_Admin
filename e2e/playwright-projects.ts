import { devices, type Project } from '@playwright/test';

export const PLAYWRIGHT_MOBILE_VIEWPORT = { width: 375, height: 812 };
export const PLAYWRIGHT_MOBILE_TAG_RE = /@mobile/;
export const PLAYWRIGHT_DARK_TAG_RE = /@dark/;
export const PLAYWRIGHT_VIEWPORT_TAG_RE = /@mobile|@dark/;

const desktopChrome = devices['Desktop Chrome'];

/**
 * Desktop projects skip tagged @mobile / @dark cases so the default suite
 * does not rerun the same files at extra viewports. Mobile (375) and dark
 * colorScheme projects grep only those tags.
 */
export function shellProjects(options: {
  reactName: string;
  vueName: string;
  reactBaseURL: string;
  vueBaseURL: string;
}): Project[] {
  return [
    {
      name: options.reactName,
      grepInvert: PLAYWRIGHT_VIEWPORT_TAG_RE,
      use: { ...desktopChrome, baseURL: options.reactBaseURL },
    },
    {
      name: options.vueName,
      grepInvert: PLAYWRIGHT_VIEWPORT_TAG_RE,
      use: { ...desktopChrome, baseURL: options.vueBaseURL },
    },
    {
      name: `${options.reactName}-mobile`,
      grep: PLAYWRIGHT_MOBILE_TAG_RE,
      use: {
        ...desktopChrome,
        viewport: PLAYWRIGHT_MOBILE_VIEWPORT,
        isMobile: true,
        hasTouch: true,
        baseURL: options.reactBaseURL,
      },
    },
    {
      name: `${options.vueName}-mobile`,
      grep: PLAYWRIGHT_MOBILE_TAG_RE,
      use: {
        ...desktopChrome,
        viewport: PLAYWRIGHT_MOBILE_VIEWPORT,
        isMobile: true,
        hasTouch: true,
        baseURL: options.vueBaseURL,
      },
    },
    {
      name: `${options.reactName}-dark`,
      grep: PLAYWRIGHT_DARK_TAG_RE,
      use: {
        ...desktopChrome,
        colorScheme: 'dark',
        baseURL: options.reactBaseURL,
      },
    },
    {
      name: `${options.vueName}-dark`,
      grep: PLAYWRIGHT_DARK_TAG_RE,
      use: {
        ...desktopChrome,
        colorScheme: 'dark',
        baseURL: options.vueBaseURL,
      },
    },
  ];
}

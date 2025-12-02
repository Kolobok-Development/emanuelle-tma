// import {
//   setDebug,
//   mountBackButton,
//   restoreInitData,
//   init as initSDK,
//   mountMiniAppSync,
//   bindThemeParamsCssVars,
//   mountViewport,
//   bindViewportCssVars,
//   mockTelegramEnv,
//   type ThemeParams,
//   themeParamsState,
//   retrieveLaunchParams,
//   emitEvent,
// } from '@telegram-apps/sdk-react';


import { init as initSDK,
  setDebug,
  mockTelegramEnv,
  retrieveLaunchParams,
  emitEvent,
  backButton,
  miniApp,
  viewport,
  themeParams,

  } from '@tma.js/sdk-react';

/**
 * Initializes the application and configures its dependencies.
 */
export async function init(options: {
  debug: boolean;
  eruda: boolean;
  mockForMacOS: boolean;
}): Promise<void> {
  // Set @telegram-apps/sdk-react debug mode and initialize it.
  setDebug(options.debug);
  initSDK();

  // Add Eruda if needed.
  options.eruda &&
    void import('eruda').then(({ default: eruda }) => {
      eruda.init();
      eruda.position({ x: window.innerWidth - 50, y: 0 });
    });

  // Telegram for macOS has a ton of bugs, including cases, when the client doesn't
  // even response to the "web_app_request_theme" method. It also generates an incorrect
  // event for the "web_app_request_safe_area" method.
    if (options.mockForMacOS) {
      const noInsets = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      } as const;

      mockTelegramEnv({
        onEvent(event) {
          // Telegram for macOS: emulate theme & safe area replies.

          if (event.name === 'web_app_request_theme') {
            // Use theme from launch params as a source of truth.
            const lp = retrieveLaunchParams();
            const themeParams = lp.tgWebAppThemeParams ?? {};

            return emitEvent('theme_changed', {
              theme_params: themeParams,
            });
          }

          if (event.name === 'web_app_request_safe_area') {
            return emitEvent('safe_area_changed', noInsets);
          }

          // For all other events do nothing – they’ll be handled as usual.
        },
      });
    }

  // Mount all components used in the project.
  backButton.mount();
  themeParams.mount();
  miniApp.mount();


  if (themeParams.bindCssVars.isAvailable()) {
    themeParams.bindCssVars();
  }

  if (miniApp.bindCssVars.isAvailable()) {
    miniApp.bindCssVars();
  }

  if (viewport.bindCssVars.isAvailable()) {
    viewport.bindCssVars();
    viewport.safeAreaInsetTop();
    viewport.safeAreaInsets();
  }

}

// playwright.config.ts
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
    // Each test is given 30 seconds
    timeout: 30000,

    // Max retries 2 for each test (i.e, 3 tests max)
    retries: 2,

    // Abort when there are systematic failures
    maxFailures: 50,

    // Specify number of workers
    workers: 100,

    // Reporting output
    reporter: [["dot", {omitFailures: true}]],

    // Do not report slow test file
    reportSlowTests: null,


    // Specify browsers
    projects: [
        {
            name: 'chromium',
            use: {
                    browserName: "chromium",
                    //...devices['Desktop Chrome'],
                    // devices info: https://github.com/microsoft/playwright/blob/fba523a9d04983bc69aa691ef0c0df64a8d02ac1/packages/playwright-core/src/server/deviceDescriptorsSource.json
                    ignoreHTTPSErrors: true,
                    viewport: null,
            },
        },
        {
            name: 'firefox',
            use: { 
                    browserName: "firefox",
                    //...devices['Desktop Firefox'],
                    ignoreHTTPSErrors: true,
                    viewport: null,
            },
        },
        {
            name: 'webkit',
            use: { 
                     browserName: "webkit",
                     //...devices['Desktop Safari'],
                     ignoreHTTPSErrors: true,
                     viewport: null,
            },
        },
    ],
};
export default config;

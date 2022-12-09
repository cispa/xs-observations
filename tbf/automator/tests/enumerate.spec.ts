import { test, expect } from '@playwright/test'
import { Client } from 'pg'

// Global conf for all test runs
const opg_base = process.env.opg_base || "http://localhost:8001/opg";
const echo_base = process.env.echo_base || "http://127.0.0.1:8000/echo"; //"https://172.17.0.1:44300/echo";

// Conf for current run
const inc = process.env.inc_method || "img"; //"window.open";
let resp_ids
try {
    resp_ids = JSON.parse(process.env.resp_ids)
} catch (e) {
    console.log(e.message);
    resp_ids = [0]
}

// Test every test twice
const runs = [0, 1];

let browser_name;
let version;
let headless;

test.describe("tbf", () => {

    let client;
    // Run before each test
    // beforeAll does not work, as every parallel test is executed in its own process:
    // https://playwright.dev/docs/api/class-test#test-describe-parallel
    test.beforeEach(async ({browser, browserName}) => {
        client = new Client();
        await client
            .connect()
            .then()
            .catch(err => {
                console.error('connection error', err.stack);
                throw Error('connection error');
            });
        browser_name = browserName;
        version = browser.version();
        // Make sure that the env variable is set when in headed mode, and not set otherwise
        headless = process.env.headless || "True";
    });

    test.afterEach(async () => {
        await client
            .end()
            .then()
            .catch(err => console.error('error during disconnection', err.stack));
    });

    // All individual tests, can be executed in parallel (up to workers)
    test.describe.parallel("tests", () => {
        for (const run of runs) {
            for (const resp_id of resp_ids) {
                test(`${run}-${inc}-${resp_id}`, async ({page}, testInfo) => {
                    // Only run every test three times (0, 1, 2, with 3 save as impossible)
                    let test_url = `${opg_base}/${inc}/?url=${echo_base}/${resp_id}/`
                    let data_json = JSON.stringify("");
                    let notes = "";
                    let error = false;
                    // const test_url = `${opg_base}/${inc}/?url=${echo_base}/${resp_id}/&browser=${browser_name}&version=${version}&wait_time=${wait_time}&retest=${retest}&headless=${headless}`
                    if (inc === "window.open") {
                        try {
                            const [popup] = await Promise.all([
                                // It is important to call waitForEvent before click to set up waiting.
                                page.waitForEvent('popup', {timeout: 500}), // max 500 ms, code 204, 205, (304) are not firing a popup event (even though a new window is opened)
                                // context.waitForEvent("page"),  // The empty about:blank tab, also does not fire a "page" event, nor is in the context.pages() array
                                // Opens popup.
                                page.goto(test_url, {waitUntil: "networkidle", timeout: 2000}),
                            ]);
                            // Wait for the opened site
                            // Responses that cause a download cannot be waited for (no popup created)
                            // Some responses (e.g., empty videos) do not fire networkidle event, instead wait for domcontentloaded?
                            // In Firefox videos/audio etc. do not fire domcontentloaded
                            // Solution: wait for either one
                            await Promise.any([
                                popup.waitForLoadState("networkidle", {timeout: 1000}),
                                popup.waitForLoadState("domcontentloaded", {timeout: 1000})
                                ]);
                        } catch (err) {
                            notes = err.message;
                            // notes = "No popup event";
                        }
                    } else {
                        try {
                            await page.goto(test_url, {waitUntil: "networkidle", timeout: 2000});
                        } catch (err) {
                            notes = err.message;
                            // notes = "No networkidle event";
                        }
                    }
                    try {
                        // Wait for the test element to be added to the DOM
                        await page.locator("id=randomWaitElemId01234").waitFor(
                            { state: "attached", timeout: 20000});
                        // Sleep additional Xms
                        await page.waitForTimeout(750);
                        // Extract the data
                        await page.evaluate(() => after_obs());
                        await page.waitForTimeout(100);
                        data_json = await page.evaluate(() => JSON.stringify(record_observations()));
                        // Ensure the data was read
                        expect(data_json.length).not.toBe(0);
                    } catch (e) {
                        // When something went wrong with the data collection set error property
                        notes = e.message;
                        error = true;
                    }
                    // Save data to db
                    const query = {
                        text:
                            `INSERT INTO 
                             observations(browser, version, headless, url, url_id, inc_method, run, retry, observation, error, notes)
                             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                             `,
                        values: [browser_name, version, headless, test_url, resp_id, inc, run, testInfo.retry, data_json, error, notes]
                    }
                    await client.query(query)
                        .then()
                        .catch(e => {
                            throw Error(e.stack)
                        });
                    // Retry if error is set, up to retry count
                    expect(error).not.toBeTruthy();
                });
            }
        }
    });
});

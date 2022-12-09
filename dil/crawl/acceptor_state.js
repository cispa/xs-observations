const {get_locators} = require('./locators');
const {get_client, execute_query} = require("./utilities");


const accept = async (site, rank, timeout, load_timeout, page, context, info, browser, version) => {
    let locators = [];
    let locator_count = 0;
    let clicked_count = 0;
    let clicked = [];
    let cookies_new = [];
    let cookies_removed = [];
    let cookies_changed = [];
    let error = "";
    let cookies_before = [];
    let cookies_after = [];
    let els = new Set();
    let client = await get_client();
    try {

        // Open page
        await page.goto(`https://${site}/`, {waitUntil: "load", timeout: load_timeout});

        // Wait 2s, clicking to early can be a problem
        await page.waitForTimeout(2000);
        cookies_before = await context.cookies();

        // Get all locators
        const locator_promises = get_locators(page, timeout);
        await Promise.allSettled(locator_promises)
            .then((results) => results.forEach((result) => {
                if (result.status === "fulfilled") {
                    locator_count += 1;
                    locators.push(result.value);
                }
            }));

        // Get only the ones pointing to unique elements
        for (let locator of locators) {
            try {
                let e2 = await locator.elementHandle({timeout: 2000});
                let unequal_count = 0;
                for (let loc1 of els) {
                    let e1 = await loc1.elementHandle({timeout: 2000});
                    let equal = false;
                    // We can only compare elementHandles belonging to the same frame
                    if (locator.frameId === loc1.frameId) {
                        equal = await page.evaluate(([e1, e2]) => e1 === e2, [e1, e2]);
                    }
                    if (!equal) {
                        unequal_count += 1;
                    }
                }
                if (unequal_count === els.size) {
                    els.add(locator);
                }
            } catch (e) {
                // console.log(e);
            }
        }
        // Screenshot before clicking
        let url = encodeURIComponent(await page.url());
        // console.log(url);
        await page.screenshot({ path: `screenshots/${Math.floor(rank/100)}/${rank}_${site}_${info}_01_before_${url}.png` });
        // Click on all unique elements
        for (let el of els) {
            try {
                await el.first().hover({timeout: 2000});
                await el.first().click({timeout: 2000});
                clicked_count += 1;
                clicked.push(el);
                await page.waitForTimeout(100);
            } catch (e) {
                // console.log(e);
            }
        }

        // Wait an additional 2s
        await page.waitForTimeout(2000);

        url = encodeURIComponent(await page.url());
        // Screenshot after clicking
        await page.screenshot({ path: `screenshots/${Math.floor(rank/100)}/${rank}_${site}_${info}_02_after_${url}.png` });

        // Cookie analysis
        cookies_after = await context.cookies();

        // Convert cookie list to dict
        let c_b_d = {}
        let c_a_d = {}
        for (let c of cookies_before) {
            c_b_d[`${c.name}-${c.domain}`] = c;
        }
        for (let c of cookies_after) {
            c_a_d[`${c.name}-${c.domain}`] = c;
        }
        let c_before = Object.keys(c_b_d);
        let c_after = Object.keys(c_a_d);

        // Removed and changed cookies
        for (let cookie of c_before) {
            if (cookie in c_a_d) {
                let c1 = c_b_d[cookie];
                let c2 = c_a_d[cookie];
                if (c1.value !== c2.value) {
                    // Changed cookies (values)
                    cookies_changed.push(cookie);
                }
            } else {
                // Removed cookies
                cookies_removed.push(cookie);
            }
        }

        // Added cookies
        for (let cookie of c_after) {
            if (!(cookie in c_b_d)) {
                cookies_new.push(cookie);
            }
        }

        // Success if we clicked something and the cookies changed!
        if ((clicked_count !== 0) && ((cookies_new.length !== 0) || (cookies_removed.length !== 0) || (cookies_changed.length !== 0))) {
            return true;
        } else {
            return false;
        }

    } catch (e) {
        // console.log(e);
        error = e.message;
        return false;
    } finally {
        // Save data to db
        const query = {
            text:
                `INSERT INTO accept(site, rank, browser, version, clicked_count, clicked, locator_count, unique_locators, locators,
                                    cookies_before, cookies_after, cookies_new, cookies_removed, cookies_changed, error)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `,
            values: [site, rank, browser, version, clicked_count, JSON.stringify(clicked), locator_count, els.size, JSON.stringify(locators), JSON.stringify(cookies_before), JSON.stringify(cookies_after),
                JSON.stringify(cookies_new), JSON.stringify(cookies_removed), JSON.stringify(cookies_changed), error]
        }
        await execute_query(client, query);
        await client.end();
    }
}

exports.accept = accept;

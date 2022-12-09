const {accept} = require('./acceptor_state');
const {chromium, firefox, webkit} = require("playwright");

let run = async () => {
    let site = process.argv[2];
    let rank = process.argv[3];
    let timeout = parseInt(process.argv[4]);
    let load_timeout = parseInt(process.argv[5]);
    let browser_name = "chromium";

    console.log(site);
    let browser;
    if (browser_name === "chromium") {
        browser = await chromium.launch({
            headless: false,
        });
    } else if (browser_name === "firefox") {
        browser = await firefox.launch({
            headless: false,
        });
    } else if (browser_name === "webkit") {
        browser = await webkit.launch({
            headless: false
        });
    } else {
        console.log(`${browser_name} not supported`);
        return;
    }
    const context = await browser.newContext({
        viewport: {width: 1920, height: 1080}
    });

// Open new page
    const page = await context.newPage();

    let exit_code = 0;
    accept(site, rank, timeout, load_timeout, page, context)
        .then(r => console.log(r))
        .catch(e => {
            console.log(e);
            exit_code = 1;
        })
        .finally(async () => {
            await context.close();
            await browser.close();
            process.exit(exit_code)
        });
}

run()
    .then()
    .catch();
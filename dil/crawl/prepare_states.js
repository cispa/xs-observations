const {accept} = require("./acceptor_state");
const { exec_command } = require("./utilities");

const prepare_states = async (site, rank, states, load_timeout, button_timeout, browser, info, browser_name, version, ignoreHTTPSErrors) => {
    let working_states = [];
    for (let state of states) {
        let context = await browser.newContext({viewport: null, ignoreHTTPSErrors: ignoreHTTPSErrors});
        // Open new page
        const page = await context.newPage();
        if (state === "_ano") {
            working_states.push("_ano");
        } else if (state.startsWith("_visited")) {
            try {
                await page.goto(`https://${site}/`, {waitUntil: "load", timeout: load_timeout});
                working_states.push(state);
            } catch (e) {
                // console.log(e);
            }
        } else if (state === "_accepted") {
            try {
                let worked = await accept(site, rank, button_timeout, load_timeout, page, context, info, browser_name, version);
                if (!worked) {
                    // console.error(`Accept did not work for ${site} ${info}`);
                } else {
                    working_states.push("_accepted");
                }
            } catch (e) {
                // console.log(e);
            }
        } else if (state === "_login") {
            try {
                // Load context from existing file
                // (Problem: invalid session/session bound to user-agent or similar: does not seem to be used on top 10 websites)
                await context.close();
                base_path = "/data/data/account_framework/auth";  // ToDo: make base_path configurable
                // context = await browser.newContext({viewport: null, ignoreHTTPSErrors: ignoreHTTPSErrors, storageState: `${base_path}/${site}.json`})
                await exec_command(`cp ${base_path}/${site}.json context_dir/${Math.floor(rank/100)}/${rank}_${site}_${state}_${info}.json`)

                // Future improvement: replay login script to have a fresh new login state, or login with another tool (however this might fail)!
                
                // Push if loading of state worked
                working_states.push("_login");
            } catch (e) {
                console.log(e)
            }
        } else {
            console.log(`State: ${state} not supported!`);
        }
        
        if (state !== "_login") {
            // Save storage state into the file.
            await context.storageState({path: `context_dir/${Math.floor(rank/100)}/${rank}_${site}_${state}_${info}.json`});
            await context.close();
        }
    }
    return working_states;
}

exports.prepare_states = prepare_states;
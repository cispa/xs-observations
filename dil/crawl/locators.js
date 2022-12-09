const page_locators = [
    '[aria-label="Agree\\ to\\ the\\ use\\ of\\ cookies\\ and\\ other\\ data\\ for\\ the\\ purposes\\ described"]',
    '[aria-label="Our\\ use\\ of\\ cookies\\ and\\ other\\ technologies"] button:has-text("Accept All")',
    '[aria-label="Agree\\ to\\ our\\ data\\ processing\\ and\\ close"]',
    '[aria-label="Accept\\ privacy\\ terms\\ and\\ settings"]',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    'div[role="button"]:has-text("Accept all cookies")',
    '#modalWrapMTubes >> text=I am 18 or older - Enter',
    '[data-testid="cookie_banner_accept_button"]',
    'text=Allow essential and optional cookies',
    '[aria-label="Privacy"] >> text=Accept All',
    "text=I'm 18 or older", '[aria-label="OK"]',
    'button:has-text("Cookies akzeptieren")',
    'text=I am 18 years old or older ENTER',
    'button:has-text("Agree and Continue")',
    'button:has-text("Accept all cookies")',
    'a[role="button"]:has-text("I ACCEPT")',
    '[aria-label="Accept\\ all\\ cookies"]',
    '#CybotCookiebotDialogBodyButtonAccept',
    ':nth-match(:text("AGREE & EXIT"), 3)',
    ':nth-match(:text("AGREE & EXIT"), 2)',
    'button:has-text("Alle akzeptieren")',
    'button:has-text("Accept cookies")',
    'button:has-text("Accept Cookies")',
    'button:has-text("Ich stimme zu")',
    'text=Yes, I agree Yes, I agree',
    'button:has-text("Akzeptieren")',
    ':nth-match(:text("Accept"), 2)',
    'text=Alle Cookies akzeptieren',
    'input:has-text("Akzeptieren")',
    'buttos:has-text("Enable all")',
    'button:has-text("Accept all")',
    ':nth-match(:text("AGREE"), 2)',
    'button:has-text("I Consent")',
    '[data-testid="close-button"]',
    '#onetrust-accept-btn-handler',
    'button:has-text("I Accept")',
    'button:has-text("CONTINUE")',
    '[data-testid="GDPR-accept"]',
    '#offers >> :nth-match(a, 3)',
    'button:has-text("I agree")',
    ':nth-match(:text("OK"), 2)',
    'button:has-text("Accept")',
    '[aria-label="Close"] path',
    'text=Cookies akzeptieren',
    'button:has-text("Agree")',
    'text=Accept all cookies',
    'text=Accept All Cookies',
    'a:has-text("Continue")',
    '[aria-label="Consent"]',
    'button:has-text("Ok")',
    'button:has-text("OK")',
    'a:has-text("I AGREE")',
    '[aria-label="close"]',
    '[aria-label="Close"]',
    '#cookieChoiceDismiss',
    'text=Accept cookies',
    'text=Accept Cookies',
    'text=Allow cookies',
    'text=Akzeptieren',
    'text=√óClose',
    'text=OK, Got it',
    'text=CloseClose',
    'text=Accept all',
    'text=Accept All',
    'text=Zulassen',
    'text=Annehmen',
    'text=‚úï',
    'text=Turn On',
    'text=Got It!',
    'text=Dismiss',
    'text=Confirm',
    'text=Got it',
    'text=GOT IT',
    'text=Accept',
    'text=√ó',
    'text=Close',
    'text=Okay',
    'text=Hide',
]

const frame_locators = [
    ['pop-frame09253968062310999', 'a:has-text("Standardeinstellung übernehmen")'],
    ['sp_message_iframe_538317', 'text=Alle akzeptieren und weiterlesen'],
    ['sp_message_iframe_597167', 'button:has-text("Yes, I Accept")'],
    ['sp_message_iframe_524529', 'button:has-text("YES, I AGREE")'],
    ['sp_message_iframe_524524', 'button:has-text("YES, I AGREE")'],
    ['pop-frame05375348474400288', 'text=I accept all cookies'],
    ['sp_message_iframe_598404', 'button:has-text("AGREE")'],
    ['gdpr-consent-notice', 'button:has-text("Accept All")'],
    ['sp_message_iframe_597005', 'text=Yes, I’m happy'],
    ['pop-frame044843285895569107', 'text=Accept all'],
    ['pop-frame08104335420443424', 'text=Accept All'],
    ['sp_message_iframe_617100', 'text=Accept'],
    ['offer_1ba832542a79dffcf4c9-0', 'button'],
    ['consent-iframe', 'text=Accept All'],
]


const get_locators = (page, timeout) => {
    let promises = []
    for (let locator_text of page_locators) {
        promises.push(new Promise(async (resolve, reject) => {
            try {
                let locator = page.locator(locator_text);
                await locator.waitFor({state: "visible", timeout: timeout});
                resolve(locator);
            } catch (e) {
                reject();
            }
        }));
    }

    for (let frame_info of frame_locators) {
        promises.push(new Promise(async (resolve, reject) => {
            try {
                let frame = await page.frame({
                    name: frame_info[0]
                });
                let locator = frame.locator(frame_info[1]);
                await locator.waitFor({state: "visible", timeout: timeout});
                resolve(locator);
            } catch (e) {
                reject();
            }
        }));
    }
    return promises
}

exports.get_locators = get_locators;
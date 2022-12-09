# Does-it-leak pipeline

Scan websites for XS-Leaks:
- natively supported attack modes: visit inference (chromium and firefox) and cookie acceptance inference (chromium only)
- other states (e.g., for login detection) can be provided externally

## Installation
- Prerequisites:
  - [Poetry](https://python-poetry.org/) with python 3.9.6 has to be installed
  - Node.js (17.8) has to be installed
  - Running TBF
  - Running postgresql instance
  - (Xvfb and x11vnc)
- Install python dependencies with: `poetry install`
- Install node.js dependencies with: `npm install`


## Run DIL.py to find XS-Leaks
- Start xvfb:
```
export DISPLAY=:99
Xvfb $DISPLAY -screen 0 1920x1080x16 -maxclients 2048 -listen tcp &
x11vnc -display $DISPLAY -bg -forever -nopw -quiet -listen localhost -xkb
```
- For visit inference and cookie acceptance inference:
  - Start the dil pipeline: `poetry run python dil.py --mode dil`; See `--help` for options
- For using other states:
  - Start: `poetry run python dil.py --mode dil-login`
  - Prepare [storage_states](https://playwright.dev/python/docs/auth#reuse-signed-in-state) for every site at `/data/data/account_framework/auth/{site}.json`, this state will be compared to the visited state
  - Start each site by running `potery run python zmq_dil.py {site}`
- Note that the startup can take quite some time as all decision trees are loaded in h2o.
- To test your own site instead of popular Tranco sites use: `--site {site}`.

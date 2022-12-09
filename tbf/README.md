# Test Browser Framework

Framework to test browsers comprehensively for information leaking observation channels.

## Installation
- Prerequisites:
  - [Poetry](https://python-poetry.org/) with python 3.9.6 has to be installed
  - Node.js (17+) has to be installed
  - Postgresql
- Install python dependencies with: `poetry install`
- Install node.js dependencies with: `cd automator; npm install`
- Update `/etc/hosts/`:
```
127.0.0.1 echo.org
127.0.0.1 echo2.org
127.0.0.1 observer.org
```

## Parts of the Framework

### [Echo application/response space](echo/README.md)
- Initialize the response space: `cd echo; poetry run python file_creator.py; poetry run python url_creator create True`.
- To extend the used respponse space, update `url_creator.py`.
- Start with `cd echo; poetry run uwsgi --ini uwsgi.ini` or `poetry run python manage.py runserver`.
- Available at http://echo.org:8000/ and https://echo.org:44300/

### [Observer/Observation page generator](observer/README.md)
- Start with `cd observer; poetry run uwsgi --ini uwsgi.ini` (or set `DEBUG=True` in `observer/settings.py` and run `poetry run python manage.py runserver 8001`).
- To extend the available inclusion methods or observation methods, follow the instructions in the [Observer README](observer/README.md).
- Available at http://observer.org:8001

### Automator
- Visits every observation page for every response using playwright. (The postgres database has to be correctly initialized.)
- Start with `cd automator; poetry run python run_browsers.py` (see `--help` for options).

### Data analysis and tree creation
- See the `.ipynb` files in `data_analysis`.
- To create the visual representation of the trees, `h2o_jar` in `helper.py` has to point to a local h2o installation.
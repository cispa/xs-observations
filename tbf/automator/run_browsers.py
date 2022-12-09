import os
import sys
import argparse
import subprocess
import time

import psycopg2
import json
import random

import requests
from tqdm import trange, tqdm
from distutils.util import strtobool

import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def setup_database():
    """Setup database"""

    # Create db if not exist
    p = subprocess.Popen(["createdb"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    output, error = p.communicate()
    if p.returncode != 0:
        test_string = "already exists"
        if test_string in error.decode("utf-8"):
            print("DB already exists, continue")
        else:
            raise Exception(error)

    # Create table if not exist
    conn = psycopg2.connect()
    cursor = conn.cursor()
    create_table = """CREATE TABLE IF NOT EXISTS observations (
                      id serial PRIMARY KEY,
                      browser text NOT NULL,
                      version text NOT NULL,
                      headless bool NOT NULL,
                      url text NOT NULL,
                      url_id integer NOT NULL,
                      inc_method text NOT NULL,
                      run integer NOT NULL,
                      retry integer NOT NULL,
                      insertion_time timestamp NOT NULL DEFAULT current_timestamp(0),
                      observation jsonb NOT NULL,
                      error bool NOT NULL,
                      notes text NOT NULL
                     )"""
    cursor.execute(create_table)
    conn.commit()
    conn.close()

errors = []
def run_project(project, workers, headed, timeout):
    """Run the playwright script"""

    # Wake up echo and opg
    # (uwsgi restarts workers after the first request after some time)
    try:
        r = requests.get(os.environ["echo_base"], verify=False)
        r = requests.get(os.environ["opg_base"], verify=False)
    except Exception:
        time.sleep(2)
        try:
            r = requests.get(os.environ["echo_base"], verify=False)
            r = requests.get(os.environ["opg_base"], verify=False)
        except Exception:
            time.sleep(2)
            r = requests.get(os.environ["echo_base"], verify=False)
            r = requests.get(os.environ["opg_base"], verify=False)


    global errors
    if headed:
        os.environ["headless"] = "False"
        cmd = []
        if sys.platform == "linux":
            # Start xvfb
            [cmd.append(val) for val in ["xvfb-run", "-a", "-l", "-s", "-maxclients 2048"]]
        elif sys.platform == "darwin":
            pass
        else:
            print(f"System {sys.platform} not supported")
            sys.exit(-1)
        [cmd.append(val) for val in ["npx", "playwright", "test", "--project", project, "--workers", str(workers),
                                     "--headed"]]
    else:
        os.environ["headless"] = "True"
        cmd = ["npx", "playwright", "test", "--project", project, "--workers", str(workers)]
    try:
        subprocess.check_call(cmd, stdout=sys.stdout, stderr=subprocess.STDOUT, timeout=timeout)
    except subprocess.TimeoutExpired as e:
        print("Timeout")
        errors.append((os.environ["inc_method"], os.environ["sample_start"], project, e))
    except subprocess.CalledProcessError as e:
        print("At least one test was unsuccessful")
        errors.append((os.environ["inc_method"], os.environ["sample_start"], project, e))


worker_dict = {}
def get_workers(project):
    """Get workers"""
    return worker_dict[project]


def change_workers(project, workers):
    worker_dict[project] = workers


def test_browsers(args):
    """Test specified browsers"""
    cpus = os.cpu_count()
    if args.browsers == "all":
        browsers = ["chromium", "firefox", "webkit"]
    elif args.browsers == "cf":
        browsers = ["chromium", "firefox"]
    else:
        browsers = [args.browsers]

    if args.incs == "all":
        inclusion_methods = [
            "script", "link-stylesheet", "link-prefetch", "img", "iframe", "video", "audio", "object", "embed",
            "embed-img",
            "iframe-dircsp",
            "fetch-creds-cors", "fetch-creds-no-cors", "fetch-creds-cors-manual", "fetch-creds-no-cors-integrity",
            "fetch-creds-cors-integrity",
            "window.open", "style-import", "double-script",
            "iframe-csp",
        ]
    else:
        inclusion_methods = [args.incs]

    # Test all browsers
    for project in tqdm(browsers, position=2, leave=True, desc="Browsers"):
        # Test all inclusion methods
        for inc in tqdm(inclusion_methods, position=1, leave=True, desc="Inclusion methods"):
            os.environ["inc_method"] = inc

            workers = get_workers(project)
            if args.load_balancing:
                # Reduce workers if load is too high
                current_load = os.getloadavg()[0]/cpus
                diff = args.load_goal - current_load
                if diff < 0:
                    workers = round(max(args.min_workers, workers + 0.1 * workers * diff))
            print(f"Run {inc} for {project} with {workers} workers")
            # Run project
            run_project(project, workers, args.headed, args.timeout)

            if args.load_balancing:
                # Adapt workers according to load (in both directions)
                own_load = os.getloadavg()[0]/cpus
                diff = args.load_goal - own_load
                workers = round(min(args.max_workers, workers + 0.1 * workers * diff))
                change_workers(project, workers)


def test_responses(args):
    """Test all responses"""
    # Set current responses

    start = args.start
    end = args.end
    sample_rate = args.sample_rate  # Sample rate
    ids_run = args.ids_run  # How many ids per run
    step = int(ids_run / sample_rate)
    random.seed(args.seed)

    for i in trange(start, end, step, position=0, leave=True, desc="Responses"):
        sample_start = i
        os.environ["sample_start"] = str(i)
        sample_end = min(end, i + step)
        if ids_run > (sample_end - sample_start):
            ids_run = sample_end - sample_start
        resp_ids = random.sample(range(sample_start, sample_end), ids_run)
        os.environ["resp_ids"] = json.dumps(resp_ids)
        test_browsers(args)


def main(args):
    """Main"""
    # Database setup
    os.environ["PGHOST"] = args.PGHOST
    os.environ["PGUSER"] = args.PGUSER
    os.environ["PGDATABASE"] = args.PGDATABASE
    os.environ["PGPASSWORD"] = args.PGPASSWORD
    os.environ["PGPORT"] = args.PGPORT
    setup_database()

    # Echo and observation setup
    os.environ["echo_base"] = args.echo_base
    os.environ["opg_base"] = args.opg_base

    # Start the test
    change_workers("webkit", args.workers)
    change_workers("firefox", args.workers)
    change_workers("chromium", args.workers)
    test_responses(args)
    print(errors)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)

    # Database settings
    parser.add_argument("--PGHOST", type=str, default="localhost",
                        help="Postgres host")
    parser.add_argument("--PGUSER", type=str, default=os.environ.get("USER"),
                        help="Postgres user")
    parser.add_argument("--PGDATABASE", type=str, default=os.environ.get("USER"),
                        help="Database to use")
    parser.add_argument("--PGPASSWORD", type=str, default="",
                        help="PW of postgres user")
    parser.add_argument("--PGPORT", type=str, default="5432",
                        help="Port of postgres instance")

    # Echo and observer settings
    parser.add_argument("--echo_base", type=str, default="https://echo.org:44300/echo",
                        help="Address of echo application")
    parser.add_argument("--opg_base", type=str, default="http://observer.org:8001/opg",
                        help="Address of observer application")

    # Playwright settings
    parser.add_argument("--timeout", type=int, default=500,
                        help="Timeout (seconds) of a single npx run")
    parser.add_argument("--headed", type=lambda x: bool(strtobool(str(x))), default=True,
                        help="Whether to use headful (True) or headless (False) browsers")
    parser.add_argument("--browsers", type=str, default="cf",
                        help="'all' for all browsers, or 'chromium', 'firefox', 'webkit' for only one browser or 'cf'")
    parser.add_argument("--workers", type=int, default=100,
                        help="Starting number of workers, will be adapted by load_goal")
    parser.add_argument("--load_goal", type=float, default=0.6,
                        help="Wanted system load average over last minute, divided by cpu count")
    parser.add_argument("--max_workers", type=int, default=120,
                        help="Maximum number of workers that are started")
    parser.add_argument("--min_workers", type=int, default=75,
                        help="Minimum amount of workers that are started")

    # Test settings
    parser.add_argument("--incs", type=str, default="all",
                        help="'all' for all inclusion methods, or '<inc>' for only a specific inclusion method")
    parser.add_argument("--start", type=int, default=0,
                        help="First response id to test (inclusive)")
    parser.add_argument("--end", type=int, default=359424,
                        help="Last response id to test (exclusive)")
    parser.add_argument("--sample_rate", type=float, default=1.0,
                        help="How many ids of the response space should be sampled (percentage)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for sampling")
    parser.add_argument("--ids_run", type=int, default=1000,
                        help="How many ids should be tested for each single npx run")
    parser.add_argument("--load_balancing", type=lambda x: bool(strtobool(str(x))), default=True,
                        help="Whether to use load balancing or not")  # Currently, not working on macOS, should be disabled

    args = parser.parse_args()
    main(args)

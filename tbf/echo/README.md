# Echo service

Application that can echo wanted content according to id or parameters.

## Responses app
- Available at: http://echo.org:8000/echo/ and https://echo.org:44300/echo/
- Echos what you want, specified in GET (query) or POST (body) parameters, some settings do not work in query parameters as they contain forbidden chars
- GET takes precedence and if there are several params of the same name the first is used
- Example: http://echo.org:8000/echo/?ecohd_status=404&X-Frame-Options=deny
- Supported values:
    - Delay: `ecodly=<delay in milliseconds>` 
    - Status Code: `ecohd_status=<status code>` (Code has to be between 200 and 999; Django limitation)
    - Body Content:
        - Html: `ecocnt_html=<details>`
            - `meta_refresh=<your content>`
            - `num_frames=<num of wanted frames>`
            - `div_id=<id you want to include in the dom on a div>`
            - `post_message=<content of postMessage sent to parent and opener>`
            - Example: `ecocnt_html=meta_refresh=0;url=http://test.com?url=abc&abc=abc,num_frames=5,div_id=try,post_message=hi"aa'`
        - CSS: `ecocnt_css=<css-content>`
            - Example: `ecocnt_css=p {color: red;}`
        - JS: `ecocnt_js=<js-content>`
            - Example: `ecocnt_js=var a=5;`
        - Image: `ecocnt_img=<img-specs>`
            - `height=<pixel>`
            - `width=<pixel>`
            - `type=<img type>`
            - Example: `ecocnt_img=width=200,height=300,type=png`
        - Video: `ecocnt_vid=<vid-specs>` (only mp4 supported)
            - `width=<pixel>` (Currently only 50 and 100 supported)
            - `height=<pixel>` (Currently only 50 and 100 supported)
            - `duration=<seconds>` (Currently only 1 and 2 supported)
            - Example: `ecocnt_vid=width=100,height=100,duration=2`
        - Audio: `ecocnt_audio=<audio-specs>` (only wav supported)
            - `duration=<seconds>` (Currently only 1 and 2 supported)
            - Example: `ecocnt_audio=duration=1`
    - Headers:
        - Just specify with `<wanted-header>=<wanted content>`
        - Example: `Content-Security-Policy=default-src 'self'; img-src * media-src media1.com media2.com; script-src userscripts.example.com`
## ID echo
- Uses echo and the `url_dict` file.
- URL: `http://echo.org:8000/echo/<url_id>/`
    - Example: http://echo.org:8000/echo/525311/
- Details about the url_dict:
    - Get the version: `echo/get_ver/`
    - Get info for one id: `echo/<url_id>/info/`

## Additional content
### [file_creator.py](file_creator.py)
- Creates the default audio and video files
- Run `poetry run python file_creator.py`

### [url_creator.py](url_creator.py)
- Update this file to add new responses to the response space!
- Run `poetry run python url_creator.py create True` to create a response space, use `True` to group status-codes together, use `False` to use the full space.
- Create all (necessary) combinations of headers and bodies we want to test and saves them in a dictionary (numbered), saved in `url_dict.pickle`
- How many combinations do we have?
    - The actual URLs/endpoints (currently: 1886976 or 359424 with Status-Codes groups)
        - Content body variations (12)
            - empty (1)
            - html (4)
            - css (1)
            - js (2)
            - img (1)
            - vid (1) 
            - audio (1)
            - pdf (1)
            - paymentAPI body(1)
            - additional interesting bodies (0+)
        - Headers&co (145152 or 27648 with Status-Codes groups) 
            - the count always include not set, if possible
            - Status codes (63) or groups (12) (a random element from the group is chosen for each combination) 
            - XCTO (2)
            - XFO (2)
            - CT (8)
            - CD (2)
            - CORP (2)
            - COOP (2)
            - Location (3)
            - CSP (3)
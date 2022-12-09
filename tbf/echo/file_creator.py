# inpired from https://stackoverflow.com/a/37624414/11782367

from moviepy.editor import *

def color_clip(size, duration, fps=25, color=(0,0,0), output='responses/static/responses/'):
    ColorClip(size, color, duration=duration).write_videofile(f"{output}movie_{size}_{duration}.mp4", fps=fps)

def audio_clip(duration, output='responses/static/responses/'):
    AudioClip(lambda _: 0, duration=duration, fps=1).write_audiofile(f"{output}audio_{duration}.wav")

if __name__ == '__main__':
    for duration in [1, 2]:
        audio_clip(duration)
        for size in [(50,50), (100,100)]:
            color_clip(size, duration)

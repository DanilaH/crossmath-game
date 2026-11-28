from PIL import Image, ImageDraw
from pathlib import Path
import base64, subprocess, json
out=Path('.test-output/independent-ui')
def sheet(name,names):
    paths=[out/(n+'.png') for n in names if (out/(n+'.png')).exists()]
    if not paths:return
    w=280
    thumbs=[]
    for p in paths:
        im=Image.open(p).convert('RGB')
        im.thumbnail((w,660))
        thumbs.append((p,im))
    cols=3
    height=max(im.height for _,im in thumbs)+30
    canvas=Image.new('RGB',(cols*(w+12),((len(thumbs)+cols-1)//cols)*height),'#d9d9d9')
    draw=ImageDraw.Draw(canvas)
    for i,(p,im) in enumerate(thumbs):
        x=i%cols*(w+12)+6;y=i//cols*height
        draw.text((x,y+5),p.stem.replace('390x844-ru-light-','').replace('320x480-en-dark-','').replace('320x568-ru-light-',''),fill='#111111')
        canvas.paste(im,(x,y+24))
    dest=out/(name+'.jpg');canvas.save(dest,quality=85)
    data=base64.b64encode(dest.read_bytes()).decode()
    for i in range(0,len(data),4000):print('UI_IMAGE '+name+' '+str(i//4000)+' '+data[i:i+4000])
sheet('root-screens',['390x844-ru-light-'+n for n in ['home','choice','calendar','modes','profile','workshop','league-invite','league-active','instrument']])
sheet('compact-dialogs',['320x480-en-dark-'+n for n in ['home','choice','calendar','play','help','pause','settings','restart','league-active']])
sheet('board-and-rewards',['320x430-ru-light-dense','320x430-en-dark-dense','320x568-ru-light-medium','390x844-ru-light-trophy-result','320x480-en-dark-trophy-result','320x480-ru-light-maximum-rank'])
video=out/'navigation-1x.webm'
if video.exists():
    try:
        subprocess.run(['ffmpeg','-y','-i',str(video),'-vf','fps=8,scale=240:-1:flags=lanczos','-t','12',str(out/'navigation-1x.gif')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    except Exception as e:print('GIF error',e)

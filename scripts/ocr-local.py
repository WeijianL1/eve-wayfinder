"""macOS Vision OCR; cropped image arrives on stdin and stays in memory."""
import sys,json,base64,io
from PIL import Image,ImageOps
import Foundation,Vision
payload=json.load(sys.stdin)
raw=base64.b64decode(payload['image'],validate=True)
if len(raw)>3_000_000: raise ValueError('Cropped image is too large')
image=Image.open(io.BytesIO(raw));w,h=image.size
if w*h>4_000_000 or min(w,h)<8: raise ValueError('Invalid crop dimensions')
# Modest upscaling improves EVE's narrow small text. Keep local files/screens out of OCR.
image=ImageOps.grayscale(image)
if w<800:image=image.resize((w*2,h*2))
buf=io.BytesIO();image.save(buf,format='PNG');data=buf.getvalue()
request=Vision.VNRecognizeTextRequest.alloc().init()
request.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
request.setRecognitionLanguages_(['en-US'])
request.setUsesLanguageCorrection_(False)
request.setMinimumTextHeight_(0.005) # Tall member columns contain small EVE name rows.
handler=Vision.VNImageRequestHandler.alloc().initWithData_options_(Foundation.NSData.dataWithBytes_length_(data,len(data)),{})
ok,error=handler.performRequests_error_([request],None)
if not ok:raise RuntimeError(str(error))
lines=[]
for result in request.results() or []:
    choices=result.topCandidates_(1)
    if not choices:continue
    c=choices[0];box=result.boundingBox()
    lines.append({'text':str(c.string()),'confidence':float(c.confidence()),'x':float(box.origin.x),'y':float(1-box.origin.y-box.size.height),'width':float(box.size.width),'height':float(box.size.height)})
lines.sort(key=lambda l:l['y'])
print(json.dumps({'lines':lines,'width':w,'height':h}))

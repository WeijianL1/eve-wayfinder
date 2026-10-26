"""Read-only EVE window discovery and ScreenCaptureKit snapshots. No input/focus APIs."""
import sys,json,time,base64,io

def filter_eve_windows(records,apps):
    pids={int(a['pid']) for a in apps if a.get('bundleId')=='com.ccpgames.eveonline'}
    result=[]
    for record in records:
        pid=int(record.get('kCGWindowOwnerPID',0));bounds=record.get('kCGWindowBounds') or {}
        title=str(record.get('kCGWindowName') or '')
        if pid not in pids or record.get('kCGWindowLayer')!=0:continue
        if bounds.get('Width',0)<300 or bounds.get('Height',0)<200:continue
        if title and title!='EVE' and not title.startswith('EVE -'):continue
        result.append({'id':int(record['kCGWindowNumber']),'pid':pid,'title':title or f'EVE (PID {pid})','width':int(bounds['Width']),'height':int(bounds['Height']),'onScreen':bool(record.get('kCGWindowIsOnscreen',False))})
    return sorted(result,key=lambda w:(not w['onScreen'],w['pid'],w['id']))

def windows():
    import Quartz
    from AppKit import NSWorkspace
    apps=[{'pid':int(a.processIdentifier()),'bundleId':str(a.bundleIdentifier() or '')} for a in NSWorkspace.sharedWorkspace().runningApplications()]
    records=Quartz.CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionAll,Quartz.kCGNullWindowID) or []
    return {'permission':bool(Quartz.CGPreflightScreenCaptureAccess()),'windows':filter_eve_windows(records,apps)}

def await_callback(start):
    from Foundation import NSRunLoop,NSDate
    result={}
    def done(value,error):result.update(value=value,error=error)
    start(done);deadline=time.monotonic()+12
    while 'value' not in result and time.monotonic()<deadline:
        NSRunLoop.currentRunLoop().runUntilDate_(NSDate.dateWithTimeIntervalSinceNow_(.02))
    if 'value' not in result:raise RuntimeError('原生窗口捕获超时')
    if result['error']:raise RuntimeError('ScreenCaptureKit 拒绝捕获，请检查录屏权限和窗口是否可见')
    return result['value']

def select_window(snapshot,request,allow_offscreen=False):
    if not snapshot['permission']:raise PermissionError('请在系统设置 → 隐私与安全性 → 屏幕与系统音频录制，允许启动服务的应用录屏，再重新检测')
    found=next((w for w in snapshot['windows'] if w['id']==request.get('windowId') and w['pid']==request.get('pid')),None)
    if not found:raise ValueError('所选 EVE 窗口已关闭或改变，请重新检测；不会改抓其他窗口')
    if not found['onScreen'] and not allow_offscreen:raise ValueError('EVE 窗口已最小化或不在当前桌面，请将它恢复到当前桌面后重新检测')
    return found

def frame(request):
    import ScreenCaptureKit as SC
    from AppKit import NSBitmapImageRep,NSBitmapImageFileTypePNG
    from PIL import Image,ImageStat
    selected=select_window(windows(),request,allow_offscreen=True)
    content=await_callback(lambda done:SC.SCShareableContent.getShareableContentExcludingDesktopWindows_onScreenWindowsOnly_completionHandler_(True,False,done))
    window=next((w for w in content.windows() if int(w.windowID())==selected['id'] and w.owningApplication() and int(w.owningApplication().processID())==selected['pid']),None)
    if window is None:raise ValueError('ScreenCaptureKit 没有找到所选 EVE 窗口，请重新检测')
    capture_filter=SC.SCContentFilter.alloc().initWithDesktopIndependentWindow_(window)
    config=SC.SCStreamConfiguration.alloc().init();scale=float(capture_filter.pointPixelScale()) if hasattr(capture_filter,'pointPixelScale') else 2
    config.setWidth_(round(selected['width']*scale));config.setHeight_(round(selected['height']*scale));config.setShowsCursor_(False)
    if hasattr(config,'setIgnoreShadowsSingleWindow_'):config.setIgnoreShadowsSingleWindow_(True)
    image=await_callback(lambda done:SC.SCScreenshotManager.captureImageWithFilter_configuration_completionHandler_(capture_filter,config,done))
    selected=select_window(windows(),request,allow_offscreen=True) # Revalidate PID/window ownership after capture.
    bitmap=NSBitmapImageRep.alloc().initWithCGImage_(image);data=bytes(bitmap.representationUsingType_properties_(NSBitmapImageFileTypePNG,{}))
    pixels=Image.open(io.BytesIO(data))
    if pixels.width*pixels.height>20_000_000:raise ValueError('窗口像素尺寸过大，请降低游戏分辨率')
    if max(ImageStat.Stat(pixels.convert('RGB').resize((128,128))).stddev)<.5:raise ValueError('窗口画面为空，请检查录屏权限并恢复 EVE 窗口')
    return {'image':'data:image/png;base64,'+base64.b64encode(data).decode(),'width':pixels.width,'height':pixels.height,'window':selected,'capturedAt':time.time()}

if __name__=='__main__':
    try:
        request=json.load(sys.stdin)
        if request.get('action')=='list':result=windows()
        elif request.get('action')=='frame':result=frame(request)
        else:raise ValueError('未知窗口操作')
        print(json.dumps(result))
    except Exception as error:
        print(json.dumps({'error':str(error),'status':403 if isinstance(error,PermissionError) else 409 if isinstance(error,ValueError) else 503}))

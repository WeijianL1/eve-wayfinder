import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('capture',Path(__file__).resolve().parents[1]/'scripts/eve-window-capture.py');capture=importlib.util.module_from_spec(spec);spec.loader.exec_module(capture)
class WindowRules(unittest.TestCase):
 def test_pid_bundle_title_bounds_layer_filter(self):
  def row(id,pid=8,title='EVE - Pilot',layer=0,w=1600,on=True):return {'kCGWindowNumber':id,'kCGWindowOwnerPID':pid,'kCGWindowName':title,'kCGWindowLayer':layer,'kCGWindowBounds':{'Width':w,'Height':1000},'kCGWindowIsOnscreen':on}
  apps=[{'pid':8,'bundleId':'com.ccpgames.eveonline'},{'pid':9,'bundleId':'com.ccpgames.evelauncher'}]
  result=capture.filter_eve_windows([row(1),row(2,pid=9),row(3,layer=1),row(4,w=50),row(5,title='Launcher'),row(6,on=False),row(7,title='')],apps)
  self.assertEqual([w['id'] for w in result],[1,7,6]);self.assertEqual(result[1]['title'],'EVE (PID 8)')
 def test_closed_reused_or_offspace_window_is_rejected(self):
  window={'id':77,'pid':8,'onScreen':True};request={'windowId':77,'pid':8}
  self.assertEqual(capture.select_window({'permission':True,'windows':[window]},request),window)
  for windows in [[],[{**window,'pid':9}],[{**window,'onScreen':False}]]:
   with self.assertRaises(ValueError):capture.select_window({'permission':True,'windows':windows},request)
  self.assertFalse(capture.select_window({'permission':True,'windows':[{**window,'onScreen':False}]},request,allow_offscreen=True)['onScreen'])
  with self.assertRaises(PermissionError):capture.select_window({'permission':False,'windows':[window]},request)
if __name__=='__main__':unittest.main()

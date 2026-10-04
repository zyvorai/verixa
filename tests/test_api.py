import concurrent.futures
import json
import shutil
import ssl
import subprocess
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
from verixa.server import make_server
from verixa.store import Store

TOKEN='test-token-with-more-than-24-characters'

class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp=tempfile.TemporaryDirectory();cls.store=Store(cls.tmp.name+'/state.db')
        cls.server=make_server(cls.store,port=0,token=TOKEN)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.url='http://127.0.0.1:'+str(cls.server.server_port)
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.tmp.cleanup()
    def request(self,path,body=None,auth=True,headers=None,raw=None):
        h={'Authorization':'Bearer '+TOKEN} if auth else {}
        if body is not None or raw is not None:h['Content-Type']='application/json'
        h.update(headers or {})
        req=urllib.request.Request(self.url+path,data=raw if raw is not None else json.dumps(body).encode() if body is not None else None,headers=h)
        try:r=urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:r=e
        with r:return r.status,r.read(),r.headers
    def test_health(self):self.assertEqual(self.request('/healthz',auth=False)[0],200)
    def test_auth_required(self):self.assertEqual(self.request('/api/v1/runs',auth=False)[0],401)
    def test_wrong_token(self):self.assertEqual(self.request('/api/v1/runs',headers={'Authorization':'Bearer wrong'})[0],401)
    def test_cross_origin(self):self.assertEqual(self.request('/api/v1/runs',headers={'Origin':'https://evil.example'})[0],403)
    def test_host_rebinding(self):self.assertEqual(self.request('/api/v1/runs',headers={'Host':'evil.example'})[0],403)
    def test_security_headers(self):
        status,body,h=self.request('/',auth=False)
        self.assertEqual(status,200);self.assertIn("frame-ancestors 'none'",h['Content-Security-Policy'])
        self.assertEqual(h['X-Content-Type-Options'],'nosniff')
    def test_traversal(self):self.assertEqual(self.request('/../store.py')[0],404)
    def test_scenarios(self):self.assertEqual(len(json.loads(self.request('/api/v1/scenarios')[1])),10)
    def test_run_and_read(self):
        status,data,_=self.request('/api/v1/runs',{'scenario_id':'refund-commit-timeout'})
        self.assertEqual(status,201);r=json.loads(data);self.assertEqual(r['verdict'],'PASS')
        self.assertEqual(json.loads(self.request('/api/v1/runs/'+r['id'])[1]),r)
    def test_unknown_scenario(self):self.assertEqual(self.request('/api/v1/runs',{'scenario_id':'absent'})[0],404)
    def test_arbitrary_model_not_allowed(self):self.assertEqual(self.request('/api/v1/runs',{'scenario_id':'infra-scale','agent':'model','url':'http://evil'})[0],400)
    def test_bad_json(self):self.assertEqual(self.request('/api/v1/runs',raw=b'{')[0],400)
    def test_nonfinite(self):self.assertEqual(self.request('/api/v1/runs',raw=b'{"scenario_id":NaN}')[0],400)
    def test_body_limit(self):self.assertEqual(self.request('/api/v1/runs',raw=b'x'*256001)[0],413)
    def test_wrong_content_type(self):self.assertEqual(self.request('/api/v1/runs',{},headers={'Content-Type':'text/plain'})[0],415)
    def test_bad_trace(self):self.assertEqual(self.request('/api/v1/runs',{'scenario_id':'infra-scale','agent':'replay','actions':[{'tool':'shell','args':{}}]})[0],400)
    def test_compare(self):
        b=json.loads(self.request('/api/v1/runs',{'scenario_id':'ticket-injection'})[1])
        c=json.loads(self.request('/api/v1/runs',{'scenario_id':'ticket-injection','agent':'regression'})[1])
        r=json.loads(self.request('/api/v1/compare',{'baseline_id':b['id'],'candidate_id':c['id']})[1])
        self.assertEqual(r['verdict'],'BLOCK')
    def open_session(self,token=TOKEN):
        status,body,h=self.request('/api/v1/session',{'token':token},auth=False)
        return status,h.get('Set-Cookie','')
    def test_session_login_sets_httponly_cookie(self):
        status,cookie=self.open_session()
        self.assertEqual(status,200)
        self.assertIn('verixa_session=',cookie);self.assertIn('HttpOnly',cookie);self.assertIn('SameSite=Strict',cookie)
        self.assertNotIn(TOKEN,cookie)
    def test_session_cookie_authorizes_api(self):
        _,cookie=self.open_session()
        value=cookie.split(';')[0]
        self.assertEqual(self.request('/api/v1/runs',auth=False,headers={'Cookie':value})[0],200)
        self.assertTrue(json.loads(self.request('/api/v1/session',auth=False,headers={'Cookie':value})[1])['authenticated'])
    def test_session_wrong_token(self):self.assertEqual(self.open_session('wrong-token-value')[0],401)
    def test_forged_and_expired_cookie_rejected(self):
        from verixa.server import mint_session
        expired=mint_session(TOKEN,1)
        forged=mint_session('another-token-entirely',4102444800)
        for value in (expired,forged,'garbage','1.'+'0'*64):
            self.assertEqual(self.request('/api/v1/runs',auth=False,headers={'Cookie':'verixa_session='+value})[0],401)
    def test_logout_clears_cookie(self):
        req=urllib.request.Request(self.url+'/api/v1/session',method='DELETE')
        with urllib.request.urlopen(req) as r:
            self.assertEqual(r.status,200);self.assertIn('Max-Age=0',r.headers['Set-Cookie'])
    def test_persistence(self):self.assertEqual(Store(self.store.path).scenarios(),self.store.scenarios())
    def test_concurrent_runs(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            results=list(pool.map(lambda _:self.request('/api/v1/runs',{'scenario_id':'infra-scale'})[0],range(10)))
        self.assertEqual(results,[201]*10)
    def test_import_validation(self):self.assertEqual(self.request('/api/v1/scenarios',{'id':'x'})[0],400)
    def test_valid_import(self):
        s=self.store.scenario('infra-scale');s['id']='custom-scale'
        self.assertEqual(self.request('/api/v1/scenarios',s)[0],201)
        self.assertIsNotNone(self.store.scenario('custom-scale'))
        with self.store.connect() as db:db.execute('DELETE FROM scenarios WHERE id=?',('custom-scale',))

class HostAndTokenTests(unittest.TestCase):
    def test_short_demo_token_accepted(self):
        with tempfile.TemporaryDirectory() as d:
            s=make_server(Store(d+'/s.db'),port=0,token='Admin@321');s.server_close()
    def test_too_short_token_rejected(self):
        from verixa.engine import ValidationError
        with tempfile.TemporaryDirectory() as d,self.assertRaises(ValidationError):
            make_server(Store(d+'/s.db'),port=0,token='short')
    @unittest.skipUnless(shutil.which('openssl'),'openssl required')
    def test_tls_serves_https_with_secure_cookie(self):
        with tempfile.TemporaryDirectory() as d:
            subprocess.run(['openssl','req','-x509','-nodes','-days','1','-newkey','ec','-pkeyopt','ec_paramgen_curve:prime256v1','-keyout',d+'/k.pem','-out',d+'/c.pem','-subj','/CN=localhost'],check=True,capture_output=True)
            s=make_server(Store(d+'/s.db'),port=0,token=TOKEN,tls_cert=d+'/c.pem',tls_key=d+'/k.pem')
            t=threading.Thread(target=s.serve_forever,daemon=True);t.start()
            try:
                ctx=ssl.create_default_context();ctx.check_hostname=False;ctx.verify_mode=ssl.CERT_NONE
                base='https://127.0.0.1:'+str(s.server_port)
                with urllib.request.urlopen(base+'/healthz',context=ctx) as r:self.assertEqual(r.status,200)
                req=urllib.request.Request(base+'/api/v1/session',data=json.dumps({'token':TOKEN}).encode(),headers={'Content-Type':'application/json','Origin':base})
                with urllib.request.urlopen(req,context=ctx) as r:self.assertIn('Secure',r.headers['Set-Cookie'])
            finally:
                s.shutdown();s.server_close();t.join()
    def test_allowed_host(self):
        with tempfile.TemporaryDirectory() as d:
            s=make_server(Store(d+'/s.db'),port=0,token=TOKEN,allowed_hosts=['203.0.113.5:30878'])
            t=threading.Thread(target=s.serve_forever,daemon=True);t.start()
            try:
                url='http://127.0.0.1:'+str(s.server_port)+'/healthz'
                def get(host):
                    try:
                        with urllib.request.urlopen(urllib.request.Request(url,headers={'Host':host})) as r:return r.status
                    except urllib.error.HTTPError as e:return e.code
                self.assertEqual(get('203.0.113.5:30878'),200)
                self.assertEqual(get('198.51.100.9:30878'),403)
            finally:
                s.shutdown();s.server_close();t.join()

if __name__=='__main__':unittest.main()

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler,HTTPServer
from verixa.agents import ModelAgent
from verixa.engine import ValidationError,run
from verixa.scenarios import bundled

class CliTests(unittest.TestCase):
    def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.db=self.tmp.name+'/test.db'
    def tearDown(self):self.tmp.cleanup()
    def cmd(self,*a):return subprocess.run([sys.executable,'-m','verixa','--db',self.db,*a],capture_output=True,text=True)
    def test_suite_and_junit(self):
        out=self.tmp.name+'/runs.json';xml=self.tmp.name+'/junit.xml'
        r=self.cmd('run','all','--output',out,'--junit',xml)
        self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(len(json.loads(Path(out).read_text())),10)
        self.assertIn('failures="0"',Path(xml).read_text())
    def test_regression_exit(self):self.assertEqual(self.cmd('run','ticket-injection','--agent','regression').returncode,3)
    def test_unknown_exit(self):self.assertEqual(self.cmd('run','absent').returncode,1)
    def test_model_network_opt_in(self):
        r=self.cmd('run','infra-scale','--agent','model');self.assertEqual(r.returncode,1);self.assertIn('--allow-model-network',r.stderr)
    def test_export_replay_verify(self):
        file=self.tmp.name+'/r.json';trace=self.tmp.name+'/trace.json'
        self.cmd('run','refund-happy','--output',file);id=json.loads(Path(file).read_text())['id']
        self.assertEqual(self.cmd('export',id,'--trace','--output',trace).returncode,0)
        self.assertEqual(self.cmd('run','refund-happy','--agent','replay','--trace',trace).returncode,0)
        self.assertEqual(self.cmd('verify',file).returncode,0)
    def test_import(self):
        s=bundled()[0];s['id']='custom';p=self.tmp.name+'/s.json';Path(p).write_text(json.dumps(s))
        self.assertEqual(self.cmd('import',p).returncode,0);self.assertIn('custom',self.cmd('list').stdout)

class ModelTests(unittest.TestCase):
    def test_remote_http_rejected(self):
        with self.assertRaises(ValidationError):ModelAgent('http://example.com/v1','model')
    def test_embedded_credentials_rejected(self):
        with self.assertRaises(ValidationError):ModelAgent('https://user:password@example.com/v1','model')
    def test_model_tool_loop(self):
        captured=[]
        class Handler(BaseHTTPRequestHandler):
            def log_message(self,*a):pass
            def do_POST(self):
                body=json.loads(self.rfile.read(int(self.headers['Content-Length'])));captured.append(body)
                steps=[('deployment__get',{'name':'payments'}),('deployment__scale',{'name':'payments','replicas':3})]
                index=sum(m['role']=='tool' for m in body['messages'])
                message={'content':'Done'} if index>=2 else {'content':None,'tool_calls':[{'id':'x','function':{'name':steps[index][0],'arguments':json.dumps(steps[index][1])}}]}
                data=json.dumps({'choices':[{'message':message}],'usage':{'prompt_tokens':10,'completion_tokens':5}}).encode()
                self.send_response(200);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        server=HTTPServer(('127.0.0.1',0),Handler);t=threading.Thread(target=server.serve_forever);t.start()
        try:
            s=next(s for s in bundled() if s['id']=='infra-scale')
            r=run(s,ModelAgent('http://127.0.0.1:'+str(server.server_port)+'/v1','mock'))
            self.assertEqual(r['verdict'],'PASS',r);self.assertEqual(r['usage']['prompt_tokens'],30)
            self.assertEqual(len(captured),3);self.assertEqual(captured[1]['messages'][-1]['role'],'tool')
        finally:server.shutdown();server.server_close();t.join()

if __name__=='__main__':unittest.main()

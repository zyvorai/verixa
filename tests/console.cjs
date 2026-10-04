/* Application logic integration with a real API. This is NOT a browser renderer. */
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');const root=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'verixa-console-'));const token='console-test-token-more-than-24-characters';
const child=spawn(process.env.PYTHON||'python3',['-m','verixa','--db',path.join(tmp,'s.db'),'serve','--demo','--port','0'],{cwd:root,env:{...process.env,VERIXA_TOKEN:token},stdio:['ignore','pipe','pipe']});
class Element{
 constructor(){this.html='';this.textContent='';this.value='';this.type='password';this.open=false;this.hidden=true;this.disabled=false;this.dataset={};this.classList={toggle(){},add(){},remove(){}};}
 set innerHTML(v){this.html=v;}get innerHTML(){return this.html;}
 showModal(){this.open=true;}close(){this.open=false;}addEventListener(){}focus(){}setAttribute(){}removeAttribute(){}
 querySelector(){return this.child||(this.child=new Element());}querySelectorAll(){return [];}
}
const elements=new Map();for(const id of ['theme','content','detail','detail-content','detail-title','close-detail','toast','login','app','login-form','login-user','login-pass','login-error','login-submit','login-host','reveal-pass','logout'])elements.set('#'+id,new Element());
const fixed=new Set(elements.keys());
function query(s){if(fixed.has(s))return elements.get(s);const id=s.slice(1);const html=query('#content').html+query('#detail-content').html;if(!s.startsWith('#')||!html.includes(`id="${id}"`))return null;if(elements.has(s))return elements.get(s);const e=new Element();const select=html.match(new RegExp(`<select[^>]*id="${id}"[^>]*>([\\s\\S]*?)</select>`));if(select){const option=select[1].match(/<option(?: value="([^"]*)")?>([^<]*)/);if(option)e.value=option[1]||option[2];}elements.set(s,e);return e;}
function storage(){const x=new Map();return {getItem:k=>x.get(k)||null,setItem:(k,v)=>x.set(k,v),removeItem:k=>x.delete(k)};}
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
(async()=>{
 let stdout='';const url=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('Server startup timed out')),10000);child.stdout.on('data',d=>{stdout+=d;const m=stdout.match(/http:\/\/127.0.0.1:\d+/);if(m){clearTimeout(t);resolve(m[0]);}});child.once('exit',c=>reject(new Error('Server exited '+c)));});
 const context=vm.createContext({document:{querySelector:query,querySelectorAll:()=>[],documentElement:{dataset:{}}},sessionStorage:storage(),localStorage:storage(),location:{hash:''},window:{addEventListener(){}},fetch:(p,o)=>fetch(url+p,o),crypto:require('node:crypto').webcrypto,console,setTimeout,clearTimeout,Blob,URL});
 vm.runInContext(fs.readFileSync(path.join(root,'verixa/static/app.js'),'utf8'),context);
 const evaluate=code=>vm.runInContext(code,context);
 await new Promise(r=>setTimeout(r,300));
 check('sign-in screen shown without a session',()=>{assert.equal(query('#login').hidden,false);assert.equal(query('#app').hidden,true);});
 check('wrong username rejected before any request',()=>assert.equal(evaluate('bearerCandidates("root","Admin@321").length'),0));
 check('demo password maps to demo bearer',()=>assert.deepEqual(Array.from(evaluate('bearerCandidates("admin","Admin@321")')),['Admin@321']));
 check('custom key accepted as password',()=>assert.deepEqual(Array.from(evaluate(`bearerCandidates("admin",${JSON.stringify(token)})`)),[token]));
 const accepted=await evaluate(`openSession(${JSON.stringify(token)})`),rejected=await evaluate('openSession("not-the-token")');
 check('session endpoint accepts the token',()=>assert.equal(accepted,true));
 check('session endpoint rejects a wrong token',()=>assert.equal(rejected,false));
 evaluate(`bearer=${JSON.stringify(token)}`);await evaluate('showApp()');
 check('console shown after sign-in',()=>{assert.equal(query('#app').hidden,false);assert.equal(query('#login').hidden,true);});
 check('real scenario data loaded',()=>assert.equal(evaluate('state.scenarios.length'),10));
 check('real demo run data loaded',()=>assert.equal(evaluate('state.runs.length'),11));
 check('overview reflects recorded outcomes',()=>assert.equal(evaluate('stats().pass'),10));
 check('overview metrics rendered',()=>assert.match(query('#content').innerHTML,/11<\/strong>/));
 check('HTML injection escaped',()=>assert.equal(evaluate('escape("<img onerror=alert(1)>")'),'&lt;img onerror=alert(1)&gt;'));
 for(const page of ['runs','scenarios','faults','compare','settings']){context.location.hash='#'+page;evaluate('render()');check('route '+page,()=>assert.equal(evaluate('state.page'),page));}
 context.location.hash='#scenarios';evaluate('render()');
 await evaluate('execute("refund-commit-timeout")');
 check('console run persisted',()=>assert.equal(evaluate('state.runs.length'),12));
 check('evidence opens',()=>assert.equal(query('#detail').open,true));
 check('successful retry evidence',()=>assert.match(query('#detail-content').innerHTML,/Exactly one refund/));
 check('trace state changes available',()=>assert.match(query('#detail-content').innerHTML,/deduplicated/));
 await evaluate('execute("ticket-injection","regression")');
 check('regression failure displayed',()=>assert.match(query('#detail-content').innerHTML,/badge fail/));
 const compared=await evaluate('api("compare", {baseline_id:state.runs.find(r=>r.scenario_id==="ticket-injection"&&r.agent==="demo-reference").id,candidate_id:state.runs[0].id})');
 check('comparison against real API blocks',()=>assert.equal(compared.verdict,'BLOCK'));
 context.location.hash='#unknown';evaluate('render()');check('unknown route fallback',()=>assert.equal(evaluate('state.page'),'overview'));
 let unauthorized=false;evaluate('bearer="bad-token-value"');try{await evaluate('refresh()');}catch{unauthorized=true;}
 check('invalid token rejected',()=>assert.equal(unauthorized,true));
 check('401 returns to sign-in',()=>assert.equal(query('#login').hidden,false));
 console.log(checks+' console-to-API checks passed (nonvisual harness).');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{child.kill('SIGTERM');fs.rmSync(tmp,{recursive:true,force:true});});

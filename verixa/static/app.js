'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = {scenarios:[], runs:[], page:'overview', busy:false, loaded:false, filter:'all', session:null};
const PAGES = ['overview','runs','scenarios','faults','compare','settings'];
const WRONG = 'Wrong username or password.';
const USERNAME = 'admin', PASSWORD = 'Admin@321', DEMO_TOKEN = 'Admin@321';
const FAULTS = {timeout:'Timeout before commit', commit_timeout:'Response lost after commit', expired_credentials:'Expired credentials', rate_limit:'Rate limit', malformed:'Malformed response'};
let bearer = '';

/* —— theme —— */
document.documentElement.dataset.theme = localStorage.getItem('verixa-theme') || 'light';
$('#theme').onclick = () => {const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem('verixa-theme', t);};
sessionStorage.removeItem('verixa-token');

function toast(message, tone='neutral'){const t=$('#toast');t.textContent=message;t.dataset.tone=tone;t.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.hidden=true,4500);}
const reducedMotion = () => typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* —— API + session —— */
async function api(path, body, method){
  const headers = {'Content-Type':'application/json', Accept:'application/json'};
  if (bearer) headers.Authorization = 'Bearer ' + bearer;
  const r = await fetch('/api/v1/' + path, {headers, credentials:'same-origin', ...(body === undefined ? (method ? {method} : {}) : {method: method || 'POST', body: JSON.stringify(body)})});
  const data = await r.json();
  if (!r.ok) {
    if (r.status === 401 && path !== 'session') showLogin('Your session ended. Sign in again.');
    throw new Error(data.error || 'Request failed');
  }
  return data;
}
async function refresh(){const data=await Promise.all([api('scenarios'),api('runs')]);state.scenarios=data[0];state.runs=data[1];state.loaded=true;render();}

function bearerCandidates(username, password){
  if (username !== USERNAME || password === '') return [];
  const out = [];
  if (password === PASSWORD) out.push(DEMO_TOKEN);
  if (!out.includes(password)) out.push(password);
  return out;
}
async function probeBearer(candidate){
  try {
    const r = await fetch('/api/v1/scenarios', {headers:{Authorization:'Bearer ' + candidate, Accept:'application/json'}});
    if (r.status === 401) return 'unauthorized';
    const ct = (r.headers.get('content-type') || '');
    return r.ok && ct.includes('application/json') ? 'ok' : 'unreachable';
  } catch { return 'unreachable'; }
}
async function openSession(candidate){
  try {
    const r = await fetch('/api/v1/session', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token: candidate})});
    return r.ok;
  } catch { return false; }
}
function loginError(message){
  const e = $('#login-error'), card = $('#login-form');
  e.textContent = message; e.hidden = !message;
  $('#login-user').setAttribute('aria-invalid', message ? 'true' : 'false');
  $('#login-pass').setAttribute('aria-invalid', message ? 'true' : 'false');
  if (message && card.classList) { card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
}
function showLogin(message=''){
  $('#app').hidden = true; $('#login').hidden = false;
  if ($('#detail').open) $('#detail').close();
  $('#login-host').textContent = location.host || location.hostname || 'this host';
  loginError(message);
  setTimeout(() => $('#login-user').focus(), 0);
}
async function showApp(){
  $('#login').hidden = true; $('#app').hidden = false;
  render();
  try { state.session = await api('session'); } catch { state.session = null; }
  await refresh();
}
function setBusy(busy){
  const b = $('#login-submit');
  b.disabled = busy; b.classList.toggle('busy', busy);
  b.querySelector('.label').textContent = busy ? 'Signing in…' : 'Sign in';
  $('#login-user').disabled = busy; $('#login-pass').disabled = busy;
}
$('#login-form').onsubmit = async e => {
  e.preventDefault();
  const candidates = bearerCandidates($('#login-user').value.trim(), $('#login-pass').value);
  if (!candidates.length) return loginError(WRONG);
  setBusy(true); loginError('');
  let sawUnauthorized = false;
  try {
    for (const candidate of candidates) {
      const result = await probeBearer(candidate);
      if (result === 'ok') {
        if (!(await openSession(candidate))) return loginError('Could not start a session. Check the URL and try again.');
        $('#login-pass').value = '';
        await showApp();
        return;
      }
      if (result === 'unauthorized') sawUnauthorized = true;
    }
    loginError(sawUnauthorized ? WRONG : 'Could not reach Verixa. Check the URL and try again.');
  } catch { loginError('Could not reach Verixa. Check the URL and try again.'); }
  finally { setBusy(false); }
};
['#login-user','#login-pass'].forEach(s => { $(s).oninput = () => { if (!$('#login-error').hidden) loginError(''); }; });
$('#reveal-pass').onclick = () => {
  const input = $('#login-pass'), show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  $('#reveal-pass').textContent = show ? 'Hide' : 'Show';
  $('#reveal-pass').setAttribute('aria-pressed', String(show));
  $('#reveal-pass').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
};
async function logout(){
  try { await fetch('/api/v1/session', {method:'DELETE', credentials:'same-origin'}); } catch {}
  bearer = ''; state.scenarios = []; state.runs = []; state.loaded = false;
  showLogin();
}
$('#logout').onclick = logout;
$('#close-detail').onclick = () => $('#detail').close();

/* —— helpers —— */
const icon = {
  refunds:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 10h18M7 15h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  tickets:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 10h8M8 13h5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  infrastructure:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="4" y="14" width="16" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 7h.01M8 17h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  check:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3L15 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cross:'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 13h6l-1 8 8-10h-6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  shield:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  compare:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M17 4v16M3 8l4-4 4 4M13 16l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  copy:'<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 15V5a1 1 0 0 1 1-1h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
function badge(v){return `<span class="badge ${v==='PASS'||v==='OK'?'pass':v==='FAIL'||v==='BLOCK'||v==='DENIED'||v==='FAULT'||v==='ERROR'?'fail':'neutral'}">${escape(v)}</span>`;}
function head(eyebrow,title,description,tint=''){return `<section class="page-hero ${tint}"><p class="eyebrow">${escape(eyebrow)}</p><h1>${escape(title)}</h1><p>${escape(description)}</p></section>`;}
function stats(){const runs=state.runs;return {total:runs.length,pass:runs.filter(r=>r.verdict==='PASS').length,failed:runs.filter(r=>r.verdict==='FAIL').length,calls:runs.reduce((n,r)=>n+r.events.length,0)};}
function ago(iso){const s=Math.max(0,(Date.now()-Date.parse(iso))/1000);if(!isFinite(s))return '';if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';}
function donut(pct){const r=52,c=2*Math.PI*r,len=pct===null?0:c*pct/100;return `<svg class="donut" viewBox="0 0 120 120" role="img" aria-label="${pct===null?'No runs yet':pct+' percent passing'}"><circle cx="60" cy="60" r="${r}" class="donut-track"/><circle cx="60" cy="60" r="${r}" class="donut-value" stroke-dasharray="${len.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="58" text-anchor="middle" class="donut-label">${pct===null?'—':pct+'%'}</text><text x="60" y="78" text-anchor="middle" class="donut-sub">passing</text></svg>`;}
function sparkline(runs){
  const items=runs.slice(0,30).reverse();
  if(!items.length)return '<div class="spark-empty">Run a scenario to start the trend.</div>';
  const w=300,h=64,bw=w/Math.max(items.length,16);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Verdicts of the last ${items.length} rehearsals">${items.map((r,i)=>{const ok=r.verdict==='PASS',bh=ok?h-8:h*0.55;return `<rect x="${(i*bw+1.5).toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${(bw-3).toFixed(1)}" height="${bh.toFixed(1)}" rx="2.5" class="${ok?'bar-pass':'bar-fail'}"><title>${escape(r.scenario_name)} · ${r.verdict}</title></rect>`;}).join('')}</svg>`;
}
function checksBar(r){const total=r.assertions.length||1,ok=r.assertions.filter(a=>a.passed).length;return `<span class="checks-meter"><svg viewBox="0 0 60 6" aria-hidden="true"><rect width="60" height="6" rx="3" class="meter-track"/><rect width="${(60*ok/total).toFixed(1)}" height="6" rx="3" class="${ok===total?'meter-pass':'meter-fail'}"/></svg>${ok} / ${r.assertions.length}</span>`;}
function emptyState(title,text,action=''){return `<div class="empty-state"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="14" width="44" height="36" rx="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 26h44M22 38h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><h3>${escape(title)}</h3><p>${escape(text)}</p>${action}</div>`;}
function skeleton(){return `<div class="skeleton-hero"><span class="sk sk-eyebrow"></span><span class="sk sk-title"></span><span class="sk sk-line"></span></div><div class="kpis">${'<div class="kpi"><span class="sk sk-num"></span><span class="sk sk-line"></span></div>'.repeat(4)}</div><div class="grid">${'<div class="card"><span class="sk sk-line"></span><span class="sk sk-line"></span><span class="sk sk-line short"></span></div>'.repeat(3)}</div>`;}

/* —— pages —— */
function runRows(runs){
  if(!runs.length)return emptyState('No rehearsals match','Run a scenario or clear the filter to see evidence.');
  return `<div class="table-card"><table><thead><tr><th>Scenario / agent</th><th>Verdict</th><th>Checks</th><th>Tool calls</th><th>When</th><th></th></tr></thead><tbody>${runs.map(r=>`<tr><td><span class="row-title"><span class="domain-icon ${escape(r.domain)}">${icon[r.domain]||icon.bolt}</span><span><strong>${escape(r.scenario_name)}</strong><small>${escape(r.agent)} · ${escape(r.id.slice(0,8))}</small></span></span></td><td>${badge(r.verdict)}</td><td>${checksBar(r)}</td><td><span class="mono">${r.events.length}</span></td><td><small title="${escape(r.created_at)}">${escape(ago(r.created_at))}</small></td><td class="cell-action"><button class="btn-secondary small" data-detail="${escape(r.id)}">Inspect ↗</button></td></tr>`).join('')}</tbody></table></div>`;
}
function overview(){
  const s=stats(),pct=s.total?Math.round(s.pass/s.total*100):null;
  const domains=['refunds','tickets','infrastructure'].map(d=>{const rs=state.runs.filter(r=>r.domain===d),ok=rs.filter(r=>r.verdict==='PASS').length;return {d,n:rs.length,ok};});
  return `<section class="hero">
<p class="eyebrow">AI agent rehearsal</p><h1>Know what your agent will do.</h1>
<p>Run real tool workflows in simulated systems. Catch regressions before a model, prompt or policy change ships.</p>
<div class="hero-actions"><button class="primary" id="run-suite">Run reference suite</button><a class="link" href="#scenarios">Explore scenarios ›</a></div></section>
<section class="kpis">
<div class="kpi kpi-ring">${donut(pct)}<div><strong class="metric-label">Pass rate</strong><span>Latest ${s.total} recorded rehearsals</span></div></div>
<div class="kpi metric"><span class="kpi-icon blue">${icon.shield}</span><strong data-count="${s.total}">${s.total}</strong><span>recorded rehearsals</span></div>
<div class="kpi metric"><span class="kpi-icon green">${icon.check}</span><strong data-count="${s.pass}">${s.pass}</strong><span>passing runs</span></div>
<div class="kpi metric"><span class="kpi-icon red">${icon.cross}</span><strong data-count="${s.failed}">${s.failed}</strong><span>failed runs</span></div>
<div class="kpi metric"><span class="kpi-icon purple">${icon.bolt}</span><strong data-count="${s.calls}">${s.calls}</strong><span>simulated tool calls</span></div>
</section>
<section class="card flow-card"><div class="section-head"><div><p class="eyebrow">How it works</p><h2>The rehearsal, end to end.</h2></div><span class="pill"><span class="dot"></span>Production tools disconnected</span></div>
<div class="flow"><div class="flow-node"><span class="step">01</span><strong>Propose</strong><span>Your agent — a model adapter or a recorded trace — proposes the next tool call.</span></div><div class="flow-link" aria-hidden="true"><span></span></div><div class="flow-node"><span class="step">02</span><strong>Rehearse</strong><span>Stateful simulated systems apply policy, inject faults and record every change.</span></div><div class="flow-link" aria-hidden="true"><span></span></div><div class="flow-node"><span class="step">03</span><strong>Verify</strong><span>Outcome assertions and a hash-chained action trail decide the verdict.</span></div></div></section>
<section class="split-wide">
<div class="card"><div class="section-head"><h2>Recent rehearsals</h2><a class="link" href="#runs">View all ›</a></div>${state.runs.length?`<ul class="recent">${state.runs.slice(0,6).map(r=>`<li><button class="recent-row" data-detail="${escape(r.id)}"><span class="domain-icon ${escape(r.domain)}">${icon[r.domain]||icon.bolt}</span><span class="recent-main"><strong>${escape(r.scenario_name)}</strong><small>${escape(r.agent)} · ${escape(ago(r.created_at))}</small></span>${badge(r.verdict)}</button></li>`).join('')}</ul>`:emptyState('No rehearsals yet','Run the reference suite to collect your first evidence.')}</div>
<div class="card"><div class="section-head"><h2>Verdict trend</h2><span class="legend"><i class="lg-pass"></i>Pass <i class="lg-fail"></i>Fail</span></div>${sparkline(state.runs)}<h3 class="subhead">By domain</h3><div class="domains">${domains.map(x=>`<div class="domain-row"><span class="domain-icon ${x.d}">${icon[x.d]}</span><span class="domain-name">${x.d[0].toUpperCase()+x.d.slice(1)}</span><svg viewBox="0 0 100 8" class="domain-bar" aria-hidden="true"><rect width="100" height="8" rx="4" class="meter-track"/><rect width="${x.n?(100*x.ok/x.n).toFixed(1):0}" height="8" rx="4" class="meter-pass"/></svg><span class="mono">${x.ok}/${x.n}</span></div>`).join('')}</div></div>
</section>
<section class="grid two">
<a class="card feature tint-amber" href="#faults"><span class="kpi-icon amber">${icon.bolt}</span><p class="eyebrow">Failure injection</p><h2>Break the response.<br>Keep the outcome correct.</h2><p>Timeouts, responses lost after commit, expired credentials, rate limits and malformed results.</p><span class="link">Open fault studio ›</span></a>
<a class="card feature tint-purple" href="#compare"><span class="kpi-icon purple">${icon.compare}</span><p class="eyebrow">Release confidence</p><h2>A change is only better<br>when the checks agree.</h2><p>Compare the same scenario revision across agent versions and block on outcome regressions.</p><span class="link">Compare two versions ›</span></a>
</section>`;
}
function scenarios(){return `${head('Scenario library','Small worlds. Real consequences.','Ten bundled scenarios across refunds, support and infrastructure. Import your own JSON scenario or edit a fixture.','hero-tint-green')}<div class="toolbar"><label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input id="scenario-search" aria-label="Search scenarios" placeholder="Search scenarios"></label><button id="import-scenario" class="btn-secondary">Import scenario JSON</button></div><input type="file" accept="application/json,.json" id="import-file" hidden><div class="grid" id="scenario-grid">${scenarioCards(state.scenarios)}</div>`;}
function scenarioCards(items){return items.map(s=>`<article class="card scenario-card"><div class="scenario-top"><span class="domain-icon lg ${escape(s.domain)}">${icon[s.domain]||icon.bolt}</span><span class="eyebrow">${escape(s.domain)}</span></div><h3>${escape(s.name)}</h3><p>${escape(s.description)}</p><div class="tags">${s.policy.allowed_tools.map(t=>`<span class="tag mono">${escape(t)}</span>`).join('')}${s.faults.map(f=>`<span class="tag tag-fault">${escape(FAULTS[f.kind]||f.kind)}</span>`).join('')}</div><div class="card-bottom"><small>${s.assertions.length} checks · ${s.faults.length} faults</small><div class="actions"><button class="btn-secondary small" data-edit="${escape(s.id)}">Edit JSON</button><button class="primary small" data-run="${escape(s.id)}">Rehearse</button></div></div></article>`).join('')||emptyState('No matching scenarios','Try a different search term.');}
function runs(){const f=state.filter;return `${head('Rehearsals','Every action has a trail.','Inspect tool arguments, injected failures, state changes and outcome checks. Export evidence or replay a recorded sequence.')}<div class="toolbar"><label class="search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input id="run-search" aria-label="Search runs" placeholder="Search scenario or agent"></label><div class="segmented" role="group" aria-label="Filter verdict">${['all','PASS','FAIL'].map(v=>`<button type="button" data-filter="${v}" class="${f===v?'active':''}" aria-pressed="${f===v}">${v==='all'?'All':v==='PASS'?'Passed':'Failed'}</button>`).join('')}</div><button id="replay-import" class="btn-secondary">Replay trace JSON</button></div><input type="file" accept=".json" id="trace-file" hidden><div id="run-table">${runRows(filteredRuns())}</div>`;}
function filteredRuns(){const q=($('#run-search')?.value||'').toLowerCase();return state.runs.filter(r=>(r.scenario_name+' '+r.agent).toLowerCase().includes(q)&&(state.filter==='all'||r.verdict===state.filter));}
function scenarioOptions(selected){return state.scenarios.map(s=>`<option value="${escape(s.id)}"${s.id===selected?' selected':''}>${escape(s.name)}</option>`).join('');}
function segmented(id,options,value){return `<div class="segmented wrap" role="radiogroup" id="${id}" data-value="${escape(value)}">${options.map(([v,l])=>`<button type="button" role="radio" data-value="${escape(v)}" aria-checked="${v===value}" class="${v===value?'active':''}">${escape(l)}</button>`).join('')}</div>`;}
function faults(){return `${head('Fault studio','Build the difficult case.','Inject a fault at a specific tool invocation. Save an independent scenario and rehearse the reference or regression agent.','hero-tint-amber')}<div class="split"><form class="card stack" id="fault-form"><div class="steps"><div class="step-row"><span class="step">1</span><div><label for="fault-scenario">Base scenario</label><select id="fault-scenario">${scenarioOptions('refund-happy')}</select></div></div><div class="step-row"><span class="step">2</span><div><label for="fault-tool">Tool to break</label><select id="fault-tool"></select></div></div><div class="step-row"><span class="step">3</span><div><label>Failure mode</label>${segmented('fault-kind',Object.entries(FAULTS),'timeout')}</div></div><div class="step-row"><span class="step">4</span><div><label for="fault-occurrence">Invocation number</label><input id="fault-occurrence" type="number" min="1" max="100" value="1" required></div></div><div class="step-row"><span class="step">5</span><div><label>Scripted agent</label>${segmented('fault-agent',[['reference','Reference · stable retries'],['regression','Regression · known mistakes']],'reference')}</div></div></div><div class="hero-actions"><button class="primary">Save & rehearse</button></div></form><div class="stack"><div class="card preview-card"><p class="eyebrow">Live preview</p><h2 id="fault-headline"></h2><div class="fault-path" id="fault-path"></div><pre class="code" id="fault-preview"></pre></div><div class="card"><p class="eyebrow">Why this matters</p><h2>A timeout is not<br>a failed transaction.</h2><p>A payment can commit before its response reaches the agent. Retrying with a new key may duplicate the operation. Verixa records both the response and the state change.</p><div class="note">The simulator enforces refund balance and idempotency. A repeated action with a stable key returns the existing refund.</div></div></div></div>`;}
function runSummary(r){return r?`<div class="run-summary"><div class="summary-top">${badge(r.verdict)}<span class="mono">${escape(r.id.slice(0,8))}</span></div><strong>${escape(r.scenario_name)}</strong><small>${escape(r.agent)} · ${escape(ago(r.created_at))}</small><div class="summary-stats"><span><b>${r.assertions.filter(a=>a.passed).length}/${r.assertions.length}</b> checks</span><span><b>${r.events.length}</b> calls</span><span><b>${r.duration_ms}</b> ms</span></div></div>`:'';}
function comparePage(){const options=state.runs.map(r=>`<option value="${escape(r.id)}">${escape(r.scenario_name)} / ${escape(r.agent)} / ${r.id.slice(0,7)}</option>`).join('');return `${head('Version comparison','Better is measurable.','Compare two runs of the same scenario revision. Any failing candidate blocks the release gate.','hero-tint-purple')}<form class="compare-grid" id="compare-form"><div class="card compare-side"><p class="eyebrow">Baseline</p><label for="baseline" class="sr-only">Baseline run</label><select id="baseline">${options}</select><div id="baseline-summary"></div></div><div class="compare-vs"><span>vs</span><button class="primary" ${state.runs.length<2?'disabled':''}>Compare outcomes</button></div><div class="card compare-side"><p class="eyebrow">Candidate</p><label for="candidate" class="sr-only">Candidate run</label><select id="candidate">${options}</select><div id="candidate-summary"></div></div></form><div id="comparison"></div><div class="note">For a regression demonstration, run Support · prompt injection with both scripted agents. The regression agent attempts an unauthorized infrastructure change.</div>`;}
function codeBlock(text){return `<div class="code-wrap"><pre class="code">${escape(text)}</pre><button type="button" class="copy" data-copy="${escape(text)}" aria-label="Copy to clipboard">${icon.copy}<span>Copy</span></button></div>`;}
function settings(){
  const sess=state.session||{};const host=location.host||'';const tls=location.protocol==='https:';
  return `${head('Settings','Your tools. Your evidence.','Verixa runs with no runtime dependencies. Scenario state is simulated; optional model calls are explicitly enabled through the CLI.')}<div class="grid two"><div class="card"><div class="section-head"><h2>Connection</h2><span class="pill ${tls?'pill-good':''}"><span class="dot"></span>${tls?'HTTPS':'HTTP'}</span></div><dl class="facts"><div><dt>Host</dt><dd class="mono">${escape(host)}</dd></div><div><dt>Signed in as</dt><dd>admin</dd></div><div><dt>Session</dt><dd>HttpOnly cookie · ${Math.round((sess.ttl_seconds||43200)/3600)} h</dd></div><div><dt>Evidence class</dt><dd class="mono">simulated-tool-state</dd></div></dl><button id="disconnect" class="btn-secondary">Sign out</button></div><div class="card"><h2>API endpoints</h2><p>Scripts and CI use <code>Authorization: Bearer &lt;token&gt;</code>. The browser uses the session cookie.</p>${codeBlock('GET  /api/v1/scenarios\nPOST /api/v1/scenarios\nGET  /api/v1/runs\nPOST /api/v1/runs\nPOST /api/v1/compare\nPOST /api/v1/session')}</div><div class="card"><h2>Run an actual model</h2><p>Use an OpenAI-compatible endpoint. Task, policy and simulated tool results are sent to that endpoint.</p>${codeBlock('export VERIXA_MODEL_URL=http://127.0.0.1:11434/v1\nexport VERIXA_MODEL=your-tool-capable-model\npython3 -m verixa run all --agent model \\\n  --allow-model-network --junit artifacts/model.xml')}<p>Token usage is recorded when the provider supplies it. There is no pricing catalog or cost estimator.</p></div><div class="card"><h2>Gate releases in CI</h2><p>Exit code 3 fails the pipeline on any failed outcome or regression.</p>${codeBlock('python3 -m verixa run all --junit artifacts/verixa.xml\npython3 -m verixa compare BASELINE_ID CANDIDATE_ID')}</div></div><div class="note">Evidence class: simulated-tool-state. An event hash chain detects edits within the event sequence; it does not sign the report or prove completeness.</div>`;
}

function render(){
  const page=location.hash.slice(1)||'overview';
  state.page=PAGES.includes(page)?page:'overview';
  $$('[data-page]').forEach(a=>{const active=a.dataset.page===state.page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  const content=$('#content');
  content.innerHTML=state.loaded?({overview,runs,scenarios,faults,compare:comparePage,settings}[state.page])():skeleton();
  if(content.classList){content.classList.remove('page-enter');void content.offsetWidth;content.classList.add('page-enter');}
  bind();
  if(state.loaded)countUp();
}
function countUp(){
  if(reducedMotion())return;
  $$('[data-count]').forEach(el=>{const target=Number(el.dataset.count);if(!target)return;const start=performance.now(),dur=700;const step=t=>{const p=Math.min(1,(t-start)/dur);el.textContent=Math.round(target*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step);};requestAnimationFrame(step);});
}
async function execute(id,agent='reference',actions){if(state.busy)return;state.busy=true;$$('button[data-run],#run-suite').forEach(b=>b.disabled=true);try{const r=await api('runs',{scenario_id:id,agent,...(actions?{actions}:{})});await refresh();showDetail(r);toast(r.verdict+' · '+r.scenario_name,r.verdict==='PASS'?'good':'bad');}catch(e){toast(e.message,'bad');}finally{state.busy=false;$$('button[data-run],#run-suite').forEach(b=>b.disabled=false);}}
function showDetail(r){
  const passed=r.assertions.filter(a=>a.passed).length;
  $('#detail-title').textContent='Rehearsal evidence';
  $('#detail-content').innerHTML=`<div class="verdict-banner ${r.verdict==='PASS'?'good':'bad'}"><span class="verdict-icon">${r.verdict==='PASS'?icon.check:icon.cross}</span><div><p class="eyebrow">${escape(r.agent)} · ${escape(r.id.slice(0,12))}</p><h2>${escape(r.scenario_name)}</h2></div>${badge(r.verdict)}</div>
<div class="chips"><span class="pill">${passed}/${r.assertions.length} checks</span><span class="pill">${r.events.length} tool calls</span><span class="pill">${r.duration_ms} ms</span><span class="pill mono">${escape(r.evidence)}</span></div>
${r.error?`<p class="login-error">Execution: ${escape(r.error)}</p>`:''}
<div class="hero-actions"><button id="export-run" class="btn-secondary small">Export evidence</button><button id="export-trace" class="btn-secondary small">Export replay trace</button></div>
<h3 class="subhead">Outcome checks</h3><ul class="checks">${r.assertions.map(a=>`<li class="check ${a.passed?'ok':'bad'}"><span class="check-icon">${a.passed?icon.check:icon.cross}</span><span><strong>${escape(a.name)}</strong><small>Expected ${escape(a.op)} ${escape(JSON.stringify(a.value))} · Actual ${escape(JSON.stringify(a.actual))}</small></span></li>`).join('')}</ul>
<h3 class="subhead">Action timeline</h3><ol class="timeline">${r.events.map(e=>`<li class="event status-${escape(e.status)}"><span class="event-dot"></span><div class="event-body"><div class="event-head"><span class="mono seq">${e.sequence.toString().padStart(2,'0')}</span><strong class="mono">${escape(e.tool)}</strong>${badge(e.status.toUpperCase())}</div><details><summary>Arguments, result & state changes</summary><pre class="code">${escape(JSON.stringify({args:e.args,result:e.result,changes:e.changes},null,2))}</pre></details></div></li>`).join('')||'<li class="event"><div class="event-body">No tool calls recorded.</div></li>'}</ol>
<details class="final-state"><summary>Final simulated state</summary><pre class="code">${escape(JSON.stringify(r.final,null,2))}</pre></details>`;
  $('#export-run').onclick=()=>download(r,'verixa-'+r.id+'.json');
  $('#export-trace').onclick=()=>download(r.events.map(e=>({tool:e.tool,args:e.args})),'trace-'+r.id+'.json');
  if(!$('#detail').open)$('#detail').showModal();
}
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function editScenario(id){
  const s=state.scenarios.find(s=>s.id===id);
  $('#detail-title').textContent='Edit scenario';
  $('#detail-content').innerHTML='<p class="note">Changing a scenario ID creates a separate fixture. Existing runs keep their scenario revision hash.</p><form id="editor-form" class="stack"><label for="scenario-json">Scenario JSON</label><div class="editor"><pre class="gutter" id="gutter" aria-hidden="true"></pre><textarea id="scenario-json" spellcheck="false"></textarea></div><p class="login-error" id="editor-error" role="alert" hidden></p><div class="hero-actions"><button class="primary">Validate & save</button></div></form>';
  const ta=$('#scenario-json'),gutter=$('#gutter');
  const lines=()=>{gutter.textContent=Array.from({length:ta.value.split('\n').length},(_,i)=>i+1).join('\n');};
  ta.value=JSON.stringify(s,null,2);lines();
  ta.oninput=()=>{lines();try{JSON.parse(ta.value);$('#editor-error').hidden=true;}catch(err){$('#editor-error').textContent='JSON: '+err.message;$('#editor-error').hidden=false;}};
  ta.onscroll=()=>{gutter.scrollTop=ta.scrollTop;};
  $('#editor-form').onsubmit=async e=>{e.preventDefault();try{await api('scenarios',JSON.parse(ta.value));$('#detail').close();await refresh();toast('Scenario validated and saved','good');}catch(err){$('#editor-error').textContent=err.message;$('#editor-error').hidden=false;}};
  $('#detail').showModal();
}
function updateFaultPreview(){
  const s=state.scenarios.find(s=>s.id===$('#fault-scenario').value);if(!s)return;
  const tool=$('#fault-tool').value,kind=$('#fault-kind').dataset.value,n=Number($('#fault-occurrence').value)||1,agent=$('#fault-agent').dataset.value;
  $('#fault-headline').textContent=`${FAULTS[kind]} on ${tool} call #${n}`;
  $('#fault-path').innerHTML=`<span class="fp-node">${escape(agent)} agent</span><span class="fp-arrow"></span><span class="fp-node mono">${escape(tool)} #${n}</span><span class="fp-arrow"></span><span class="fp-node fp-fault">${icon.bolt}${escape(FAULTS[kind])}</span><span class="fp-arrow"></span><span class="fp-node">verify outcome</span>`;
  $('#fault-preview').textContent=JSON.stringify({faults:[{tool,occurrence:n,kind}],assertions:s.assertions.map(a=>a.name)},null,2);
}
function bindSegmented(id,onChange){const g=$('#'+id);if(!g)return;g.onclick=e=>{const b=e.target.closest('button');if(!b)return;g.dataset.value=b.dataset.value;g.querySelectorAll('button').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-checked',String(on));});onChange&&onChange();};}
function renderComparisonSummaries(){const b=state.runs.find(r=>r.id===$('#baseline').value),c=state.runs.find(r=>r.id===$('#candidate').value);$('#baseline-summary').innerHTML=runSummary(b);$('#candidate-summary').innerHTML=runSummary(c);}
function bind(){
  $('#content').onclick=e=>{
    const copy=e.target.closest('[data-copy]');if(copy){navigator.clipboard?.writeText(copy.dataset.copy).then(()=>toast('Copied to clipboard','good'));return;}
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.detail)showDetail(state.runs.find(r=>r.id===b.dataset.detail));
    if(b.dataset.run)execute(b.dataset.run);
    if(b.dataset.edit)editScenario(b.dataset.edit);
  };
  if($('#run-suite'))$('#run-suite').onclick=async()=>{if(state.busy)return;state.busy=true;const btn=$('#run-suite');btn.disabled=true;btn.textContent='Running suite…';try{for(const s of state.scenarios)await api('runs',{scenario_id:s.id,agent:'reference'});await refresh();toast('Reference suite completed','good');}catch(e){toast(e.message,'bad');}finally{state.busy=false;if($('#run-suite')){$('#run-suite').disabled=false;$('#run-suite').textContent='Run reference suite';}}};
  if($('#scenario-search'))$('#scenario-search').oninput=e=>{$('#scenario-grid').innerHTML=scenarioCards(state.scenarios.filter(s=>(s.name+' '+s.description).toLowerCase().includes(e.target.value.toLowerCase())));};
  if($('#run-search')){
    const filter=()=>{$('#run-table').innerHTML=runRows(filteredRuns());};
    $('#run-search').oninput=filter;
    $$('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;$$('[data-filter]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});filter();});
    $('#replay-import').onclick=()=>{if(!state.scenarios.length)return;$('#detail-title').textContent='Replay a trace';$('#detail-content').innerHTML=`<div class="stack"><label for="replay-scenario">Scenario to replay</label><select id="replay-scenario">${scenarioOptions()}</select><p>Select an exported action trace. Every tool executes against fresh simulated state.</p><div><button id="choose-trace" class="primary">Choose trace JSON</button></div></div>`;$('#choose-trace').onclick=()=>$('#trace-file').click();$('#detail').showModal();};
    $('#trace-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>256000)return toast('Trace exceeds 256 KB','bad');try{const actions=JSON.parse(await f.text());const id=$('#replay-scenario').value;$('#detail').close();await execute(id,'replay',actions);}catch(err){toast(err.message,'bad');}};
  }
  if($('#import-scenario')){$('#import-scenario').onclick=()=>$('#import-file').click();$('#import-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>256000)return toast('Scenario exceeds 256 KB','bad');try{await api('scenarios',JSON.parse(await f.text()));await refresh();toast('Scenario imported','good');}catch(err){toast(err.message,'bad');}};}
  if($('#fault-form')){
    const update=()=>{const s=state.scenarios.find(s=>s.id===$('#fault-scenario').value);if(!s)return;$('#fault-tool').innerHTML=s.policy.allowed_tools.map(t=>`<option>${escape(t)}</option>`).join('');updateFaultPreview();};
    $('#fault-scenario').onchange=update;$('#fault-tool').onchange=updateFaultPreview;$('#fault-occurrence').oninput=updateFaultPreview;
    bindSegmented('fault-kind',updateFaultPreview);bindSegmented('fault-agent',updateFaultPreview);update();
    $('#fault-form').onsubmit=async e=>{e.preventDefault();try{const s=JSON.parse(JSON.stringify(state.scenarios.find(s=>s.id===$('#fault-scenario').value)));s.id='fault-'+crypto.randomUUID().slice(0,8);s.name+=' · custom fault';s.faults=[{tool:$('#fault-tool').value,occurrence:Number($('#fault-occurrence').value),kind:$('#fault-kind').dataset.value}];const agent=$('#fault-agent').dataset.value;await api('scenarios',s);await execute(s.id,agent);}catch(err){toast(err.message,'bad');}};
  }
  if($('#compare-form')){
    $('#candidate').selectedIndex=Math.min(1,state.runs.length-1);
    $('#baseline').onchange=renderComparisonSummaries;$('#candidate').onchange=renderComparisonSummaries;renderComparisonSummaries();
    $('#compare-form').onsubmit=async e=>{e.preventDefault();try{const c=await api('compare',{baseline_id:$('#baseline').value,candidate_id:$('#candidate').value});const ok=c.verdict==='PASS';$('#comparison').innerHTML=`<div class="gate ${ok?'good':'bad'}"><span class="verdict-icon">${ok?icon.check:icon.cross}</span><div><p class="eyebrow">Release gate</p><h2>${ok?'Release allowed':'Release blocked'}</h2><p>${c.regressions.length?'Regressed: '+escape(c.regressions.join(' · ')):ok?'No outcome regressions detected.':'The candidate run did not pass its outcome checks.'}</p></div>${badge(c.verdict)}</div><div class="delta-row"><div class="card delta"><span>Tool call delta</span><strong class="${c.call_delta>0?'text-bad':c.call_delta<0?'text-good':''}">${c.call_delta>0?'+':''}${c.call_delta}</strong></div><div class="card delta"><span>Duration delta</span><strong>${c.duration_delta_ms>0?'+':''}${c.duration_delta_ms} ms</strong></div><div class="card delta"><span>Regressions</span><strong class="${c.regressions.length?'text-bad':'text-good'}">${c.regressions.length}</strong></div></div>`;}catch(err){toast(err.message,'bad');}};
  }
  if($('#disconnect'))$('#disconnect').onclick=logout;
}
window.addEventListener('hashchange',()=>{if($('#app').hidden)return;render();window.scrollTo?.(0,0);$('#content').focus({preventScroll:true});});

(async()=>{
  try {
    const r = await fetch('/api/v1/session', {credentials:'same-origin', headers:{Accept:'application/json'}});
    const s = await r.json();
    if (s.authenticated) { state.session = s; await showApp(); return; }
  } catch {}
  showLogin();
})();

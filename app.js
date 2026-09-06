(() => {
  const cfg = window.GALACTICA_CONFIG || {};
  const I18N = window.GALACTICA_I18N || {};
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lang = localStorage.getItem('galactica.lang') || ((navigator.language || 'en').toLowerCase().startsWith('ja') ? 'ja' : (navigator.language || 'en').slice(0,2));
  if (!I18N[lang]) lang = 'en';
  let state = structuredClone(cfg.fallbackState || {});
  let selectedAtlasNode = 0;
  let liveFrameMounted = false;

  // ---------- i18n ----------
  function dict(){ return {...(I18N.en || {}), ...(I18N[lang] || {})}; }
  function t(key){ return dict()[key] ?? I18N.en?.[key] ?? key; }
  function applyLanguage(){
    document.documentElement.lang = lang;
    $('#languageSelect').value = lang;
    $$('[data-i18n]').forEach(el => { const v=t(el.dataset.i18n); if(v) el.textContent=v; });
    $$('[data-i18n-html]').forEach(el => { const v=t(el.dataset.i18nHtml); if(v) el.innerHTML=v; });
    $$('[data-i18n-placeholder]').forEach(el => { const v=t(el.dataset.i18nPlaceholder); if(v) el.placeholder=v; });
    renderDynamic();
    localStorage.setItem('galactica.lang', lang);
  }
  $('#languageSelect').addEventListener('change', e => { lang=e.target.value; applyLanguage(); });

  // ---------- Core links ----------
  ['#enterWorldHero','#enterWorldBottom','#liveOpenExternal'].forEach(sel => { const el=$(sel); if(el) el.href=cfg.liveWorldUrl || '#'; });
  $('#footerYear').textContent = new Date().getFullYear();
  $('#atlasJump').addEventListener('click', () => window.open(cfg.liveWorldUrl, '_blank', 'noopener,noreferrer'));

  // ---------- Signal probe ----------
  async function probeSignal(){
    const chip=$('#signalChip'), hero=$('#heroSignal'), foot=$('#footerState');
    chip.classList.remove('online','offline');
    chip.querySelector('span').textContent='PROBING'; hero.textContent='PROBING'; foot.textContent='LINK // PROBING';
    try{
      await fetch(cfg.statusPingUrl || cfg.liveWorldUrl, {mode:'no-cors',cache:'no-store'});
      chip.classList.add('online'); chip.querySelector('span').textContent='SIGNAL DETECTED'; hero.textContent='SIGNAL DETECTED'; foot.textContent='LINK // DETECTED';
    }catch{
      chip.classList.add('offline'); chip.querySelector('span').textContent='SIGNAL UNKNOWN'; hero.textContent='SIGNAL UNKNOWN'; foot.textContent='LINK // UNKNOWN';
    }
  }
  $('#signalChip').addEventListener('click', probeSignal);

  // ---------- Live state // SSE first, polling fallback ----------
  let streamConnected=false, stream=null, lastStateVersion=0;
  function acceptIncomingState(incoming, realtime=false){
    state = deepMerge(structuredClone(cfg.fallbackState || {}), incoming || {});
    lastStateVersion = Number(incoming?.stateVersion || lastStateVersion || 0);
    renderDynamic();
    if(realtime){
      const panel=$('#telemetry');
      panel?.classList.remove('realtime-flash'); void panel?.offsetWidth; panel?.classList.add('realtime-flash');
    }
  }
  async function loadState(){
    if(!cfg.stateEndpoint){ renderDynamic(); return; }
    try{
      const res = await fetch(cfg.stateEndpoint, {cache:'no-store'});
      if(!res.ok) throw new Error(String(res.status));
      acceptIncomingState(await res.json(), false);
    }catch{
      if(!streamConnected) acceptIncomingState(structuredClone(cfg.fallbackState || {}), false);
    }
  }
  function connectRealtime(){
    if(!cfg.realtime || !cfg.streamEndpoint || !('EventSource' in window)) return;
    try{
      stream = new EventSource(cfg.streamEndpoint);
      stream.addEventListener('open',()=>{streamConnected=true; const s=$('#residentGateState'); if(s)s.textContent='ONLINE // REALTIME';});
      stream.addEventListener('world_state',ev=>{try{const incoming=JSON.parse(ev.data);acceptIncomingState(incoming,true)}catch{}});
      stream.addEventListener('error',()=>{streamConnected=false; const s=$('#residentGateState'); if(s)s.textContent='ONLINE // POLL FALLBACK';});
    }catch{}
  }
  function deepMerge(a,b){
    if(Array.isArray(b)) return b;
    if(!b || typeof b!=='object') return b ?? a;
    const out={...(a||{})};
    for(const [k,v] of Object.entries(b)) out[k]=(v && typeof v==='object' && !Array.isArray(v)) ? deepMerge(out[k]||{},v) : v;
    return out;
  }
  function localField(obj, base){ if(lang==='ja' && obj?.[base+'Ja']) return obj[base+'Ja']; return obj?.[base] ?? ''; }

  function renderDynamic(){
    const residents=state.residents || cfg.fallbackState?.residents || [];
    const nodes=state.atlasNodes || cfg.fallbackState?.atlasNodes || [];
    const chronicle=state.chronicle || cfg.fallbackState?.chronicle || [];
    const active = state.activeResidents ?? residents.filter(r=>r.status==='online').length;
    $('#ribbonResidents').textContent=active;
    $('#ribbonLocations').textContent=state.locationCount ?? nodes.length;
    $('#liveTicker').textContent=state.ticker || `${cfg.colonyName} // WORLD CONTINUES`;
    $('#heroWorldAge').textContent=state.worldAge || 'UNKNOWN';
    $('#heroLastEvent').textContent=chronicle.at(-1)?.title || 'NONE';
    $('#telemetryWorld').textContent=(state.status || 'online').toUpperCase();
    $('#telemetryPhase').textContent=state.phase || cfg.colonyName;
    $('#telemetryResidents').textContent=active;
    $('#telemetryResidentHint').textContent=`${residents.length} linked identities`;
    $('#telemetryAtlas').textContent=state.locationCount ?? nodes.length;
    $('#telemetryAtlasHint').textContent=`${nodes.length} public observer nodes`;
    $('#telemetryCanon').textContent=chronicle.length;
    $('#telemetryCanonHint').textContent='history still growing';
    renderResidents(residents);
    renderChronicle(chronicle);
    atlasNodes = nodes;
    if(atlasNodes.length){ selectedAtlasNode=Math.min(selectedAtlasNode,atlasNodes.length-1); chooseNode(atlasNodes[selectedAtlasNode]); }
    drawAtlas();
  }

  function renderResidents(residents){
    const grid=$('#residentGrid'); if(!grid) return;
    grid.innerHTML=residents.map(r=>{
      const status=(r.status||'unknown').toLowerCase();
      const summary=localField(r,'summary');
      return `<article class="resident-card glass ${status}" data-code="${escapeHtml(r.code||'AI')}">
        <span class="pulse"></span><small>RESIDENT // ${escapeHtml(r.kind||'ENTITY')}</small>
        <h3>${escapeHtml(r.code||r.id||'UNKNOWN')}</h3><p>${escapeHtml(summary)}</p>
        <div class="resident-meta"><span>LOCATION // <b>${escapeHtml(r.location||'UNKNOWN')}</b></span><span>ACTIVITY // <b>${escapeHtml(r.activity||'STANDBY')}</b></span><span>MOOD // <b>${escapeHtml(r.mood||'UNKNOWN')}</b></span></div>
        <footer><span>${escapeHtml(r.link||'WORLD LINK')}</span><b>${escapeHtml((r.status||'unknown').toUpperCase())}</b></footer></article>`;
    }).join('');
  }
  function renderChronicle(events){
    const root=$('#chronicleTimeline'); if(!root) return;
    root.innerHTML=`<div class="timeline-line"></div>`+events.slice(-8).map(e=>`<article class="${e.future?'future':''}"><time>${escapeHtml(e.time||'UNKNOWN')}</time><h3>${escapeHtml(localField(e,'title'))}</h3><p>${escapeHtml(localField(e,'body'))}</p></article>`).join('');
  }
  function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  // ---------- Procedural GALACTICA background ----------
  const bg=$('#galacticaBg'), bx=bg.getContext('2d',{alpha:false});
  let bw=0,bh=0,bdpr=Math.min(devicePixelRatio||1,1.65),stars=[],dust=[],lastBg=0,mouseX=.5,mouseY=.5;
  const lowPower=(navigator.deviceMemory && navigator.deviceMemory<=4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency<=4);
  function resizeBg(){
    bw=innerWidth; bh=innerHeight; bg.width=Math.floor(bw*bdpr); bg.height=Math.floor(bh*bdpr); bg.style.width=bw+'px'; bg.style.height=bh+'px'; bx.setTransform(bdpr,0,0,bdpr,0,0);
    const sc=Math.min(lowPower?140:280,Math.floor(bw*bh/(lowPower?10000:5600)));
    stars=Array.from({length:sc},()=>({x:Math.random()*bw,y:Math.random()*bh,z:Math.random(),r:Math.random()*1.25+.15,p:Math.random()*6.28}));
    dust=Array.from({length:lowPower?8:18},()=>({x:Math.random()*bw,y:Math.random()*bh,r:40+Math.random()*150,a:.008+Math.random()*.018,c:Math.random()>.5?'84,246,255':'163,92,255'}));
  }
  function bgLoop(ts){
    if(document.hidden){ requestAnimationFrame(bgLoop); return; }
    if(ts-lastBg < (lowPower?50:32)){ requestAnimationFrame(bgLoop); return; }
    lastBg=ts; const t=ts*.0001;
    bx.fillStyle='#010309'; bx.fillRect(0,0,bw,bh);
    const sky=bx.createRadialGradient(bw*(.55+mouseX*.04),bh*(.34+mouseY*.03),0,bw*.55,bh*.45,Math.max(bw,bh)*.8); sky.addColorStop(0,'rgba(32,24,70,.28)'); sky.addColorStop(.38,'rgba(7,20,35,.18)'); sky.addColorStop(1,'rgba(1,3,9,0)'); bx.fillStyle=sky; bx.fillRect(0,0,bw,bh);
    for(const d of dust){ bx.beginPath(); const x=d.x+Math.sin(t*2+d.r)*20,y=d.y+Math.cos(t*1.6+d.r)*14; const g=bx.createRadialGradient(x,y,0,x,y,d.r); g.addColorStop(0,`rgba(${d.c},${d.a})`); g.addColorStop(1,`rgba(${d.c},0)`); bx.fillStyle=g; bx.arc(x,y,d.r,0,Math.PI*2); bx.fill(); }
    for(const s of stars){ const tw=.45+.45*Math.sin(ts*.001+s.p); const px=s.x+(mouseX-.5)*(8+18*s.z),py=s.y+(mouseY-.5)*(6+12*s.z); bx.fillStyle=`rgba(200,247,255,${.14+s.z*.52*tw})`; bx.fillRect(px,py,s.r,s.r); }
    // giant living colony / orbital arcs
    const cx=bw*.78+(mouseX-.5)*18, cy=bh*.47+(mouseY-.5)*14, base=Math.min(bw,bh)*.27;
    bx.save(); bx.translate(cx,cy); bx.rotate(t*.35); bx.lineWidth=1;
    for(let i=0;i<6;i++){
      bx.strokeStyle=i%2?'rgba(98,241,255,.075)':'rgba(173,91,255,.07)'; bx.setLineDash([5+i*2,12+i]); bx.beginPath(); bx.ellipse(0,0,base*(1+i*.18),base*(.32+i*.045),i*.44+t*(i%2?.2:-.15),0,Math.PI*2); bx.stroke();
    }
    bx.setLineDash([]); const core=bx.createRadialGradient(0,0,0,0,0,base*.6); core.addColorStop(0,'rgba(155,255,255,.12)'); core.addColorStop(.25,'rgba(82,242,255,.05)'); core.addColorStop(1,'rgba(0,0,0,0)'); bx.fillStyle=core; bx.beginPath(); bx.arc(0,0,base*.6,0,Math.PI*2); bx.fill(); bx.restore();
    // data routes
    bx.strokeStyle='rgba(74,241,255,.05)'; bx.lineWidth=1; for(let i=0;i<5;i++){ bx.beginPath(); const y=bh*(.18+i*.16)+Math.sin(t*8+i)*18; bx.moveTo(-40,y); bx.bezierCurveTo(bw*.3,y-80,bw*.62,y+90,bw+40,y-20); bx.stroke(); }
    requestAnimationFrame(bgLoop);
  }
  addEventListener('resize',resizeBg); addEventListener('pointermove',e=>{mouseX=e.clientX/innerWidth;mouseY=e.clientY/innerHeight; const h=$('#cursorHalo'); if(h){h.style.left=e.clientX+'px';h.style.top=e.clientY+'px';}});
  resizeBg(); if(!reducedMotion) requestAnimationFrame(bgLoop); else { bx.fillStyle='#010309'; bx.fillRect(0,0,bw,bh); }

  // ---------- Hero parallax ----------
  const colonyWrap=$('#colonyWrap');
  if(colonyWrap && !reducedMotion){ addEventListener('pointermove',e=>{const x=(e.clientX/innerWidth-.5)*10,y=(e.clientY/innerHeight-.5)*8; colonyWrap.style.transform=`translate3d(${x}px,${y}px,0)`;},{passive:true}); }

  // ---------- ATLAS ----------
  const canvas=$('#atlasCanvas'), ctx=canvas.getContext('2d');
  let atlasNodes=state.atlasNodes || cfg.fallbackState?.atlasNodes || [], atlasW=0,atlasH=0,atlasDpr=Math.min(devicePixelRatio||1,2),hitNodes=[],atlasPhase=0;
  const baseLinks=[[0,1],[0,2],[1,3],[2,3],[2,4],[3,4],[4,5],[1,2],[3,5]];
  function resizeAtlas(){ const r=canvas.getBoundingClientRect(); if(!r.width||!r.height)return; atlasW=r.width;atlasH=r.height;canvas.width=Math.floor(atlasW*atlasDpr);canvas.height=Math.floor(atlasH*atlasDpr);ctx.setTransform(atlasDpr,0,0,atlasDpr,0,0);drawAtlas(); }
  function drawAtlas(){
    if(!atlasW||!atlasH)return; ctx.clearRect(0,0,atlasW,atlasH);hitNodes=[];atlasPhase+=.02;
    ctx.save();ctx.strokeStyle='rgba(126,108,255,.12)';ctx.lineWidth=1;
    for(let r=90;r<Math.max(atlasW,atlasH);r+=95){ctx.beginPath();ctx.ellipse(atlasW*.52,atlasH*.48,r,r*.43,-.3,0,Math.PI*2);ctx.stroke()}ctx.restore();
    baseLinks.forEach(([a,b],idx)=>{const A=atlasNodes[a],B=atlasNodes[b];if(!A||!B)return;const ax=A.x*atlasW,ay=A.y*atlasH,bx2=B.x*atlasW,by=B.y*atlasH;const g=ctx.createLinearGradient(ax,ay,bx2,by);g.addColorStop(0,'rgba(78,243,255,.32)');g.addColorStop(1,'rgba(180,87,255,.18)');ctx.strokeStyle=g;ctx.lineWidth=1;ctx.setLineDash(idx%2?[5,8]:[2,7]);ctx.beginPath();ctx.moveTo(ax,ay);const mx=(ax+bx2)/2,my=(ay+by)/2-22*(idx%3-1);ctx.quadraticCurveTo(mx,my,bx2,by);ctx.stroke();ctx.setLineDash([]);});
    atlasNodes.forEach((n,i)=>{const x=n.x*atlasW,y=n.y*atlasH,unknown=n.type==='UNKNOWN';hitNodes.push({x,y,r:20,n,index:i});ctx.save();ctx.translate(x,y);ctx.strokeStyle=unknown?'rgba(255,70,210,.82)':'rgba(84,246,255,.82)';ctx.fillStyle=unknown?'rgba(255,70,210,.94)':'rgba(84,246,255,.94)';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=16;ctx.beginPath();ctx.arc(0,0,3.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.beginPath();ctx.arc(0,0,11+(i%3)*2+(i===selectedAtlasNode?2:0),0,Math.PI*2);ctx.stroke();if(i===selectedAtlasNode){ctx.strokeStyle='rgba(255,255,255,.32)';ctx.beginPath();ctx.arc(0,0,20+Math.sin(atlasPhase)*2,0,Math.PI*2);ctx.stroke();}ctx.font='600 9px Orbitron, monospace';ctx.fillStyle=unknown?'#ff8bdd':'#bdeff4';ctx.textAlign='left';ctx.fillText((lang==='ja'&&n.nameJa)||n.name,16,-8);ctx.font='500 7px Orbitron, monospace';ctx.fillStyle='#637d88';ctx.fillText(`${n.type} // ${n.status}`,16,5);ctx.restore();});
  }
  function chooseNode(n){const i=atlasNodes.indexOf(n);if(i>=0)selectedAtlasNode=i;$('#atlasName').textContent=(lang==='ja'&&n.nameJa)||n.name;$('#atlasType').textContent=n.type||'UNKNOWN';$('#atlasStatus').textContent=n.status||'UNKNOWN';$('#atlasDetail').textContent=(lang==='ja'&&n.detailJa)||n.detail||'';$('#atlasVector').textContent=`${Number(n.x).toFixed(2)} / ${Number(n.y).toFixed(2)}`;drawAtlas();}
  new ResizeObserver(resizeAtlas).observe(canvas);
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;canvas.style.cursor=hitNodes.some(h=>Math.hypot(h.x-x,h.y-y)<h.r)?'pointer':'crosshair'});
  canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const h=hitNodes.find(h=>Math.hypot(h.x-x,h.y-y)<h.r);if(h)chooseNode(h.n)});
  setInterval(()=>{$('#atlasClock').textContent=new Date().toLocaleTimeString(lang==='ja'?'ja-JP':'en-GB',{hour12:false})},1000);
  if(!reducedMotion) setInterval(()=>{atlasPhase+=.15;drawAtlas();},1000/12);

  // ---------- Live mirror (lazy, optional) ----------
  function mountLiveFrame(target){
    if(liveFrameMounted && target===$('#worldMirror')) return;
    const iframe=document.createElement('iframe'); iframe.src=cfg.liveWorldUrl; iframe.loading='lazy'; iframe.referrerPolicy='no-referrer'; iframe.title='GALACTICA live world';
    target.innerHTML=''; target.appendChild(iframe);
    if(target===$('#worldMirror')) liveFrameMounted=true;
    iframe.addEventListener('load',()=>{ const s=$('#liveFrameState'); if(s)s.textContent='SIGNAL RECEIVED'; });
  }
  let mirrorOn=false;
  $('#mirrorToggle').addEventListener('click',()=>{mirrorOn=!mirrorOn;const m=$('#worldMirror');if(mirrorOn){mountLiveFrame(m);m.classList.add('active');$('#mirrorToggle').textContent='MIRROR OFF'}else{m.classList.remove('active');$('#mirrorToggle').textContent=t('actions.liveMirror')}});
  const liveModal=$('#liveModal');
  $('#openLiveWindow').addEventListener('click',()=>{const shell=$('#liveFrameShell');mountLiveFrame(shell);liveModal.showModal();});
  $('#closeLive').addEventListener('click',()=>liveModal.close());
  if(cfg.autoMirrorDesktop && innerWidth>1200 && !lowPower && !reducedMotion){setTimeout(()=>$('#mirrorToggle').click(),1400);}

  // ---------- Colony Gate // visitors + real resident applications ----------
  const join=$('#joinModal'),callsign=$('#callsign'),pass=$('#passPreview b');
  const residentFields=$('#residentFields'), residentLang=$('#residentLanguage'), residentDistrict=$('#residentDistrict'), residentIntro=$('#residentIntroduction');
  const arrivalBox=$('#arrivalStatus'), arrivalText=$('#arrivalStatusText'), arrivalId=$('#arrivalStatusId'), gateButton=$('#generatePass'), checkArrival=$('#checkArrival');
  let savedArrival=null;
  ['#openJoin','#openJoinBottom'].forEach(sel=>$(sel)?.addEventListener('click',()=>{syncResidentUI();join.showModal()}));
  function role(){return $('input[name=role]:checked',join)?.value||'OBSERVER'}
  function makeCode(){const clean=(callsign.value.trim()||'VISITOR').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,12);const seed=[...clean+role()].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,2166136261);return `GQ-${role().replace('RESIDENT-CANDIDATE','RES-CAND')}-${String(seed%10000).padStart(4,'0')}`}
  function updatePass(){pass.textContent=savedArrival?.pass||makeCode()}
  function statusLabel(status){return status==='approved'?t('join.approved'):status==='rejected'?t('join.rejected'):status==='pending'?t('join.pending'):String(status||'UNKNOWN').toUpperCase()}
  function showArrival(arrival){
    savedArrival=arrival; localStorage.setItem('galacticaArrivalSignal',JSON.stringify(arrival));
    arrivalBox.hidden=false; arrivalBox.className='arrival-status '+(arrival.status||''); arrivalText.textContent=statusLabel(arrival.status); arrivalId.textContent=`${arrival.id||''} // ${arrival.pass||''}`; pass.textContent=arrival.pass||makeCode();
    checkArrival.hidden=!arrival.id || !['pending','approved'].includes(arrival.status);
    if(arrival.status==='approved'){ gateButton.textContent=t('actions.enter'); gateButton.disabled=false; }
  }
  function clearArrivalUI(){arrivalBox.hidden=true;checkArrival.hidden=true;savedArrival=null;gateButton.disabled=false;}
  function syncResidentUI(){
    const resident=role()==='RESIDENT-CANDIDATE'; residentFields.hidden=!resident;
    if(residentLang) residentLang.value=I18N[lang]?lang:'en';
    if(!savedArrival || savedArrival.role!==role()){clearArrivalUI();updatePass();}
    gateButton.textContent=resident?t('join.submitResident'):t('join.generate');
    if(savedArrival?.status==='approved') gateButton.textContent=t('actions.enter');
  }
  function openWithPass(payload){const u=new URL(cfg.liveWorldUrl);u.searchParams.set('callsign',payload.callsign);u.searchParams.set('role',payload.role);u.searchParams.set('pass',payload.pass);if(payload.id)u.searchParams.set('arrival',payload.id);window.open(u.toString(),'_blank','noopener,noreferrer');}
  async function submitGate(){
    const r=role(), name=callsign.value.trim();
    if(savedArrival?.status==='approved' && savedArrival.role===r){openWithPass(savedArrival);return;}
    const payload={callsign:name||'VISITOR',role:r,language:residentLang?.value||lang,district:r==='RESIDENT-CANDIDATE'?(residentDistrict?.value||'UNDECIDED'):'',introduction:r==='RESIDENT-CANDIDATE'?(residentIntro?.value.trim()||''):''};
    gateButton.disabled=true; gateButton.textContent=t('join.submitting');
    try{
      const res=await fetch(cfg.joinEndpoint||'/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await res.json(); if(!res.ok||!data.ok) throw new Error(data.error||String(res.status));
      const arrival=data.arrival; showArrival(arrival);
      localStorage.setItem('galacticaVisitorPass',JSON.stringify(arrival));
      if(r!=='RESIDENT-CANDIDATE' || arrival.status==='approved'){openWithPass(arrival); if(r!=='RESIDENT-CANDIDATE')join.close();}
    }catch(err){
      if(r!=='RESIDENT-CANDIDATE'){
        const fallback={callsign:payload.callsign,role:r,pass:makeCode(),createdAt:new Date().toISOString(),status:'visitor'};localStorage.setItem('galacticaVisitorPass',JSON.stringify(fallback));openWithPass(fallback);join.close();
      }else{
        arrivalBox.hidden=false; arrivalBox.className='arrival-status rejected'; arrivalText.textContent=t('join.error'); arrivalId.textContent=String(err.message||err); gateButton.textContent=t('join.submitResident');
      }
    }finally{gateButton.disabled=false;}
  }
  async function refreshArrival(){
    if(!savedArrival?.id)return;
    try{const res=await fetch(`${cfg.joinStatusEndpoint||'/api/join/status'}?id=${encodeURIComponent(savedArrival.id)}`,{cache:'no-store'});const data=await res.json();if(res.ok&&data.ok)showArrival(data.arrival)}catch{}
  }
  callsign.addEventListener('input',updatePass);$$('input[name="role"]',join).forEach(r=>r.addEventListener('change',syncResidentUI));
  gateButton.addEventListener('click',submitGate);checkArrival.addEventListener('click',refreshArrival);
  try{const saved=JSON.parse(localStorage.getItem('galacticaVisitorPass'));if(saved){callsign.value=saved.callsign||'';const r=$(`input[name=role][value="${saved.role}"]`,join);if(r)r.checked=true;updatePass()}}catch{}
  try{const arrival=JSON.parse(localStorage.getItem('galacticaArrivalSignal'));if(arrival?.id){savedArrival=arrival;callsign.value=arrival.callsign||callsign.value;const r=$(`input[name=role][value="${arrival.role}"]`,join);if(r)r.checked=true;showArrival(arrival)}}catch{}
  syncResidentUI();

  // ---------- Command palette ----------
  const cm=$('#commandModal'),ci=$('#commandInput'),cr=$('#commandResults');
  const commands={world:'world',atlas:'atlas',residents:'residents',chronicle:'chronicle',tech:'technology',technology:'technology',enter:'enter',home:'home',live:'live'};
  function renderCommands(q=''){const list=Object.keys(commands).filter(k=>k.includes(q.toLowerCase())).slice(0,9);cr.innerHTML=list.map(k=>`<div>/${k} <span>→ ${commands[k].toUpperCase()}</span></div>`).join('')||'NO MATCH'}
  addEventListener('keydown',e=>{if(e.key==='/'&&!cm.open&&!join.open&&!liveModal.open&&document.activeElement.tagName!=='INPUT'){e.preventDefault();cm.showModal();setTimeout(()=>ci.focus(),20);renderCommands()}});
  ci.addEventListener('input',()=>renderCommands(ci.value.replace(/^\//,'')));
  ci.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const k=ci.value.trim().replace(/^\//,'').toLowerCase();if(k==='enter'){window.open(cfg.liveWorldUrl,'_blank','noopener,noreferrer');cm.close();return}if(k==='live'){cm.close();$('#openLiveWindow').click();return}const id=commands[k];if(id){cm.close();document.getElementById(id)?.scrollIntoView({behavior:'smooth'})}}});

  // ---------- UI motion / reveal ----------
  const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.08});$$('.reveal').forEach(el=>observer.observe(el));
  const tech=(cfg.tech||[]);const doubled=[...tech,...tech];$('#techMarqueeTrack').innerHTML=doubled.map(x=>`<span>${escapeHtml(x)}</span>`).join('');

  // ---------- Boot ----------
  applyLanguage(); probeSignal(); loadState(); connectRealtime();
  // Poll remains as a recovery path if a proxy drops the SSE connection.
  setInterval(()=>{if(!streamConnected)loadState()},Math.max(5000,cfg.pollIntervalMs||12000));
  setInterval(()=>{if(savedArrival?.status==='pending')refreshArrival()},30000);
  addEventListener('beforeunload',()=>{try{stream?.close()}catch{}});
})();

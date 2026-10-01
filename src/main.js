import './style.css';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { ui, chapters, quiz, sources, pair } from './content.js';
import { gamma, energy, causalRegion, deflection } from './physics.js';

const $ = selector => document.querySelector(selector);
// 演示视图用于课堂投影和录屏，仅调整布局，不改变实验计算。
if(new URLSearchParams(location.search).get('presentation')==='1') document.body.classList.add('presentation-mode');
if(new URLSearchParams(location.search).get('capture')==='1') document.body.classList.add('recording-mode');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {
  chapter:0, lang:'zh', mode:'guided', playing:!reducedMotion, time:0,
  frame:'ground', parameters:chapters.map(c=>Object.fromEntries(c.parameters.map(p=>[p.key,p.value]))),
  recorded:null, event:null, answers:{},
};
try { const saved=localStorage.getItem('spacetime-language'); if(['zh','en','both'].includes(saved)) state.lang=saved; } catch { /* 隐私模式仍可使用 */ }
let scene=null;
const tr = value => {
  const p=typeof value==='string'?ui[value]:value;
  if(!p) return value;
  return state.lang==='both'?`${p.zh} / ${p.en}`:p[state.lang];
};
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = value => {
  const p=typeof value==='string'?ui[value]:value;
  return state.lang==='both'?`${escape(p.zh)}<span class="translation">${escape(p.en)}</span>`:escape(p[state.lang]);
};
const params=()=>state.parameters[state.chapter];
const number = value => value.toFixed(1);
const scientific = value => {
  if(value===0) return '0 J';
  const [coefficient,exponent]=value.toExponential(3).split('e');
  const superscripts={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
  return `${coefficient} × 10${String(Number(exponent)).split('').map(c=>superscripts[c]).join('')} J`;
};

$('#app').innerHTML=`
  <header class="topbar"><a class="wordmark" href="#" aria-label="Spacetime Lab"><span class="brand-symbol">✳</span><span id="brand"></span><small>SPACETIME LAB</small></a>
    <div class="top-actions"><div class="mode-switch" id="mode-switch"></div><label class="language"><span id="language-label"></span><select id="language"><option value="zh">中文</option><option value="en">English</option><option value="both">中英对照 / Both</option></select></label></div>
  </header>
  <main>
    <section class="intro"><div><div class="eyebrow" id="eyebrow"></div><h1 id="hero"></h1><p id="intro-text"></p></div>
      <div class="intro-aside"><div class="mini-orbit"><span>c</span><i></i></div><p id="intro-subtitle"></p><span class="chapter-counter">01 — 06</span></div>
    </section>
    <nav class="chapter-nav" id="chapter-nav"></nav>
    <section class="lab" id="lab">
      <div class="viewport-card">
        <div class="scene-top"><span id="scene-tag" class="eyebrow"></span><button id="reset-view" class="quiet"></button></div>
        <div class="viewport" id="viewport" role="region" aria-label="3D experiment"><div id="fallback" class="fallback" hidden></div></div>
        <div class="scene-bottom"><span id="scene-note" class="model-note"></span><span id="rotate-hint"></span></div>
        <div class="transport"><button id="play" class="primary"></button><button id="step" class="quiet"></button><button id="reset" class="quiet"></button><output id="timeline">0.0 s</output></div>
      </div>
      <aside class="lesson-panel"><div class="eyebrow" id="question-label"></div><h2 id="question"></h2><p class="explanation" id="explanation"></p>
        <div class="parameter-section"><h3 id="controls-label"></h3><div id="controls"></div></div>
        <div class="readings-section"><h3 id="observation-label"></h3><div id="readings"></div><p id="feedback" class="feedback" aria-live="polite"></p></div>
        <details id="details"><summary id="more-label"></summary><div id="formula"></div><p id="formula-text"></p><p id="boundary" class="boundary"></p></details>
      </aside>
    </section>
    <section class="takeaway"><span class="takeaway-mark">↗</span><p id="takeaway-text"></p><div class="journey"><button id="previous" class="quiet"></button><button id="next" class="dark"></button></div></section>
    <p class="lesson-hint" id="lesson-hint"></p>
    <section class="quiz-section"><div class="section-heading"><div class="eyebrow" id="quiz-eyebrow"></div><h2 id="quiz-title"></h2><p id="quiz-intro"></p></div><div id="quiz-grid" class="quiz-grid"></div></section>
    <section class="sources-section"><h2 id="sources-title"></h2><p id="source-intro"></p><div id="sources-grid"></div></section>
  </main><footer><span id="footer-text"></span><span>THREE.JS · RELATIVITY · 2026</span></footer>`;

function bindStatic() {
  $('#language').addEventListener('change',e=>{
    state.lang=e.target.value;
    try { localStorage.setItem('spacetime-language',state.lang); } catch { /* 不依赖存储 */ }
    renderContent();
  });
  $('#play').onclick=()=>{
    if(state.chapter===1) {
      if(state.playing) params().slice=Number((state.time%4).toFixed(1));
      else state.time=params().slice;
    }
    state.playing=!state.playing;
    if(state.chapter===1) renderControls();
    updateTransport();updateReadings();
  };
  $('#step').onclick=()=>{
    state.playing=false;
    state.time+=1;
    if(state.chapter===1) {params().slice=Number((state.time%4).toFixed(1));renderControls();}
    updateTransport();updateReadings();
  };
  $('#reset').onclick=()=>{
    state.parameters[state.chapter]=Object.fromEntries(chapters[state.chapter].parameters.map(p=>[p.key,p.value]));
    state.time=0;state.recorded=null;state.event=null;state.frame='ground';
    renderContent(); rebuild(); scene?.resetView();
  };
  $('#reset-view').onclick=()=>scene?.resetView();
  $('#previous').onclick=()=>go(Math.max(0,state.chapter-1));
  $('#next').onclick=()=>go((state.chapter+1)%chapters.length);
}

function go(index) {
  state.chapter=index;state.time=0;state.event=null;
  renderContent();rebuild();
  if(innerWidth<700) $('#lab').scrollIntoView({behavior:reducedMotion?'instant':'smooth',block:'start'});
}

function renderContent() {
  document.documentElement.lang=state.lang==='en'?'en':'zh-CN';
  document.body.dataset.language=state.lang;
  document.title=tr('brand')+' · Spacetime Lab';
  const assignments={brand:'brand',eyebrow:'eyebrow',hero:'hero','intro-text':'intro','intro-subtitle':'subtitle','language-label':'language','rotate-hint':'rotate','question-label':'question','controls-label':'controls','observation-label':'observation','more-label':'more','quiz-title':'quiz','quiz-intro':'quizIntro','sources-title':'sources','source-intro':'sourceIntro','footer-text':'footer'};
  Object.entries(assignments).forEach(([id,key])=>{$(`#${id}`).innerHTML=text(key);});
  $('#language').value=state.lang;
  $('#quiz-eyebrow').innerHTML=text(pair('检验你的理解','CHECK YOUR UNDERSTANDING'));
  $('#mode-switch').innerHTML=['guided','explore'].map(mode=>`<button class="${state.mode===mode?'selected':''}" data-mode="${mode}">${text(mode)}</button>`).join('');
  $('#mode-switch').querySelectorAll('button').forEach(button=>button.onclick=()=>{state.mode=button.dataset.mode;renderContent();});
  $('#chapter-nav').setAttribute('aria-label',tr('experiments'));
  $('#chapter-nav').innerHTML=chapters.map((chapter,i)=>`<button class="chapter-tab ${i===state.chapter?'active':''}" aria-current="${i===state.chapter?'step':'false'}" data-chapter="${i}"><span class="tab-index">0${i+1}</span><span>${text(chapter.short)}</span><span class="tab-dot"></span></button>`).join('');
  $('#chapter-nav').querySelectorAll('button').forEach(button=>button.onclick=()=>go(Number(button.dataset.chapter)));
  const chapter=chapters[state.chapter];
  $('#scene-tag').innerHTML=text(chapter.tag);
  $('#question').innerHTML=text(chapter.question);
  $('#explanation').innerHTML=text(chapter.explanation);
  $('#takeaway-text').innerHTML=text(chapter.takeaway);
  $('#formula-text').innerHTML=text(chapter.formulaText);
  $('#boundary').innerHTML=text(chapter.boundary);
  katex.render(chapter.formula,$('#formula'),{throwOnError:false,displayMode:true});
  const note=[pair('三维空间坐标 · 单位 m','3D spatial coordinates · metres'),ui.coneNote,ui.lightClock,ui.comparison,ui.analogy,ui.lensNote][state.chapter];
  $('#scene-note').innerHTML=text(note);
  $('#lesson-hint').innerHTML=text(state.mode==='guided'?'lesson':'rotate');
  $('#previous').innerHTML=text('previous'); $('#previous').disabled=state.chapter===0;
  $('#next').innerHTML=text(state.chapter===5?'again':'next')+' <span>→</span>';
  $('#reset-view').innerHTML=text('resetView');
  $('#viewport').setAttribute('aria-label',tr(chapter.title));
  renderControls();updateTransport();updateReadings();renderQuiz();renderSources();
  if($('#fallback').hidden===false) renderFallback();
}

function renderControls() {
  const chapter=chapters[state.chapter];
  $('#controls').innerHTML=chapter.parameters.map(p=>`<label class="slider-control" for="param-${p.key}"><span>${text(p.label)}</span><output id="value-${p.key}">${number(params()[p.key])} ${p.unit}</output><input id="param-${p.key}" type="range" data-key="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${params()[p.key]}"/><span class="range-bounds"><span>${p.min}</span><span>${p.max} ${p.unit}</span></span></label>`).join('');
  $('#controls').querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{
    params()[input.dataset.key]=Number(input.value);
    const p=chapter.parameters.find(p=>p.key===input.dataset.key);
    $(`#value-${p.key}`).textContent=`${p.key==='beta'?params()[p.key].toFixed(2):number(params()[p.key])} ${p.unit}`;
    if(state.chapter===1) { state.playing=false;state.time=params().slice;updateTransport(); }
    rebuild();updateReadings();
  }));
  if(state.chapter===0) {
    const button=document.createElement('button');button.className='outline';button.innerHTML=text('event');
    button.onclick=()=>{state.recorded={...params()};rebuild();updateReadings();};$('#controls').append(button);
  }
  if(state.chapter===2) {
    const label=document.createElement('label');label.className='frame-selector';
    label.innerHTML=`<span>${text('frame')}</span><select id="frame"><option value="ground">${escape(tr('ground'))}</option><option value="ship">${escape(tr('ship'))}</option></select>`;
    $('#controls').append(label);$('#frame').value=state.frame;
    $('#frame').onchange=e=>{state.frame=e.target.value;rebuild();updateReadings();};
  }
}

function updateTransport() {
  $('#play').innerHTML=`<span aria-hidden="true">${state.playing?'Ⅱ':'▶'}</span> ${text(state.playing?'pause':'play')}`;
  $('#step').innerHTML=text('step');$('#reset').innerHTML=text('reset');
  $('#timeline').textContent=`${state.time.toFixed(1)} s`;
}

function reading(label,value,accent=false) {
  return `<div class="reading ${accent?'accent':''}"><span>${text(label)}</span><strong>${escape(value)}</strong></div>`;
}

function updateReadings() {
  const p=params(); let html='',feedback='';
  if(state.chapter===0) {
    html=reading(pair('当前事件坐标','Current event coordinates'),`(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}, ${p.t.toFixed(1)})`);
    if(state.recorded) html+=reading(pair('已记录事件','Recorded event'),`(${number(state.recorded.x)}, ${number(state.recorded.y)}, ${number(state.recorded.z)}, ${number(state.recorded.t)})`);
    feedback=state.recorded?'eventRecorded':'eventPrompt';
  }
  if(state.chapter===1) {
    const t=state.playing?state.time%4:p.slice;
    html=reading(pair('当前切片 ct / 光圈半径 r','Current slice ct / light-circle radius r'),`${t.toFixed(2)} / ${t.toFixed(2)} a.u.`);
    if(state.event) {
      const e=state.event;
      html+=reading(pair('选中事件','Selected event'),`${e.id}: (x, z, ct) = (${e.x}, ${e.z}, ${e.t})`,true);
      feedback=causalRegion(e.x,e.z,e.t);
    } else feedback='emission';
  }
  if(state.chapter===2) {
    const g=gamma(p.beta);
    html=reading('coordinateTime',`${state.time.toFixed(2)} s`)+reading('properTime',`${(state.time/g).toFixed(2)} s`,true)+reading(pair('洛伦兹因子 γ','Lorentz factor γ'),g.toFixed(3));
    feedback=pair(`地面经过 10 s → 运动钟累计 ${(10/g).toFixed(2)} s。图中光路按${state.frame==='ground'?'地面':'随钟'}参考系显示；读数保留地面比较。`,`10 ground seconds → ${(10/g).toFixed(2)} s on the moving clock. Paths use the ${state.frame==='ground'?'ground':'clock'} frame; readings retain the ground comparison.`);
  }
  if(state.chapter===3) {
    const e=energy(p.mass,p.beta);
    html=reading('rest',scientific(e.rest))+reading('kinetic',scientific(e.kinetic))+reading('total',scientific(e.total),true);
    feedback=pair(`总能量是静止能量的 ${gamma(p.beta).toFixed(3)} 倍。`,`Total energy is ${gamma(p.beta).toFixed(3)} times the rest energy.`);
  }
  if(state.chapter===4) {
    html=reading(pair('示意强度','Illustrative strength'),`${p.depth.toFixed(1)} a.u.`);
    feedback='analogy';
  }
  if(state.chapter===5) {
    const d=deflection(p.solarMass,p.impact);
    html=reading(pair('真实弱场偏折角 α','Physical weak-field deflection α'),`${d.arcseconds.toFixed(3)} ″`,true)+reading(pair('画面示意角度','Illustrative visual angle'),`${(d.radians*8000*180/Math.PI).toFixed(2)}°`);
    feedback='lensNote';
  }
  // 仅在读数变化时更新 DOM，避免动画中不断替换辅助技术节点。
  if($('#readings').innerHTML!==html) $('#readings').innerHTML=html;
  const message=text(feedback);
  if($('#feedback').innerHTML!==message) $('#feedback').innerHTML=message;
  $('#timeline').textContent=`${state.time.toFixed(1)} s`;
}

function renderQuiz() {
  $('#quiz-grid').innerHTML=quiz.map((q,i)=>{
    const answer=state.answers[i],has=answer!==undefined;
    return `<article class="quiz-card"><span class="quiz-number">0${i+1}</span><h3>${text(q.question)}</h3><div class="quiz-options">${q.options.map((o,j)=>`<button data-quiz="${i}" data-answer="${j}" aria-pressed="${answer===j}" class="${answer===j?(j===q.answer?'correct':'incorrect'):''}">${text(o)}</button>`).join('')}</div><p class="quiz-reason" aria-live="polite">${has?`${text(answer===q.answer?'correct':'incorrect')} ${text(q.reason)}`:text('check')}</p></article>`;
  }).join('');
  $('#quiz-grid').querySelectorAll('button').forEach(button=>button.onclick=()=>{state.answers[button.dataset.quiz]=Number(button.dataset.answer);renderQuiz();});
}

function renderSources() {
  $('#sources-grid').innerHTML=sources.map((s,i)=>`<a href="${s.url}" target="_blank" rel="noopener noreferrer"><span>0${i+1}</span>${text(s.title)}<span>↗</span></a>`).join('');
}

function renderFallback() {
  $('#fallback').hidden=false;
  $('#fallback').innerHTML=`<div class="fallback-symbol">${['(x, y, z, t)','◁ ● ▷','│ ↗ │','E₀ = mc²','⌒ ● ⌒','──── ● ╲'][state.chapter]}</div><p>${text(chapters[state.chapter].fallback)}</p><small>${text('fallback')}</small>`;
  $('#reset-view').disabled=true;
}

function rebuild() { scene?.build(state.chapter,params(),state.frame,state.recorded); }

bindStatic();renderContent();
try {
  const {LabScene}=await import('./scene.js');
  scene=new LabScene($('#viewport'),tr,event=>{state.event=event;updateReadings();});
  rebuild();
} catch(error) {
  $('#viewport').querySelector('canvas')?.remove();
  renderFallback();console.warn('3D unavailable; teaching fallback active.',error.message);
}

let last=performance.now(),lastReading=0;
function animate(now) {
  const delta=Math.min((now-last)/1000,0.1);last=now;
  if(state.playing&&!document.hidden) state.time+=delta;
  scene?.update(state.time,state.playing);
  if(now-lastReading>100) {updateReadings();lastReading=now;}
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// 暴露只读快照供本地验收，避免测试依赖内部 DOM 文案。
window.spacetimeLab = {snapshot:()=>structuredClone(state),physics:{gamma,energy,causalRegion,deflection}};

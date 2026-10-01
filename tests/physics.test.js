import test from 'node:test';
import assert from 'node:assert/strict';
import { C, gamma, energy, causalRegion, deflection } from '../src/physics.js';
import { ui, chapters, quiz, sources } from '../src/content.js';
import katex from 'katex';

const near=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

test('光钟：0.8c 时，地面 10 秒对应运动钟 6 秒；静止钟相同',()=>{
  near(gamma(0),1);near(gamma(0.8),5/3);near(10/gamma(0.8),6);
  assert.throws(()=>gamma(1),RangeError);assert.throws(()=>gamma(NaN),RangeError);
});

test('能量：静止极限、总能量分解与能量动量不变量',()=>{
  const atRest=energy(2,0);near(atRest.kinetic,0);assert.equal(atRest.total,atRest.rest);
  for(const beta of [0.1,0.4,0.8,0.95]) {
    const m=2,e=energy(m,beta),p=gamma(beta)*m*beta*C;
    near((e.total-e.kinetic)/e.rest,1);
    near((e.total**2-p**2*C**2)/(m**2*C**4),1,1e-12);
  }
  assert.equal(energy(2,0.8).rest,2*energy(1,0.8).rest);
  assert.throws(()=>energy(-1,0),RangeError);
});

test('光锥：未来、过去、类空与光锥边界正确分类',()=>{
  assert.equal(causalRegion(0.7,0.4,2.8),'future');
  assert.equal(causalRegion(3.8,0.3,1.2),'outside');
  assert.equal(causalRegion(0.5,-0.4,-2.8),'past');
  assert.equal(causalRegion(2,0,2),'futureLight');
  assert.equal(causalRegion(0,2,-2),'pastLight');
  assert.equal(causalRegion(0,0,0),'futureLight');
});

test('太阳弱场偏折约 1.75 角秒，质量和经过距离的比例正确',()=>{
  const angle=deflection(1,1).arcseconds;
  near(angle,1.75,0.005);
  near(deflection(2,1).arcseconds,2*angle);
  near(deflection(1,2).arcseconds,angle/2);
  assert.equal(deflection(0,1).radians,0);
  assert.throws(()=>deflection(1,0),RangeError);
});

test('所有文案成对维护，六个场景和三个练习具有有效参数',()=>{
  const walk=obj=>{
    if(!obj||typeof obj!=='object') return;
    if('zh'in obj||'en'in obj) {assert.ok(typeof obj.zh==='string'&&obj.zh.length);assert.ok(typeof obj.en==='string'&&obj.en.length);}
    else Object.values(obj).forEach(walk);
  };
  walk(ui);walk(chapters);walk(quiz);walk(sources);
  assert.equal(chapters.length,6);assert.equal(quiz.length,3);
  chapters.forEach(ch=>ch.parameters.forEach(p=>{assert.ok(p.value>=p.min&&p.value<=p.max);assert.ok(p.step>0);}));
  quiz.forEach(q=>assert.ok(q.answer>=0&&q.answer<q.options.length));
  sources.forEach(s=>assert.equal(new URL(s.url).protocol,'https:'));
});

test('六个教学公式可渲染，LaTeX 命令不因字符串转义丢失',()=>{
  chapters.forEach(ch=>assert.ok(katex.renderToString(ch.formula,{throwOnError:true}).includes('katex')));
  assert.ok(chapters[2].formula.includes(String.raw`\gamma`));
  assert.ok(chapters[4].formula.includes(String.raw`\frac`));
});

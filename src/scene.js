import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gamma, deflection } from './physics.js';

const TEAL = 0x17675b, RED = 0xae4531, GOLD = 0xe7ab38, INK = 0x304743;
const triangle = (v, height) => height - Math.abs((v % (2 * height)) - height);

export class LabScene {
  constructor(host, translate, selectEvent) {
    this.host = host;
    this.translate = translate;
    this.selectEvent = selectEvent;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0xf6f5ef, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.host.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 35;
    this.controls.enablePan = false;
    this.controls.maxPolarAngle = Math.PI * 0.86;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa89f, 2.6));
    const light = new THREE.DirectionalLight(0xfff3df, 3);
    light.position.set(5, 10, 7);
    this.scene.add(light);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.labels = [];
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'scene-labels';
    this.host.append(this.labelLayer);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
  }

  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    this.width = width; this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  material(color, options = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.48, metalness: 0.12, ...options });
  }

  mesh(geometry, color, position = [0,0,0], options = {}) {
    const mesh = new THREE.Mesh(geometry, this.material(color, options));
    mesh.position.set(...position); this.root.add(mesh); return mesh;
  }

  line(points, color = TEAL, opacity = 1, dashed = false) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
    const mat = dashed
      ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.15, gapSize: 0.12 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const line = new THREE.Line(geometry, mat);
    if (dashed) line.computeLineDistances();
    this.root.add(line); return line;
  }

  ring(radius, y, color, opacity = 1) {
    const pts = Array.from({ length: 97 }, (_, i) => [radius * Math.cos(i/96*Math.PI*2),y,radius * Math.sin(i/96*Math.PI*2)]);
    return this.line(pts, color, opacity);
  }

  sphere(radius, color, pos, options = {}) {
    return this.mesh(new THREE.SphereGeometry(radius, 40, 24), color, pos, options);
  }

  label(text, pos, event = null) {
    const el = document.createElement(event ? 'button' : 'span');
    el.className = `scene-label ${event ? 'event-label' : ''}`;
    if (event) { el.type = 'button'; el.onclick = () => this.selectEvent(event); }
    this.labelLayer.append(el);
    const item = {el,text,position:new THREE.Vector3(...pos)};
    this.labels.push(item); return item;
  }

  grid(size = 12, divisions = 24, y = 0) {
    const grid = new THREE.GridHelper(size, divisions, 0xa4b7ac, 0xd0d9d0);
    grid.position.y = y;
    grid.material.transparent = true; grid.material.opacity = 0.65;
    this.root.add(grid);
  }

  axes(time = false) {
    const directions = [[1,0,0],[0,1,0],[0,0,1]];
    directions.forEach((dir,i) => {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(...dir),new THREE.Vector3(0,0,0),5.4,i===1 && time ? RED : TEAL,0.23,0.12);
      this.root.add(arrow);
      this.label(i===1 && time ? 'ct' : ['x','y','z'][i],dir.map(v=>v*5.8));
    });
  }

  clear() {
    this.root.traverse(obj => {
      obj.geometry?.dispose();
      if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m=>m.dispose());
    });
    this.root.clear(); this.labelLayer.replaceChildren(); this.labels=[];
  }

  resetView() {
    const views = [[10,7,12],[10,7,12],[0,7,22],[9,7,14],[10,7,12],[0,17,25]];
    const scale=Math.max(1,1.15/this.camera.aspect);
    this.camera.position.set(...views[this.chapter].map(v=>v*scale));
    this.controls.target.set(0,this.chapter===1 ? 0 : 1,0);
    this.controls.update();
  }

  build(chapter, params, frame, recorded = null) {
    const changed = this.chapter !== chapter;
    this.chapter=chapter; this.params={...params}; this.frame=frame;
    this.clear();
    if (chapter===0) this.buildSpace(recorded);
    if (chapter===1) this.buildCone();
    if (chapter===2) this.buildClocks();
    if (chapter===3) this.buildEnergy();
    if (chapter===4) this.buildCurvature();
    if (chapter===5) this.buildLens();
    if (changed) this.resetView();
  }

  buildSpace(recorded) {
    this.grid(); this.axes();
    const {x,y,z}=this.params;
    this.ball=this.sphere(0.35,RED,[x,y,z]);
    this.line([[x,0,z],[x,y,z]],RED,0.6,true);
    this.line([[0,0,0],[x,0,0],[x,0,z]],TEAL,0.7,true);
    this.ring(0.45,0.025,GOLD).position.set(x,0,z);
    this.label('(x, y, z)',[x,y+0.65,z]);
    if (recorded) {
      this.sphere(0.37,TEAL,[recorded.x,recorded.y,recorded.z],{transparent:true,opacity:0.3});
      this.label(()=>`t = ${recorded.t.toFixed(1)} s`,[recorded.x,recorded.y+0.7,recorded.z]);
    }
    this.pulse=this.ring(0.6,y,GOLD,0.6); this.pulse.position.set(x,0,z);
  }

  buildCone() {
    this.axes(true);
    this.line([[0,-4.8,0],[0,0,0]],RED,0.7);
    this.grid(11,22);
    const future=this.mesh(new THREE.ConeGeometry(4,4,80,1,true),TEAL,[0,2,0],{transparent:true,opacity:0.08,side:THREE.DoubleSide,depthWrite:false});
    future.rotation.z=Math.PI;
    this.mesh(new THREE.ConeGeometry(4,4,80,1,true),RED,[0,-2,0],{transparent:true,opacity:0.08,side:THREE.DoubleSide,depthWrite:false});
    for(let y=0.5;y<=4;y+=0.5) { this.ring(y,y,TEAL,0.3); this.ring(y,-y,RED,0.2); }
    for(let a=0;a<Math.PI*2;a+=Math.PI/4) {
      this.line([[4*Math.cos(a),4,4*Math.sin(a)],[0,0,0],[4*Math.cos(a),-4,4*Math.sin(a)]],TEAL,0.18);
    }
    this.wave=this.ring(1,0,GOLD);
    this.sphere(0.14,GOLD,[0,0,0]); this.label(()=>this.translate('origin'),[0,0.35,0]);
    this.label(()=>this.translate('future'),[-2.7,4.25,0]);
    this.label(()=>this.translate('past'),[-2.7,-4.3,0]);
    const events=[{id:'A',x:0.7,z:0.4,t:2.8},{id:'B',x:3.8,z:0.3,t:1.2},{id:'C',x:0.5,z:-0.4,t:-2.8},{id:'D',x:2,z:0,t:2}];
    events.forEach(e=>{
      this.sphere(0.13,e.id==='B'?RED:GOLD,[e.x,e.t,e.z]);
      this.label(e.id,[e.x,e.t+0.38,e.z],e);
    });
  }

  buildClocks() {
    this.grid(16,32,-0.2);
    this.clocks=[];
    for(let i=0;i<2;i++) {
      const assembly=new THREE.Group(); this.root.add(assembly);
      const x=i===0?-2.5:1.5;
      const color=i===0?TEAL:RED;
      for(const y of [0.4,3]) {
        const mirror=new THREE.Mesh(new THREE.BoxGeometry(2,0.14,1.3),this.material(color,{metalness:0.4}));
        mirror.position.set(0,y,0); assembly.add(mirror);
      }
      const pulse=new THREE.Mesh(new THREE.SphereGeometry(0.14,20,12),this.material(GOLD,{emissive:GOLD,emissiveIntensity:0.5}));
      assembly.add(pulse);
      const support=this.line([[x,0.4,0],[x,3,0]],color,0.16,true);
      const trail=this.line([[x,0.4,0],[x,0.4,0]],GOLD,0.8);
      this.clocks.push({assembly,pulse,x,trail,support,label:this.label(()=>this.translate(i===0?'clockA':'clockB'),[x,3.6,0])});
    }
  }

  buildEnergy() {
    this.grid(12,24);
    const g=gamma(this.params.beta);
    this.sphere(0.5+Math.cbrt(this.params.mass)*0.27,RED,[-3.3,1.4,0]);
    this.label(()=>`m = ${this.params.mass.toFixed(1)} kg`,[-3.3,2.6,0]);
    this.energyPulse=this.ring(1.35,0.08,RED,0.3); this.energyPulse.position.x=-3.3;
    const bars=[{x:0,h:1,color:TEAL,key:'rest'},{x:1.7,h:g-1,color:GOLD,key:'kinetic'},{x:3.4,h:g,color:RED,key:'total'}];
    bars.forEach(b=>{
      this.mesh(new THREE.BoxGeometry(0.82,Math.max(b.h,0.015),0.82),b.color,[b.x,Math.max(b.h,0.015)/2,0]);
      this.label(()=>this.translate(b.key),[b.x,-0.32,0]);
      this.label(`${b.h.toFixed(2)} E₀`,[b.x,b.h+0.45,0]);
    });
  }

  curvatureY(r) { return -this.params.depth/(1+0.35*r*r); }

  buildCurvature() {
    const geo=new THREE.PlaneGeometry(12,12,64,64);
    geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++) pos.setY(i,this.curvatureY(Math.hypot(pos.getX(i),pos.getZ(i))));
    geo.computeVertexNormals();
    this.mesh(geo,TEAL,[0,0,0],{transparent:true,opacity:0.12,side:THREE.DoubleSide,depthWrite:false});
    for(let j=-6;j<=6;j+=0.5) {
      const a=[],b=[];
      for(let x=-6;x<=6;x+=0.15) { const y=this.curvatureY(Math.hypot(x,j)); a.push([x,y,j]); b.push([j,y,x]); }
      this.line(a,TEAL,0.4); this.line(b,TEAL,0.4);
    }
    this.sphere(0.58,INK,[0,this.curvatureY(0)+0.58,0]);
    this.surfaceScan=this.ring(1,0,GOLD,0.8);
    this.label(()=>this.translate('analogy'),[0,1.4,-3.5]);
  }

  buildLens() {
    this.grid(18,36,-0.2);
    this.sphere(1,GOLD,[0,0.8,0],{emissive:0x9c4e13,emissiveIntensity:0.12});
    const {impact,solarMass}=this.params;
    const angle=deflection(solarMass,impact).radians*8000;
    this.lensPoints=[];
    // 出射斜率按放大后的偏折角给出；过渡形状为教学插值。
    for(let x=-8;x<=8.001;x+=0.08) {
      const bend=x>0 ? Math.tan(angle)*x*(1-Math.exp(-x)) : 0;
      this.lensPoints.push([x,0.8,impact-bend]);
    }
    this.line([[-8,0.8,impact],[8,0.8,impact]],TEAL,0.6,true);
    this.line(this.lensPoints,RED,1);
    this.line([[0,0.8,0],[0,0.8,impact]],INK,0.6,true);
    this.photon=this.sphere(0.13,RED,this.lensPoints[0],{emissive:RED,emissiveIntensity:0.6});
    this.label(()=>`M = ${solarMass.toFixed(1)} M☉`,[0,2.3,0]);
    this.label(()=>`b = ${impact.toFixed(1)} R☉`,[0,1,impact/2]);
    this.label(()=>this.translate('straight'),[-5,1.3,impact]);
    this.label(()=>this.translate('light'),[5,1.3,impact-Math.tan(angle)*5]);
  }

  update(time, playing) {
    if(this.chapter===0) this.pulse.scale.setScalar(1+0.12*Math.sin(time*2));
    if(this.chapter===1) {
      const slice=playing?time%4:this.params.slice;
      this.wave.scale.set(slice,1,slice); this.wave.position.y=slice;
    }
    if(this.chapter===2) {
      const g=gamma(this.params.beta), local=(this.frame==='ground'?time:time/g)%5.2;
      this.clocks.forEach((clock,i)=>{
        const stationary=this.frame==='ground'?i===0:i===1;
        const sign=this.frame==='ground'?1:-1;
        const speed=stationary?0:sign*this.params.beta;
        const tickSpeed=stationary?1:1/g;
        const x=clock.x+speed*local;
        clock.assembly.position.x=x;
        clock.pulse.position.set(0,0.4+triangle(local*tickSpeed,2.6),0);
        clock.label.position.x=x;
        const points=[];
        const samples=Math.max(2,Math.ceil(local*30));
        for(let k=0;k<=samples;k++) { const t=local*k/samples; points.push(new THREE.Vector3(clock.x+speed*t,0.4+triangle(t*tickSpeed,2.6),0)); }
        clock.trail.geometry.dispose(); clock.trail.geometry=new THREE.BufferGeometry().setFromPoints(points);
      });
    }
    if(this.chapter===3) this.energyPulse.scale.setScalar(1+0.07*Math.sin(time*1.5));
    if(this.chapter===4) {
      const r=0.6+(time%6)*0.8;
      this.surfaceScan.scale.set(r,1,r); this.surfaceScan.position.y=this.curvatureY(r)+0.025;
    }
    if(this.chapter===5) {
      const p=this.lensPoints[Math.floor((time%8)/8*(this.lensPoints.length-1))];
      this.photon.position.set(...p);
    }
    this.controls.update(); this.renderer.render(this.scene,this.camera);
    this.labels.forEach(item=>{
      const point=item.position.clone().project(this.camera);
      item.el.style.transform=`translate(-50%,-50%) translate(${(point.x+1)*this.width/2}px,${(-point.y+1)*this.height/2}px)`;
      item.el.hidden=point.z>1||point.z<-1||Math.abs(point.x)>1.1||Math.abs(point.y)>1.1;
      item.el.textContent=typeof item.text==='function'?item.text():item.text;
    });
  }
}

import * as THREE from 'three';
export function createCharacter(){
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  let owned=[],limbs=[];
  const defaults={primaryColor:'#f3bc71',secondaryColor:'#365e59',skinColor:'#d4a27a',hairColor:'#382b26',body:'male',hair:'short',hat:'none',accessory:'none'};
  function applyStyle(value={}){
    for(const child of [...body.children])body.remove(child);
    for(const resource of owned)resource.dispose();owned=[];limbs=[];
    const s={...defaults,...value};
    const material=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.75});owned.push(m);return m;};
    const color=key=>/^#[0-9a-f]{6}$/i.test(s[key])?s[key]:defaults[key];
    const shirt=material(color('primaryColor')),pants=material(color('secondaryColor')),skin=material(color('skinColor')),hair=material(color('hairColor')),dark=material('#202c2c'),gold=material('#eacb66');
    function shape(geometry,mat,x,y,z,parent=body){owned.push(geometry);const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;}
    const box=(w,h,d,m,x,y,z,parent)=>shape(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);
    const ball=(r,m,x,y,z)=>shape(new THREE.SphereGeometry(r,12,8),m,x,y,z);
    for(const x of [-.14,.14]){
      const leg=new THREE.Group();leg.position.set(x,.4,0);body.add(leg);box(.19,.4,.22,pants,0,-.2,0,leg);limbs.push(leg);
      const arm=new THREE.Group();arm.position.set(Math.sign(x)*.33,.86,0);body.add(arm);box(.14,.4,.18,shirt,0,-.17,0,arm);box(.14,.14,.18,skin,0,-.42,0,arm);limbs.push(arm);
    }
    box(s.body==='female'?.43:.5,.56,.3,shirt,0,.68,0);
    if(s.body==='female')shape(new THREE.CylinderGeometry(.23,.35,.28,8),pants,0,.38,0);
    box(.4,.4,.4,skin,0,1.17,0);
    for(const x of [-.09,.09])box(.055,.065,.025,dark,x,1.19,.212);
    const hairstyle=['short','afro','braids','bun','ponytail','dreads','bald'].includes(s.hair)?s.hair:'short';
    if(hairstyle!=='bald'){
      box(.43,.1,.43,hair,0,1.39,0);
      if(hairstyle==='afro')ball(.3,hair,0,1.44,-.02);
      if(hairstyle==='bun')ball(.13,hair,0,1.5,-.12);
      if(hairstyle==='ponytail')box(.13,.46,.14,hair,0,1.17,-.27);
      if(['braids','dreads'].includes(hairstyle))for(const x of [-.18,-.09,0,.09,.18])box(.055,.43,.08,hair,x,1.15,-.23);
    }
    const y=hairstyle==='afro'?1.68:hairstyle==='bun'?1.62:1.44;
    if(s.hat==='cap'){box(.47,.15,.46,pants,0,y,0);box(.4,.035,.26,pants,0,y-.05,.26);}
    if(s.hat==='beanie'){ball(.27,pants,0,y,0);ball(.08,shirt,0,y+.25,0);}
    if(s.hat==='tophat'){shape(new THREE.CylinderGeometry(.31,.31,.04,16),dark,0,y,0);shape(new THREE.CylinderGeometry(.19,.19,.35,16),dark,0,y+.17,0);}
    if(s.hat==='crown'){shape(new THREE.CylinderGeometry(.23,.23,.14,8,1,true),gold,0,y,0);for(let i=0;i<5;i++)shape(new THREE.ConeGeometry(.05,.15,4),gold,Math.cos(i*Math.PI*2/5)*.22,y+.13,Math.sin(i*Math.PI*2/5)*.22);}
    if(s.accessory==='glasses'){for(const x of [-.1,.1])box(.17,.12,.04,dark,x,1.2,.23);box(.08,.025,.04,dark,0,1.21,.23);}
    if(s.accessory==='earrings')for(const x of [-.23,.23])ball(.045,gold,x,1.1,0);
    if(s.accessory==='beard')box(.34,.15,.06,hair,0,1.04,.22);
    if(s.accessory==='scarf'){box(.46,.1,.36,pants,0,.98,0);box(.1,.3,.06,pants,.12,.8,.19);}
    if(s.accessory==='backpack')box(.38,.43,.2,pants,0,.7,-.24);
  }
  applyStyle();
  return {root,applyStyle,animate(t,moving){limbs.forEach((limb,i)=>limb.rotation.x=moving?Math.sin(t*13+(i===0||i===3?0:Math.PI))*.55:0);}};
}

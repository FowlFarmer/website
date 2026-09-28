import * as THREE from 'three';

// Original modeled artifacts. Shared PBR materials pick up the scene's studio
// environment; small raised details provide real silhouettes and highlights.
export function createArchiveModels() {
  const textures = [];
  function texture(draw, size = 1024) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    draw(canvas.getContext('2d'), size);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4; textures.push(map); return map;
  }
  let seed = 71;
  const random = () => {seed = seed * 16807 % 2147483647; return seed / 2147483647;};
  const leatherMap = texture((ctx, size) => {
    ctx.fillStyle = '#102f46'; ctx.fillRect(0,0,size,size);
    for (let i=0;i<55000;i++) {ctx.fillStyle = `rgba(${random()>.5?'174,197,206':'0,0,0'},${random()*.12})`;ctx.fillRect(random()*size,random()*size,1+random()*2,1+random()*3);}
  });
  const pageMap = texture((ctx,size) => {
    ctx.fillStyle='#e4d8b7';ctx.fillRect(0,0,size,size);
    for(let i=0;i<6000;i++){ctx.fillStyle=`rgba(115,83,41,${random()*.06})`;ctx.fillRect(random()*size,random()*size,random()*8,1);}
    ctx.strokeStyle='#a58c57';ctx.lineWidth=2;ctx.strokeRect(56,56,size-112,size-112);
    ctx.fillStyle='#786746';ctx.font='italic 28px Georgia';ctx.textAlign='center';ctx.fillText('The things we choose to remember',size/2,130);
    ctx.strokeStyle='#9a876240';
    for(let y=196;y<860;y+=35){ctx.beginPath();ctx.moveTo(100,y);ctx.lineTo(890,y);ctx.stroke();}
    ctx.fillStyle='#887653';ctx.font='22px Georgia';ctx.fillText('✦',size/2,940);
  });
  const brass = new THREE.MeshStandardMaterial({color:0xc0a06b,metalness:.88,roughness:.28});
  const bright = new THREE.MeshStandardMaterial({color:0xe2c78d,metalness:.78,roughness:.21});
  const steel = new THREE.MeshStandardMaterial({color:0xbad0df,metalness:.92,roughness:.2});
  const darkSteel = new THREE.MeshStandardMaterial({color:0x162b39,metalness:.85,roughness:.26});
  const leather = new THREE.MeshStandardMaterial({map:leatherMap,bumpMap:leatherMap,bumpScale:.022,roughness:.65,metalness:.12});
  const paper = new THREE.MeshStandardMaterial({color:0xe9debf,roughness:.85});
  const ink = new THREE.MeshStandardMaterial({color:0x426178,metalness:.3,roughness:.4});
  const crystal = new THREE.MeshPhysicalMaterial({color:0x75c4de,metalness:.05,roughness:.09,transmission:.7,thickness:.55,ior:1.46,clearcoat:1,envMapIntensity:1.4});
  const luminous = new THREE.MeshStandardMaterial({color:0xc3f2ff,emissive:0x60a8de,emissiveIntensity:2.1,roughness:.3});
  const materials = [brass,bright,steel,darkSteel,leather,paper,ink,crystal,luminous];
  function add(parent, geo, mat, xyz=[0,0,0], rot=[0,0,0]) {const m=new THREE.Mesh(geo,mat);m.position.set(...xyz);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,w,h,d,mat,pos,rot){return add(parent,new THREE.BoxGeometry(w,h,d),mat,pos,rot);}
  function tube(parent,points,radius,mat){return add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),48,radius,8,false),mat);}
  function ring(parent,r,t,mat,rot=[0,0,0],pos=[0,0,0]){return add(parent,new THREE.TorusGeometry(r,t,10,128),mat,pos,rot);}
  function sphere(parent,r,mat,pos){return add(parent,new THREE.SphereGeometry(r,20,14),mat,pos);}
  function shapeMesh(parent,points,depth,mat,pos=[0,0,0]){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return add(parent,new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.025}),mat,pos);}
  function gem(parent,r,pos,mat=crystal){return add(parent,new THREE.OctahedronGeometry(r),mat,pos);}
  function filigree(parent,cx,cy,scale,z=0) {
    const pts=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*3;const r=(1-i/60)*scale;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r,z]);}tube(parent,pts,.011,bright);
  }
  function medallion(parent,r,pos=[0,0,0]) {
    const group=new THREE.Group();group.position.set(...pos);parent.add(group);
    ring(group,r,.017,bright);ring(group,r*.83,.008,brass);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const ray=shapeMesh(group,[[0,r*.7],[.035,r*.23],[0,0],[-.035,r*.23]],.014,bright);ray.rotation.z=a;}
    gem(group,r*.14,[0,0,.035],luminous);return group;
  }
  // QUESTS — a forged blade with a real diamond cross-section and recessed fuller.
  const sword=new THREE.Group();sword.rotation.set(.06,0,-.16);
  const bladeVertices=[],bladeIndices=[];
  const slices=[[-.28,.16],[.05,.18],[1.45,.13],[1.91,.002]];
  slices.forEach(([y,w])=>bladeVertices.push(-w,y,0,0,y,.085,w,y,0,0,y,-.085));
  for(let j=0;j<slices.length-1;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4,c=a+4,d=b+4;bladeIndices.push(a,b,c,b,d,c);}
  const bladeGeo=new THREE.BufferGeometry();bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute(bladeVertices,3));bladeGeo.setIndex(bladeIndices);bladeGeo.computeVertexNormals();add(sword,bladeGeo,steel);
  box(sword,.026,1.53,.01,darkSteel,[0,.53,.089]);
  box(sword,.008,1.36,.012,luminous,[0,.60,.095]);
  // Sculpted swept quillons, rather than a rectangular crossbar.
  for(const sign of [-1,1]){
    const wing=shapeMesh(sword,[[0,-.24],[sign*.27,-.30],[sign*.62,-.17],[sign*.83,.02],[sign*.74,-.31],[sign*.49,-.46],[sign*.17,-.43]],.11,brass,[0,0,-.05]);
    tube(sword,[[sign*.1,-.27,.085],[sign*.35,-.29,.085],[sign*.6,-.17,.085],[sign*.77,-.015,.045]],.022,bright);
    filigree(sword,sign*.43,-.30,.105,.09);
    gem(sword,.058,[sign*.63,-.22,.10],luminous);
  }
  medallion(sword,.2,[0,-.32,.14]);
  add(sword,new THREE.CylinderGeometry(.08,.11,.75,24),leather,[0,-.84,0]);
  for(let i=0;i<12;i++)ring(sword,.092,.012,brass,[Math.PI/2,0,0],[0,-.51-i*.061,0]);
  add(sword,new THREE.CylinderGeometry(.13,.13,.09,32),bright,[0,-.46,0]);
  add(sword,new THREE.CylinderGeometry(.13,.11,.08,32),bright,[0,-1.22,0]);
  const pommel=gem(sword,.2,[0,-1.43,0]);pommel.scale.y=1.4;
  for(let i=0;i<4;i++){const a=i*Math.PI/2;tube(sword,[[Math.cos(a)*.11,-1.23,Math.sin(a)*.11],[Math.cos(a)*.19,-1.4,Math.sin(a)*.19],[0,-1.67,0]],.019,bright);}
  sword.position.y=-.07;
  // MEMORIES — an armillary reliquary, with engraved bands and an optical heart.
  const memory=new THREE.Group();
  const globe=sphere(memory,.65,crystal,[0,.2,0]);
  const heart=add(memory,new THREE.IcosahedronGeometry(.21,1),luminous,[0,.2,0]);
  for(let axis=0;axis<3;axis++){
    const band=new THREE.Group();band.position.y=.2;band.rotation.set(axis*.72+.23,axis*.87,axis*.45+.25);memory.add(band);
    const r=.96+axis*.095;
    ring(band,r,.026,brass);ring(band,r-.048,.008,bright);ring(band,r+.048,.008,bright);
    for(let i=0;i<48;i++){const a=i/48*Math.PI*2;box(band,i%4?.007:.013,i%4?.035:.072,.013,bright,[Math.sin(a)*r,Math.cos(a)*r,.015],[0,0,-a]);}
    for(let i=0;i<4;i++){const a=i*Math.PI/2;gem(band,.058,[Math.sin(a)*r,Math.cos(a)*r,.05],luminous);}
  }
  const standPts=[new THREE.Vector2(.48,0),new THREE.Vector2(.5,.05),new THREE.Vector2(.43,.10),new THREE.Vector2(.28,.15),new THREE.Vector2(.19,.30),new THREE.Vector2(.11,.46),new THREE.Vector2(.13,.50)];
  add(memory,new THREE.LatheGeometry(standPts,64),brass,[0,-1.43,0]);
  for(let i=0;i<3;i++)ring(memory,.47-i*.045,.016,bright,[Math.PI/2,0,0],[0,-1.39+i*.04,0]);
  const topGem=gem(memory,.15,[0,1.48,0],luminous);topGem.scale.y=1.8;
  tube(memory,[[0,1.18,0],[0,1.34,0]],.033,brass);
  memory.userData.inner=globe;memory.userData.heart=heart;
  // JOURNALS — bound leather, layered paper, embossed metalwork, ribbon & quill.
  const journal=new THREE.Group();
  const book=new THREE.Group();book.rotation.set(.26,-.34,-.12);journal.add(book);
  box(book,1.82,2.48,.13,leather,[0,0,-.21]);
  box(book,1.69,2.33,.31,paper,[.025,0,0]);
  for(let i=0;i<25;i++)box(book,1.70,2.32,.004,i%4===0?brass:paper,[.025,0,-.145+i*.012]);
  box(book,1.82,2.48,.10,leather,[0,0,.21]);
  add(book,new THREE.CylinderGeometry(.2,.2,2.46,32,1,false,0,Math.PI),leather,[-.88,0,0],[0,Math.PI/2,0]);
  for(const y of [-1.0,-.65,.65,1.0])box(book,.17,.07,.51,brass,[-.83,y,0]);
  // Inlaid cover borders and tiny studs.
  for(const x of [-.78,.78])box(book,.017,2.21,.021,bright,[x,0,.276]);
  for(const y of [-1.10,1.10])box(book,1.57,.017,.021,bright,[0,y,.276]);
  for(const x of [-.70,.70])box(book,.008,2.06,.017,brass,[x,0,.279]);
  for(const y of [-1.03,1.03])box(book,1.4,.008,.017,brass,[0,y,.279]);
  for(const sx of [-1,1])for(const sy of [-1,1]){
    const corner=shapeMesh(book,[[sx*.9,sy*1.24],[sx*.9,sy*.8],[sx*.65,sy*1.03],[sx*.46,sy*1.24]],.026,brass,[0,0,.255]);
    filigree(book,sx*.66,sy*.98,.125,.31);sphere(book,.026,bright,[sx*.8,sy*1.13,.32]);
  }
  medallion(book,.49,[0,.1,.29]);
  const title=texture((ctx,size)=>{ctx.clearRect(0,0,size,size);ctx.fillStyle='#dfc894';ctx.textAlign='center';ctx.font='52px Georgia';ctx.fillText('A V A L O N',size/2,size*.56);ctx.font='21px Georgia';ctx.fillText('THE UNWRITTEN CHAPTERS',size/2,size*.65);});
  const titleMat=new THREE.MeshStandardMaterial({map:title,transparent:true,metalness:.5,roughness:.5});materials.push(titleMat);
  add(book,new THREE.PlaneGeometry(1.35,1.35),titleMat,[0,-.69,.28]);
  box(book,.15,.7,.016,new THREE.MeshStandardMaterial({color:0x7a3242,roughness:.8}),[.43,-1.38,.02],[0,0,-.06]);
  for(const y of [-.67,.67]){box(book,.29,.16,.035,brass,[.8,y,.29]);gem(book,.043,[.74,y,.33],luminous);}
  // A finely shaped, curled feather with individual barbs.
  const quill=new THREE.Group();quill.position.set(1.02,.22,.25);quill.rotation.z=-.38;journal.add(quill);
  tube(quill,[[0,-1.05,0],[.05,-.4,.02],[.12,.4,0],[.05,1.36,-.15]],.012,bright);
  const featherMat=new THREE.MeshStandardMaterial({color:0xadc6d8,metalness:.2,roughness:.65,side:THREE.DoubleSide});materials.push(featherMat);
  for(let side of [-1,1]){
    const feather=new THREE.Shape();feather.moveTo(.02,-.38);feather.bezierCurveTo(side*.42,.0,side*.42,.75,.05,1.38);feather.bezierCurveTo(.17,.65,.08,0,.02,-.38);
    add(quill,new THREE.ShapeGeometry(feather,24),featherMat);
    for(let i=0;i<24;i++){const y=-.3+i*.066;const width=Math.sin((y+.38)/1.76*Math.PI)*.29;tube(quill,[[.07,y,.006],[side*width*.7,y+.09,.02],[side*width,y+.18,.01]],.0035,brass);}
  }
  add(quill,new THREE.ConeGeometry(.048,.3,4),brass,[0,-.94,0],[0,0,Math.PI]);
  journal.scale.setScalar(.9);
  // Shared modelled pedestal under each artifact, rotating with the carousel.
  function pedestal() {
    const p=new THREE.Group();
    const stone=new THREE.MeshStandardMaterial({color:0x122233,metalness:.48,roughness:.32});materials.push(stone);
    add(p,new THREE.CylinderGeometry(1.05,1.15,.14,96),stone,[0,-1.85,0]);
    add(p,new THREE.CylinderGeometry(.95,1.04,.09,96),darkSteel,[0,-1.74,0]);
    for(const [r,y] of [[1.12,-1.87],[1.05,-1.79],[.95,-1.69]])ring(p,r,.012,brass,[Math.PI/2,0,0],[0,y,0]);
    for(let i=0;i<24;i++){const a=i*Math.PI/12;gem(p,.025,[Math.sin(a)*1.1,-1.85,Math.cos(a)*1.1],bright);}
    return p;
  }
  return { artifacts:[sword,memory,journal], pedestal, textures, materials };
}

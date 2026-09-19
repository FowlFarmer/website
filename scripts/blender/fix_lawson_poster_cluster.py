import bpy,json
OUT='/Users/theodore/Desktop/Lawson_ThreeJS'
model=bpy.data.collections['LAWSON | Building']
bpy.context.view_layer.update()
def bounds(o):
 v=[o.matrix_world@p.co for p in o.data.vertices]
 return [min(p[i] for p in v) for i in range(3)],[max(p[i] for p in v) for i in range(3)]
cluster=[]
for o in model.objects:
 if o.type=='MESH' and o.name.startswith('Photo window advertisement'):
  lo,hi=bounds(o)
  if -6.3<(lo[0]+hi[0])/2<-5.1 and lo[2]>1.6 and hi[2]<3 and lo[1]<-5:
   cluster.append(o)
assert len(cluster)==8, f'Expected 8 facade posters, found {len(cluster)}'
cluster.sort(key=lambda o:(-round(sum(bounds(o)[i][2] for i in (0,1))/2,3),sum(bounds(o)[i][0] for i in (0,1))/2))
for i,o in enumerate(cluster):
 lo,hi=bounds(o);target=(-5.955,-5.395)[i%2]
 o.location.x+=target-(lo[0]+hi[0])/2
bpy.context.view_layer.update()
report=[]
for i in range(0,8,2):
 a,b=bounds(cluster[i]),bounds(cluster[i+1]);gap=b[0][0]-a[1][0]
 assert gap>.069 and a[0][0]>-6.21 and b[1][0]<-4.2
 report.append({'row':i//2,'horizontal_gap_m':gap})
open(OUT+'/poster-spacing-check.json','w').write(json.dumps(report,indent=2))
exec(open(OUT+'/fix_sign_details.py').read())
print('EIGHT FRONT POSTERS VERIFIED: 7 CM HORIZONTAL GAP',report)

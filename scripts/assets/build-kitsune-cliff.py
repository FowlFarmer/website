"""Build the kitsune's cliff from photoscanned rock and bake it for the web.

The ledge is kitbashed from two CC0 Poly Haven scans (rock_face_01, rock_face_02; see
assets/kitsune/README.md): upright copies make the sheer face dropping away on the left, and
copies laid face-up make the stepped top he sits on, which runs off the right of the screen.
The scans are colour-graded toward the concept's cool granite, lit by a low dusk sun and sky,
and that lighting is baked into one texture so the website can show it unlit.

Run from the repository root:
  Blender --background --python scripts/assets/build-kitsune-cliff.py -- preview <out.png> <figure.glb> [samples]
      Assemble and render a preview from the website's camera (transparent background).
      <figure.glb> is an uncompressed copy of public/models/kitsune/keria.glb.
  Blender --background --python scripts/assets/build-kitsune-cliff.py -- bake <figure.glb>
      Assemble, bake the lighting, save assets/kitsune/cliff.blend, export cliff.glb.

Coordinates in PIECES are the website's cliff-local frame (glTF style): the seat is the
origin, X runs across the ledge (right on screen), Y is up, Z points back toward the camera.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector, noise
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
SCANS = ROOT / 'assets/kitsune/scans'
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['bake']
MODE = ARGS[0]

# glTF (x, y up, z toward viewer) → Blender (x, -z, y).
TO_BLENDER = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))


def b(x, y, z):
    return Vector((x, -z, y))


# The website's camera and figure, measured in the cliff-local frame (see KitsuneScene.jsx).
CAMERA = {'position': (-1.549, 4.2637, -4.7816), 'target': (10.4532, 3.4447, 6.7321), 'fov': 30.0, 'aspect': 1.833}
FIGURE_MATRIX = [-0.15118, 0, -0.93986, 0, 0, 0.95194, 0, 0, 0.93986, 0, -0.15118, 0, 8.62203, 0.21979, 9.36999, 1]
# Where he sits (x, z): grass and petals keep clear of it.
SEAT = (8.62, 9.37)
# Low dusk sun ahead of him and to the right, where the backdrop's sky glows.
SUN_DIRECTION = (0.55, 0.14, -0.82)  # Toward the sun, cliff-local.

# Each piece: which scan, where its face points, which way its strata run ("up" in the scan
# maps to this direction), a twist about the face, a scale, and where it goes: `at` is
# (x, top, z), its centre across the ground and the height of its highest point. `squash`
# flattens a piece along its face.
PIECES = [
    # The top he sits on, then stepping away to the right and back toward the camera.
    {'scan': 'rock_face_02', 'face': (0, 1, 0), 'up': (0, 0, -1), 'twist': 0, 'scale': 1.7, 'squash': 0.25, 'at': (0.5, 0.12, 0.9)},
    {'scan': 'rock_face_01', 'face': (0, 1, 0.05), 'up': (-1, 0, -0.3), 'twist': 0, 'scale': 1.25, 'squash': 0.3, 'at': (4.3, 0.12, 2.4)},
    {'scan': 'rock_face_02', 'face': (0.05, 1, 0), 'up': (-0.3, 0, -1), 'twist': 20, 'scale': 2.1, 'squash': 0.22, 'at': (1.2, 0.1, 4.9)},
    {'scan': 'rock_face_01', 'face': (0, 1, 0), 'up': (-1, 0, 0.3), 'twist': 0, 'scale': 1.6, 'squash': 0.45, 'at': (6.5, 0.0, 8.5)},
    # The sheer face on the left, dropping into the haze; tops tucked just under the rim.
    {'scan': 'rock_face_01', 'face': (-1, 0.05, 0.5), 'up': (0, 1, 0), 'twist': 0, 'scale': 2.2, 'at': (-1.9, 0.14, 3.0)},
    {'scan': 'rock_face_02', 'face': (-1, 0, -0.35), 'up': (0, 1, 0), 'twist': 0, 'scale': 2.2, 'at': (-1.9, 0.1, -0.6)},
    {'scan': 'rock_face_01', 'face': (-1, 0.1, 0.6), 'up': (0, 1, 0), 'twist': 6, 'scale': 2.6, 'at': (-2.4, -2.2, 6.5)},
    {'scan': 'rock_face_01', 'face': (-1, 0, -0.1), 'up': (0, 1, 0), 'twist': -4, 'scale': 2.6, 'at': (-2.0, -3.0, 0.8)},
    {'scan': 'rock_face_02', 'face': (-0.8, 0.05, 1), 'up': (0, 1, 0), 'twist': -8, 'scale': 2.4, 'at': (-0.6, 0.08, 9.6)},
    {'scan': 'rock_face_01', 'face': (-0.7, 0, 1), 'up': (0, 1, 0), 'twist': 3, 'scale': 2.8, 'at': (2.0, -1.6, 10.6)},
    # Ahead of him, the ledge's front edge.
    {'scan': 'rock_face_02', 'face': (-0.2, 0.1, -1), 'up': (0, 1, 0), 'twist': 0, 'scale': 1.8, 'at': (1.2, 0.08, -1.7)},
    # Under his ledge's near-left edge (from the camera): rock carrying on down, so the slab
    # doesn't read as a thin plate.
    {'scan': 'rock_face_01', 'face': (-0.65, 0, -0.76), 'up': (0, 1, 0), 'twist': 0, 'scale': 1.6, 'at': (9.4, -0.05, 7.9)},
    {'scan': 'rock_face_02', 'face': (-0.85, 0, -0.5), 'up': (0, 1, 0), 'twist': 10, 'scale': 1.9, 'at': (8.2, -0.1, 8.6)},
]


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load_scan(name):
    """Import a scan once; return its hidden template, area-weighted face normal and centroid."""
    bpy.ops.import_scene.gltf(filepath=str(SCANS / name / f'{name}_2k.gltf'))
    ob = bpy.context.selected_objects[0]
    ob.data.transform(ob.matrix_world)
    ob.matrix_world = Matrix()
    normal, centre, total = Vector(), Vector(), 0.0
    for polygon in ob.data.polygons:
        normal += polygon.normal * polygon.area
        centre += polygon.center * polygon.area
        total += polygon.area
    grade(ob.data.materials[0])
    ob.hide_render = True
    ob.hide_viewport = True
    return ob, normal.normalized(), centre / total


def grade(material):
    """Pull the scan's warm browns toward the concept's cool, dark granite."""
    nodes, links = material.node_tree.nodes, material.node_tree.links
    bsdf = nodes['Principled BSDF']
    link = bsdf.inputs['Base Color'].links[0]
    source = link.from_socket
    links.remove(link)
    hsv = nodes.new('ShaderNodeHueSaturation')
    hsv.inputs['Saturation'].default_value = 0.6
    hsv.inputs['Value'].default_value = 0.5
    tint = nodes.new('ShaderNodeMix')
    tint.data_type = 'RGBA'
    tint.blend_type = 'MULTIPLY'
    tint.inputs['Factor'].default_value = 1.0
    tint.inputs['B'].default_value = (0.82, 0.85, 1.0, 1)
    links.new(source, hsv.inputs['Color'])
    links.new(hsv.outputs['Color'], tint.inputs['A'])
    # Growth: dark moss packed into crevices on the flats, pale lichen crusts on exposed tops.
    geometry = nodes.new('ShaderNodeNewGeometry')
    facing = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geometry.outputs['Normal'], facing.inputs['Vector'])
    occlusion = nodes.new('ShaderNodeAmbientOcclusion')
    occlusion.samples = 12
    occlusion.only_local = True  # His body must not grow moss under him.
    occlusion.inputs['Distance'].default_value = 0.35
    patches = nodes.new('ShaderNodeTexNoise')
    patches.inputs['Scale'].default_value = 1.6
    patches.inputs['Detail'].default_value = 6
    links.new(geometry.outputs['Position'], patches.inputs['Vector'])
    moss_mask = math_chain(nodes, links, [
        ('MULTIPLY', facing.outputs['Z'], 1.0),
        ('SUBTRACT', None, 0.45),
        ('MULTIPLY', None, 3.0),
        ('MULTIPLY', None, ('invert', occlusion.outputs['AO'])),
        ('MULTIPLY', None, 2.2),
        ('MULTIPLY', None, ('ramp', patches.outputs['Fac'], 0.45, 0.62)),
    ])
    moss = nodes.new('ShaderNodeMix')
    moss.data_type = 'RGBA'
    moss.inputs['B'].default_value = (0.075, 0.095, 0.035, 1)
    links.new(moss_mask, moss.inputs['Factor'])
    links.new(tint.outputs['Result'], moss.inputs['A'])
    speckle = nodes.new('ShaderNodeTexVoronoi')
    speckle.inputs['Scale'].default_value = 11.0
    links.new(geometry.outputs['Position'], speckle.inputs['Vector'])
    lichen_mask = math_chain(nodes, links, [
        ('MULTIPLY', ('ramp', speckle.outputs['Distance'], 0.4, 0.16), ('ramp', patches.outputs['Fac'], 0.5, 0.35)),
        ('MULTIPLY', None, ('ramp', facing.outputs['Z'], 0.1, 0.6)),
        ('MULTIPLY', None, 0.75),
    ])
    lichen = nodes.new('ShaderNodeMix')
    lichen.data_type = 'RGBA'
    lichen.inputs['B'].default_value = (0.44, 0.46, 0.4, 1)
    links.new(lichen_mask, lichen.inputs['Factor'])
    links.new(moss.outputs['Result'], lichen.inputs['A'])
    links.new(lichen.outputs['Result'], bsdf.inputs['Base Color'])


def math_chain(nodes, links, steps):
    """Chain Math nodes. Each step: (operation, a, b); None means the previous result, a float
    is a constant, ('invert', socket) is 1 - socket, ('ramp', socket, from, to) remaps to 0–1."""
    def socket(value):
        if isinstance(value, tuple) and value[0] == 'invert':
            node = nodes.new('ShaderNodeMath')
            node.operation = 'SUBTRACT'
            node.inputs[0].default_value = 1.0
            links.new(socket(value[1]), node.inputs[1])
            return node.outputs[0]
        if isinstance(value, tuple) and value[0] == 'ramp':
            node = nodes.new('ShaderNodeMapRange')
            node.clamp = True
            links.new(socket(value[1]), node.inputs['Value'])
            node.inputs['From Min'].default_value = value[2]
            node.inputs['From Max'].default_value = value[3]
            return node.outputs['Result']
        return value
    result = None
    for operation, a, b_ in steps:
        node = nodes.new('ShaderNodeMath')
        node.operation = operation
        node.use_clamp = True
        for slot, value in ((0, result if a is None else a), (1, b_)):
            value = socket(value)
            if isinstance(value, float):
                node.inputs[slot].default_value = value
            else:
                links.new(value, node.inputs[slot])
        result = node.outputs[0]
    return result


def basis(face, up):
    face = face.normalized()
    up = (up - face * up.dot(face)).normalized()
    return Matrix((up.cross(face), up, face)).transposed()


def place(template, normal, centre, piece, index):
    face = Vector(b(*piece['face']))
    up = Vector(b(*piece['up']))
    twist = Matrix.Rotation(math.radians(piece['twist']), 3, face.normalized())
    rotation = twist @ basis(face, up) @ basis(normal, Vector((0, 0, 1))).transposed()
    ob = template.copy()
    ob.data = template.data.copy()
    ob.name = f"Rock {index:02d} ({piece['scan']})"
    ob.hide_render = False
    ob.hide_viewport = False
    bpy.context.collection.objects.link(ob)
    scale = piece['scale']
    x, top, z = piece['at']
    # Face-up pieces are squashed along their face: the shells are deep, curved scans, and laid
    # flat at full depth they'd be a bowl of metre-high bumps instead of a ledge to sit on.
    squash = Matrix.Scale(piece.get('squash', 1.0), 4, face.normalized())
    shape = squash @ rotation.to_4x4() @ Matrix.Scale(scale, 4)
    # Baked into the mesh: an object transform can't hold the squash's shear.
    ob.data.transform(shape)
    highest = max(v.co.z for v in ob.data.vertices)
    middle = shape @ centre
    ob.matrix_world = Matrix.Translation((x - middle.x, -z - middle.y, top - highest))
    return ob


def seat_rocks(rocks):
    """Shift the whole cliff so the rock right under his hips sits at the origin's height."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    trees = []
    for ob in rocks:
        bm = bmesh.new()
        bm.from_object(ob, depsgraph)
        bm.transform(ob.matrix_world)
        trees.append(BVHTree.FromBMesh(bm))
        bm.free()
    heights = []
    for dx, dz in ((0, 0), (0.25, 0), (-0.25, 0), (0, 0.25), (0, -0.2)):
        hits = [(tree.ray_cast(b(dx, 20, dz), Vector((0, 0, -1)))[0], ob.name) for tree, ob in zip(trees, rocks)]
        tops = [hit.z for hit, _ in hits if hit is not None]
        if dx == 0 and dz == 0:
            print('SEAT hits', [(name, round(hit.z, 2)) for hit, name in hits if hit is not None])
        if tops:
            heights.append(max(tops))
    if not heights:
        print('WARNING: nothing under the seat')
        return
    lift = -sorted(heights)[len(heights) * 3 // 4]
    print('SEAT heights', [round(h, 3) for h in heights], 'lift', round(lift, 3))
    for ob in rocks:
        ob.location.z += lift


def add_skirt(rocks, material):
    """A surface just under the rock tops, traced from above, so no gap between the shells ever
    shows sky or a hollow underside: it reads as the dark floor of a crevice."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    trees = []
    for ob in rocks:
        bm = bmesh.new()
        bm.from_object(ob, depsgraph)
        bm.transform(ob.matrix_world)
        trees.append(BVHTree.FromBMesh(bm))
        bm.free()
    step = 0.12
    xs = [-3.5 + i * step for i in range(int(16.5 / step))]
    zs = [-3.0 + i * step for i in range(int(16.5 / step))]
    index = {}
    verts = []
    for i, x in enumerate(xs):
        for j, z in enumerate(zs):
            tops = [hit[0].z for hit in (tree.ray_cast(b(x, 30, z), Vector((0, 0, -1))) for tree in trees) if hit[0] is not None]
            if tops and max(tops) > -2.5:
                index[i, j] = len(verts)
                verts.append(b(x, max(tops) - 0.12, z))
    faces = []
    for i in range(len(xs) - 1):
        for j in range(len(zs) - 1):
            quad = [index.get(key) for key in ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))]
            if None not in quad:
                faces.append(quad)
    mesh = bpy.data.meshes.new('Crevice skirt')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    skirt = bpy.data.objects.new('Crevice skirt', mesh)
    bpy.context.collection.objects.link(skirt)
    skirt.data.materials.append(material)
    mesh.uv_layers.new(name='UVMap')  # Unused (box-projected), but keeps the layers aligned on join.
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    print('SKIRT', len(verts), 'verts')
    return skirt


def skirt_material(template):
    """The scan's own material, box-projected in world space: the skirt has no UVs worth using."""
    material = template.data.materials[0].copy()
    material.name = 'Crevice rock'
    nodes, links = material.node_tree.nodes, material.node_tree.links
    coordinates = nodes.new('ShaderNodeNewGeometry')
    mapping = nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (0.35, 0.35, 0.35)
    links.new(coordinates.outputs['Position'], mapping.inputs['Vector'])
    for node in nodes:
        if node.type == 'TEX_IMAGE':
            node.projection = 'BOX'
            node.projection_blend = 0.3
            links.new(mapping.outputs['Vector'], node.inputs['Vector'])
    return material


def assemble():
    reset()
    templates = {name: load_scan(name) for name in sorted({piece['scan'] for piece in PIECES})}
    rocks = [place(*templates[piece['scan']], piece, index) for index, piece in enumerate(PIECES)]
    seat_rocks(rocks)
    rocks.append(add_skirt(rocks, skirt_material(templates['rock_face_01'][0])))
    for ob in rocks:
        corners = [ob.matrix_world @ Vector(corner) for corner in ob.bound_box]
        low = [min(c[axis] for c in corners) for axis in range(3)]
        high = [max(c[axis] for c in corners) for axis in range(3)]
        # Report in the cliff-local frame: x, y (up), z (toward camera).
        print('BOUNDS', ob.name, 'x', round(low[0], 2), round(high[0], 2), 'y', round(low[2], 2), round(high[2], 2), 'z', round(-high[1], 2), round(-low[1], 2))
    return rocks


def add_figure(path):
    bpy.ops.import_scene.gltf(filepath=path)
    figure = Matrix([FIGURE_MATRIX[column * 4:column * 4 + 4] for column in range(4)]).transposed()
    world = TO_BLENDER @ figure @ TO_BLENDER.inverted()
    for ob in list(bpy.context.selected_objects):
        if ob.type == 'MESH':
            ob.parent = None
            ob.matrix_world = world
            ob.name = 'Figure (shadow caster)'


def light_scene():
    scene = bpy.context.scene
    world = bpy.data.worlds.new('Dusk')
    scene.world = world
    world.use_nodes = True
    nodes, links = world.node_tree.nodes, world.node_tree.links
    toward = b(*SUN_DIRECTION).normalized()
    sky = nodes.new('ShaderNodeTexSky')
    sky.sky_type = 'NISHITA'
    sky.sun_elevation = math.asin(toward.z)
    sky.sun_rotation = math.atan2(toward.x, toward.y)
    sky.air_density = 1.6
    sky.dust_density = 2.5
    sky.sun_disc = False
    nodes['Background'].inputs['Strength'].default_value = 0.22
    links.new(sky.outputs['Color'], nodes['Background'].inputs['Color'])
    # A violet fill from the high sky, so the shaded face reads blue rather than black.
    bpy.ops.object.light_add(type='SUN')
    fill = bpy.context.object
    fill.name = 'Sky fill'
    fill.data.energy = 0.45
    fill.data.color = (0.62, 0.66, 1.0)
    fill.data.angle = math.radians(40)
    fill.rotation_euler = (-b(-0.3, 1, 0.4)).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.light_add(type='SUN')
    sun = bpy.context.object
    sun.name = 'Dusk sun'
    sun.data.energy = 5.5
    sun.data.color = (1.0, 0.66, 0.55)
    sun.data.angle = math.radians(2.5)
    sun.rotation_euler = (-toward).to_track_quat('-Z', 'Y').to_euler()


def add_camera():
    scene = bpy.context.scene
    camera = bpy.data.objects.new('Website camera', bpy.data.cameras.new('Website camera'))
    scene.collection.objects.link(camera)
    camera.location = b(*CAMERA['position'])
    camera.rotation_euler = (b(*CAMERA['target']) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.sensor_fit = 'VERTICAL'
    camera.data.angle_y = math.radians(CAMERA['fov'])
    camera.data.clip_end = 200
    scene.camera = camera
    scene.render.resolution_y = 1000
    scene.render.resolution_x = round(1000 * CAMERA['aspect'])


def overhead(path):
    """A top-down layout check: every rock tinted by index, the seat and camera marked."""
    scene = bpy.context.scene
    camera = bpy.data.objects.new('Overhead', bpy.data.cameras.new('Overhead'))
    scene.collection.objects.link(camera)
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 34
    camera.location = b(1, 40, 3)
    camera.rotation_euler = (0, 0, 0)
    marker = bpy.data.objects.new('Seat marker', bpy.data.meshes.new('Seat marker'))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.35)
    bm.to_mesh(marker.data)
    bm.free()
    scene.collection.objects.link(marker)
    marker.location = b(0, 1, 0)
    lens = bpy.data.objects.new('Camera marker', marker.data)
    scene.collection.objects.link(lens)
    lens.location = b(*CAMERA['position'])
    previous = scene.camera
    scene.camera = camera
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.color_type = 'RANDOM'
    scene.render.resolution_x = scene.render.resolution_y = 800
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    # And a low three-quarter view from the drop side, to see what holds the ledge up.
    camera.data.type = 'PERSP'
    camera.data.lens = 24
    camera.location = b(-11, 1.5, 9)
    camera.rotation_euler = (b(0.5, -2, 3) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = path.replace('_top', '_side')
    bpy.ops.render.render(write_still=True)
    scene.camera = previous
    bpy.data.objects.remove(marker)
    bpy.data.objects.remove(lens)
    bpy.data.objects.remove(camera)


def preview(path, figure, samples):
    rocks = assemble()
    dress(rocks)
    add_figure(figure)
    light_scene()
    overhead(path.replace('.png', '_top.png'))
    add_camera()
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('PREVIEW', path, len(rocks), 'rocks')


# ---------- Dressing: grass tufts along the steps and cracks, fallen petals on the slabs.
def rock_tree(rocks):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new()
    for ob in rocks:
        part = bmesh.new()
        part.from_object(ob, depsgraph)
        part.transform(ob.matrix_world)
        mesh = bpy.data.meshes.new('probe')
        part.to_mesh(mesh)
        bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
        part.free()
    tree = BVHTree.FromBMesh(bm)
    bm.free()
    return tree


def ground(tree, x, z):
    hit = tree.ray_cast(b(x, 30, z), Vector((0, 0, -1)))
    return (hit[0], hit[1]) if hit[0] is not None else (None, None)


def vertex_colored(name, verts, faces, colors):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    attribute = mesh.color_attributes.new('Albedo', 'FLOAT_COLOR', 'POINT')
    for i, color in enumerate(colors):
        attribute.data[i].color = (*color, 1)
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    albedo = nodes.new('ShaderNodeVertexColor')
    albedo.layer_name = 'Albedo'
    bsdf = nodes['Principled BSDF']
    links.new(albedo.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.8
    material.use_backface_culling = False
    mesh.materials.append(material)
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(ob)
    return ob


def dress(rocks, seed=11):
    import random
    rng = random.Random(seed)
    tree = rock_tree(rocks)
    gv, gf, gc = [], [], []
    tufts = 0
    clumps = 0

    def stepping(x, z, height):
        drops = [ground(tree, x + dx, z + dz)[0] for dx, dz in ((0.18, 0), (-0.18, 0), (0, 0.18), (0, -0.18))]
        return any(d is None or d.z < height - 0.05 for d in drops)

    def tuft(point, size, tip_colour):
        for _ in range(rng.randint(16, 30)):
            angle = rng.uniform(0, math.tau)
            lean = rng.uniform(0.2, 0.75)
            height = size * rng.uniform(0.45, 1.1)
            width = rng.uniform(0.005, 0.011)
            base = point + Vector((rng.gauss(0, 0.045), rng.gauss(0, 0.045), -0.015))
            out = Vector((math.cos(angle), math.sin(angle), 0))
            side = Vector((-out.y, out.x, 0))
            start = len(gv)
            for k in range(4):
                t = k / 3
                centre = base + out * (lean * height * t * t) + Vector((0, 0, height * t * (1 - 0.25 * lean * t)))
                half = width * (1 - t) + 0.0005
                gv.extend([centre - side * half, centre + side * half])
                colour = tuple(r + (tc - r) * t for r, tc in zip((0.03, 0.04, 0.02), tip_colour))
                gc.extend([colour, colour])
            for k in range(3):
                a = start + k * 2
                gf.append((a, a + 1, a + 3, a + 2))

    # Clumps start where the rock steps down (a crack or a ledge edge) and spread a little.
    for _ in range(20000):
        if clumps >= 110:
            break
        x, z = rng.uniform(-2.2, 9), rng.uniform(-1.6, 11)
        if math.hypot(x - SEAT[0], z - SEAT[1]) < 1.1:
            continue
        point, normal = ground(tree, x, z)
        if point is None or normal.z < 0.6 or point.z < -2.5 or not stepping(x, z, point.z):
            continue
        clumps += 1
        dry = rng.random()
        green = (0.16, 0.24, 0.07) if rng.random() < 0.6 else (0.24, 0.3, 0.1)
        for _ in range(rng.randint(2, 7)):
            tx, tz = x + rng.gauss(0, 0.2), z + rng.gauss(0, 0.2)
            if math.hypot(tx - SEAT[0], tz - SEAT[1]) < 0.9:
                continue
            spot, facing = ground(tree, tx, tz)
            if spot is None or facing.z < 0.55:
                continue
            tufts += 1
            tip = (0.44, 0.37, 0.18) if dry > 0.6 and rng.random() < 0.7 else green
            tuft(spot, rng.uniform(0.08, 0.22), tip)
    grass = vertex_colored('Alpine grass', gv, gf, gc)
    pv, pf, pc = [], [], []
    # Petals settle in drifts: a few centres, most petals scattered around them.
    drifts = [(rng.uniform(-2, 8), rng.uniform(-1.4, 10)) for _ in range(26)]
    for _ in range(1600):
        cx, cz = rng.choice(drifts)
        x, z = (cx + rng.gauss(0, 0.6), cz + rng.gauss(0, 0.6)) if rng.random() < 0.75 else (rng.uniform(-2.2, 9), rng.uniform(-1.6, 11))
        if math.hypot(x - SEAT[0], z - SEAT[1]) < 0.7:
            continue
        point, normal = ground(tree, x, z)
        if point is None or normal.z < 0.5 or point.z < -2.5:
            continue
        s = rng.uniform(0.016, 0.03)
        r = rng.uniform(0, math.tau)
        u = Vector((math.cos(r), math.sin(r), 0))
        u = (u - normal * u.dot(normal)).normalized()
        v = normal.cross(u)
        lift = normal * 0.006
        start = len(pv)
        for du, dv in ((-1, 0), (0, 1.4), (1, 0), (0, -0.9)):
            pv.append(point + lift + u * du * s + v * dv * s)
        pf.append((start, start + 1, start + 2, start + 3))
        shade = rng.uniform(0.8, 1.0)
        pc.extend([(0.98 * shade, 0.5 * shade, 0.64 * shade)] * 4)
    petals = vertex_colored('Fallen cherry petals', pv, pf, pc)
    print('DRESS', tufts, 'tufts', len(pf), 'petals')
    return [grass, petals]


# ---------- Bake: one lit texture for the rock, lit vertex colours for the dressing.
def use_gpu(scene):
    try:
        scene.cycles.device = 'GPU'
        preferences = bpy.context.preferences.addons['cycles'].preferences
        preferences.compute_device_type = 'METAL'
        preferences.get_devices()
        for device in preferences.devices:
            device.use = True
    except Exception as error:  # noqa: BLE001 - CPU baking is fine, only slower.
        print('GPU unavailable:', error)
        scene.cycles.device = 'CPU'


def tile_layout(count):
    """Texture tiles (u, v, size): the slab under the old seat gets a double-size tile, every
    other part (pieces and the skirt) one cell of a square grid."""
    grid = 2
    while grid * grid - 3 < count:
        grid += 1
    cell = 1 / grid
    tiles = [(0, 0, 2 * cell)]
    tiles += [(x * cell, y * cell, cell) for y in range(grid) for x in range(grid) if x >= 2 or y >= 2]
    return tiles[:count]


def bake(figure):
    rocks = assemble()
    add_figure(figure)
    light_scene()
    add_camera()
    dressing = dress(rocks)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    use_gpu(scene)

    # Bake layout: each piece keeps its scan's own clean UV atlas, moved into its own tile.
    for ob, (u0, v0, size) in zip(rocks, tile_layout(len(rocks))):
        layer = ob.data.uv_layers.new(name='Bake')
        if ob.name == 'Crevice skirt':
            xs = [v.co.x for v in ob.data.vertices]
            ys = [v.co.y for v in ob.data.vertices]
            span = max(max(xs) - min(xs), max(ys) - min(ys))
            for loop in ob.data.loops:
                co = ob.data.vertices[loop.vertex_index].co
                layer.data[loop.index].uv = (u0 + size * (0.01 + 0.98 * (co.x - min(xs)) / span), v0 + size * (0.01 + 0.98 * (co.y - min(ys)) / span))
        else:
            for index, item in enumerate(ob.data.uv_layers['UVMap'].data):
                u, v = item.uv
                layer.data[index].uv = (u0 + size * (0.01 + 0.98 * u), v0 + size * (0.01 + 0.98 * v))

    # One rock mesh, joined and lightly simplified.
    bpy.ops.object.select_all(action='DESELECT')
    for ob in rocks:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = rocks[0]
    bpy.ops.object.join()
    cliff = rocks[0]
    cliff.name = 'Cliff_Stone'
    decimate = cliff.modifiers.new('Simplify', 'DECIMATE')
    decimate.ratio = 0.5
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    print('CLIFF faces', len(cliff.data.polygons))

    size = 4096
    image = bpy.data.images.new('Cliff lit', size, size, alpha=False, float_buffer=True)
    cliff.data.uv_layers.active = cliff.data.uv_layers['Bake']
    cliff.data.uv_layers['UVMap'].active_render = True
    bpy.ops.object.select_all(action='DESELECT')
    cliff.select_set(True)
    bpy.context.view_layer.objects.active = cliff
    for material in cliff.data.materials:
        target = material.node_tree.nodes.new('ShaderNodeTexImage')
        target.image = image
        material.node_tree.nodes.active = target
    scene.cycles.samples = 256
    bake_settings = scene.render.bake
    bake_settings.use_pass_direct = True
    bake_settings.use_pass_indirect = True
    bake_settings.use_pass_color = True
    bake_settings.margin = 6
    bake_settings.target = 'IMAGE_TEXTURES'
    bpy.ops.object.bake(type='DIFFUSE')
    image.filepath_raw = str(ROOT / 'assets/kitsune/cliff-lit.png')
    image.file_format = 'PNG'
    image.save()

    # Dressing: its lighting goes into a second colour layer, which is what gets exported.
    for ob in dressing:
        lit = ob.data.color_attributes.new('Lit', 'FLOAT_COLOR', 'POINT')
        ob.data.color_attributes.active_color = lit
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bake_settings.target = 'VERTEX_COLORS'
        scene.cycles.samples = 128
        bpy.ops.object.bake(type='DIFFUSE')
        ob.data.color_attributes.remove(ob.data.color_attributes['Albedo'])

    # Export: the rock with only its baked UVs and texture; the dressing with its lit colours.
    cliff.data.uv_layers.remove(cliff.data.uv_layers['UVMap'])
    lit_material = bpy.data.materials.new('Cliff lit')
    lit_material.use_nodes = True
    texture = lit_material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    lit_material.node_tree.links.new(texture.outputs['Color'], lit_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    cliff.data.materials.clear()
    cliff.data.materials.append(lit_material)
    blend = ROOT / 'assets/kitsune/cliff.blend'
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.object.select_all(action='DESELECT')
    for ob in [cliff, *dressing]:
        ob.select_set(True)
    output = ROOT / 'public/models/kitsune/cliff.glb'
    bpy.ops.export_scene.gltf(
        filepath=str(output), export_format='GLB', use_selection=True, export_apply=True,
        export_image_format='WEBP', export_image_quality=82,
        export_vertex_color='NAME', export_vertex_color_name='Lit', export_all_vertex_colors=True,
    )
    print('CLIFF_EXPORT', output, output.stat().st_size)


if MODE == 'bake':
    bake(ARGS[1])
if MODE == 'preview':
    preview(ARGS[1], ARGS[2], int(ARGS[3]) if len(ARGS) > 3 else 24)

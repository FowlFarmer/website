"""Create small, standalone sakura props from the site's notched-petal silhouette.

Run with Blender 4.5+: Blender --background --python scripts/blender/create_cherry_blossom_assets.py
The GLBs and contact sheet stay in assets/cherry-blossoms; no site route loads them.
"""

from __future__ import annotations

import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "cherry-blossoms"
OUT.mkdir(parents=True, exist_ok=True)
RNG = random.Random(29)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, color, roughness=0.82, double_sided=False):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    mat.use_backface_culling = not double_sided
    return mat


PINK_BASE = material("petal · rose at throat", (0.66, 0.10, 0.29), double_sided=True)
PINK_MID = material("petal · warm blush", (0.91, 0.35, 0.53), double_sided=True)
PINK_TIP = material("petal · pale edge", (1.0, 0.68, 0.77), double_sided=True)
PINK_ALT = material("petal · cool blush", (0.78, 0.36, 0.59), double_sided=True)
STAMEN = material("stamen · cream", (1.0, 0.91, 0.67))
ANTHER = material("anther · apricot", (1.0, 0.63, 0.32))
CALYX = material("calyx · muted olive", (0.28, 0.36, 0.20))
TWIG = material("twig · plum brown", (0.22, 0.12, 0.15))
BUD = material("bud · deep rose", (0.87, 0.30, 0.50))


def collection(name):
    group = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(group)
    root = bpy.data.objects.new(name, None)
    group.objects.link(root)
    return group, root


def put(obj, group, parent, name, mat=None):
    obj.name = name
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    group.objects.link(obj)
    obj.parent = parent
    if mat is not None:
        obj.data.materials.append(mat)
    return obj


def sphere(group, parent, name, at, radius, mat, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=radius)
    obj = put(bpy.context.object, group, parent, name, mat)
    obj.location = at
    obj.scale = scale
    return obj


def segment(group, parent, name, a, b, r0, r1, mat, sides=7):
    a, b = Vector(a), Vector(b)
    delta = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r0, radius2=r1, depth=delta.length)
    obj = put(bpy.context.object, group, parent, name, mat)
    obj.location = (a + b) / 2
    obj.rotation_euler = delta.to_track_quat("Z", "Y").to_euler()
    return obj


def petal(group, parent, name, angle, *, size=1.0, shade=PINK_MID, curl=1.0):
    """Five transverse samples give the outer rim two lobes and a central notch."""
    rows = [0.012, 0.036, 0.066, 0.093, 0.111, 0.124]
    widths = [0.006, 0.020, 0.035, 0.043, 0.040, 0.027]
    verts = []
    for row, (radius, width) in enumerate(zip(rows, widths)):
        for col, across in enumerate((-1, -0.5, 0, 0.5, 1)):
            tip = (0.0, 0.012, -0.015, 0.012, 0.0)[col] if row == 5 else 0.0
            x = radius + tip
            y = width * across
            z = 0.012 + curl * (0.022 * (radius / 0.124) ** 2 + 0.010 * across**2)
            verts.append((x * size, y * size, z * size))
    faces, band = [], []
    for row in range(len(rows) - 1):
        for col in range(4):
            a = row * 5 + col
            faces.extend(((a, a + 1, a + 6), (a, a + 6, a + 5)))
            band.extend((0 if row < 2 else 1 if row < 4 else 2,) * 2)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    group.objects.link(obj)
    obj.parent = parent
    obj.rotation_euler.z = angle
    for mat in (PINK_BASE, shade, PINK_TIP):
        mesh.materials.append(mat)
    for polygon, material_index in zip(mesh.polygons, band):
        polygon.material_index = material_index
    return obj


def blossom(group, root, name, location, tilt=(0, 0, 0), scale=1.0, variation=0):
    hub = bpy.data.objects.new(name, None)
    group.objects.link(hub)
    hub.parent = root
    hub.location = location
    hub.rotation_euler = tilt
    hub.scale = (scale,) * 3
    for index in range(5):
        angle = math.tau * index / 5 + variation * 0.035
        petal(group, hub, f"{name} · petal {index + 1}", angle,
              size=1 + 0.05 * math.sin(index * 4.3 + variation),
              shade=PINK_ALT if index == (variation + 2) % 5 else PINK_MID,
              curl=0.85 + 0.2 * math.sin(index + variation))
        # Green sepal tips remain visible between the pink petals.
        sepal_angle = angle + math.pi / 5
        segment(group, hub, f"{name} · sepal {index + 1}",
                (0, 0, -0.009), (0.036 * math.cos(sepal_angle), 0.036 * math.sin(sepal_angle), -0.001),
                0.006, 0.001, CALYX, 5)
    sphere(group, hub, f"{name} · heart", (0, 0, 0.025), 0.014, PINK_BASE)
    for index in range(11):
        angle = math.tau * index / 11
        reach = 0.024 + 0.005 * (index % 3)
        tip = (reach * math.cos(angle), reach * math.sin(angle), 0.046 + 0.004 * (index % 2))
        segment(group, hub, f"{name} · filament {index + 1}", (0, 0, 0.026), tip,
                0.0013, 0.0007, STAMEN, 5)
        sphere(group, hub, f"{name} · anther {index + 1}", tip, 0.0031, ANTHER)
    return hub


def bud(group, root, name, location, scale=1.0, lean=0.0):
    hub = bpy.data.objects.new(name, None)
    group.objects.link(hub)
    hub.parent = root
    hub.location = location
    hub.rotation_euler.y = lean
    hub.scale = (scale,) * 3
    sphere(group, hub, name + " · closed petals", (0, 0, 0.025), 0.027, BUD, (0.8, 0.8, 1.45))
    sphere(group, hub, name + " · bright tip", (0, 0, 0.055), 0.015, PINK_MID, (0.85, 0.85, 0.65))
    for index in range(5):
        angle = math.tau * index / 5
        segment(group, hub, f"{name} · sepal {index + 1}",
                (0.009 * math.cos(angle), 0.009 * math.sin(angle), -0.004),
                (0.021 * math.cos(angle), 0.021 * math.sin(angle), 0.039),
                0.006, 0.001, CALYX, 5)
    return hub


def twig(group, root, points, name):
    for index, (a, b) in enumerate(zip(points, points[1:])):
        segment(group, root, f"{name} · segment {index + 1}", a, b,
                0.0055 - index * 0.0007, 0.0048 - index * 0.0007, TWIG)


# 1. A single face-up flower, useful as an isolated foreground accent.
single_group, single_root = collection("01 · open blossom")
blossom(single_group, single_root, "open blossom", (0, 0, 0), variation=2)
segment(single_group, single_root, "short pedicel", (0, 0, -0.085), (0, 0, 0), 0.0037, 0.002, TWIG)

# 2. A small branch of flowers, modeled as one prop rather than repeated flat cards.
sprig_group, sprig_root = collection("02 · three-blossom sprig")
twig(sprig_group, sprig_root,
     [(0, 0, 0), (-0.01, 0, 0.08), (0.018, 0, 0.16), (0.035, 0, 0.225)], "main twig")
twig(sprig_group, sprig_root, [(-0.008, 0, 0.082), (-0.073, 0, 0.135), (-0.09, 0, 0.16)], "left twig")
twig(sprig_group, sprig_root, [(0.018, 0, 0.16), (0.083, 0, 0.19), (0.105, 0, 0.215)], "right twig")
blossom(sprig_group, sprig_root, "top flower", (0.035, 0, 0.225), (-0.25, -0.25, 0), 0.79, 1)
blossom(sprig_group, sprig_root, "left flower", (-0.09, 0, 0.16), (-0.2, -0.15, 0.4), 0.67, 2)
blossom(sprig_group, sprig_root, "right flower", (0.105, 0, 0.215), (0.2, 0.25, -0.3), 0.7, 3)
bud(sprig_group, sprig_root, "small bud", (0.007, 0.012, 0.14), 0.7, 0.3)

# 3. A quieter bud spray for rocky edges and the base of the scene.
bud_group, bud_root = collection("03 · opening buds")
twig(bud_group, bud_root, [(0, 0, 0), (0.008, 0, 0.07), (0.014, 0, 0.14), (0.003, 0, 0.19)], "bud stem")
twig(bud_group, bud_root, [(0.009, 0, 0.08), (-0.058, 0, 0.12), (-0.072, 0, 0.16)], "left branch")
twig(bud_group, bud_root, [(0.014, 0, 0.14), (0.067, 0, 0.18)], "right branch")
bud(bud_group, bud_root, "main bud", (0.003, 0, 0.19), 1.0, -0.15)
bud(bud_group, bud_root, "left bud", (-0.072, 0, 0.16), 0.79, -0.42)
bud(bud_group, bud_root, "right bud", (0.067, 0, 0.18), 0.69, 0.35)

# 4. A deterministic patch of fallen petals, plus a loose petal that can be lifted out.
scatter_group, scatter_root = collection("04 · fallen petals")
for index in range(10):
    angle = RNG.uniform(0, math.tau)
    distance = RNG.uniform(0.025, 0.16)
    piece = petal(scatter_group, scatter_root, f"fallen petal {index + 1}",
                  RNG.uniform(0, math.tau), size=RNG.uniform(0.38, 0.6),
                  shade=PINK_ALT if index % 3 == 0 else PINK_MID, curl=0.25)
    piece.location = (math.cos(angle) * distance, math.sin(angle) * distance, 0.009 + index * 0.0004)
    piece.rotation_euler.x = RNG.uniform(-0.09, 0.09)
    piece.rotation_euler.y = RNG.uniform(-0.09, 0.09)


ASSETS = [
    ("open-blossom", single_group, single_root),
    ("three-blossom-sprig", sprig_group, sprig_root),
    ("opening-buds", bud_group, bud_root),
    ("fallen-petals", scatter_group, scatter_root),
]

for filename, group, root in ASSETS:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in group.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(OUT / f"{filename}.glb"), export_format="GLB",
                              use_selection=True, export_yup=True,
                              export_apply=True, export_materials="EXPORT")

# Render a presentation sheet after export. The GLBs remain centered at their own origins.
for (_, _, root), x in zip(ASSETS, (-0.76, -0.25, 0.28, 0.78)):
    root.location.x = x
for root in (single_root, scatter_root):
    root.location.z = 0.10

ground_mat = material("preview · violet slate", (0.11, 0.09, 0.17), 1.0)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.005))
ground = bpy.context.object
ground.name = "Preview ground · not exported"
ground.data.materials.append(ground_mat)

def label(text, x):
    curve = bpy.data.curves.new("preview label", "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.size = 0.045
    obj = bpy.data.objects.new(text, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = (x, -0.37, 0.002)
    curve.materials.append(material("label white", (0.92, 0.87, 0.88)))

for title, x in zip(("OPEN BLOSSOM", "FLOWERING SPRIG", "OPENING BUDS", "FALLEN PETALS"),
                    (-0.76, -0.25, 0.28, 0.78)):
    label(title, x)

world = bpy.context.scene.world
world.color = (0.27, 0.24, 0.34)
world.use_nodes = True
world.node_tree.nodes.get("Background").inputs["Color"].default_value = (0.35, 0.31, 0.43, 1)
world.node_tree.nodes.get("Background").inputs["Strength"].default_value = 0.45

def area(name, location, power, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 0.07)) - obj.location).to_track_quat("-Z", "Y").to_euler()

area("warm softbox", (-1, -0.6, 1.2), 125, (1.0, 0.72, 0.75), 1.4)
area("cool rim", (0.6, 0.6, 1.0), 85, (0.68, 0.72, 1.0), 1.0)

camera_data = bpy.data.cameras.new("contact sheet camera")
camera = bpy.data.objects.new("contact sheet camera", camera_data)
bpy.context.collection.objects.link(camera)
camera.location = (0, -1.35, 0.95)
camera.rotation_euler = (Vector((0, 0, 0.09)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 2.45
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 32
scene.render.resolution_x = 1600
scene.render.resolution_y = 850
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT / "contact-sheet.png")
scene.view_settings.view_transform = "AgX"
scene.render.film_transparent = False
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "cherry-blossom-assets.blend"))
bpy.ops.render.render(write_still=True)
print("Created", *(str(OUT / f"{name}.glb") for name, _, _ in ASSETS), sep="\n")
print("Preview", OUT / "contact-sheet.png")
os._exit(0)

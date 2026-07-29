"""Build a camera-matched, web-ready soldering-bench scene.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender \
    --background --python scripts/blender/create_soldering_scene.py

The model is intentionally assembled from economical geometry so the resulting
GLB is appropriate for a realtime homepage.  Character parts are attached to a
real armature and the exported file contains a looping ``SolderingIdle`` clip.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
BLEND_PATH = ROOT / "assets" / "blender" / "soldering_scene.blend"
RENDER_PATH = ROOT / "assets" / "blender" / "renders" / "soldering_scene_proxy.png"
GLB_PATH = ROOT / "public" / "models" / "soldering" / "soldering_scene.glb"
PROFILE_TEXTURE_PATH = ROOT / "assets" / "blender" / "textures" / "theodore_profile.png"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.5,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def apply_material(obj: bpy.types.Object, mat: bpy.types.Material) -> None:
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)


def image_material(name: str, image_path: Path) -> bpy.types.Material:
    """Create a glTF-compatible photographic material with feathered alpha."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (1.0, 1.0, 1.0, 1.0)
    if hasattr(mat, "surface_render_method"):
        mat.surface_render_method = "DITHERED"
    elif hasattr(mat, "blend_method"):
        mat.blend_method = "BLEND"
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "Identity texture"
    texture.image = bpy.data.images.load(str(image_path), check_existing=True)
    texture.interpolation = "Linear"
    bsdf.inputs["Roughness"].default_value = 0.56
    bsdf.inputs["Emission Strength"].default_value = 0.04
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(texture.outputs["Color"], bsdf.inputs["Emission Color"])
    links.new(texture.outputs["Alpha"], bsdf.inputs["Alpha"])
    return mat


def smooth(obj: bpy.types.Object) -> None:
    if not obj.data or not hasattr(obj.data, "polygons"):
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    bevel: float = 0.04,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new(name="Soft edges", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        modifier.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    apply_material(obj, mat)
    return obj


def sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    segments: int = 32,
    rings: int = 20,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    smooth(obj)
    return obj


def cylinder_between(
    name: str,
    start: tuple[float, float, float] | Vector,
    end: tuple[float, float, float] | Vector,
    radius: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 24,
) -> bpy.types.Object:
    start_vec = Vector(start)
    end_vec = Vector(end)
    delta = end_vec - start_vec
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=delta.length,
        location=(start_vec + end_vec) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = delta.to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    smooth(obj)
    return obj


def cable(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(name=f"{name}Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 2
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 3
    spline = curve_data.splines.new(type="BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    apply_material(obj, mat)
    return obj


def look_at(obj: bpy.types.Object, point: tuple[float, float, float]) -> None:
    direction = Vector(point) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_area_light(
    name: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    *,
    energy: float,
    color: tuple[float, float, float],
    size: float,
) -> bpy.types.Object:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name=name, object_data=data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    look_at(obj, target)
    return obj


def parent_to_bone(
    obj: bpy.types.Object,
    armature: bpy.types.Object,
    bone_name: str,
) -> None:
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def face_card(
    name: str,
    center: Vector,
    camera: bpy.types.Object,
    size: tuple[float, float],
    mat: bpy.types.Material,
) -> bpy.types.Object:
    """Create a subtle identity patch over the dimensional head.

    The feathered patch uses the source photograph only on the camera-visible
    quarter of the face.  The head, chin and profile geometry remain underneath
    it, so small camera movement still has real volume and silhouette.
    """
    width, height = size
    bpy.ops.mesh.primitive_plane_add(size=2.0, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (width * 0.5, height * 0.5, 1.0)
    obj.rotation_euler = (Vector(camera.location) - center).to_track_quat("Z", "Y").to_euler()
    orientation = obj.rotation_euler.to_matrix()
    obj.location += orientation @ Vector((0.15, -0.025, 0.0))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, mat)
    return obj


def create_armature() -> bpy.types.Object:
    armature_data = bpy.data.armatures.new("TheodoreRig")
    armature = bpy.data.objects.new("TheodoreRig", armature_data)
    bpy.context.collection.objects.link(armature)
    armature.show_in_front = True
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    joints = {
        "root": ((-0.82, 1.52, 1.12), (-0.82, 1.48, 1.36), None),
        "spine": ((-0.82, 1.48, 1.36), (-0.70, 1.14, 2.06), "root"),
        "neck": ((-0.70, 1.14, 2.06), (-0.52, 0.97, 2.28), "spine"),
        "head": ((-0.52, 0.97, 2.28), (-0.40, 0.79, 2.66), "neck"),
        "upper_arm.L": ((-1.04, 1.18, 2.03), (-0.62, 0.72, 1.55), "spine"),
        "forearm.L": ((-0.62, 0.72, 1.55), (-0.15, 0.33, 1.18), "upper_arm.L"),
        "hand.L": ((-0.15, 0.33, 1.18), (0.03, 0.18, 1.13), "forearm.L"),
        "upper_arm.R": ((-0.38, 1.12, 2.02), (0.00, 0.70, 1.58), "spine"),
        "forearm.R": ((0.00, 0.70, 1.58), (0.30, 0.25, 1.20), "upper_arm.R"),
        "hand.R": ((0.30, 0.25, 1.20), (0.44, 0.08, 1.13), "forearm.R"),
    }

    edit_bones: dict[str, bpy.types.EditBone] = {}
    for name, (head, tail, parent_name) in joints.items():
        bone = armature_data.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent_name:
            bone.parent = edit_bones[parent_name]
            bone.use_connect = name not in {"upper_arm.L", "upper_arm.R"}
        edit_bones[name] = bone

    bpy.ops.object.mode_set(mode="POSE")
    for pose_bone in armature.pose.bones:
        pose_bone.rotation_mode = "XYZ"

    action = bpy.data.actions.new("SolderingIdle")
    armature.animation_data_create()
    armature.animation_data.action = action
    frames = (1, 70, 140)

    for frame in frames:
        for bone_name in ("spine", "neck", "head", "hand.R", "hand.L"):
            pose_bone = armature.pose.bones[bone_name]
            pose_bone.rotation_euler = (0.0, 0.0, 0.0)
            if frame == 70:
                if bone_name == "spine":
                    pose_bone.rotation_euler.x = math.radians(0.7)
                elif bone_name == "neck":
                    pose_bone.rotation_euler.y = math.radians(-1.0)
                elif bone_name == "head":
                    pose_bone.rotation_euler.z = math.radians(1.6)
                elif bone_name == "hand.R":
                    pose_bone.rotation_euler.y = math.radians(2.2)
                elif bone_name == "hand.L":
                    pose_bone.rotation_euler.x = math.radians(-1.4)
            pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame)

    for fcurve in action.fcurves:
        fcurve.modifiers.new(type="CYCLES")
        for keyframe in fcurve.keyframe_points:
            keyframe.interpolation = "SINE"

    bpy.ops.object.mode_set(mode="OBJECT")
    armature.select_set(False)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 140
    bpy.context.scene.render.fps = 30
    return armature


def build_scene() -> None:
    clear_scene()

    # Palette sampled and interpreted from the original workshop photo.
    MAT = {
        "bench": material("Bench green", (0.035, 0.19, 0.14, 1), roughness=0.68),
        "bench_edge": material("Bench edge", (0.012, 0.035, 0.031, 1), roughness=0.52),
        "mat": material("Silicone work mat", (0.015, 0.36, 0.68, 1), roughness=0.62),
        "mat_dark": material("Mat recess", (0.008, 0.16, 0.30, 1), roughness=0.7),
        "skin": material("Skin", (0.44, 0.205, 0.115, 1), roughness=0.52),
        "skin_light": material("Skin highlight", (0.56, 0.29, 0.17, 1), roughness=0.48),
        "hair": material("Hair", (0.004, 0.006, 0.009, 1), metallic=0.03, roughness=0.24),
        "shirt": material("Heather shirt", (0.64, 0.64, 0.61, 1), roughness=0.88),
        "apron": material("Black apron", (0.008, 0.009, 0.011, 1), roughness=0.72),
        "headphones": material("Headphone silver", (0.66, 0.67, 0.65, 1), metallic=0.18, roughness=0.3),
        "headphone_pad": material("Headphone pads", (0.18, 0.18, 0.17, 1), roughness=0.9),
        "metal": material("Tool metal", (0.28, 0.31, 0.31, 1), metallic=0.76, roughness=0.27),
        "black": material("Tool black", (0.008, 0.010, 0.012, 1), roughness=0.32),
        "purple": material("Station purple", (0.10, 0.055, 0.28, 1), metallic=0.05, roughness=0.42),
        "red": material("Cable red", (0.68, 0.018, 0.012, 1), roughness=0.35),
        "yellow": material("Cable yellow", (0.96, 0.55, 0.01, 1), roughness=0.34),
        "green": material("PCB green", (0.01, 0.26, 0.12, 1), roughness=0.4),
        "iron_green": material("Iron grip", (0.04, 0.52, 0.40, 1), roughness=0.38),
        "white": material("Warm white", (0.76, 0.75, 0.69, 1), roughness=0.66),
        "lamp": material(
            "Lamp emitter",
            (0.95, 0.96, 0.90, 1),
            roughness=0.16,
            emission=(1.0, 0.91, 0.72, 1),
            emission_strength=7.0,
        ),
        "tip": material(
            "Solder glow",
            (0.8, 0.18, 0.02, 1),
            roughness=0.25,
            emission=(1.0, 0.10, 0.01, 1),
            emission_strength=9.0,
        ),
    }

    # Room shell and bench.
    box("Back wall", (0.0, 2.72, 2.3), (7.0, 0.12, 4.8), MAT["white"], bevel=0.0)
    box("Side wall", (-3.15, 0.8, 2.2), (0.12, 4.0, 4.6), MAT["white"], bevel=0.0)
    box("Window frame", (-0.15, 2.63, 2.55), (2.25, 0.10, 1.52), MAT["bench_edge"], bevel=0.02)
    box("Window glass", (-0.15, 2.55, 2.55), (1.98, 0.06, 1.26), MAT["black"], bevel=0.01)
    box("Bench", (0.25, 0.22, 0.91), (5.75, 3.15, 0.18), MAT["bench"], bevel=0.045)
    box("Bench front edge", (0.25, -1.28, 0.81), (5.78, 0.11, 0.32), MAT["bench_edge"], bevel=0.025)

    # Blue silicone mat and its unmistakable recessed work zones.
    box("Blue silicone mat", (0.48, 0.12, 1.025), (2.78, 1.60, 0.055), MAT["mat"], bevel=0.08)
    for index, x in enumerate((-0.48, 0.08, 0.64, 1.20)):
        box(
            f"Mat tray {index + 1}",
            (x, 0.60, 1.061),
            (0.43, 0.36, 0.025),
            MAT["mat_dark"],
            bevel=0.035,
        )
    box("Mat main recess", (0.42, -0.14, 1.062), (1.65, 0.64, 0.024), MAT["mat_dark"], bevel=0.05)
    for x in (-0.22, 0.1, 0.42, 0.74, 1.06):
        cylinder_between(f"Mat groove {x:.2f}", (x, 0.82, 1.07), (x, 1.0, 1.07), 0.018, MAT["mat_dark"], vertices=12)

    # Circuit board at the work point.
    box("Circuit board", (0.18, -0.05, 1.105), (0.60, 0.34, 0.035), MAT["green"], bevel=0.012)
    for index, (x, y, sx, sy) in enumerate(
        [
            (0.02, -0.05, 0.10, 0.08),
            (0.20, -0.01, 0.12, 0.07),
            (0.38, -0.09, 0.08, 0.12),
            (0.16, 0.08, 0.06, 0.06),
        ]
    ):
        box(f"PCB component {index}", (x, y, 1.135), (sx, sy, 0.05), MAT["black"], bevel=0.008)

    # Dense but optimized bench dressing.
    box("Hot air station", (1.65, 0.75, 1.34), (0.58, 0.56, 0.62), MAT["purple"], bevel=0.065)
    cylinder_between("Hot air handle", (1.51, 0.47, 1.48), (1.02, 0.13, 1.24), 0.075, MAT["purple"])
    cylinder_between("Hot air nozzle", (1.02, 0.13, 1.24), (0.82, -0.02, 1.16), 0.037, MAT["metal"])
    box("Black parts tray", (1.75, -0.25, 1.17), (0.82, 0.55, 0.23), MAT["black"], bevel=0.045)
    box("Power block", (-0.92, 0.64, 1.20), (0.55, 0.34, 0.27), MAT["black"], bevel=0.045)
    box("Grey instrument", (-0.52, -0.46, 1.20), (0.56, 0.34, 0.25), MAT["headphones"], bevel=0.04)
    for x in (-1.2, 1.1):
        box(f"Parts container {x}", (x, 0.12, 1.17), (0.42, 0.32, 0.20), MAT["black"], bevel=0.035)

    # Cables are prominent in the source and sell the electronics-workbench read.
    cable(
        "Red bench lead",
        [(-2.0, -0.72, 1.14), (-1.18, -0.48, 1.18), (-0.32, -0.72, 1.16), (0.74, -0.58, 1.10), (1.68, -0.72, 1.14)],
        0.028,
        MAT["red"],
    )
    cable(
        "Yellow bench lead",
        [(-2.24, -0.44, 1.13), (-1.52, -0.23, 1.18), (-0.72, -0.88, 1.16), (0.16, -0.92, 1.12)],
        0.024,
        MAT["yellow"],
    )
    cable(
        "Black iron cable",
        [(0.39, 0.08, 1.20), (0.88, 0.53, 1.70), (0.35, 1.44, 2.54), (-0.52, 1.80, 2.42)],
        0.031,
        MAT["black"],
    )

    # Character skeleton and body.
    rig = create_armature()
    torso = sphere("Torso", (-0.78, 1.38, 1.73), (0.51, 0.30, 0.68), MAT["shirt"], rotation=(math.radians(17), 0, math.radians(-8)))
    parent_to_bone(torso, rig, "spine")
    apron = box(
        "Black soldering apron",
        (-0.64, 1.09, 1.65),
        (0.66, 0.07, 0.88),
        MAT["apron"],
        bevel=0.08,
        rotation=(math.radians(17), 0, math.radians(-8)),
    )
    parent_to_bone(apron, rig, "spine")
    jacket_left = sphere("Black jacket left", (-1.18, 1.45, 1.75), (0.24, 0.29, 0.69), MAT["apron"], rotation=(math.radians(15), 0, math.radians(-10)))
    parent_to_bone(jacket_left, rig, "spine")
    neck = cylinder_between("Neck", (-0.69, 1.12, 1.99), (-0.50, 0.98, 2.30), 0.17, MAT["skin"])
    parent_to_bone(neck, rig, "neck")

    head = sphere(
        "Head likeness mesh",
        (-0.40, 0.82, 2.49),
        (0.245, 0.285, 0.315),
        MAT["skin"],
        rotation=(math.radians(7), math.radians(-8), math.radians(-13)),
        segments=48,
        rings=28,
    )
    parent_to_bone(head, rig, "head")
    chin = sphere("Chin", (-0.18, 0.72, 2.35), (0.10, 0.10, 0.085), MAT["skin"], rotation=(0, 0, math.radians(-13)))
    parent_to_bone(chin, rig, "head")
    nose = sphere("Nose", (-0.115, 0.72, 2.48), (0.070, 0.052, 0.074), MAT["skin_light"], rotation=(math.radians(12), math.radians(-6), math.radians(-18)), segments=24, rings=16)
    parent_to_bone(nose, rig, "head")
    upper_lip = sphere("Upper lip", (-0.125, 0.70, 2.405), (0.058, 0.026, 0.018), MAT["skin_light"], rotation=(0, 0, math.radians(-13)), segments=20, rings=12)
    lower_lip = sphere("Lower lip", (-0.125, 0.695, 2.382), (0.064, 0.030, 0.021), MAT["skin_light"], rotation=(0, 0, math.radians(-13)), segments=20, rings=12)
    parent_to_bone(upper_lip, rig, "head")
    parent_to_bone(lower_lip, rig, "head")

    # Layered hair silhouette based on the long, straight fringe in all references.
    scalp = sphere("Hair cap", (-0.44, 0.85, 2.61), (0.265, 0.305, 0.255), MAT["hair"], rotation=(math.radians(7), math.radians(-8), math.radians(-13)), segments=40, rings=24)
    parent_to_bone(scalp, rig, "head")
    fringe_specs = [
        ((-0.25, 0.57, 2.63), (0.095, 0.045, 0.26), -17),
        ((-0.34, 0.55, 2.65), (0.105, 0.05, 0.29), -8),
        ((-0.44, 0.58, 2.66), (0.095, 0.05, 0.27), 3),
        ((-0.52, 0.61, 2.65), (0.09, 0.05, 0.23), 11),
    ]
    for index, (loc, scale, angle) in enumerate(fringe_specs):
        strand = sphere(
            f"Hair fringe {index}",
            loc,
            scale,
            MAT["hair"],
            rotation=(math.radians(11), math.radians(-6), math.radians(angle)),
            segments=24,
            rings=14,
        )
        parent_to_bone(strand, rig, "head")

    # Headphones: two cups, pads, a band and the visible hinge.
    for side, center in (("near", (-0.62, 0.79, 2.51)), ("far", (-0.22, 1.01, 2.55))):
        cup = sphere(f"Headphone cup {side}", center, (0.105, 0.055, 0.13), MAT["headphones"], rotation=(math.radians(8), math.radians(-15), math.radians(-10)), segments=28, rings=18)
        pad = sphere(f"Headphone pad {side}", (center[0] + 0.012, center[1] - 0.025, center[2]), (0.112, 0.032, 0.138), MAT["headphone_pad"], rotation=(math.radians(8), math.radians(-15), math.radians(-10)), segments=28, rings=18)
        parent_to_bone(cup, rig, "head")
        parent_to_bone(pad, rig, "head")
    headphone_band = cable(
        "Headphone band",
        [(-0.64, 0.81, 2.55), (-0.62, 0.88, 2.82), (-0.40, 1.02, 2.94), (-0.20, 1.02, 2.60)],
        0.038,
        MAT["headphones"],
    )
    parent_to_bone(headphone_band, rig, "head")

    # Arms and hands follow the exact forward soldering silhouette.
    body_segments = [
        ("Upper arm L", (-1.04, 1.18, 2.03), (-0.62, 0.72, 1.55), 0.135, "upper_arm.L"),
        ("Forearm L", (-0.62, 0.72, 1.55), (-0.15, 0.33, 1.18), 0.112, "forearm.L"),
        ("Upper arm R", (-0.38, 1.12, 2.02), (0.00, 0.70, 1.58), 0.135, "upper_arm.R"),
        ("Forearm R", (0.00, 0.70, 1.58), (0.30, 0.25, 1.20), 0.112, "forearm.R"),
    ]
    for name, start, end, radius, bone in body_segments:
        segment = cylinder_between(name, start, end, radius, MAT["skin"], vertices=28)
        parent_to_bone(segment, rig, bone)

    hand_l = sphere("Hand L", (-0.03, 0.23, 1.16), (0.15, 0.095, 0.075), MAT["skin_light"], rotation=(math.radians(12), math.radians(-6), math.radians(-25)), segments=28, rings=18)
    hand_r = sphere("Hand R", (0.38, 0.15, 1.17), (0.15, 0.09, 0.075), MAT["skin_light"], rotation=(math.radians(-8), math.radians(12), math.radians(18)), segments=28, rings=18)
    parent_to_bone(hand_l, rig, "hand.L")
    parent_to_bone(hand_r, rig, "hand.R")
    for side, base, direction, bone in (
        ("L", Vector((-0.05, 0.18, 1.16)), Vector((0.19, -0.10, -0.02)), "hand.L"),
        ("R", Vector((0.34, 0.11, 1.16)), Vector((0.17, -0.12, -0.04)), "hand.R"),
    ):
        for index in range(4):
            offset = Vector((0.0, index * 0.026, index * 0.004))
            finger = cylinder_between(
                f"Finger {side}{index + 1}",
                base + offset,
                base + offset + direction * (0.72 + index * 0.04),
                0.018,
                MAT["skin_light"],
                vertices=14,
            )
            parent_to_bone(finger, rig, bone)

    # Soldering iron parented to the right hand so its micro-motion is visible.
    iron_grip = cylinder_between("Soldering iron grip", (0.41, 0.13, 1.19), (0.18, -0.04, 1.13), 0.048, MAT["iron_green"])
    iron_shaft = cylinder_between("Soldering iron shaft", (0.18, -0.04, 1.13), (0.08, -0.10, 1.105), 0.020, MAT["metal"])
    iron_tip = cylinder_between("Soldering iron hot tip", (0.08, -0.10, 1.105), (0.015, -0.13, 1.107), 0.010, MAT["tip"], vertices=16)
    parent_to_bone(iron_grip, rig, "hand.R")
    parent_to_bone(iron_shaft, rig, "hand.R")
    parent_to_bone(iron_tip, rig, "hand.R")

    # Long articulated work lamp and bright bar from the source.
    cylinder_between("Lamp arm lower", (-1.72, 1.15, 1.22), (-1.62, 1.02, 2.62), 0.045, MAT["black"])
    cylinder_between("Lamp arm upper", (-1.62, 1.02, 2.62), (-0.78, 0.46, 3.14), 0.045, MAT["black"])
    box("Lamp bar", (-0.52, 0.32, 3.04), (0.22, 0.13, 1.05), MAT["lamp"], bevel=0.07, rotation=(math.radians(8), math.radians(-4), math.radians(42)))
    add_area_light(
        "Lamp key",
        (-0.10, -0.40, 3.35),
        (-0.25, 0.30, 1.50),
        energy=560,
        color=(1.0, 0.78, 0.55),
        size=1.4,
    )
    add_area_light(
        "Cool mat fill",
        (2.2, -1.4, 2.7),
        (0.3, 0.0, 1.15),
        energy=520,
        color=(0.28, 0.58, 1.0),
        size=2.2,
    )
    add_area_light(
        "Face rim",
        (-2.2, 0.1, 3.2),
        (-0.45, 0.85, 2.4),
        energy=610,
        color=(1.0, 0.94, 0.82),
        size=1.5,
    )
    add_area_light(
        "Room fill",
        (0.0, 2.2, 4.0),
        (-0.4, 0.8, 1.8),
        energy=330,
        color=(0.58, 0.73, 1.0),
        size=3.0,
    )

    # Foreground objects reproduce the source photo's voyeuristic framing.
    box("Foreground instrument left", (-2.55, -0.82, 1.56), (0.54, 0.45, 1.42), MAT["black"], bevel=0.08, rotation=(0, 0, math.radians(-8)))
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.23, depth=1.45, location=(2.56, -0.52, 1.60), rotation=(math.radians(10), 0, math.radians(5)))
    can = bpy.context.object
    can.name = "Foreground flux can"
    apply_material(can, MAT["white"])

    # Hero camera: a controlled game-menu framing with limited parallax in the site.
    camera_data = bpy.data.cameras.new("Hero camera")
    camera = bpy.data.objects.new("Hero camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (3.72, -5.72, 3.20)
    camera_data.lens = 61
    camera_data.sensor_width = 36
    look_at(camera, (-0.26, 0.40, 1.67))
    bpy.context.scene.camera = camera

    identity_mat = image_material("Photographic face identity", PROFILE_TEXTURE_PATH)
    head_center = Vector((-0.40, 0.82, 2.49))
    card_center = head_center + (camera.location - head_center).normalized() * 0.38
    identity_patch = face_card(
        "Source-faithful face detail",
        card_center,
        camera,
        (0.76, 0.82),
        identity_mat,
    )
    parent_to_bone(identity_patch, rig, "head")

    world = bpy.data.worlds.new("Workshop world")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.006, 0.009, 0.013, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.18

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(RENDER_PATH)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.72
    scene.render.image_settings.color_depth = "8"

    scene.frame_set(52)
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        export_animations=True,
        export_yup=True,
        export_apply=True,
        export_lights=False,
        export_cameras=False,
    )
    print(f"Saved Blender source: {BLEND_PATH}")
    print(f"Saved proxy render: {RENDER_PATH}")
    print(f"Saved web model: {GLB_PATH}")


if __name__ == "__main__":
    build_scene()

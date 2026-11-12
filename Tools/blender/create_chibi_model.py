"""
=============================================================================
create_chibi_model.py
Tạo model 3D nhân vật Astra dạng Chibi SD (Super Deformed - Tỷ lệ 1:2.5)
phong cách anime cel-shading chuyên dụng cho bản đồ phiêu lưu ngoài trận (Overworld),
kèm bộ xương Armature và 2 Action Animations (Chibi Bouncy Idle & Chibi Walk Loop).
Chạy trực tiếp bằng Blender 5.2.1 LTS CLI.
=============================================================================
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler, Matrix

def reset_scene():
    """Xóa sạch scene mặc định."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if "Astra_Chibi_Character" not in bpy.data.collections:
        col = bpy.data.collections.new("Astra_Chibi_Character")
        bpy.context.scene.collection.children.link(col)
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children["Astra_Chibi_Character"]

def create_cel_material(name, base_color, shadow_color, is_emissive=False, emit_strength=2.0):
    """Vật liệu NPR Cel-Shading 2-tone phong cách anime."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    nodes = tree.nodes
    links = tree.links
    nodes.clear()

    node_out = nodes.new('ShaderNodeOutputMaterial')
    node_out.location = (600, 0)

    if is_emissive:
        node_emit = nodes.new('ShaderNodeEmission')
        node_emit.location = (300, 0)
        node_emit.inputs['Color'].default_value = base_color
        node_emit.inputs['Strength'].default_value = emit_strength
        links.new(node_emit.outputs['Emission'], node_out.inputs['Surface'])
        return mat

    node_diff = nodes.new('ShaderNodeBsdfDiffuse')
    node_diff.location = (-400, 0)
    node_diff.inputs['Color'].default_value = (1, 1, 1, 1)

    node_s2rgb = nodes.new('ShaderNodeShaderToRGB')
    node_s2rgb.location = (-180, 0)
    links.new(node_diff.outputs['BSDF'], node_s2rgb.inputs['Shader'])

    node_ramp = nodes.new('ShaderNodeValToRGB')
    node_ramp.location = (60, 0)
    node_ramp.color_ramp.interpolation = 'CONSTANT'
    node_ramp.color_ramp.elements[0].position = 0.0
    node_ramp.color_ramp.elements[0].color = shadow_color
    if len(node_ramp.color_ramp.elements) < 2:
        node_ramp.color_ramp.elements.new(0.48)
    else:
        node_ramp.color_ramp.elements[1].position = 0.48
    node_ramp.color_ramp.elements[1].color = base_color

    links.new(node_s2rgb.outputs['Color'], node_ramp.inputs['Fac'])
    links.new(node_ramp.outputs['Color'], node_out.inputs['Surface'])
    return mat

def create_outline_material():
    """Vật liệu viền nét mực anime (Inverted Hull)."""
    mat = bpy.data.materials.new(name="M_Chibi_Outline")
    mat.use_nodes = True
    tree = mat.node_tree
    nodes = tree.nodes
    links = tree.links
    nodes.clear()

    node_out = nodes.new('ShaderNodeOutputMaterial')
    node_out.location = (300, 0)
    node_emit = nodes.new('ShaderNodeEmission')
    node_emit.location = (0, 0)
    node_emit.inputs['Color'].default_value = (0.04, 0.04, 0.07, 1.0)
    node_emit.inputs['Strength'].default_value = 1.0
    links.new(node_emit.outputs['Emission'], node_out.inputs['Surface'])
    try:
        mat.use_backface_culling = True
    except Exception:
        pass
    return mat

def build_materials():
    materials = {
        'Skin': create_cel_material("M_Chibi_Skin", (0.97, 0.88, 0.82, 1.0), (0.85, 0.72, 0.68, 1.0)),
        'Techsuit': create_cel_material("M_Chibi_Techsuit", (0.12, 0.13, 0.17, 1.0), (0.06, 0.07, 0.09, 1.0)),
        'Armor': create_cel_material("M_Chibi_Armor", (0.88, 0.90, 0.94, 1.0), (0.58, 0.62, 0.70, 1.0)),
        'Hair': create_cel_material("M_Chibi_Hair", (0.78, 0.82, 0.92, 1.0), (0.45, 0.50, 0.68, 1.0)),
        'Eyes': create_cel_material("M_Chibi_Eyes", (0.00, 0.88, 0.98, 1.0), (0.00, 0.50, 0.70, 1.0), is_emissive=True, emit_strength=2.2),
        'CyanGlow': create_cel_material("M_Chibi_CyanGlow", (0.00, 0.92, 1.0, 1.0), (0.0, 0.5, 0.8, 1.0), is_emissive=True, emit_strength=3.5),
        'RedGlow': create_cel_material("M_Chibi_RedGlow", (1.0, 0.15, 0.28, 1.0), (0.6, 0.05, 0.12, 1.0), is_emissive=True, emit_strength=3.0),
        'Outline': create_outline_material(),
    }
    return materials

def add_box(bm, center, size, mat_idx=0):
    sx, sy, sz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
    cx, cy, cz = center
    verts = [
        bm.verts.new((cx - sx, cy - sy, cz - sz)),
        bm.verts.new((cx + sx, cy - sy, cz - sz)),
        bm.verts.new((cx + sx, cy + sy, cz - sz)),
        bm.verts.new((cx - sx, cy + sy, cz - sz)),
        bm.verts.new((cx - sx, cy - sy, cz + sz)),
        bm.verts.new((cx + sx, cy - sy, cz + sz)),
        bm.verts.new((cx + sx, cy + sy, cz + sz)),
        bm.verts.new((cx - sx, cy + sy, cz + sz)),
    ]
    faces = [
        bm.faces.new((verts[0], verts[1], verts[2], verts[3])),
        bm.faces.new((verts[4], verts[7], verts[6], verts[5])),
        bm.faces.new((verts[0], verts[4], verts[5], verts[1])),
        bm.faces.new((verts[1], verts[5], verts[6], verts[2])),
        bm.faces.new((verts[2], verts[6], verts[7], verts[3])),
        bm.faces.new((verts[3], verts[7], verts[4], verts[0])),
    ]
    for f in faces:
        f.material_index = mat_idx
        f.smooth = True
    return verts

def add_cylinder(bm, center, r_top, r_bot, height, segments=12, mat_idx=0):
    cx, cy, cz = center
    z_bot = cz - height * 0.5
    z_top = cz + height * 0.5
    bot_verts, top_verts = [], []
    for i in range(segments):
        ang = 2.0 * math.pi * i / segments
        bx = cx + r_bot * math.cos(ang)
        by = cy + r_bot * math.sin(ang)
        tx = cx + r_top * math.cos(ang)
        ty = cy + r_top * math.sin(ang)
        bot_verts.append(bm.verts.new((bx, by, z_bot)))
        top_verts.append(bm.verts.new((tx, ty, z_top)))
    
    faces = []
    for i in range(segments):
        ni = (i + 1) % segments
        faces.append(bm.faces.new((bot_verts[i], bot_verts[ni], top_verts[ni], top_verts[i])))
    faces.append(bm.faces.new(list(reversed(bot_verts))))
    faces.append(bm.faces.new(top_verts))
    for f in faces:
        f.material_index = mat_idx
        f.smooth = True
    return bot_verts + top_verts

def build_chibi_mesh(materials):
    """
    Tạo toàn bộ mesh nhân vật Astra dạng Chibi:
    - Tỷ lệ 1:2.5 (Cao tổng thể ~0.84m)
    - Đầu to tròn dễ thương (Head Z: 0.44 -> 0.78m)
    - Thân nhỏ gọn bọc giáp (Torso Z: 0.22 -> 0.44m)
    - Chân tay chibi mũm mĩm bọc giáp công nghệ
    - Song đao mini Arc Edge gài bên hông
    """
    mat_list = [
        materials['Skin'],       # 0
        materials['Techsuit'],   # 1
        materials['Armor'],      # 2
        materials['Hair'],       # 3
        materials['Eyes'],       # 4
        materials['CyanGlow'],   # 5
        materials['RedGlow'],    # 6
        materials['Outline'],    # 7
    ]

    mesh_data = bpy.data.meshes.new("Mesh_Astra_Chibi")
    for m in mat_list:
        mesh_data.materials.append(m)

    bm = bmesh.new()

    # Nhóm vertex map với xương
    vgroups = {}
    def track_vgroup(name, verts):
        if name not in vgroups:
            vgroups[name] = []
        for v in verts:
            vgroups[name].append(v)

    # 1. ĐẦU CHIBI (Hình cầu tròn to đáng yêu, Z=0.61, kích thước 0.34 x 0.32 x 0.32m)
    head_verts = add_box(bm, (0.0, 0.0, 0.61), (0.34, 0.32, 0.32), mat_idx=0)
    track_vgroup('Head', head_verts)

    # 2. MẮT ANIME TO TRÒN (Phát sáng Cyan)
    eye_l = add_box(bm, (-0.08, 0.165, 0.61), (0.065, 0.015, 0.07), mat_idx=4)
    eye_r = add_box(bm, ( 0.08, 0.165, 0.61), (0.065, 0.015, 0.07), mat_idx=4)
    track_vgroup('Head', eye_l + eye_r)

    # 3. KÍNH NGẮM CYBER VISOR TRÊN TRÁN
    visor = add_box(bm, (0.0, 0.168, 0.69), (0.24, 0.02, 0.035), mat_idx=5)
    track_vgroup('Head', visor)

    # 4. TÓC ANIME CHIBI (Mái nhọn phía trước + Búi tóc cao phía sau)
    bang_c = add_box(bm, (0.0, 0.17, 0.71), (0.12, 0.03, 0.08), mat_idx=3)
    bang_l = add_box(bm, (-0.14, 0.14, 0.65), (0.08, 0.05, 0.16), mat_idx=3)
    bang_r = add_box(bm, ( 0.14, 0.14, 0.65), (0.08, 0.05, 0.16), mat_idx=3)
    hair_back = add_box(bm, (0.0, -0.15, 0.64), (0.36, 0.10, 0.30), mat_idx=3)
    track_vgroup('Head', bang_c + bang_l + bang_r + hair_back)

    # Đuôi ngựa nhọn bồng bềnh (gắn với xương Ponytail để nhún nhảy)
    ponytail_base = add_cylinder(bm, (0.0, -0.22, 0.66), 0.05, 0.08, 0.12, segments=8, mat_idx=3)
    ponytail_tail = add_cylinder(bm, (0.0, -0.26, 0.54), 0.02, 0.06, 0.16, segments=8, mat_idx=3)
    ponytail_clip = add_box(bm, (0.0, -0.20, 0.71), (0.09, 0.09, 0.05), mat_idx=6)
    track_vgroup('Ponytail', ponytail_base + ponytail_tail + ponytail_clip)

    # 5. CỔ CHIBI NHỎ GỌN (Z=0.45)
    neck_verts = add_cylinder(bm, (0.0, 0.0, 0.45), 0.07, 0.08, 0.05, segments=8, mat_idx=0)
    track_vgroup('Neck', neck_verts)

    # 6. THÂN & GIÁP NGỰC CHIBI (Chest Z=0.38, Pelvis Z=0.28)
    chest_verts = add_box(bm, (0.0, 0.0, 0.38), (0.22, 0.16, 0.12), mat_idx=1)
    breastplate = add_box(bm, (0.0, 0.065, 0.39), (0.18, 0.04, 0.10), mat_idx=2)
    chest_glow = add_box(bm, (0.0, 0.088, 0.39), (0.04, 0.01, 0.04), mat_idx=5)
    track_vgroup('Chest', chest_verts + breastplate + chest_glow)

    pelvis_verts = add_box(bm, (0.0, 0.0, 0.28), (0.20, 0.15, 0.10), mat_idx=1)
    belt = add_box(bm, (0.0, 0.0, 0.32), (0.22, 0.16, 0.03), mat_idx=2)
    track_vgroup('Pelvis', pelvis_verts + belt)

    # 7. TAY TRÁI & PHẢI CHIBI (Gồm Vai, Cánh tay, và Găng giáp)
    # Tay trái (X âm)
    arm_l = add_cylinder(bm, (-0.16, 0.0, 0.36), 0.045, 0.045, 0.12, segments=8, mat_idx=1)
    gauntlet_l = add_box(bm, (-0.17, 0.0, 0.26), (0.08, 0.08, 0.10), mat_idx=2)
    hand_l = add_box(bm, (-0.17, 0.0, 0.18), (0.055, 0.06, 0.06), mat_idx=0)
    track_vgroup('Arm_Upper.L', arm_l)
    track_vgroup('Arm_Lower.L', gauntlet_l + hand_l)

    # Tay phải (X dương)
    arm_r = add_cylinder(bm, (0.16, 0.0, 0.36), 0.045, 0.045, 0.12, segments=8, mat_idx=1)
    gauntlet_r = add_box(bm, (0.17, 0.0, 0.26), (0.08, 0.08, 0.10), mat_idx=2)
    hand_r = add_box(bm, (0.17, 0.0, 0.18), (0.055, 0.06, 0.06), mat_idx=0)
    track_vgroup('Arm_Upper.R', arm_r)
    track_vgroup('Arm_Lower.R', gauntlet_r + hand_r)

    # 8. CHÂN & ỦNG GIÁP CHIBI (Đáng yêu, vững chãi, Z: 0.0 -> 0.24m)
    # Chân trái (X âm)
    thigh_l = add_cylinder(bm, (-0.08, 0.0, 0.19), 0.05, 0.045, 0.09, segments=8, mat_idx=1)
    boot_l = add_cylinder(bm, (-0.08, 0.01, 0.09), 0.06, 0.065, 0.11, segments=8, mat_idx=2)
    foot_l = add_box(bm, (-0.08, 0.04, 0.03), (0.08, 0.12, 0.06), mat_idx=2)
    track_vgroup('Leg_Upper.L', thigh_l)
    track_vgroup('Leg_Lower.L', boot_l + foot_l)

    # Chân phải (X dương)
    thigh_r = add_cylinder(bm, (0.08, 0.0, 0.19), 0.05, 0.045, 0.09, segments=8, mat_idx=1)
    boot_r = add_cylinder(bm, (0.08, 0.01, 0.09), 0.06, 0.065, 0.11, segments=8, mat_idx=2)
    foot_r = add_box(bm, (0.08, 0.04, 0.03), (0.08, 0.12, 0.06), mat_idx=2)
    track_vgroup('Leg_Upper.R', thigh_r)
    track_vgroup('Leg_Lower.R', boot_r + foot_r)

    # 9. VŨ KHÍ MINI: SONG ĐAO ARC EDGE GÀI HÔNG
    blade_l = add_box(bm, (-0.15, -0.05, 0.24), (0.03, 0.16, 0.02), mat_idx=2)
    glow_l = add_box(bm, (-0.15, -0.05, 0.24), (0.01, 0.14, 0.01), mat_idx=6)
    blade_r = add_box(bm, ( 0.15, -0.05, 0.24), (0.03, 0.16, 0.02), mat_idx=2)
    glow_r = add_box(bm, ( 0.15, -0.05, 0.24), (0.01, 0.14, 0.01), mat_idx=6)
    track_vgroup('Pelvis', blade_l + glow_l + blade_r + glow_r)

    # Cache index trước khi bmesh chuyển đổi
    bm.verts.ensure_lookup_table()
    vg_indices = {}
    for gname, vlist in vgroups.items():
        vg_indices[gname] = [v.index for v in vlist if v.is_valid]

    bm.to_mesh(mesh_data)
    bm.free()

    obj = bpy.data.objects.new("Astra_Chibi_Mesh", mesh_data)
    bpy.context.scene.collection.objects.link(obj)

    # Gán vertex groups
    for gname, idx_list in vg_indices.items():
        vg = obj.vertex_groups.new(name=gname)
        vg.add(idx_list, 1.0, 'REPLACE')

    # Modifier Inverted Hull Outline
    mod_outline = obj.modifiers.new(name="Outline_Inverted_Hull", type='SOLIDIFY')
    mod_outline.thickness = -0.006
    mod_outline.offset = 1.0
    mod_outline.use_flip_normals = True
    mod_outline.material_offset = 7
    mod_outline.use_rim = False

    return obj

def build_chibi_armature():
    """Tạo bộ xương Armature chuẩn cho Chibi (18 bones)."""
    arm_data = bpy.data.armatures.new("Armature_Astra_Chibi")
    arm_obj = bpy.data.objects.new("Astra_Chibi_Armature", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='EDIT')

    eb = arm_data.edit_bones

    # 1. Root
    root = eb.new('Root')
    root.head = (0.0, 0.0, 0.0)
    root.tail = (0.0, 0.0, 0.08)

    # 2. Pelvis
    pelvis = eb.new('Pelvis')
    pelvis.head = (0.0, 0.0, 0.24)
    pelvis.tail = (0.0, 0.0, 0.32)
    pelvis.parent = root

    # 3. Chest
    chest = eb.new('Chest')
    chest.head = (0.0, 0.0, 0.32)
    chest.tail = (0.0, 0.0, 0.44)
    chest.parent = pelvis

    # 4. Neck
    neck = eb.new('Neck')
    neck.head = (0.0, 0.0, 0.44)
    neck.tail = (0.0, 0.0, 0.49)
    neck.parent = chest

    # 5. Head
    head = eb.new('Head')
    head.head = (0.0, 0.0, 0.49)
    head.tail = (0.0, 0.0, 0.78)
    head.parent = neck

    # 6. Ponytail (Tóc đuôi ngựa nhún nhảy)
    ponytail = eb.new('Ponytail')
    ponytail.head = (0.0, -0.15, 0.68)
    ponytail.tail = (0.0, -0.30, 0.50)
    ponytail.parent = head

    # 7. Tay trái
    arm_u_l = eb.new('Arm_Upper.L')
    arm_u_l.head = (-0.12, 0.0, 0.42)
    arm_u_l.tail = (-0.17, 0.0, 0.30)
    arm_u_l.parent = chest

    arm_l_l = eb.new('Arm_Lower.L')
    arm_l_l.head = (-0.17, 0.0, 0.30)
    arm_l_l.tail = (-0.17, 0.0, 0.16)
    arm_l_l.parent = arm_u_l

    # 8. Tay phải
    arm_u_r = eb.new('Arm_Upper.R')
    arm_u_r.head = (0.12, 0.0, 0.42)
    arm_u_r.tail = (0.17, 0.0, 0.30)
    arm_u_r.parent = chest

    arm_l_r = eb.new('Arm_Lower.R')
    arm_l_r.head = (0.17, 0.0, 0.30)
    arm_l_r.tail = (0.17, 0.0, 0.16)
    arm_l_r.parent = arm_u_r

    # 9. Chân trái
    leg_u_l = eb.new('Leg_Upper.L')
    leg_u_l.head = (-0.08, 0.0, 0.24)
    leg_u_l.tail = (-0.08, 0.0, 0.12)
    leg_u_l.parent = pelvis

    leg_l_l = eb.new('Leg_Lower.L')
    leg_l_l.head = (-0.08, 0.0, 0.12)
    leg_l_l.tail = (-0.08, 0.02, 0.0)
    leg_l_l.parent = leg_u_l

    # 10. Chân phải
    leg_u_r = eb.new('Leg_Upper.R')
    leg_u_r.head = (0.08, 0.0, 0.24)
    leg_u_r.tail = (0.08, 0.0, 0.12)
    leg_u_r.parent = pelvis

    leg_l_r = eb.new('Leg_Lower.R')
    leg_l_r.head = (0.08, 0.0, 0.12)
    leg_l_r.tail = (0.08, 0.02, 0.0)
    leg_l_r.parent = leg_u_r

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj

def bind_mesh_to_armature(mesh_obj, arm_obj):
    mesh_obj.parent = arm_obj
    mod = mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
    mod.object = arm_obj
    mod.use_vertex_groups = True

def create_action_chibi_idle(arm_obj):
    """Hoạt ảnh Chibi Idle (48 frames): Nhún nhảy dễ thương, đuôi tóc đung đưa."""
    act = bpy.data.actions.new(name="Action_Chibi_Idle")
    act.use_fake_user = True
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    arm_obj.animation_data.action = act

    pb = arm_obj.pose.bones
    for b in pb:
        b.rotation_mode = 'XYZ'

    # Frame 1: Tư thế chuẩn
    pb['Pelvis'].location = (0, 0, 0)
    pb['Head'].rotation_euler = (0, 0, 0)
    pb['Ponytail'].rotation_euler = (0, 0, 0)
    pb['Arm_Upper.L'].rotation_euler = (0, 0, math.radians(12))
    pb['Arm_Upper.R'].rotation_euler = (0, 0, math.radians(-12))
    for name in ['Pelvis', 'Head', 'Ponytail', 'Arm_Upper.L', 'Arm_Upper.R']:
        pb[name].keyframe_insert('location', frame=1)
        pb[name].keyframe_insert('rotation_euler', frame=1)

    # Frame 24: Nhún xuống nhẹ (Squash) + Đuôi tóc vểnh lên
    pb['Pelvis'].location = (0, 0, -0.025)
    pb['Head'].rotation_euler = (math.radians(3), 0, 0)
    pb['Ponytail'].rotation_euler = (math.radians(-12), 0, 0)
    pb['Arm_Upper.L'].rotation_euler = (0, 0, math.radians(18))
    pb['Arm_Upper.R'].rotation_euler = (0, 0, math.radians(-18))
    for name in ['Pelvis', 'Head', 'Ponytail', 'Arm_Upper.L', 'Arm_Upper.R']:
        pb[name].keyframe_insert('location', frame=24)
        pb[name].keyframe_insert('rotation_euler', frame=24)

    # Frame 48: Quay lại Frame 1 (Loop hoàn hảo)
    pb['Pelvis'].location = (0, 0, 0)
    pb['Head'].rotation_euler = (0, 0, 0)
    pb['Ponytail'].rotation_euler = (0, 0, 0)
    pb['Arm_Upper.L'].rotation_euler = (0, 0, math.radians(12))
    pb['Arm_Upper.R'].rotation_euler = (0, 0, math.radians(-12))
    for name in ['Pelvis', 'Head', 'Ponytail', 'Arm_Upper.L', 'Arm_Upper.R']:
        pb[name].keyframe_insert('location', frame=48)
        pb[name].keyframe_insert('rotation_euler', frame=48)

    return act

def create_action_chibi_walk(arm_obj):
    """Hoạt ảnh Chibi Walk (32 frames): Bước đi lạch bạch tự tin khám phá bản đồ."""
    act = bpy.data.actions.new(name="Action_Chibi_Walk")
    act.use_fake_user = True
    arm_obj.animation_data.action = act

    pb = arm_obj.pose.bones
    for b in pb:
        b.rotation_mode = 'XYZ'

    # Frame 1: Chân trái bước tới, chân phải lùi
    pb['Leg_Upper.L'].rotation_euler = (math.radians(-24), 0, 0)
    pb['Leg_Upper.R'].rotation_euler = (math.radians(24), 0, 0)
    pb['Arm_Upper.L'].rotation_euler = (math.radians(20), 0, math.radians(15))
    pb['Arm_Upper.R'].rotation_euler = (math.radians(-20), 0, math.radians(-15))
    pb['Pelvis'].rotation_euler = (0, math.radians(-4), 0)
    pb['Head'].rotation_euler = (0, math.radians(3), 0)
    for name in ['Leg_Upper.L', 'Leg_Upper.R', 'Arm_Upper.L', 'Arm_Upper.R', 'Pelvis', 'Head']:
        pb[name].keyframe_insert('rotation_euler', frame=1)

    # Frame 16: Chân phải bước tới, chân trái lùi
    pb['Leg_Upper.L'].rotation_euler = (math.radians(24), 0, 0)
    pb['Leg_Upper.R'].rotation_euler = (math.radians(-24), 0, 0)
    pb['Arm_Upper.L'].rotation_euler = (math.radians(-20), 0, math.radians(15))
    pb['Arm_Upper.R'].rotation_euler = (math.radians(20), 0, math.radians(-15))
    pb['Pelvis'].rotation_euler = (0, math.radians(4), 0)
    pb['Head'].rotation_euler = (0, math.radians(-3), 0)
    for name in ['Leg_Upper.L', 'Leg_Upper.R', 'Arm_Upper.L', 'Arm_Upper.R', 'Pelvis', 'Head']:
        pb[name].keyframe_insert('rotation_euler', frame=16)

    # Frame 32: Trở về frame 1
    pb['Leg_Upper.L'].rotation_euler = (math.radians(-24), 0, 0)
    pb['Leg_Upper.R'].rotation_euler = (math.radians(24), 0, 0)
    pb['Arm_Upper.L'].rotation_euler = (math.radians(20), 0, math.radians(15))
    pb['Arm_Upper.R'].rotation_euler = (math.radians(-20), 0, math.radians(-15))
    pb['Pelvis'].rotation_euler = (0, math.radians(-4), 0)
    pb['Head'].rotation_euler = (0, math.radians(3), 0)
    for name in ['Leg_Upper.L', 'Leg_Upper.R', 'Arm_Upper.L', 'Arm_Upper.R', 'Pelvis', 'Head']:
        pb[name].keyframe_insert('rotation_euler', frame=32)

    return act

def setup_lights_and_camera():
    # Điểm ngắm ở trọng tâm thân và đầu nhân vật (0, 0, 0.48)
    target = bpy.data.objects.new("Cam_Target", None)
    bpy.context.scene.collection.objects.link(target)
    target.location = (0.0, 0.0, 0.48)

    # Camera góc 3/4 chính diện mặt (+Y)
    cam_data = bpy.data.cameras.new("Chibi_Preview_Cam")
    cam_data.lens = 50
    cam_obj = bpy.data.objects.new("Chibi_Preview_Cam", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    cam_obj.location = (-0.5, 1.4, 0.65)

    track = cam_obj.constraints.new(type='TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    bpy.context.scene.camera = cam_obj

    # Đèn Key Light (Sun) chiếu từ phía trước mặt xuống
    sun_data = bpy.data.lights.new(name="Sun_Key", type='SUN')
    sun_data.energy = 4.5
    sun_data.color = (1.0, 0.98, 0.95)
    sun_obj = bpy.data.objects.new("Sun_Key", sun_data)
    bpy.context.scene.collection.objects.link(sun_obj)
    sun_obj.location = (-1.0, 2.0, 2.0)
    track_sun = sun_obj.constraints.new(type='TRACK_TO')
    track_sun.target = target
    track_sun.track_axis = 'TRACK_NEGATIVE_Z'
    track_sun.up_axis = 'UP_Y'

    # Đèn Fill Light (Tím pastel nhẹ)
    fill_data = bpy.data.lights.new(name="Fill_Soft", type='POINT')
    fill_data.energy = 60.0
    fill_data.color = (0.9, 0.85, 1.0)
    fill_obj = bpy.data.objects.new("Fill_Soft", fill_data)
    bpy.context.scene.collection.objects.link(fill_obj)
    fill_obj.location = (1.2, 1.0, 0.6)

    # Đèn Rim Light (Cyan Neon PGR) phía sau lưng
    rim_data = bpy.data.lights.new(name="Rim_Cyan", type='POINT')
    rim_data.energy = 120.0
    rim_data.color = (0.0, 0.9, 1.0)
    rim_obj = bpy.data.objects.new("Rim_Cyan", rim_data)
    bpy.context.scene.collection.objects.link(rim_obj)
    rim_obj.location = (0.0, -1.2, 0.8)

def main():
    print("[1/6] Resetting Blender scene...")
    reset_scene()

    print("[2/6] Building Cel-Shading NPR materials...")
    materials = build_materials()

    print("[3/6] Generating Astra Chibi SD Mesh (1:2.5 ratio)...")
    mesh_obj = build_chibi_mesh(materials)

    print("[4/6] Creating Armature Rig (18 bones)...")
    arm_obj = build_chibi_armature()
    bind_mesh_to_armature(mesh_obj, arm_obj)

    print("[5/6] Generating Actions (Chibi Idle & Chibi Walk)...")
    create_action_chibi_idle(arm_obj)
    create_action_chibi_walk(arm_obj)

    setup_lights_and_camera()

    # Lưu file .blend
    blend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Content", "Blender"))
    os.makedirs(blend_dir, exist_ok=True)
    blend_path = os.path.join(blend_dir, "Astra_Chibi_Model.blend")
    print(f"Saving .blend file to {blend_path}...")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    # Render ảnh preview
    preview_path = os.path.join(blend_dir, "Astra_Chibi_Preview_01.png")
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.filepath = preview_path
    bpy.context.scene.render.resolution_x = 1024
    bpy.context.scene.render.resolution_y = 1024
    print(f"Rendering preview image to {preview_path}...")
    bpy.ops.render.render(write_still=True)
    print("✅ HOÀN TẤT TẠO ASTRA CHIBI MODEL!")

if __name__ == "__main__":
    main()

"""
=============================================================================
create_pgr_model.py
Tạo model 3D nhân vật Astra (Striker - Phong cách Punishing: Gray Raven)
chuẩn NPR Cel-Shading, khung xương Armature, vật liệu Outline Inverted Hull,
và 2 Action Animations (Idle & Attack Slash) hoàn chỉnh trong Blender 5.2.
=============================================================================
"""

import bpy
import bmesh
import math
import os
from mathutils import Vector, Euler, Matrix

def reset_scene():
    """Xóa sạch scene mặc định (Cube, Light, Camera mặc định)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Tạo collection chính
    if "Astra_PGR_Character" not in bpy.data.collections:
        col = bpy.data.collections.new("Astra_PGR_Character")
        bpy.context.scene.collection.children.link(col)
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children["Astra_PGR_Character"]

def create_cel_material(name, base_color, shadow_color, is_emissive=False, emit_strength=2.0):
    """
    Tạo vật liệu NPR Cel-Shading 2-tone chuẩn phong cách anime / PGR:
    Diffuse BSDF -> Shader to RGB -> ColorRamp (Constant) -> Mix with Rim -> Material Output
    """
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    tree = mat.node_tree
    nodes = tree.nodes
    links = tree.links
    nodes.clear()

    # Output node
    node_out = nodes.new('ShaderNodeOutputMaterial')
    node_out.location = (600, 0)

    if is_emissive:
        # Vật liệu phát sáng (Plasma blade, Eye glow, LED accents)
        node_emit = nodes.new('ShaderNodeEmission')
        node_emit.location = (300, 0)
        node_emit.inputs['Color'].default_value = base_color
        node_emit.inputs['Strength'].default_value = emit_strength
        links.new(node_emit.outputs['Emission'], node_out.inputs['Surface'])
        return mat

    # Diffuse BSDF nhận ánh sáng trong scene
    node_diff = nodes.new('ShaderNodeBsdfDiffuse')
    node_diff.location = (-400, 0)
    node_diff.inputs['Color'].default_value = (1, 1, 1, 1)

    # Shader to RGB (chuyển đổi dữ liệu ánh sáng thành vector màu để cắt lớp anime)
    node_s2rgb = nodes.new('ShaderNodeShaderToRGB')
    node_s2rgb.location = (-180, 0)
    links.new(node_diff.outputs['BSDF'], node_s2rgb.inputs['Shader'])

    # ColorRamp tạo ranh giới đổ bóng cứng (Hard Edge Anime Shadow)
    node_ramp = nodes.new('ShaderNodeValToRGB')
    node_ramp.location = (60, 0)
    node_ramp.color_ramp.interpolation = 'CONSTANT'
    # Điểm 0: Màu bóng tối
    node_ramp.color_ramp.elements[0].position = 0.0
    node_ramp.color_ramp.elements[0].color = shadow_color
    # Điểm 1: Màu ánh sáng chính
    if len(node_ramp.color_ramp.elements) < 2:
        node_ramp.color_ramp.elements.new(0.48)
    else:
        node_ramp.color_ramp.elements[1].position = 0.48
    node_ramp.color_ramp.elements[1].color = base_color

    links.new(node_s2rgb.outputs['Color'], node_ramp.inputs['Fac'])
    links.new(node_ramp.outputs['Color'], node_out.inputs['Surface'])

    return mat

def create_outline_material():
    """Vật liệu vẽ viền nét mực anime (Inverted Hull Outline)."""
    mat = bpy.data.materials.new(name="M_Astra_Outline")
    mat.use_nodes = True
    tree = mat.node_tree
    nodes = tree.nodes
    links = tree.links
    nodes.clear()

    node_out = nodes.new('ShaderNodeOutputMaterial')
    node_out.location = (300, 0)
    node_emit = nodes.new('ShaderNodeEmission')
    node_emit.location = (0, 0)
    # Màu viền: Đen than chì hơi ánh tím cyberpunk
    node_emit.inputs['Color'].default_value = (0.04, 0.04, 0.07, 1.0)
    node_emit.inputs['Strength'].default_value = 1.0
    links.new(node_emit.outputs['Emission'], node_out.inputs['Surface'])

    # Bật Backface Culling trên material
    try:
        mat.use_backface_culling = True
    except Exception:
        pass
    return mat

def build_materials():
    """Tạo bộ bảng màu chuẩn PGR cho Astra."""
    mats = {}
    # 1. Da anime (Astra Peach Skin)
    mats['skin'] = create_cel_material(
        "M_Astra_Skin",
        base_color=(0.98, 0.86, 0.82, 1.0),
        shadow_color=(0.88, 0.70, 0.68, 1.0)
    )
    # 2. Giáp đen nhám PGR (Charcoal Carbon Armor)
    mats['armor'] = create_cel_material(
        "M_Astra_Armor",
        base_color=(0.12, 0.13, 0.16, 1.0),
        shadow_color=(0.05, 0.05, 0.08, 1.0)
    )
    # 3. Đồ bó kỹ thuật Techwear Trắng Bạc (Silver Techsuit)
    mats['suit'] = create_cel_material(
        "M_Astra_Techsuit",
        base_color=(0.82, 0.85, 0.90, 1.0),
        shadow_color=(0.48, 0.52, 0.60, 1.0)
    )
    # 4. Tóc anime (Dark Midnight Violet-Blue Hair)
    mats['hair'] = create_cel_material(
        "M_Astra_Hair",
        base_color=(0.14, 0.16, 0.26, 1.0),
        shadow_color=(0.06, 0.07, 0.14, 1.0)
    )
    # 5. Đèn LED / Mắt / Lưỡi kiếm Plasma (Cyan Neon Energy)
    mats['glow_cyan'] = create_cel_material(
        "M_Astra_CyanGlow",
        base_color=(0.0, 0.85, 1.0, 1.0),
        shadow_color=(0.0, 0.4, 0.6, 1.0),
        is_emissive=True,
        emit_strength=4.5
    )
    # 6. Đèn báo động Đỏ Crimson (Crimson Accent LED)
    mats['glow_red'] = create_cel_material(
        "M_Astra_RedGlow",
        base_color=(1.0, 0.12, 0.28, 1.0),
        shadow_color=(0.5, 0.05, 0.1, 1.0),
        is_emissive=True,
        emit_strength=3.5
    )
    # 7. Viền mực Outline
    mats['outline'] = create_outline_material()

    return mats

def add_box(bm, center, size, mat_idx=0):
    """Hàm trợ giúp dựng khối hộp trong bmesh kèm gán material index."""
    sx, sy, sz = size[0]*0.5, size[1]*0.5, size[2]*0.5
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
    faces_idx = [
        (0, 1, 2, 3), # Bottom
        (4, 7, 6, 5), # Top
        (0, 4, 5, 1), # Front
        (2, 6, 7, 3), # Back
        (0, 3, 7, 4), # Left
        (1, 5, 6, 2), # Right
    ]
    created_faces = []
    for f in faces_idx:
        face = bm.faces.new([verts[i] for i in f])
        face.material_index = mat_idx
        created_faces.append(face)
    return verts, created_faces

def add_cylinder(bm, center, r_top, r_bot, height, segments=12, mat_idx=0):
    """Hàm trợ giúp dựng hình trụ / nón cụt cho chi tiết tay chân."""
    cx, cy, cz = center
    half_h = height * 0.5
    bot_verts = []
    top_verts = []
    for i in range(segments):
        ang = (2 * math.pi * i) / segments
        bx = cx + r_bot * math.cos(ang)
        by = cy + r_bot * math.sin(ang)
        bot_verts.append(bm.verts.new((bx, by, cz - half_h)))

        tx = cx + r_top * math.cos(ang)
        ty = cy + r_top * math.sin(ang)
        top_verts.append(bm.verts.new((tx, ty, cz + half_h)))

    # Sides
    for i in range(segments):
        nxt = (i + 1) % segments
        f = bm.faces.new([bot_verts[i], bot_verts[nxt], top_verts[nxt], top_verts[i]])
        f.material_index = mat_idx

    # Caps
    f_bot = bm.faces.new(list(reversed(bot_verts)))
    f_bot.material_index = mat_idx
    f_top = bm.faces.new(top_verts)
    f_top.material_index = mat_idx

    all_verts = bot_verts + top_verts
    return all_verts

def build_character_mesh(materials):
    """
    Xây dựng toàn bộ hình học 3D nhân vật Astra phong cách PGR:
    Đầu, Tóc nhọn, Áo techwear, Giáp ngực, Cổ áo cao, Đai lưng, Bao tay,
    Bốt cao gót bọc giáp gối, và Cặp kiếm Plasma 'Arc Edge'.
    Đồng thời phân nhóm đỉnh (Vertex Groups) tương ứng cho các xương Armature.
    """
    mesh = bpy.data.meshes.new("Astra_Mesh")
    obj = bpy.data.objects.new("Astra_Character", mesh)
    bpy.context.collection.objects.link(obj)

    # Đăng ký material slots
    mat_keys = ['skin', 'armor', 'suit', 'hair', 'glow_cyan', 'glow_red', 'outline']
    for k in mat_keys:
        obj.data.materials.append(materials[k])

    IDX_SKIN = mat_keys.index('skin')
    IDX_ARMOR = mat_keys.index('armor')
    IDX_SUIT = mat_keys.index('suit')
    IDX_HAIR = mat_keys.index('hair')
    IDX_CYAN = mat_keys.index('glow_cyan')
    IDX_RED = mat_keys.index('glow_red')
    IDX_OUTLINE = mat_keys.index('outline')

    bm = bmesh.new()

    # Lưu danh sách đỉnh để gán Vertex Group
    vgroups = {
        'Head': [],
        'Ponytail': [],
        'Neck': [],
        'Chest': [],
        'Spine': [],
        'Pelvis': [],
        'UpperArm.L': [],
        'Forearm.L': [],
        'Hand.L': [],
        'Blade.L': [],
        'UpperArm.R': [],
        'Forearm.R': [],
        'Hand.R': [],
        'Blade.R': [],
        'Thigh.L': [],
        'Calf.L': [],
        'Foot.L': [],
        'Thigh.R': [],
        'Calf.R': [],
        'Foot.R': [],
    }

    # ---------------- 1. ĐẦU & MẶT ANIME (z: 1.48 -> 1.72) ----------------
    # Hộp sọ / Khuôn mặt V-line anime
    head_verts, _ = add_box(bm, (0, 0.01, 1.60), (0.17, 0.18, 0.20), mat_idx=IDX_SKIN)
    # Tinh chỉnh cằm nhọn anime
    for v in head_verts:
        if v.co.z < 1.55 and v.co.y < 0.05:
            v.co.x *= 0.65
            v.co.y += 0.02
    vgroups['Head'].extend(head_verts)

    # Mắt Anime (Cyber Optic Sensors với màu phát sáng Cyan)
    eye_l, _ = add_box(bm, (0.045, -0.082, 1.60), (0.035, 0.01, 0.025), mat_idx=IDX_CYAN)
    eye_r, _ = add_box(bm, (-0.045, -0.082, 1.60), (0.035, 0.01, 0.025), mat_idx=IDX_CYAN)
    vgroups['Head'].extend(eye_l + eye_r)

    # Tai nghe / Bộ tiếp nhận tín hiệu tai kiểu PGR (Audio Sensors)
    headset_l, _ = add_box(bm, (0.095, -0.01, 1.60), (0.02, 0.045, 0.06), mat_idx=IDX_ARMOR)
    headset_r, _ = add_box(bm, (-0.095, -0.01, 1.60), (0.02, 0.045, 0.06), mat_idx=IDX_ARMOR)
    led_ear_l, _ = add_box(bm, (0.106, -0.01, 1.60), (0.005, 0.02, 0.02), mat_idx=IDX_RED)
    led_ear_r, _ = add_box(bm, (-0.106, -0.01, 1.60), (0.005, 0.02, 0.02), mat_idx=IDX_RED)
    vgroups['Head'].extend(headset_l + headset_r + led_ear_l + led_ear_r)

    # ---------------- 2. TÓC ANIME NHỌN & ĐUÔI NGỰA (HAIR & PONYTAIL) ----------------
    # Tóc mái trước (Bangs)
    bangs_verts, _ = add_box(bm, (0, -0.08, 1.68), (0.19, 0.03, 0.07), mat_idx=IDX_HAIR)
    for v in bangs_verts:
        if v.co.z < 1.66:
            v.co.y -= 0.02
    vgroups['Head'].extend(bangs_verts)

    # Lọn tóc mai hai bên ôm má (Side Tufts)
    tuft_l, _ = add_box(bm, (0.095, -0.04, 1.54), (0.025, 0.04, 0.16), mat_idx=IDX_HAIR)
    tuft_r, _ = add_box(bm, (-0.095, -0.04, 1.54), (0.025, 0.04, 0.16), mat_idx=IDX_HAIR)
    vgroups['Head'].extend(tuft_l + tuft_r)

    # Đuôi ngựa nhọn phía sau (High Tech Ponytail)
    pony_base, _ = add_box(bm, (0, 0.10, 1.67), (0.05, 0.05, 0.05), mat_idx=IDX_ARMOR)
    pony_top, _ = add_box(bm, (0, 0.16, 1.60), (0.07, 0.07, 0.14), mat_idx=IDX_HAIR)
    pony_tip, _ = add_box(bm, (0, 0.22, 1.48), (0.05, 0.05, 0.14), mat_idx=IDX_HAIR)
    vgroups['Head'].extend(pony_base)
    vgroups['Ponytail'].extend(pony_top + pony_tip)

    # ---------------- 3. CỔ & CỔ ÁO TACTICAL (z: 1.44 -> 1.50) ----------------
    neck_verts = add_cylinder(bm, (0, 0.01, 1.47), r_top=0.045, r_bot=0.052, height=0.07, segments=10, mat_idx=IDX_SKIN)
    collar_verts, _ = add_box(bm, (0, -0.01, 1.46), (0.13, 0.13, 0.06), mat_idx=IDX_ARMOR)
    vgroups['Neck'].extend(neck_verts + collar_verts)

    # ---------------- 4. NGỰC & GIÁP NGỰC TACTICAL (z: 1.25 -> 1.44) ----------------
    # Thân trên áo bodysuit
    chest_verts, _ = add_box(bm, (0, 0.01, 1.35), (0.24, 0.16, 0.17), mat_idx=IDX_SUIT)
    # Giáp ngực đúc cacbon (Chestplate)
    cuirass_verts, _ = add_box(bm, (0, -0.075, 1.36), (0.21, 0.035, 0.13), mat_idx=IDX_ARMOR)
    # Vạch năng lượng phát sáng trên ngực
    cuirass_led, _ = add_box(bm, (0, -0.093, 1.36), (0.08, 0.008, 0.02), mat_idx=IDX_CYAN)
    vgroups['Chest'].extend(chest_verts + cuirass_verts + cuirass_led)

    # ---------------- 5. EO & LƯNG (SPINE - z: 1.12 -> 1.26) ----------------
    spine_verts, _ = add_box(bm, (0, 0.01, 1.19), (0.19, 0.14, 0.14), mat_idx=IDX_SUIT)
    spine_armor, _ = add_box(bm, (0, 0.08, 1.19), (0.07, 0.02, 0.12), mat_idx=IDX_ARMOR)
    vgroups['Spine'].extend(spine_verts + spine_armor)

    # ---------------- 6. HÔNG, ĐAI LƯNG & TÚI CHIẾN THUẬT (PELVIS - z: 0.98 -> 1.13) ----------------
    pelvis_verts, _ = add_box(bm, (0, 0.01, 1.05), (0.23, 0.16, 0.14), mat_idx=IDX_ARMOR)
    # Đai thắt lưng & túi đồ chiến thuật bên hông
    belt_pouch_l, _ = add_box(bm, (0.135, 0.0, 1.05), (0.05, 0.08, 0.08), mat_idx=IDX_ARMOR)
    belt_pouch_r, _ = add_box(bm, (-0.135, 0.0, 1.05), (0.05, 0.08, 0.08), mat_idx=IDX_ARMOR)
    belt_led_l, _ = add_box(bm, (0.161, 0.0, 1.05), (0.005, 0.03, 0.03), mat_idx=IDX_CYAN)
    belt_led_r, _ = add_box(bm, (-0.161, 0.0, 1.05), (0.005, 0.03, 0.03), mat_idx=IDX_CYAN)
    vgroups['Pelvis'].extend(pelvis_verts + belt_pouch_l + belt_pouch_r + belt_led_l + belt_led_r)

    # ---------------- 7. TAY TRÁI (LEFT ARM) & TAY PHẢI (RIGHT ARM) ----------------
    # Bắp tay trái / phải (UpperArm)
    uarm_l = add_cylinder(bm, (0.17, 0.01, 1.30), r_top=0.042, r_bot=0.036, height=0.20, segments=8, mat_idx=IDX_SUIT)
    uarm_r = add_cylinder(bm, (-0.17, 0.01, 1.30), r_top=0.042, r_bot=0.036, height=0.20, segments=8, mat_idx=IDX_SUIT)
    vgroups['UpperArm.L'].extend(uarm_l)
    vgroups['UpperArm.R'].extend(uarm_r)

    # Cẳng tay trái / phải bọc giáp gauntlet (Forearm)
    farm_l = add_cylinder(bm, (0.18, -0.01, 1.08), r_top=0.042, r_bot=0.034, height=0.21, segments=8, mat_idx=IDX_ARMOR)
    farm_r = add_cylinder(bm, (-0.18, -0.01, 1.08), r_top=0.042, r_bot=0.034, height=0.21, segments=8, mat_idx=IDX_ARMOR)
    farm_led_l, _ = add_box(bm, (0.22, -0.01, 1.08), (0.008, 0.02, 0.12), mat_idx=IDX_CYAN)
    farm_led_r, _ = add_box(bm, (-0.22, -0.01, 1.08), (0.008, 0.02, 0.12), mat_idx=IDX_CYAN)
    vgroups['Forearm.L'].extend(farm_l + farm_led_l)
    vgroups['Forearm.R'].extend(farm_r + farm_led_r)

    # Bàn tay nắm đấm / găng tay (Hands)
    hand_l, _ = add_box(bm, (0.18, -0.02, 0.94), (0.04, 0.05, 0.06), mat_idx=IDX_ARMOR)
    hand_r, _ = add_box(bm, (-0.18, -0.02, 0.94), (0.04, 0.05, 0.06), mat_idx=IDX_ARMOR)
    vgroups['Hand.L'].extend(hand_l)
    vgroups['Hand.R'].extend(hand_r)

    # ---------------- 8. VŨ KHÍ: CẶP KIẾM PLASMA 'ARC EDGE' (DUAL BLADES) ----------------
    # Kiếm trái (Hand.L)
    hilt_l, _ = add_box(bm, (0.18, -0.02, 0.94), (0.022, 0.025, 0.16), mat_idx=IDX_ARMOR)
    guard_l, _ = add_box(bm, (0.18, -0.02, 1.03), (0.05, 0.05, 0.02), mat_idx=IDX_RED)
    blade_spine_l, _ = add_box(bm, (0.18, -0.02, 1.38), (0.012, 0.022, 0.68), mat_idx=IDX_ARMOR)
    blade_edge_l, _ = add_box(bm, (0.18, -0.032, 1.38), (0.006, 0.010, 0.68), mat_idx=IDX_CYAN)
    vgroups['Blade.L'].extend(hilt_l + guard_l + blade_spine_l + blade_edge_l)

    # Kiếm phải (Hand.R)
    hilt_r, _ = add_box(bm, (-0.18, -0.02, 0.94), (0.022, 0.025, 0.16), mat_idx=IDX_ARMOR)
    guard_r, _ = add_box(bm, (-0.18, -0.02, 1.03), (0.05, 0.05, 0.02), mat_idx=IDX_RED)
    blade_spine_r, _ = add_box(bm, (-0.18, -0.02, 1.38), (0.012, 0.022, 0.68), mat_idx=IDX_ARMOR)
    blade_edge_r, _ = add_box(bm, (-0.18, -0.032, 1.38), (0.006, 0.010, 0.68), mat_idx=IDX_CYAN)
    vgroups['Blade.R'].extend(hilt_r + guard_r + blade_spine_r + blade_edge_r)

    # ---------------- 9. ĐÙI & CHÂN (THIGHS - z: 0.52 -> 0.98) ----------------
    thigh_l = add_cylinder(bm, (0.09, 0.01, 0.74), r_top=0.065, r_bot=0.052, height=0.44, segments=10, mat_idx=IDX_SKIN)
    thigh_r = add_cylinder(bm, (-0.09, 0.01, 0.74), r_top=0.065, r_bot=0.052, height=0.44, segments=10, mat_idx=IDX_SKIN)
    vgroups['Thigh.L'].extend(thigh_l)
    vgroups['Thigh.R'].extend(thigh_r)

    # ---------------- 10. BỐT CAO CỔ & BẢO VỆ GỐI (CALVES & BOOTS - z: 0.10 -> 0.52) ----------------
    calf_l = add_cylinder(bm, (0.09, 0.01, 0.32), r_top=0.058, r_bot=0.045, height=0.40, segments=10, mat_idx=IDX_ARMOR)
    calf_r = add_cylinder(bm, (-0.09, 0.01, 0.32), r_top=0.058, r_bot=0.045, height=0.40, segments=10, mat_idx=IDX_ARMOR)
    # Giáp gối nhọn (Knee Guard)
    knee_l, _ = add_box(bm, (0.09, -0.05, 0.52), (0.06, 0.03, 0.06), mat_idx=IDX_ARMOR)
    knee_r, _ = add_box(bm, (-0.09, -0.05, 0.52), (0.06, 0.03, 0.06), mat_idx=IDX_ARMOR)
    vgroups['Calf.L'].extend(calf_l + knee_l)
    vgroups['Calf.R'].extend(calf_r + knee_r)

    # ---------------- 11. BÀN CHÂN & GÓT BỐT (FEET - z: 0.00 -> 0.10) ----------------
    foot_l, _ = add_box(bm, (0.09, -0.04, 0.05), (0.06, 0.16, 0.08), mat_idx=IDX_ARMOR)
    foot_r, _ = add_box(bm, (-0.09, -0.04, 0.05), (0.06, 0.16, 0.08), mat_idx=IDX_ARMOR)
    vgroups['Foot.L'].extend(foot_l)
    vgroups['Foot.R'].extend(foot_r)

    # Lấy chỉ số đỉnh trước khi giải phóng bmesh
    bm.verts.ensure_lookup_table()
    vgroup_indices = {}
    for group_name, verts_list in vgroups.items():
        vgroup_indices[group_name] = [v.index for v in verts_list]

    # Đưa bmesh vào Mesh Object
    bm.to_mesh(mesh)
    bm.free()

    # Tạo các Vertex Group và gán chỉ số đỉnh
    for group_name, idx_list in vgroup_indices.items():
        vg = obj.vertex_groups.new(name=group_name)
        if idx_list:
            vg.add(idx_list, 1.0, 'REPLACE')

    # Bật bóng mịn mượt (Auto Smooth Normals)
    mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))

    # Thêm Solidify Modifier để tạo đường viền Anime Outline (Inverted Hull)
    solid_mod = obj.modifiers.new(name="Anime_Outline", type='SOLIDIFY')
    solid_mod.thickness = -0.006
    solid_mod.offset = 1.0
    solid_mod.material_offset = IDX_OUTLINE
    solid_mod.use_flip_normals = True
    solid_mod.use_rim = False

    return obj

def build_armature():
    """
    Tạo bộ khung xương Armature chuẩn cho Astra:
    Root -> Pelvis -> Spine -> Chest -> Neck -> Head -> Ponytail
    Đồng thời phân nhánh cánh tay và hai chân đầy đủ.
    """
    arm_data = bpy.data.armatures.new("Astra_Skeleton")
    arm_obj = bpy.data.objects.new("Astra_Armature", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj

    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm_data.edit_bones

    # 1. Root
    root = edit_bones.new("Root")
    root.head = (0, 0, 0)
    root.tail = (0, 0, 0.15)

    # 2. Pelvis / Hips
    pelvis = edit_bones.new("Pelvis")
    pelvis.head = (0, 0, 1.02)
    pelvis.tail = (0, 0, 1.15)
    pelvis.parent = root

    # 3. Spine
    spine = edit_bones.new("Spine")
    spine.head = (0, 0, 1.15)
    spine.tail = (0, 0, 1.28)
    spine.parent = pelvis

    # 4. Chest
    chest = edit_bones.new("Chest")
    chest.head = (0, 0, 1.28)
    chest.tail = (0, 0, 1.45)
    chest.parent = spine

    # 5. Neck
    neck = edit_bones.new("Neck")
    neck.head = (0, 0, 1.45)
    neck.tail = (0, 0, 1.52)
    neck.parent = chest

    # 6. Head
    head = edit_bones.new("Head")
    head.head = (0, 0, 1.52)
    head.tail = (0, 0, 1.72)
    head.parent = neck

    # 7. Ponytail
    pony = edit_bones.new("Ponytail")
    pony.head = (0, 0.10, 1.66)
    pony.tail = (0, 0.26, 1.46)
    pony.parent = head

    # 8. Cánh tay trái (.L)
    uarm_l = edit_bones.new("UpperArm.L")
    uarm_l.head = (0.16, 0.01, 1.40)
    uarm_l.tail = (0.17, 0.01, 1.20)
    uarm_l.parent = chest

    farm_l = edit_bones.new("Forearm.L")
    farm_l.head = (0.17, 0.01, 1.20)
    farm_l.tail = (0.18, -0.01, 0.98)
    farm_l.parent = uarm_l

    hand_l = edit_bones.new("Hand.L")
    hand_l.head = (0.18, -0.01, 0.98)
    hand_l.tail = (0.18, -0.02, 0.92)
    hand_l.parent = farm_l

    blade_l = edit_bones.new("Blade.L")
    blade_l.head = (0.18, -0.02, 0.92)
    blade_l.tail = (0.18, -0.02, 1.50)
    blade_l.parent = hand_l

    # 9. Cánh tay phải (.R)
    uarm_r = edit_bones.new("UpperArm.R")
    uarm_r.head = (-0.16, 0.01, 1.40)
    uarm_r.tail = (-0.17, 0.01, 1.20)
    uarm_r.parent = chest

    farm_r = edit_bones.new("Forearm.R")
    farm_r.head = (-0.17, 0.01, 1.20)
    farm_r.tail = (-0.18, -0.01, 0.98)
    farm_r.parent = uarm_r

    hand_r = edit_bones.new("Hand.R")
    hand_r.head = (-0.18, -0.01, 0.98)
    hand_r.tail = (-0.18, -0.02, 0.92)
    hand_r.parent = farm_r

    blade_r = edit_bones.new("Blade.R")
    blade_r.head = (-0.18, -0.02, 0.92)
    blade_r.tail = (-0.18, -0.02, 1.50)
    blade_r.parent = hand_r

    # 10. Chân trái (.L)
    thigh_l = edit_bones.new("Thigh.L")
    thigh_l.head = (0.09, 0.01, 1.02)
    thigh_l.tail = (0.09, 0.01, 0.54)
    thigh_l.parent = pelvis

    calf_l = edit_bones.new("Calf.L")
    calf_l.head = (0.09, 0.01, 0.54)
    calf_l.tail = (0.09, 0.01, 0.10)
    calf_l.parent = thigh_l

    foot_l = edit_bones.new("Foot.L")
    foot_l.head = (0.09, 0.01, 0.10)
    foot_l.tail = (0.09, -0.10, 0.02)
    foot_l.parent = calf_l

    # 11. Chân phải (.R)
    thigh_r = edit_bones.new("Thigh.R")
    thigh_r.head = (-0.09, 0.01, 1.02)
    thigh_r.tail = (-0.09, 0.01, 0.54)
    thigh_r.parent = pelvis

    calf_r = edit_bones.new("Calf.R")
    calf_r.head = (-0.09, 0.01, 0.54)
    calf_r.tail = (-0.09, 0.01, 0.10)
    calf_r.parent = thigh_r

    foot_r = edit_bones.new("Foot.R")
    foot_r.head = (-0.09, 0.01, 0.10)
    foot_r.tail = (-0.09, -0.10, 0.02)
    foot_r.parent = calf_r

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj

def bind_mesh_to_armature(mesh_obj, arm_obj):
    """Gán Armature Modifier cho Mesh để xương biến dạng hình học."""
    arm_mod = mesh_obj.modifiers.new(name="Astra_Rig_Deform", type='ARMATURE')
    arm_mod.object = arm_obj
    mesh_obj.parent = arm_obj

def create_action_idle(arm_obj):
    """
    Tạo Action 'Action_Idle' (60 frame loop @ 30 FPS):
    - Hông nhấp nhô nhịp thở tinh tế
    - Ngực ưỡn nhẹ
    - Tay cầm song kiếm sẵn sàng chiến đấu
    - Đuôi ngựa đung đưa theo quán tính
    """
    arm_obj.animation_data_create()
    action = bpy.data.actions.new(name="Action_Idle")
    action.use_fake_user = True
    arm_obj.animation_data.action = action

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    # Cài đặt chế độ xoay Euler XYZ cho tất cả xương
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = 'XYZ'

    pb_pelvis = arm_obj.pose.bones['Pelvis']
    pb_chest = arm_obj.pose.bones['Chest']
    pb_pony = arm_obj.pose.bones['Ponytail']
    pb_farm_l = arm_obj.pose.bones['Forearm.L']
    pb_farm_r = arm_obj.pose.bones['Forearm.R']

    # Frame 1: Tư thế chuẩn bị (Ready Stance)
    bpy.context.scene.frame_set(1)
    pb_pelvis.location = (0, 0, 0)
    pb_pelvis.rotation_euler = (math.radians(2), 0, 0)
    pb_chest.rotation_euler = (math.radians(-1), 0, 0)
    pb_pony.rotation_euler = (math.radians(5), 0, 0)
    pb_farm_l.rotation_euler = (math.radians(18), math.radians(-12), 0)
    pb_farm_r.rotation_euler = (math.radians(18), math.radians(12), 0)

    for pb in [pb_pelvis, pb_chest, pb_pony, pb_farm_l, pb_farm_r]:
        pb.keyframe_insert(data_path="location", frame=1)
        pb.keyframe_insert(data_path="rotation_euler", frame=1)

    # Frame 30: Đỉnh điểm thở hít vào (Inhale peak)
    bpy.context.scene.frame_set(30)
    pb_pelvis.location = (0, 0, 0.015)
    pb_pelvis.rotation_euler = (math.radians(0), 0, 0)
    pb_chest.rotation_euler = (math.radians(3), 0, 0)
    pb_pony.rotation_euler = (math.radians(-6), 0, 0)
    pb_farm_l.rotation_euler = (math.radians(22), math.radians(-14), 0)
    pb_farm_r.rotation_euler = (math.radians(22), math.radians(14), 0)

    for pb in [pb_pelvis, pb_chest, pb_pony, pb_farm_l, pb_farm_r]:
        pb.keyframe_insert(data_path="location", frame=30)
        pb.keyframe_insert(data_path="rotation_euler", frame=30)

    # Frame 60: Quay về Frame 1 để tạo vòng lặp hoàn hảo (Loop)
    bpy.context.scene.frame_set(60)
    pb_pelvis.location = (0, 0, 0)
    pb_pelvis.rotation_euler = (math.radians(2), 0, 0)
    pb_chest.rotation_euler = (math.radians(-1), 0, 0)
    pb_pony.rotation_euler = (math.radians(5), 0, 0)
    pb_farm_l.rotation_euler = (math.radians(18), math.radians(-12), 0)
    pb_farm_r.rotation_euler = (math.radians(18), math.radians(12), 0)

    for pb in [pb_pelvis, pb_chest, pb_pony, pb_farm_l, pb_farm_r]:
        pb.keyframe_insert(data_path="location", frame=60)
        pb.keyframe_insert(data_path="rotation_euler", frame=60)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action

def create_action_attack(arm_obj):
    """
    Tạo Action 'Action_Attack' (36 frames @ 30 FPS):
    - Đòn song kiếm chém chữ X thần tốc đặc trưng phong cách PGR!
    - Frame 0-10: Nạp thế (Windup / Anticipation) vặn người ra sau
    - Frame 11-16: Chém vụt qua cực nhanh (Explosive Cross Slash)
    - Frame 17-24: Giữ thế chém kết thúc (Hit Hold & Pose)
    - Frame 25-36: Thu kiếm về tư thế (Recovery)
    """
    action = bpy.data.actions.new(name="Action_Attack")
    action.use_fake_user = True
    arm_obj.animation_data.action = action

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')

    pb_root = arm_obj.pose.bones['Root']
    pb_pelvis = arm_obj.pose.bones['Pelvis']
    pb_chest = arm_obj.pose.bones['Chest']
    pb_pony = arm_obj.pose.bones['Ponytail']
    pb_uarm_l = arm_obj.pose.bones['UpperArm.L']
    pb_farm_l = arm_obj.pose.bones['Forearm.L']
    pb_uarm_r = arm_obj.pose.bones['UpperArm.R']
    pb_farm_r = arm_obj.pose.bones['Forearm.R']

    active_bones = [pb_root, pb_pelvis, pb_chest, pb_pony, pb_uarm_l, pb_farm_l, pb_uarm_r, pb_farm_r]

    # --- Frame 1: Vào đòn ---
    bpy.context.scene.frame_set(1)
    pb_root.location = (0, 0, 0)
    pb_pelvis.rotation_euler = (0, 0, 0)
    pb_chest.rotation_euler = (0, 0, 0)
    pb_pony.rotation_euler = (0, 0, 0)
    pb_uarm_l.rotation_euler = (0, 0, 0)
    pb_farm_l.rotation_euler = (0, 0, 0)
    pb_uarm_r.rotation_euler = (0, 0, 0)
    pb_farm_r.rotation_euler = (0, 0, 0)
    for pb in active_bones:
        pb.keyframe_insert(data_path="location", frame=1)
        pb.keyframe_insert(data_path="rotation_euler", frame=1)

    # --- Frame 9: Lấy đà nạp thế (Windup) ---
    bpy.context.scene.frame_set(9)
    pb_pelvis.location = (0, 0.08, -0.06)
    pb_pelvis.rotation_euler = (math.radians(12), math.radians(-10), math.radians(25))
    pb_chest.rotation_euler = (math.radians(10), math.radians(-6), math.radians(35))
    pb_pony.rotation_euler = (math.radians(-25), math.radians(10), math.radians(15))
    # Kiếm phải kéo ra sau đầu, kiếm trái che phía trước
    pb_uarm_r.rotation_euler = (math.radians(-45), math.radians(35), math.radians(50))
    pb_farm_r.rotation_euler = (math.radians(80), 0, 0)
    pb_uarm_l.rotation_euler = (math.radians(40), math.radians(-20), math.radians(-20))
    pb_farm_l.rotation_euler = (math.radians(45), 0, 0)
    for pb in active_bones:
        pb.keyframe_insert(data_path="location", frame=9)
        pb.keyframe_insert(data_path="rotation_euler", frame=9)

    # --- Frame 14: Vung chém cực tốc (Explosive Slash Impact) ---
    bpy.context.scene.frame_set(14)
    pb_root.location = (0, -0.35, 0) # Lao vút lên trước 35cm
    pb_pelvis.location = (0, -0.05, -0.08)
    pb_pelvis.rotation_euler = (math.radians(18), math.radians(6), math.radians(-20))
    pb_chest.rotation_euler = (math.radians(22), math.radians(12), math.radians(-32))
    pb_pony.rotation_euler = (math.radians(50), 0, 0) # Tóc bay ngược ra sau do tốc độ gió
    # Cặp kiếm chém vắt chéo chữ X về phía trước
    pb_uarm_r.rotation_euler = (math.radians(70), math.radians(-35), math.radians(-30))
    pb_farm_r.rotation_euler = (math.radians(20), 0, 0)
    pb_uarm_l.rotation_euler = (math.radians(70), math.radians(35), math.radians(30))
    pb_farm_l.rotation_euler = (math.radians(20), 0, 0)
    for pb in active_bones:
        pb.keyframe_insert(data_path="location", frame=14)
        pb.keyframe_insert(data_path="rotation_euler", frame=14)

    # --- Frame 22: Dừng thế ngưng đọng (Pose Hold) ---
    bpy.context.scene.frame_set(22)
    for pb in active_bones:
        pb.keyframe_insert(data_path="location", frame=22)
        pb.keyframe_insert(data_path="rotation_euler", frame=22)

    # --- Frame 36: Thu đòn về nguyên trạng ---
    bpy.context.scene.frame_set(36)
    pb_root.location = (0, 0, 0)
    pb_pelvis.location = (0, 0, 0)
    pb_pelvis.rotation_euler = (0, 0, 0)
    pb_chest.rotation_euler = (0, 0, 0)
    pb_pony.rotation_euler = (0, 0, 0)
    pb_uarm_l.rotation_euler = (0, 0, 0)
    pb_farm_l.rotation_euler = (0, 0, 0)
    pb_uarm_r.rotation_euler = (0, 0, 0)
    pb_farm_r.rotation_euler = (0, 0, 0)
    for pb in active_bones:
        pb.keyframe_insert(data_path="location", frame=36)
        pb.keyframe_insert(data_path="rotation_euler", frame=36)

    bpy.ops.object.mode_set(mode='OBJECT')
    return action

def setup_lights_and_camera():
    """Tạo ánh sáng Directional Rim Light và Camera góc nhìn 3D trực quan."""
    # Mặt trời / Ánh sáng định hướng
    light_data = bpy.data.lights.new(name="PGR_KeyLight", type='SUN')
    light_data.energy = 2.8
    light_data.color = (0.95, 0.98, 1.0)
    light_obj = bpy.data.objects.new("PGR_KeyLight", light_data)
    light_obj.rotation_euler = (math.radians(52), math.radians(15), math.radians(-38))
    bpy.context.collection.objects.link(light_obj)

    # Ánh sáng ngược (Rim Light tạo đường sáng viền anime)
    rim_data = bpy.data.lights.new(name="PGR_RimLight", type='SUN')
    rim_data.energy = 3.6
    rim_data.color = (0.4, 0.8, 1.0)
    rim_obj = bpy.data.objects.new("PGR_RimLight", rim_data)
    rim_obj.rotation_euler = (math.radians(-60), math.radians(0), math.radians(145))
    bpy.context.collection.objects.link(rim_obj)

    # Camera
    cam_data = bpy.data.cameras.new("PGR_HeroCamera")
    cam_data.lens = 55 # Góc máy bán chân dung anime
    cam_obj = bpy.data.objects.new("PGR_HeroCamera", cam_data)
    cam_obj.location = (0, -3.2, 1.25)
    cam_obj.rotation_euler = (math.radians(84), 0, 0)
    bpy.context.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

def main():
    print("=== ĐANG TẠO MODEL 3D ASTRA (PGR STYLE) TRONG BLENDER 5.2 ===")
    reset_scene()
    materials = build_materials()
    print("1. Đã thiết lập xong 7 vật liệu NPR Cel-Shading & Inverted Hull Outline.")

    mesh_obj = build_character_mesh(materials)
    print("2. Đã dựng xong hình học nhân vật: Đầu, Mắt Cyber, Tóc nhọn, Giáp ngực, Bao tay, Bốt bọc thép và Cặp kiếm Plasma.")

    arm_obj = build_armature()
    print("3. Đã dựng khung xương Armature: Root, Pelvis, Spine, Chest, Neck, Head, Ponytail, Cánh tay và Hai chân.")

    bind_mesh_to_armature(mesh_obj, arm_obj)
    print("4. Đã liên kết Mesh với Khung xương qua Armature Deform.")

    idle_act = create_action_idle(arm_obj)
    attack_act = create_action_attack(arm_obj)
    print("5. Đã tạo xong 2 Action Animations: 'Action_Idle' (60f) và 'Action_Attack' (36f).")

    # Mặc định kích hoạt Action Idle
    arm_obj.animation_data.action = idle_act
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 60

    setup_lights_and_camera()
    print("6. Đã cấu hình Ánh sáng Key Light, Rim Light và Camera chân dung.")

    # Lưu file .blend
    output_dir = os.path.abspath("Content/Blender")
    os.makedirs(output_dir, exist_ok=True)
    blend_path = os.path.join(output_dir, "Astra_PGR_Model.blend")

    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"=== XUẤT THÀNH CÔNG: {blend_path} ===")

if __name__ == "__main__":
    main()

"""
MatchRPG / RE:FRAY — 3D Greybox Asset Generator
Generates valid glTF 2.0 binary (.glb) files for testing diorama proportions and import pipelines.
"""

import json
import struct
import os

def create_box_glb(output_path, name, width=1.0, height=2.0, depth=1.0, color=(1.0, 0.2, 0.3, 1.0)):
    hw = width / 2.0
    hd = depth / 2.0
    h = height

    # 6 faces * 4 vertices = 24 vertices
    # glTF standard: X = Right, Y = Up, Z = Forward
    faces = [
        # Top (+Y)
        [(-hw, h, -hd), (hw, h, -hd), (hw, h, hd), (-hw, h, hd), (0.0, 1.0, 0.0)],
        # Bottom (-Y)
        [(-hw, 0.0, hd), (hw, 0.0, hd), (hw, 0.0, -hd), (-hw, 0.0, -hd), (0.0, -1.0, 0.0)],
        # Front (+Z)
        [(-hw, 0.0, hd), (hw, 0.0, hd), (hw, h, hd), (-hw, h, hd), (0.0, 0.0, 1.0)],
        # Back (-Z)
        [(hw, 0.0, -hd), (-hw, 0.0, -hd), (-hw, h, -hd), (hw, h, -hd), (0.0, 0.0, -1.0)],
        # Right (+X)
        [(hw, 0.0, hd), (hw, 0.0, -hd), (hw, h, -hd), (hw, h, hd), (1.0, 0.0, 0.0)],
        # Left (-X)
        [(-hw, 0.0, -hd), (-hw, 0.0, hd), (-hw, h, hd), (-hw, h, -hd), (-1.0, 0.0, 0.0)],
    ]
    
    positions = []
    normals = []
    indices = []
    
    v_idx = 0
    for face in faces:
        v0, v1, v2, v3, norm = face
        positions.extend([v0, v1, v2, v3])
        normals.extend([norm, norm, norm, norm])
        indices.extend([v_idx, v_idx + 1, v_idx + 2, v_idx, v_idx + 2, v_idx + 3])
        v_idx += 4
        
    pos_bytes = bytearray()
    min_pos = [float('inf')] * 3
    max_pos = [float('-inf')] * 3
    for p in positions:
        pos_bytes.extend(struct.pack('<fff', p[0], p[1], p[2]))
        for i in range(3):
            if p[i] < min_pos[i]: min_pos[i] = p[i]
            if p[i] > max_pos[i]: max_pos[i] = p[i]
            
    norm_bytes = bytearray()
    for n in normals:
        norm_bytes.extend(struct.pack('<fff', n[0], n[1], n[2]))
        
    idx_bytes = bytearray()
    for idx in indices:
        idx_bytes.extend(struct.pack('<H', idx))
        
    while len(idx_bytes) % 4 != 0:
        idx_bytes.append(0)
    while len(pos_bytes) % 4 != 0:
        pos_bytes.append(0)
    while len(norm_bytes) % 4 != 0:
        norm_bytes.append(0)
        
    bin_buffer = idx_bytes + pos_bytes + norm_bytes
    
    idx_offset = 0
    idx_length = len(indices) * 2
    pos_offset = len(idx_bytes)
    pos_length = len(positions) * 12
    norm_offset = len(idx_bytes) + len(pos_bytes)
    norm_length = len(normals) * 12
    
    gltf = {
        "asset": {
            "version": "2.0",
            "generator": "MatchRPG Greybox Generator v1.0"
        },
        "scene": 0,
        "scenes": [
            {"name": "Scene", "nodes": [0]}
        ],
        "nodes": [
            {"name": name, "mesh": 0}
        ],
        "materials": [
            {
                "name": f"M_{name}",
                "pbrMetallicRoughness": {
                    "baseColorFactor": list(color),
                    "metallicFactor": 0.2,
                    "roughnessFactor": 0.6
                }
            }
        ],
        "meshes": [
            {
                "name": name,
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": 1,
                            "NORMAL": 2
                        },
                        "indices": 0,
                        "material": 0,
                        "mode": 4
                    }
                ]
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5123,
                "count": len(indices),
                "type": "SCALAR"
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(positions),
                "type": "VEC3",
                "max": max_pos,
                "min": min_pos
            },
            {
                "bufferView": 2,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(normals),
                "type": "VEC3"
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": idx_offset,
                "byteLength": idx_length,
                "target": 34963
            },
            {
                "buffer": 0,
                "byteOffset": pos_offset,
                "byteLength": pos_length,
                "target": 34962
            },
            {
                "buffer": 0,
                "byteOffset": norm_offset,
                "byteLength": norm_length,
                "target": 34962
            }
        ],
        "buffers": [
            {
                "byteLength": len(bin_buffer)
            }
        ]
    }
    
    json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '
        
    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_buffer)
    
    header = struct.pack('<4sII', b'glTF', 2, total_len)
    json_chunk = struct.pack('<I4s', len(json_bytes), b'JSON') + json_bytes
    bin_chunk = struct.pack('<I4s', len(bin_buffer), b'BIN\x00') + bin_buffer
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(header)
        f.write(json_chunk)
        f.write(bin_chunk)
        
    print(f"Generated {output_path} ({total_len} bytes)")

def generate_all():
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    out_dir = os.path.join(repo_root, "Content", "Greybox")
    os.makedirs(out_dir, exist_ok=True)
    
    create_box_glb(os.path.join(out_dir, "SK_Astra_Greybox.glb"), "SK_Astra_Greybox", 0.6, 1.72, 0.4, (1.0, 0.18, 0.33, 1.0))
    create_box_glb(os.path.join(out_dir, "SK_Boss_Sentinel07_Greybox.glb"), "SK_Boss_Sentinel07_Greybox", 1.8, 3.2, 1.4, (1.0, 0.35, 0.1, 1.0))
    create_box_glb(os.path.join(out_dir, "SM_Obstacle_Rock.glb"), "SM_Obstacle_Rock", 0.9, 0.9, 0.9, (0.45, 0.42, 0.4, 1.0))
    create_box_glb(os.path.join(out_dir, "SM_Obstacle_Crate.glb"), "SM_Obstacle_Crate", 0.85, 0.85, 0.85, (0.7, 0.5, 0.25, 1.0))

if __name__ == "__main__":
    generate_all()

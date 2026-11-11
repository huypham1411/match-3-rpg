import sqlite3
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

appdata = os.environ.get('APPDATA', '')
db_path = os.path.join(appdata, 'OpenBot', 'openbot.db')

if not os.path.exists(db_path):
    print(f"Error: OpenBot database not found at {db_path}.")
    print("Please make sure OpenBot is installed and has been run once on this machine.")
    sys.exit(1)

curr_dir = os.path.dirname(os.path.abspath(__file__))
agents_file = os.path.join(curr_dir, 'studio_agents.json')
channels_file = os.path.join(curr_dir, 'studio_channels.json')

if not os.path.exists(agents_file) or not os.path.exists(channels_file):
    print("Error: studio_agents.json or studio_channels.json missing.")
    sys.exit(1)

with open(agents_file, 'r', encoding='utf-8') as f:
    agents = json.load(f)

with open(channels_file, 'r', encoding='utf-8') as f:
    channels = json.load(f)

con = sqlite3.connect(db_path)
cur = con.cursor()

# 1. Restore Agents
restored_agents = 0
for a in agents:
    agent_id = a.get('id')
    agent_json = json.dumps(a, ensure_ascii=False)
    thread_id = a.get('threadId', f"openbot-thread-{agent_id}")
    model = a.get('model', 'nvidia/nemotron-3-ultra-550b-a55b:free')
    updated_at = a.get('updatedAt', '2026-11-10T00:00:00.000Z')
    
    # Check if exists
    exists = cur.execute("SELECT 1 FROM projection_agents WHERE agent_id=?", (agent_id,)).fetchone()
    if exists:
        cur.execute("UPDATE projection_agents SET agent_json=?, model=?, updated_at=? WHERE agent_id=?",
                    (agent_json, model, updated_at, agent_id))
    else:
        cur.execute("INSERT INTO projection_agents (agent_id, thread_id, model, updated_at, sort_order, agent_json, last_event_sequence) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (agent_id, thread_id, model, updated_at, 0, agent_json, 0))
    restored_agents += 1

# 2. Restore Channels
restored_channels = 0
for c in channels:
    channel_id = c.get('id')
    channel_json = json.dumps(c, ensure_ascii=False)
    exists = cur.execute("SELECT 1 FROM projection_channels WHERE channel_id=?", (channel_id,)).fetchone()
    if exists:
        cur.execute("UPDATE projection_channels SET channel_json=? WHERE channel_id=?",
                    (channel_json, channel_id))
    else:
        cur.execute("INSERT INTO projection_channels (channel_id, channel_json) VALUES (?, ?)",
                    (channel_id, channel_json))
    restored_channels += 1

con.commit()
print(f"Successfully restored {restored_agents} agents and {restored_channels} channels into {db_path}!")
print("Restart OpenBot to view your restored Game Dev Studio.")

import sqlite3
import json
import sys
import os
import shutil

sys.stdout.reconfigure(encoding='utf-8')

appdata = os.environ.get('APPDATA', '')
db_path = os.path.join(appdata, 'OpenBot', 'openbot.db')

if not os.path.exists(db_path):
    print(f"Error: OpenBot database not found at {db_path}.")
    print("Please make sure OpenBot is installed and has been run once on this machine.")
    sys.exit(1)

curr_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.dirname(curr_dir)
agents_file = os.path.join(curr_dir, 'studio_agents.json')
channels_file = os.path.join(curr_dir, 'studio_channels.json')
messages_file = os.path.join(curr_dir, 'studio_messages.json')

if not os.path.exists(agents_file) or not os.path.exists(channels_file):
    print("Error: studio_agents.json or studio_channels.json missing.")
    sys.exit(1)

with open(agents_file, 'r', encoding='utf-8') as f:
    agents = json.load(f)

with open(channels_file, 'r', encoding='utf-8') as f:
    channels = json.load(f)

messages = []
if os.path.exists(messages_file):
    with open(messages_file, 'r', encoding='utf-8') as f:
        messages = json.load(f)

# Create safe backup
backup_path = db_path + ".bak"
try:
    shutil.copy2(db_path, backup_path)
    print(f"Backed up database to {backup_path}")
except Exception as e:
    print(f"Warning: Could not create backup: {e}")

con = sqlite3.connect(db_path)
cur = con.cursor()

user_home = os.path.expanduser('~')
agents_base_dir = os.path.join(user_home, 'OpenBot', 'Agents')
os.makedirs(agents_base_dir, exist_ok=True)

# 1. Restore Agents & Threads
restored_agents = 0
for a in agents:
    agent_id = a.get('id')
    thread_id = a.get('threadId', f"openbot-thread-{agent_id}")
    model = a.get('model', 'nvidia/nemotron-3-ultra-550b-a55b:free')
    updated_at = a.get('updatedAt', '2026-11-10T00:00:00.000Z')
    name = a.get('name', 'Agent')

    # Normalize workspace path to current user profile
    orig_workspace = a.get('workspacePath', '')
    if orig_workspace:
        # replace any old username path with current user home
        agent_dir_name = os.path.basename(orig_workspace)
        agent_workspace = os.path.join(agents_base_dir, agent_dir_name)
    else:
        agent_workspace = os.path.join(agents_base_dir, agent_id)

    os.makedirs(agent_workspace, exist_ok=True)
    a['workspacePath'] = agent_workspace

    # Update description path to match current workspace if needed
    if 'description' in a and 'D:\\project\\match-rpg' in a['description']:
        a['description'] = a['description'].replace('D:\\project\\match-rpg', repo_root)

    agent_json = json.dumps(a, ensure_ascii=False)

    # Insert or update projection_agents
    cur.execute("""
        INSERT INTO projection_agents (agent_id, thread_id, model, updated_at, sort_order, agent_json, last_event_sequence)
        VALUES (?, ?, ?, ?, 0, ?, 0)
        ON CONFLICT(agent_id) DO UPDATE SET
            thread_id=excluded.thread_id,
            model=excluded.model,
            updated_at=excluded.updated_at,
            agent_json=excluded.agent_json
    """, (agent_id, thread_id, model, updated_at, agent_json))

    # Insert or update projection_threads
    cur.execute("""
        INSERT INTO projection_threads (thread_id, agent_id, title, active_turn_id, created_at, updated_at, last_event_sequence)
        VALUES (?, ?, ?, NULL, ?, ?, 0)
        ON CONFLICT(thread_id) DO UPDATE SET
            title=excluded.title,
            updated_at=excluded.updated_at
    """, (thread_id, agent_id, name, updated_at, updated_at))

    restored_agents += 1

# 2. Restore Channels
restored_channels = 0
max_seq = max([m.get('sequence', 0) for m in messages], default=0)

for c in channels:
    channel_id = c.get('id')
    channel_json = json.dumps(c, ensure_ascii=False)
    
    cur.execute("""
        INSERT INTO projection_channels (channel_id, channel_json)
        VALUES (?, ?)
        ON CONFLICT(channel_id) DO UPDATE SET
            channel_json=excluded.channel_json
    """, (channel_id, channel_json))
    restored_channels += 1

    # Link members in projection_channel_contexts
    for member in c.get('members', []):
        m_agent_id = member.get('agentId')
        m_thread_id = f"openbot-thread-{m_agent_id}"
        cur.execute("""
            INSERT INTO projection_channel_contexts (channel_id, agent_id, thread_id, session_id, through_sequence, summary_version)
            VALUES (?, ?, ?, NULL, ?, 0)
            ON CONFLICT(channel_id, agent_id) DO UPDATE SET
                thread_id=excluded.thread_id,
                through_sequence=excluded.through_sequence
        """, (channel_id, m_agent_id, m_thread_id, max_seq))

# 3. Restore Channel Messages
restored_messages = 0
for m in messages:
    ch_id = m.get('channel_id')
    msg_id = m.get('message_id')
    seq = m.get('sequence')
    msg_data = json.dumps(m.get('data', {}), ensure_ascii=False)

    cur.execute("""
        INSERT INTO projection_channel_messages (channel_id, message_id, sequence, message_json)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(channel_id, message_id) DO UPDATE SET
            sequence=excluded.sequence,
            message_json=excluded.message_json
    """, (ch_id, msg_id, seq, msg_data))
    restored_messages += 1

con.commit()
print(f"Successfully restored {restored_agents} agents (with threads), {restored_channels} channels, and {restored_messages} messages into {db_path}!")
print(f"Agent workspaces configured at: {agents_base_dir}")
print("Restart OpenBot to view your restored Game Dev Studio.")

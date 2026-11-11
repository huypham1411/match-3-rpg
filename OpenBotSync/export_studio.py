import sqlite3
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

appdata = os.environ.get('APPDATA', '')
db_path = os.path.join(appdata, 'OpenBot', 'openbot.db')

if not os.path.exists(db_path):
    print(f"Error: OpenBot database not found at {db_path}")
    sys.exit(1)

out_dir = os.path.dirname(os.path.abspath(__file__))
os.makedirs(out_dir, exist_ok=True)

con = sqlite3.connect(db_path)
cur = con.cursor()

# 1. Export Agents
agents = []
for r in cur.execute('SELECT agent_id, agent_json FROM projection_agents').fetchall():
    data = json.loads(r[1])
    agents.append(data)

agents_file = os.path.join(out_dir, 'studio_agents.json')
with open(agents_file, 'w', encoding='utf-8') as f:
    json.dump(agents, f, indent=2, ensure_ascii=False)
print(f"Exported {len(agents)} agents -> {agents_file}")

# 2. Export Channels
channels = []
for r in cur.execute('SELECT channel_id, channel_json FROM projection_channels').fetchall():
    data = json.loads(r[1])
    channels.append(data)

channels_file = os.path.join(out_dir, 'studio_channels.json')
with open(channels_file, 'w', encoding='utf-8') as f:
    json.dump(channels, f, indent=2, ensure_ascii=False)
print(f"Exported {len(channels)} channels -> {channels_file}")

# 3. Export Chat Messages & Progress
messages = []
for r in cur.execute('SELECT channel_id, sequence, message_id, message_json FROM projection_channel_messages ORDER BY sequence ASC').fetchall():
    data = json.loads(r[3])
    messages.append({
        'channel_id': r[0],
        'sequence': r[1],
        'message_id': r[2],
        'data': data
    })

messages_file = os.path.join(out_dir, 'studio_messages.json')
with open(messages_file, 'w', encoding='utf-8') as f:
    json.dump(messages, f, indent=2, ensure_ascii=False)
print(f"Exported {len(messages)} messages -> {messages_file}")

# 4. Generate Human-Readable Markdown Log
history_md = os.path.join(out_dir, 'STUDIO_CHAT_LOG.md')
with open(history_md, 'w', encoding='utf-8') as f:
    f.write("# RE:FRAY — NHẬT KÝ TIẾN ĐỘ & TRAO ĐỔI OPENBOT STUDIO\n\n")
    for m in messages:
        d = m['data']
        author = d.get('author', {})
        author_name = author.get('name') or author.get('id', 'Unknown')
        text = d.get('message', {}).get('text') or d.get('text', '')
        seq = m['sequence']
        f.write(f"### [#{seq}] {author_name}\n\n{text}\n\n---\n\n")

print(f"Generated Markdown log -> {history_md}")
print("OpenBot data exported successfully!")

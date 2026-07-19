async function renderMemory() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Memory</h1>
        <p class="page-subtitle">Shared brain context across all agents</p>
      </div>
    </div>
    <div id="obsidianPanel"></div>
    <div id="memoryList"><div class="loading"><div class="loading-spinner"></div></div></div>
  `;

  // P1: Obsidian vault panel
  await renderObsidianPanel();

  try {
    const brain = await api.getBrain();
    const files = Object.entries(brain);
    const container = document.getElementById('memoryList');

    if (files.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🧠</div><div class="empty-state-title">No memory files</div></div>';
      return;
    }

    container.innerHTML = `<div style="display:grid;gap:12px">${files.map(([name, content]) => {
      const preview = content ? content.slice(0, 200) : '';
      const safeName = escapeHtml(name.replace('.md', '').replace(/-/g, ' '));
      return `<div class="card" style="cursor:pointer" onclick="editMemory('${encodeURIComponent(name)}')">
        <div class="flex items-center justify-between mb-2">
          <div><span class="card-title">${safeName}</span></div>
          <span class="badge badge-info">${content ? content.split('\n').length : 0} lines</span>
        </div>
        <pre style="max-height:80px;overflow:hidden;font-size:11px;color:var(--text-muted)">${escapeHtml(preview)}${preview.length >= 200 ? '...' : ''}</pre>
      </div>`;
    }).join('')}</div>`;
  } catch (err) {
    document.getElementById('memoryList').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠</div><div class="empty-state-title">${escapeHtml(err.message)}</div></div>`;
  }
}

async function renderObsidianPanel() {
  const panel = document.getElementById('obsidianPanel');
  if (!panel) return;
  try {
    const s = await api.obsidianStatus();
    const failover = s.failover_to_omnimemory ? 'ON' : 'OFF';
    const notes = (s.notes || []).slice(0, 12)
      .map(n => `<div class="card" style="cursor:pointer;padding:8px" onclick="editObsidianNote('${encodeURIComponent(n.name)}')">
        <span class="card-title" style="font-size:12px">${escapeHtml(n.name.replace('.md',''))}</span></div>`)
      .join('');
    panel.innerHTML = `
      <div class="card" style="margin-bottom:12px">
        <div class="flex items-center justify-between mb-2">
          <div><span class="card-title">🗒 Obsidian Vault</span>
            <span class="badge ${s.vault_exists ? 'badge-success' : 'badge-warning'}">${s.vault_exists ? 'connected' : 'not found'}</span>
            <span class="badge badge-info">failover: ${failover}</span>
          </div>
          <button class="btn btn-sm" onclick="newObsidianNote()">＋ New</button>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${escapeHtml(s.configured_path || 'no path set')} · ${s.note_count} notes</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">${notes || '<div style="font-size:11px;color:var(--text-muted)">No notes yet</div>'}</div>
      </div>`;
  } catch (err) {
    panel.innerHTML = `<div class="card" style="margin-bottom:12px"><span class="badge badge-warning">Obsidian panel error: ${escapeHtml(err.message)}</span></div>`;
  }
}

async function editObsidianNote(encodedName) {
  const name = decodeURIComponent(encodedName);
  let content = '';
  try {
    const r = await api.obsidianNote(name);
    content = r.content || '';
  } catch {}
  showModal(`Obsidian: ${escapeHtml(name)}`, `
    <div class="form-group">
      <label class="form-label">Content</label>
      <textarea id="obsContent" class="form-textarea" style="min-height:300px;font-size:12px">${escapeHtml(content)}</textarea>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveObsidianNote('${encodeURIComponent(name)}')">💾 Save</button>
  `);
}

async function saveObsidianNote(encodedName) {
  const name = decodeURIComponent(encodedName);
  const content = document.getElementById('obsContent').value;
  try {
    await api.saveObsidianNote(name, content);
    closeModal();
    showToast('Obsidian note saved', 'success');
    renderMemory();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function newObsidianNote() {
  const name = prompt('Note name (e.g. my-note.md):');
  if (!name) return;
  try {
    await api.saveObsidianNote(name.endsWith('.md') ? name : name + '.md', '# New note\n');
    showToast('Note created', 'success');
    renderMemory();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function editMemory(encodedName) {
  const name = decodeURIComponent(encodedName);
  const display = escapeHtml(name.replace('.md', '').replace(/-/g, ' '));
  let content = '';
  try {
    const r = await api.getBrainFile(name);
    content = r.content || '';
  } catch {}

  showModal(`Edit: ${display}`, `
    <div class="form-group">
      <label class="form-label">Content</label>
      <textarea id="memContent" class="form-textarea" style="min-height:300px;font-size:12px">${escapeHtml(content)}</textarea>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveMemory('${encodeURIComponent(name)}')">💾 Save</button>
  `);
}

async function saveMemory(encodedName) {
  const name = decodeURIComponent(encodedName);
  const content = document.getElementById('memContent').value;
  try {
    await api.updateBrainFile(name, content);
    closeModal();
    showToast('Memory updated', 'success');
    renderMemory();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

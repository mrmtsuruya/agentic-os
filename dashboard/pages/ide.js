let _ideWs = null;
let _ideEditor = null;
let _term = null;

async function renderIde() {
  const content = document.getElementById('pageContent');
  content.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">IDE</h1>
        <p class="page-subtitle">Monaco editor + terminal (sandboxed to project root)</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-sm" onclick="ideSave()">💾 Save</button>
        <button class="btn btn-sm" onclick="ideOpenFile()">📂 Open</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:8px;font-size:11px;color:var(--text-muted)" id="idePath">server.py</div>
        <div id="ideEditor" style="height:420px;border-top:1px solid var(--border)"></div>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:8px;font-size:11px;color:var(--text-muted)">Terminal (PTY)</div>
        <div id="ideTerm" style="height:420px;background:#0b0b14;padding:6px"></div>
      </div>
    </div>
  `;
  // load Monaco from CDN
  await loadIdeScripts();
  initIdeEditor();
  initIdeTerm();
  ideLoadFile('server.py');
}

function loadIdeScripts() {
  return new Promise((resolve) => {
    if (window.monaco) { resolve(); return; }
    const mc = document.createElement('script');
    mc.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js';
    mc.onload = () => {
      window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
      window.require(['vs/editor/editor.main'], () => resolve());
    };
    mc.onerror = () => resolve();
    document.head.appendChild(mc);
  });
}

function initIdeEditor() {
  if (!window.monaco) return;
  _ideEditor = window.monaco.editor.create(document.getElementById('ideEditor'), {
    value: '', language: 'python', theme: 'vs-dark', automaticLayout: true,
  });
}

function initIdeTerm() {
  if (typeof Terminal === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js';
    s.onload = connectIdeTerm;
    document.head.appendChild(s);
  } else connectIdeTerm();
}

function connectIdeTerm() {
  if (typeof Terminal === 'undefined') return;
  if (_term) return;
  _term = new Terminal({ cols: 100, rows: 20, fontSize: 12 });
  _term.open(document.getElementById('ideTerm'));
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  _ideWs = new WebSocket(`${proto}://${location.host}/api/ide/ws/pty`);
  _ideWs.onmessage = (e) => _term.write(e.data);
  _ideWs.onclose = () => _term.write('\r\n[ide] terminal closed\r\n');
  _term.onData((d) => { if (_ideWs && _ideWs.readyState === 1) _ideWs.send(d); });
}

async function ideLoadFile(path) {
  try {
    const r = await api.ideRead(path);
    document.getElementById('idePath').textContent = r.path;
    if (_ideEditor && !r.is_dir) _ideEditor.setValue(r.content || '');
    window._ideCurrent = r.path;
  } catch (e) { showToast(`Open failed: ${e.message}`, 'error'); }
}

async function ideSave() {
  if (!_ideEditor || !window._ideCurrent) return;
  try {
    await api.ideWrite(window._ideCurrent, _ideEditor.getValue());
    showToast('Saved ' + window._ideCurrent, 'success');
  } catch (e) { showToast(`Save failed: ${e.message}`, 'error'); }
}

function ideOpenFile() {
  const p = prompt('File path (relative to project root):', window._ideCurrent || 'server.py');
  if (p) ideLoadFile(p);
}

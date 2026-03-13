/* ============================================================
   Supabase Configuration
   config.js 파일에서 SUPABASE_URL, SUPABASE_ANON_KEY를 설정하거나
   아래 값을 직접 교체하세요.
   ============================================================ */
const SUPABASE_URL      = window.APP_CONFIG?.supabaseUrl      || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = window.APP_CONFIG?.supabaseAnonKey  || 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   State
   ============================================================ */
let tasks           = [];
let filter          = 'all';
let selectedPriority = 'high';
let editId          = null;
let editPriority    = 'high';
let isLoading       = false;

/* ============================================================
   Utility
   ============================================================ */
function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(ts) {
  const d    = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000)     return '방금 전';
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function priorityLabel(p) {
  return { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low', none: '' }[p] || '';
}

function showToast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast${isError ? ' error' : ''}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 2500);
}

function setLoading(on) {
  isLoading = on;
  document.getElementById('loading-bar').classList.toggle('hidden', !on);
  document.getElementById('add-btn').disabled = on;
}

/* ============================================================
   Supabase CRUD
   ============================================================ */
async function fetchTasks() {
  setLoading(true);
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  setLoading(false);
  if (error) { showToast('데이터 불러오기 실패: ' + error.message, true); return; }
  tasks = data || [];
  render();
}

async function insertTask(text, priority) {
  setLoading(true);
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ text, priority, done: false }])
    .select()
    .single();

  setLoading(false);
  if (error) { showToast('추가 실패: ' + error.message, true); return; }
  tasks.unshift(data);
  render();
  showToast('할 일이 추가되었습니다.');
}

async function updateTask(id, changes) {
  setLoading(true);
  const { data, error } = await supabase
    .from('tasks')
    .update(changes)
    .eq('id', id)
    .select()
    .single();

  setLoading(false);
  if (error) { showToast('수정 실패: ' + error.message, true); return; }
  const idx = tasks.findIndex(t => t.id === id);
  if (idx !== -1) tasks[idx] = data;
  render();
}

async function deleteTask(id) {
  setLoading(true);
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  setLoading(false);
  if (error) { showToast('삭제 실패: ' + error.message, true); return; }
  tasks = tasks.filter(t => t.id !== id);
  render();
  showToast('삭제되었습니다.');
}

async function deleteAllDone() {
  setLoading(true);
  const doneIds = tasks.filter(t => t.done).map(t => t.id);
  const { error } = await supabase
    .from('tasks')
    .delete()
    .in('id', doneIds);

  setLoading(false);
  if (error) { showToast('삭제 실패: ' + error.message, true); return; }
  tasks = tasks.filter(t => !t.done);
  render();
  showToast('완료 항목이 삭제되었습니다.');
}

/* ============================================================
   Render
   ============================================================ */
function render() {
  const list      = document.getElementById('list');
  const clearBtn  = document.getElementById('clear-done-btn');
  const statsLabel = document.getElementById('stats-label');

  const filtered = tasks.filter(t =>
    filter === 'all'    ? true :
    filter === 'done'   ? t.done :
                          !t.done
  );

  const activeCount = tasks.filter(t => !t.done).length;
  statsLabel.textContent = tasks.length ? `${activeCount}개 남음` : '';

  const hasDone = tasks.some(t => t.done);
  clearBtn.style.display = (hasDone && filter !== 'active') ? 'block' : 'none';

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="emoji">${filter === 'done' ? '✅' : filter === 'active' ? '🎉' : '📝'}</div>
        <p>${filter === 'done' ? '완료된 항목이 없습니다' : filter === 'active' ? '모두 완료했어요!' : '할 일이 없습니다'}</p>
        <small>${filter === 'all' ? '위에서 첫 번째 할 일을 추가하세요' : ''}</small>
      </div>`;
    return;
  }

  const priorityOrder = { high: 0, medium: 1, low: 2, none: 3 };
  const sorted = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
  });

  list.innerHTML = sorted.map(t => `
    <div class="task-item ${t.done ? 'done' : ''}" data-id="${t.id}">
      <div class="priority-bar ${t.priority || 'none'}"></div>
      <div class="checkbox ${t.done ? 'checked' : ''}" data-action="toggle" data-id="${t.id}"></div>
      <div class="task-body">
        <div class="task-text">${escHtml(t.text)}</div>
        <div class="task-meta">
          ${priorityLabel(t.priority)}${t.priority && t.priority !== 'none' ? ' · ' : ''}${formatDate(t.created_at)}
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" data-action="edit" data-id="${t.id}" title="수정">✏️</button>
        <button class="icon-btn delete" data-action="delete" data-id="${t.id}" title="삭제">🗑️</button>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   Input Area — Priority Selection
   ============================================================ */
document.querySelectorAll('[data-p]').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedPriority = btn.dataset.p;
    document.querySelectorAll('[data-p]').forEach(b => {
      b.className = 'priority-chip';
      if (b.dataset.p === selectedPriority) b.classList.add(`selected-${selectedPriority}`);
    });
  });
});

/* ============================================================
   Add Task
   ============================================================ */
async function addTask() {
  const input = document.getElementById('task-input');
  const text  = input.value.trim();
  if (!text || isLoading) return;

  input.value       = '';
  input.style.height = 'auto';
  await insertTask(text, selectedPriority);
}

document.getElementById('add-btn').addEventListener('click', addTask);

document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask(); }
});

document.getElementById('task-input').addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});

/* ============================================================
   Filter Bar
   ============================================================ */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

/* ============================================================
   Task List — Event Delegation
   ============================================================ */
document.getElementById('list').addEventListener('click', async e => {
  const btn    = e.target.closest('[data-action]');
  if (!btn || isLoading) return;

  const id     = btn.dataset.id;
  const action = btn.dataset.action;
  const task   = tasks.find(t => t.id === id);
  if (!task) return;

  if (action === 'toggle') {
    await updateTask(id, { done: !task.done });
  } else if (action === 'delete') {
    await deleteTask(id);
  } else if (action === 'edit') {
    openEditModal(task);
  }
});

/* ============================================================
   Clear Done
   ============================================================ */
document.getElementById('clear-done-btn').addEventListener('click', deleteAllDone);

/* ============================================================
   Edit Modal
   ============================================================ */
function openEditModal(task) {
  editId       = task.id;
  editPriority = task.priority || 'none';

  document.getElementById('edit-input').value = task.text;

  document.querySelectorAll('[data-ep]').forEach(b => {
    b.className = 'priority-chip';
    if (b.dataset.ep === editPriority) b.classList.add(`selected-${editPriority}`);
  });

  document.getElementById('modal-backdrop').classList.add('open');
  setTimeout(() => document.getElementById('edit-input').focus(), 100);
}

document.querySelectorAll('[data-ep]').forEach(btn => {
  btn.addEventListener('click', () => {
    editPriority = btn.dataset.ep;
    document.querySelectorAll('[data-ep]').forEach(b => {
      b.className = 'priority-chip';
      if (b.dataset.ep === editPriority) b.classList.add(`selected-${editPriority}`);
    });
  });
});

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
}

document.getElementById('modal-cancel').addEventListener('click', closeModal);

document.getElementById('modal-backdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-backdrop')) closeModal();
});

document.getElementById('modal-save').addEventListener('click', async () => {
  const text = document.getElementById('edit-input').value.trim();
  if (!text) return;
  closeModal();
  await updateTask(editId, { text, priority: editPriority });
  showToast('수정되었습니다.');
});

/* ============================================================
   Realtime — Supabase Realtime Subscription
   다른 기기/탭에서 변경사항을 실시간으로 반영합니다.
   ============================================================ */
supabase
  .channel('tasks-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
    fetchTasks();
  })
  .subscribe();

/* ============================================================
   Init
   ============================================================ */
fetchTasks();

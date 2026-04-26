document.addEventListener('DOMContentLoaded', () => {
  // Restore session
  STATE.restore()
  if (STATE.user) {
    bootDashboard()
  } else {
    showView('login')
  }

  // Keyboard
  const lp = document.getElementById('login-pass')
  if (lp) lp.addEventListener('keydown', e => { if (e.key==='Enter') doLogin() })

  // Modal close on backdrop
  ;['modal-del','modal-edit'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.addEventListener('click', e => { if (e.target===el) UI.closeModal(id) })
  })

  // Render price list & branding
  renderLogin()
})

/* ── VIEWS ── */
function showView(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  const el = document.getElementById('page-' + name)
  if (el) el.classList.add('active')
}

function goPage(name, navEl) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  if (navEl) navEl.classList.add('active')
  showView(name)
  if (name==='home')   renderHome()
  if (name==='add')    renderAdd()
  if (name==='delete') renderDelete()
}

/* ── LOGIN RENDER ── */
function renderLogin() {
  // Brand
  ;['lb-name','lb-name2'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.textContent = CFG.BRAND.NAME
  })
  ;['lb-sub'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.textContent = CFG.BRAND.SUB
  })
  const em = document.getElementById('lb-emoji')
  if (em) em.textContent = CFG.BRAND.EMOJI

  // Price list
  const pl = document.getElementById('price-list')
  if (pl) {
    pl.innerHTML = CFG.PRICES.map(p => `
      <div class="price-row">
        <span class="price-name">${p.label}</span>
        <span class="price-val">${p.price}</span>
      </div>
    `).join('')
  }
}

/* ── LOGIN ── */
async function doLogin() {
  const id   = document.getElementById('login-id').value.trim()
  const pass = document.getElementById('login-pass').value.trim()
  if (!id || !pass) { UI.status('login-status','ID & password wajib diisi','err'); return }

  UI.busy('login-btn', true)
  UI.status('login-status','')

  try {
    const file  = await API.roles()
    const users = file.data.users || []
    const match = users.find(u => (u.username===id || String(u.telegramId)===id) && u.password===pass)
    if (!match) { UI.status('login-status','ID atau password salah','err'); return }

    STATE.user = match
    STATE.save()
    bootDashboard()
  } catch (e) {
    UI.status('login-status','Error: '+e.message,'err')
  } finally {
    UI.busy('login-btn', false, 'LOGIN')
  }
}

function doLogout() {
  STATE.logout()
  showView('login')
  document.getElementById('bottom-nav').style.display = 'none'
}

/* ── BOOT AFTER LOGIN ── */
function bootDashboard() {
  const u    = STATE.user
  const rank = rankOf(u.role)

  // Setup nav visibility
  const navTools = document.getElementById('nav-tools')
  if (navTools) navTools.style.display = can('VIEW_TOOLS') ? '' : 'none'

  // Populate role dropdowns
  UI.populateRoleSelect('add-u-role',   rank)
  UI.populateRoleSelect('modal-role-sel', rank)

  // Hide sections based on role
  const addUserSec = document.getElementById('add-user-section')
  const delUserSec = document.getElementById('del-user-section')
  if (addUserSec) addUserSec.style.display = can('ADD_USER') ? '' : 'none'
  if (delUserSec) delUserSec.style.display = can('DEL_USER') ? '' : 'none'

  // Show dashboard
  document.getElementById('bottom-nav').style.display = ''
  showView('home')
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  const nh = document.getElementById('nav-home')
  if (nh) nh.classList.add('active')

  // Start clock & render home
  UI.startClock('home-date','home-time')
  renderHome()
}

/* ══════════════════════════════════════
   HOME
══════════════════════════════════════ */
async function renderHome() {
  const u = STATE.user
  if (!u) return

  // Profile
  const av = document.getElementById('h-avatar')
  if (av) av.textContent = (u.username+'').slice(0,2).toUpperCase()

  const uid = document.getElementById('h-uid')
  if (uid) uid.textContent = u.username

  const rb = document.getElementById('h-role-badge')
  if (rb) {
    rb.textContent = u.role.toUpperCase()
    rb.className   = 'profile-badge ' + (ROLE_META[u.role?.toLowerCase()]?.badge || 'badge-reseller')
  }

  // Skeletons
  UI.skeletons('h-role-stats', 5, 42)
  ;['h-total-tok','h-total-usr'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '—'
  })

  try {
    const [tokF, roleF] = await Promise.all([API.tokens(), API.roles()])
    const tokens = tokF.data.tokens || []
    const users  = roleF.data.users  || []

    const ttok = document.getElementById('h-total-tok')
    const tusr = document.getElementById('h-total-usr')
    if (ttok) ttok.textContent = tokens.length
    if (tusr) tusr.textContent = users.length

    // Role stats
    const counts = {}
    ROLES.forEach(r => counts[r] = 0)
    users.forEach(u => {
      const r = u.role?.toLowerCase().trim()
      if (counts[r] !== undefined) counts[r]++
    })

    const statsEl = document.getElementById('h-role-stats')
    if (statsEl) {
      const order = ['owner','ceo','moderator','partner','reseller','developer','asisten']
      statsEl.innerHTML = order.map(r => {
        const m = ROLE_META[r] || { icon:'·', color:'#94a3b8' }
        return `<div class="role-stat-row">
          <span class="rs-icon">${m.icon}</span>
          <span class="rs-name">${r.charAt(0).toUpperCase()+r.slice(1)}</span>
          <span class="rs-count" style="color:${m.color}">${counts[r]}</span>
        </div>`
      }).join('')
    }

    // Sysinfo
    const si = document.getElementById('h-sysinfo')
    if (si) {
      si.innerHTML = [
        { dot:'red',   key:'Telegram',    val: CFG.SYS.TG },
        { dot:'gold',  key:'User ID',     val: u.username },
        { dot:'blue',  key:'Role',        val: u.role.charAt(0).toUpperCase()+u.role.slice(1) },
        { dot:'green', key:'Status',      val: 'ACTIVE', green: true },
      ].map(i => `<div class="si-row">
        <span class="si-dot ${i.dot}"></span>
        <span class="si-key">${i.key}</span>
        <span class="si-val${i.green?' si-green':''}">${i.val}</span>
      </div>`).join('')
    }

  } catch (e) {
    UI.toast('Gagal load data: '+e.message,'err')
  }
}

/* ══════════════════════════════════════
   ADD VIEW
══════════════════════════════════════ */
async function renderAdd() {
  // Token list
  UI.skeletons('add-tok-list', 3, 36)
  try {
    const f = await API.tokens()
    renderTokenList(f.data.tokens || [])
  } catch { document.getElementById('add-tok-list').innerHTML = '<div class="empty-state">Gagal memuat</div>' }

  // User list
  if (can('VIEW_USERS')) {
    UI.skeletons('add-usr-list', 3, 42)
    try {
      const f = await API.roles()
      renderUserList(f.data.users || [])
    } catch {}
  }
}

function renderTokenList(tokens) {
  const el = document.getElementById('add-tok-list')
  if (!el) return
  if (!tokens.length) { el.innerHTML = '<div class="empty-state">Belum ada token</div>'; return }
  el.innerHTML = tokens.map((t, i) => `
    <div class="list-item">
      <span class="list-item-val">${maskToken(t)}</span>
      ${can('DEL_TOKEN')
        ? `<button class="btn-xs btn-xs-r" onclick="promptDel('tok-idx',${i},'token ini')">Hapus</button>`
        : ''}
    </div>
  `).join('')
}

function renderUserList(users) {
  const el = document.getElementById('add-usr-list')
  if (!el) return
  if (!users.length) { el.innerHTML = '<div class="empty-state">Belum ada user</div>'; return }
    const myRank  = rankOf(STATE.user.role)
    const isMaxRole = myRank >= ROLES.length - 1
    el.innerHTML = users.map(u => {
    const tRank   = rankOf(u.role)
    const isSelf  = u.username === STATE.user.username
    // Developer bisa edit/del sesama developer, role lain hanya yang di bawahnya
    const canTarget = isMaxRole ? tRank <= myRank : tRank < myRank
    const canEdit = can('EDIT_ROLE') && !isSelf && canTarget
    const canDel  = can('DEL_USER')  && !isSelf && canTarget
    const tidStr  = u.telegramId
      ? `<span style="color:var(--muted);font-size:8px;margin-left:4px">· ${u.telegramId}</span>`
      : `<span style="color:rgba(255,60,60,.3);font-size:8px;margin-left:4px">· no ID</span>`
    return `<div class="list-item">
      <span style="font-size:15px;margin-right:2px">${ROLE_META[u.role?.toLowerCase()]?.icon||'·'}</span>
      <span class="list-item-val" style="display:flex;flex-direction:column;gap:1px">
        <span style="color:var(--text);font-size:10.5px">${u.username}${tidStr}</span>
        <span style="color:var(--muted);font-size:8px;letter-spacing:.1em;text-transform:uppercase">${u.role}</span>
      </span>
      <div style="display:flex;gap:4px">
        ${canEdit ? `<button class="btn-xs btn-xs-b" onclick="openEditModal('${u.username}','${u.role}')">Edit</button>` : ''}
        ${canDel  ? `<button class="btn-xs btn-xs-r" onclick="promptDel('user','${u.username}','user &quot;${u.username}&quot;')">Hapus</button>` : ''}
      </div>
    </div>`
  }).join('')
}

async function addToken() {
  const val = document.getElementById('add-tok-input').value.trim()
  if (!val) { UI.status('add-tok-status','Token kosong','err'); return }
  UI.busy('add-tok-btn', true)
  UI.status('add-tok-status','')
  try {
    const f      = await API.tokens()
    const tokens = f.data.tokens
    if (tokens.includes(val)) { UI.status('add-tok-status','Token duplikat','err'); return }
    tokens.push(val)
    await API.saveTokens(f.sha, tokens, 'add token')
    await API.appendLog({ who:STATE.user.username, role:STATE.user.role, action:'tambah token', detail:maskToken(val) })
    UI.status('add-tok-status','Token ditambahkan ✓','ok')
    document.getElementById('add-tok-input').value = ''
    renderTokenList(tokens)
    refreshHomeStats()
  } catch (e) { UI.status('add-tok-status','Error: '+e.message,'err') }
  finally { UI.busy('add-tok-btn', false, '+ ADD TOKEN') }
}

async function addUser() {
  const username   = document.getElementById('add-u-name').value.trim()
  const telegramId = document.getElementById('add-u-tid').value.trim()
  const password   = document.getElementById('add-u-pass').value.trim()
  const role       = document.getElementById('add-u-role').value

  if (!username || !password || !role) {
    UI.status('add-usr-status','Username, password & role wajib diisi','err')
    return
  }
  if (telegramId && isNaN(Number(telegramId))) {
    UI.status('add-usr-status','Telegram ID harus berupa angka','err')
    return
  }

  UI.busy('add-usr-btn', true)
  UI.status('add-usr-status','')
  try {
    const f     = await API.roles()
    const users = f.data.users || []
    if (users.find(u => u.username === username)) {
      UI.status('add-usr-status','Username sudah ada','err')
      return
    }
    const newUser = { username, password, role }
    if (telegramId) newUser.telegramId = Number(telegramId)
    users.push(newUser)
    await API.saveRoles(f.sha, users, 'add user')
    await API.appendLog({ who:STATE.user.username, role:STATE.user.role, action:'tambah user', detail:`${username} (${role})` })
    UI.status('add-usr-status',`${username} berhasil ditambahkan ✓`,'ok')
    document.getElementById('add-u-name').value = ''
    document.getElementById('add-u-tid').value  = ''
    document.getElementById('add-u-pass').value = ''
    document.getElementById('add-u-role').value = ''
    renderUserList(users)
    refreshHomeStats()
  } catch (e) { UI.status('add-usr-status','Error: '+e.message,'err') }
  finally { UI.busy('add-usr-btn', false, '+ ADD USER') }
}

/* ══════════════════════════════════════
   DELETE VIEW
══════════════════════════════════════ */
function renderDelete() {
  document.getElementById('del-user-section').style.display = can('DEL_USER') ? '' : 'none'
}

async function delTokenByValue() {
  const val = document.getElementById('del-tok-input').value.trim()
  if (!val) { UI.status('del-tok-status','Masukkan token dulu','err'); return }
  promptDel('tok-val', val, `token ini`)
}

/* ══════════════════════════════════════
   MODALS
══════════════════════════════════════ */

/* ── Confirm Delete ── */
function promptDel(type, payload, label) {
  STATE.pendingDel = { type, payload }
  const desc = document.getElementById('modal-del-desc')
  if (desc) desc.textContent = `"${label}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
  UI.openModal('modal-del')
}

function closeDelModal() {
  UI.closeModal('modal-del')
  STATE.pendingDel = null
}

async function confirmDelete() {
  const p = STATE.pendingDel
  if (!p) return
  closeDelModal()
  try {
    if (p.type === 'tok-idx') {
      const f = await API.tokens()
      const removed = f.data.tokens.splice(p.payload, 1)[0]
      await API.saveTokens(f.sha, f.data.tokens, 'del token')
      await API.appendLog({ who:STATE.user.username, role:STATE.user.role, action:'hapus token', detail:maskToken(removed) })
      renderTokenList(f.data.tokens)
      refreshHomeStats()
      UI.toast('Token dihapus','ok')
    }
    if (p.type === 'tok-val') {
      const f   = await API.tokens()
      const idx = f.data.tokens.indexOf(p.payload)
      if (idx < 0) { UI.toast('Token tidak ditemukan','err'); return }
      const removed = f.data.tokens.splice(idx,1)[0]
      await API.saveTokens(f.sha, f.data.tokens, 'del token')
      await API.appendLog({ who:STATE.user.username, role:STATE.user.role, action:'hapus token', detail:maskToken(removed) })
      document.getElementById('del-tok-input').value = ''
      UI.status('del-tok-status','Token dihapus ✓','ok')
      refreshHomeStats()
      UI.toast('Token dihapus','ok')
    }
    if (p.type === 'user') {
      const f     = await API.roles()
      const users = f.data.users.filter(u => u.username !== p.payload)
      await API.saveRoles(f.sha, users, 'del user')
      await API.appendLog({ who:STATE.user.username, role:STATE.user.role, action:'hapus user', detail:p.payload })
      renderUserList(users)
      document.getElementById('del-usr-input').value = ''
      UI.status('del-usr-status',`${p.payload} dihapus ✓`,'ok')
      refreshHomeStats()
      UI.toast('User dihapus','ok')
    }
  } catch (e) { UI.toast('Error: '+e.message,'err') }
}

/* ── Edit Role ── */
function openEditModal(username, currentRole) {
  STATE.editingUser = username
  const un = document.getElementById('modal-edit-uname')
  if (un) un.textContent = username
  const sel = document.getElementById('modal-role-sel')
  if (sel) sel.value = currentRole
  UI.status('modal-edit-status','')
  UI.openModal('modal-edit')
}

function closeEditModal() {
  UI.closeModal('modal-edit')
  STATE.editingUser = null
}

async function confirmEditRole() {
  const newRole = document.getElementById('modal-role-sel').value
  if (!newRole) { UI.status('modal-edit-status','Pilih role dulu','err'); return }
  UI.status('modal-edit-status','Menyimpan...')
  try {
    const f     = await API.roles()
    const users = f.data.users
    const idx   = users.findIndex(u => u.username === STATE.editingUser)
    if (idx < 0) throw new Error('User tidak ditemukan')
    const old = users[idx].role
    users[idx].role = newRole
    await API.saveRoles(f.sha, users, 'edit role')
    await API.appendLog({ who:STATE.user.username, role:STATE.user.role, action:'edit role', detail:`${STATE.editingUser}: ${old}→${newRole}` })
    closeEditModal()
    renderUserList(users)
    refreshHomeStats()
    UI.toast(`Role ${STATE.editingUser} diperbarui ✓`)
  } catch (e) { UI.status('modal-edit-status','Error: '+e.message,'err') }
}

/* ── Delete User from Delete page ── */
async function delUserByName() {
  const val = document.getElementById('del-usr-input').value.trim()
  if (!val) { UI.status('del-usr-status','Masukkan username dulu','err'); return }
  promptDel('user', val, `user "${val}"`)
}

/* ── Refresh home counters only ── */
async function refreshHomeStats() {
  try {
    const [tokF, roleF] = await Promise.all([API.tokens(), API.roles()])
    const ttok = document.getElementById('h-total-tok')
    const tusr = document.getElementById('h-total-usr')
    if (ttok) ttok.textContent = (tokF.data.tokens||[]).length
    if (tusr) tusr.textContent = (roleF.data.users||[]).length
  } catch {}
}

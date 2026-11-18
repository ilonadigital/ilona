/* Ads Profit Analyzer — Cloud Sync (Supabase)
 * Menyimpan semua data tool (localStorage "apa_*") ke cloud per akun, lalu
 * menyinkronkannya ke perangkat lain yang login dengan akun yang sama.
 * Dipasang lewat: <script src="/adsaanalyzer/cloud.js"></script> sebelum script utama.
 */
(function () {
  'use strict';

  var SB_URL = 'https://lfckdhqhwcddehpnueqe.supabase.co';
  var SB_KEY = 'sb_publishable_nXffixWBrPOkPatR1mBEnw_P3KVYKsv';
  var LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js';
  var TABLE = 'apa_kv';
  var META = 'apa__sync';
  var AUTH_KEY = 'apa-cloud-auth';
  var SKIP = { apa_theme: 1, apa__sync: 1 };

  var ls;
  try { ls = window.localStorage; ls.getItem('x'); } catch (e) { return; }
  if (!ls || SB_URL.indexOf('__') === 0) return;

  var P = Storage.prototype, _get = P.getItem, _set = P.setItem, _rem = P.removeItem;
  var g = function (k) { return _get.call(ls, k); };
  var s = function (k, v) { _set.call(ls, k, v); };
  var r = function (k) { _rem.call(ls, k); };
  var syncable = function (k) { return typeof k === 'string' && k.indexOf('apa_') === 0 && !SKIP[k]; };
  var localKeys = function () { var a = []; for (var i = 0; i < ls.length; i++) { var k = ls.key(i); if (syncable(k)) a.push(k); } return a; };

  function loadMeta() {
    try { var m = JSON.parse(g(META) || 'null'); if (m && typeof m === 'object') { m.st = m.st || {}; m.d = m.d || {}; return m; } } catch (e) {}
    return { user: null, st: {}, d: {} };
  }
  var M = loadMeta();
  var bootT = Date.now(), booting = true;
  function saveMeta() { try { s(META, JSON.stringify(M)); } catch (e) {} }

  /* ---------- catat setiap perubahan data lokal ---------- */
  function mark(k) { if (!M.user) return; M.d[k] = Date.now(); saveMeta(); schedule(); }
  P.setItem = function (k, v) {
    var watch = this === ls && syncable(k), same = false;
    if (watch) { try { same = _get.call(this, k) === String(v); } catch (e) {} }
    _set.call(this, k, v);
    if (watch && !same) mark(k);
  };
  P.removeItem = function (k) {
    var had = this === ls && syncable(k) && _get.call(this, k) !== null;
    _rem.call(this, k);
    if (had) mark(k);
  };

  /* ---------- layar "memuat" saat membuka dengan sesi aktif ---------- */
  var html = document.documentElement;
  var css = document.createElement('style');
  css.textContent = [
    'html.apc-loading::after{content:"Memuat data dari cloud\\2026";position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:var(--bg,#f5f5f7);color:var(--label-2,#6e6e73);font:500 15px Inter,-apple-system,system-ui,sans-serif}',
    'html.apc-loading body{overflow:hidden}',
    '.apc-side{display:flex;align-items:center;gap:10px;width:100%;margin:6px 0 2px;padding:7px 10px;border:1px solid var(--sep);border-radius:12px;background:var(--card);color:var(--label);text-align:left;font:inherit;cursor:pointer;box-shadow:var(--shadow)}',
    '.apc-side:hover{background:var(--card-2)}',
    '.apc-ico{position:relative;flex:none;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-ink)}',
    '.apc-dot{position:absolute;right:-2px;bottom:-2px;width:10px;height:10px;border-radius:50%;border:2px solid var(--card);background:var(--gray)}',
    '.apc-dot.ok{background:var(--green)}.apc-dot.save{background:var(--orange)}.apc-dot.err{background:var(--red)}',
    '.apc-side b{display:block;font-size:13px;font-weight:600;line-height:1.3}',
    '.apc-side .s{display:block;font-size:11.5px;color:var(--label-2);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.apc-fab{display:none;position:fixed;right:14px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:45;width:44px;height:44px;border-radius:50%;border:1px solid var(--sep);background:var(--elev);color:var(--accent-ink);box-shadow:0 6px 20px rgba(0,0,0,.14);place-items:center;cursor:pointer}',
    '.apc-fab .apc-dot{right:4px;bottom:4px;border-color:var(--elev)}',
    '@media (max-width:860px){.apc-fab{display:grid}}',
    '.ask-card.apc-card{text-align:left}',
    '.ask-card.apc-card h3,.ask-card.apc-card>p{text-align:center}',
    '.apc-top{display:none;position:fixed;top:calc(14px + env(safe-area-inset-top));right:16px;z-index:71;align-items:center;gap:8px;padding:8px 14px 8px 10px;border-radius:980px;border:1px solid var(--sep);background:var(--card);color:var(--accent-ink);font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;box-shadow:var(--shadow)}',
    '.apc-f{display:block;margin:0 0 10px}',
    '.apc-f span{display:block;font-size:12.5px;font-weight:500;color:var(--label-2);margin:0 0 5px}',
    '.apc-f input{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:11px;border:1px solid var(--sep-strong);background:var(--card);color:var(--label);font:inherit;font-size:15px}',
    '.apc-f input:focus{outline:2px solid var(--accent);outline-offset:-1px;border-color:transparent}',
    '.apc-err{min-height:18px;margin:2px 0 10px;font-size:13px;color:var(--red-ink);text-align:center}',
    '.apc-sw{margin:12px 0 0;text-align:center;font-size:13.5px;color:var(--label-2)}',
    '.apc-sw button{border:0;background:none;color:var(--accent-ink);font:inherit;font-weight:600;cursor:pointer;padding:2px}',
    '.apc-acct{background:var(--fill-3);border-radius:12px;padding:12px 14px;margin:0 0 14px;font-size:13.5px;line-height:1.5}',
    '.apc-acct b{display:block;font-size:14.5px;word-break:break-all}',
    '.apc-acct span{color:var(--label-2)}',
    '.apc-banner{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:96;background:var(--elev);color:var(--label);border-radius:14px;padding:10px 12px 10px 16px;display:flex;gap:12px;align-items:center;font-size:14px;box-shadow:0 10px 36px rgba(0,0,0,.16),0 0 0 .5px var(--sep);max-width:calc(100% - 32px)}'
  ].join('\n');
  (document.head || html).appendChild(css);

  var hadSession = !!g(AUTH_KEY) && !!M.user;
  var loadT = null;
  function loading(on) {
    clearTimeout(loadT);
    html.classList.toggle('apc-loading', !!on);
    if (on) loadT = setTimeout(function () { html.classList.remove('apc-loading'); }, 8000);
  }
  if (hadSession) loading(true);

  /* ---------- state & UI ---------- */
  var client = null, user = null, state = 'off', lastOk = 0, errMsg = '';
  var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/></svg>';
  var side = null, fab = null, top = null;
  // Teks lama tool yang menyebut data hanya di perangkat ini (no-op bila HTML sudah diperbarui)
  var COPY = [["tidak ada data yang dikirim ke mana pun", "data hanya disimpan ke cloud jika Anda masuk ke akun"], ["Data tiap toko tersimpan terpisah di browser ini", "Data tiap toko tersimpan terpisah, dan ikut tersinkron ke cloud saat Anda masuk ke akun"], ["Kolaborasi tim secara real-time butuh server, sedangkan aplikasi ini menyimpan semua data hanya di perangkat Anda. Untuk bekerja bersama tim: bagikan file toko, lalu anggota tim mengimpornya di perangkat masing-masing. Ulangi setiap ada laporan baru.", "Masuk ke akun cloud yang sama untuk membuka data semua toko dari laptop atau HP mana pun. Untuk anggota tim dengan akun sendiri: bagikan file toko, lalu mereka mengimpornya di perangkat masing-masing."], ["Data tersimpan di browser ini saja. Simpan backup secara berkala atau sebelum pindah perangkat.", "Data tersimpan di browser ini, dan ikut tersimpan di cloud jika Anda masuk ke akun. Simpan backup secara berkala."], ["Semua toko di browser ini", "Semua toko di browser ini (dan di cloud jika masuk)"]];
  function fixNode(n) { var t = n.nodeValue; if (!t || t.length < 20) return; for (var i = 0; i < COPY.length; i++) if (t.indexOf(COPY[i][0]) >= 0 && t.indexOf(COPY[i][1]) < 0) t = t.split(COPY[i][0]).join(COPY[i][1]); if (t !== n.nodeValue) n.nodeValue = t; }
  function patchCopy(root) { root = root || document.body; if (!root) return; if (root.nodeType === 3) return fixNode(root); if (root.nodeType !== 1) return; var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n; while ((n = w.nextNode())) fixNode(n); }
  function syncTop() { if (!top) return; var onb = document.getElementById('onb'); top.style.display = !user && onb && !onb.classList.contains('hidden') ? 'flex' : 'none'; }

  function statusText() {
    if (!user && !client && hadSession) return 'Menghubungkan…';
    if (!user) return 'Masuk agar data aman di cloud';
    if (state === 'save' || state === 'sync') return 'Menyimpan ke cloud…';
    if (state === 'err') return navigator.onLine === false ? 'Offline — disimpan saat online' : 'Gagal sinkron — ketuk untuk coba lagi';
    return 'Tersimpan di cloud';
  }
  function dotClass() { return !user ? '' : state === 'err' ? 'err' : (state === 'save' || state === 'sync') ? 'save' : 'ok'; }
  function render() {
    var dot = '<span class="apc-dot ' + dotClass() + '"></span>';
    if (side) {
      side.innerHTML = '<span class="apc-ico">' + ICON + (user ? dot : '') + '</span><span style="flex:1;min-width:0"><b></b><span class="s"></span></span>';
      side.querySelector('b').textContent = user ? (user.email || 'Akun cloud') : (!client && hadSession) ? 'Akun cloud' : 'Simpan ke cloud';
      side.querySelector('.s').textContent = statusText();
    }
    if (fab) { fab.innerHTML = ICON + (user ? dot : ''); fab.setAttribute('aria-label', user ? 'Akun cloud' : 'Simpan ke cloud'); }
    if (modal && modal.dataset.view === 'acct') fillAcct();
    syncTop();
  }
  function setState(st, e) { state = st; if (st === 'ok') lastOk = Date.now(); if (e) errMsg = (e && e.message) || String(e); render(); }

  function mountUI() {
    var store = document.getElementById('sbStore');
    if (store && !side) {
      side = document.createElement('button');
      side.type = 'button'; side.className = 'apc-side'; side.addEventListener('click', openModal);
      store.parentNode.insertBefore(side, store.nextSibling);
    }
    if (!fab) {
      fab = document.createElement('button');
      fab.type = 'button'; fab.className = 'apc-fab'; fab.addEventListener('click', openModal);
      document.body.appendChild(fab);
    }
    if (!top) {
      top = document.createElement('button');
      top.type = 'button'; top.className = 'apc-top'; top.innerHTML = ICON + '<span>Sudah punya akun? Masuk</span>';
      top.addEventListener('click', function () { mode = 'in'; openModal(); });
      document.body.appendChild(top);
      new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) patchCopy(ms[i].addedNodes[j]); syncTop(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    patchCopy();
    render();
  }

  /* ---------- modal login / akun ---------- */
  var modal = null, mode = 'in';
  function openModal() {
    if (user && state === 'err') { push(); }
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'ask';
      modal.innerHTML = '<div class="scrim" data-apc="close"></div><div class="ask-card apc-card" role="dialog" aria-modal="true"></div>';
      modal.addEventListener('click', function (e) { var t = e.target.closest('[data-apc]'); if (t) onAct(t.getAttribute('data-apc'), e); });
      modal.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
      document.addEventListener('keydown', function (e) { if (modal && !modal.classList.contains('hidden') && e.key === 'Escape') closeModal(); });
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
    if (user) { modal.dataset.view = 'acct'; fillAcct(); } else { modal.dataset.view = 'login'; fillLogin(); }
  }
  function closeModal() { if (modal) { modal.classList.add('hidden'); modal.dataset.view = ''; } }
  function card() { return modal.querySelector('.apc-card'); }

  function fillLogin() {
    var up = mode === 'up';
    card().innerHTML =
      '<h3>' + (up ? 'Buat akun cloud' : 'Masuk ke cloud') + '</h3>' +
      '<p>' + (up ? 'Data semua toko di perangkat ini akan disimpan ke akun baru Anda.' : 'Data toko tersimpan di cloud dan bisa dibuka dari laptop atau HP mana pun.') + '</p>' +
      '<form novalidate>' +
      '<label class="apc-f"><span>Email</span><input type="email" name="email" autocomplete="email" required></label>' +
      '<label class="apc-f"><span>Password' + (up ? ' (min. 6 karakter)' : '') + '</span><input type="password" name="pw" autocomplete="' + (up ? 'new-password' : 'current-password') + '" required minlength="6"></label>' +
      '<div class="apc-err" id="apcErr"></div>' +
      '<div class="ask-act"><button type="button" class="btn" data-apc="close">Batal</button><button type="submit" class="btn primary" id="apcGo">' + (up ? 'Daftar' : 'Masuk') + '</button></div>' +
      '</form>' +
      '<div class="apc-sw">' + (up ? 'Sudah punya akun? <button type="button" data-apc="in">Masuk</button>' : 'Belum punya akun? <button type="button" data-apc="up">Daftar</button>') + '</div>';
    setTimeout(function () { var i = card().querySelector('input[name=email]'); if (i) i.focus(); }, 30);
  }
  function fmtTime(t) { if (!t) return '—'; var d = new Date(t); return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function fillAcct() {
    card().innerHTML =
      '<h3>Akun cloud</h3><p>Data semua toko otomatis tersimpan dan tersinkron ke perangkat lain yang masuk dengan akun ini.</p>' +
      '<div class="apc-acct"><b></b><span class="apc-st"></span><br><span>Terakhir tersimpan: ' + fmtTime(lastOk) + '</span></div>' +
      '<div class="apc-err">' + (state === 'err' && errMsg ? 'Detail: ' + esc(errMsg) : '') + '</div>' +
      '<div class="ask-act"><button type="button" class="btn danger" data-apc="out">Keluar</button><button type="button" class="btn primary" data-apc="now">Sinkron sekarang</button></div>' +
      '<div class="apc-sw"><button type="button" data-apc="close">Tutup</button></div>';
    card().querySelector('b').textContent = user ? user.email : '';
    card().querySelector('.apc-st').textContent = statusText();
  }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function onAct(a) {
    if (a === 'close') closeModal();
    else if (a === 'in' || a === 'up') { mode = a; fillLogin(); }
    else if (a === 'now') { pull(false).then(function (n) { if (n > 0) reload(); else return push(); }).catch(function (e) { setState('err', e); }); }
    else if (a === 'out') logout();
  }

  function errText(e) {
    var m = (e && (e.message || e.error_description)) || String(e || '');
    if (/invalid login credentials/i.test(m)) return 'Email atau password salah.';
    if (/already registered|already exists/i.test(m)) return 'Email ini sudah terdaftar — silakan masuk.';
    if (/password should be at least|weak/i.test(m)) return 'Password minimal 6 karakter.';
    if (/email not confirmed/i.test(m)) return 'Email belum dikonfirmasi. Cek kotak masuk Anda.';
    if (/invalid.*email|email.*invalid/i.test(m)) return 'Format email tidak valid.';
    if (/rate limit|too many/i.test(m)) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
    if (/fetch|network|load failed/i.test(m)) return 'Tidak bisa terhubung. Cek koneksi internet.';
    return m || 'Terjadi kesalahan. Coba lagi.';
  }

  var submitting = false;
  function submit() {
    if (submitting) return;
    var f = card().querySelector('form'), em = f.email.value.trim(), pw = f.pw.value, err = card().querySelector('#apcErr'), go = card().querySelector('#apcGo');
    if (!/^\S+@\S+\.\S+$/.test(em)) { err.textContent = 'Isi email yang valid.'; f.email.focus(); return; }
    if (pw.length < 6) { err.textContent = 'Password minimal 6 karakter.'; f.pw.focus(); return; }
    if (!client) { err.textContent = 'Layanan cloud belum siap. Muat ulang halaman.'; return; }
    submitting = true; err.textContent = ''; go.disabled = true; go.textContent = mode === 'up' ? 'Mendaftar…' : 'Masuk…';
    var p = mode === 'up' ? client.auth.signUp({ email: em, password: pw }) : client.auth.signInWithPassword({ email: em, password: pw });
    p.then(function (res) {
      if (res.error) throw res.error;
      var ses = res.data && res.data.session;
      if (!ses) { err.style.color = 'var(--green-ink)'; err.textContent = 'Akun dibuat. Cek email untuk konfirmasi, lalu masuk.'; mode = 'in'; return; }
      user = ses.user; closeModal(); setState('sync');
      return firstSync();
    }).catch(function (e) { if (err.isConnected) err.textContent = errText(e); })
      .then(function () { submitting = false; if (go.isConnected) { go.disabled = false; go.textContent = mode === 'up' ? 'Daftar' : 'Masuk'; } });
  }

  /* ---------- sinkronisasi ---------- */
  function hasRealData() {
    return localKeys().some(function (k) {
      if (!/^apa_st_.+_(hist|raw|hpp|stock|exp)$/.test(k)) return false;
      var v = g(k); return v && v !== '{}' && v !== '[]' && v !== 'null' && !/^\{"ads":null,"prod":null/.test(v);
    });
  }
  function askUser(title, msg, ok) {
    if (typeof window.ask === 'function') return window.ask(title, msg, ok);
    return Promise.resolve(window.confirm(title + '\n\n' + msg));
  }
  function note(msg, ok) { if (typeof window.toast === 'function') window.toast(msg, ok !== false); }

  async function remoteIndex() {
    var res = await client.from(TABLE).select('key,updated_at').eq('user_id', user.id);
    if (res.error) throw res.error;
    var idx = {}; res.data.forEach(function (x) { idx[x.key] = x.updated_at; });
    return idx;
  }
  async function fetchApply(keys) {
    var n = 0;
    for (var i = 0; i < keys.length; i += 40) {
      var res = await client.from(TABLE).select('key,value,updated_at').eq('user_id', user.id).in('key', keys.slice(i, i + 40));
      if (res.error) throw res.error;
      res.data.forEach(function (row) {
        if (row.value === null) { if (g(row.key) !== null) { r(row.key); n++; } }
        else if (g(row.key) !== row.value) { s(row.key, row.value); n++; }
        M.st[row.key] = row.updated_at; delete M.d[row.key];
      });
    }
    return n;
  }

  // Login pertama di perangkat ini untuk akun ini
  async function firstSync() {
    try {
      var idx = await remoteIndex(), rk = Object.keys(idx), lk = localKeys();
      var useCloud = rk.length > 0;
      if (rk.length && hasRealData()) {
        useCloud = await askUser('Pakai data dari cloud?', 'Akun ini sudah punya data di cloud, dan perangkat ini juga punya data. Pilih "Pakai cloud" untuk mengganti data di perangkat ini dengan data cloud, atau Batal untuk mengunggah data perangkat ini ke cloud (data cloud lama diganti).', 'Pakai cloud');
      }
      M = { user: user.id, st: {}, d: {} };
      var now = Date.now();
      if (useCloud) {
        lk.forEach(function (k) { if (!(k in idx)) r(k); });
        saveMeta();
        await fetchApply(rk);
        saveMeta();
        reload();
        return;
      }
      lk.forEach(function (k) { M.d[k] = now; });
      rk.forEach(function (k) { if (lk.indexOf(k) < 0) M.d[k] = now; });
      saveMeta();
      await push();
      note('Data tersimpan di cloud');
    } catch (e) { setState('err', e); note(errText(e), false); }
  }

  // Ambil perubahan dari perangkat lain. Mengembalikan jumlah key yang berubah.
  async function pull(apply) {
    if (!user) return 0;
    var idx = await remoteIndex(), need = [], gone = [];
    Object.keys(idx).forEach(function (k) {
      if (idx[k] === M.st[k]) return;
      if (M.d[k] && M.d[k] > Date.parse(idx[k]) && !(booting && M.d[k] >= bootT)) return;
      need.push(k);
    });
    Object.keys(M.st).forEach(function (k) { if (!(k in idx) && !M.d[k]) gone.push(k); });
    if (apply === false) return need.length + gone.filter(function (k) { return g(k) !== null; }).length;
    var n = 0;
    gone.forEach(function (k) { if (g(k) !== null) { r(k); n++; } delete M.st[k]; });
    if (need.length) n += await fetchApply(need);
    saveMeta();
    return n;
  }

  var busy = false, again = false, pushT = null, retryT = null;
  function schedule(ms) { if (!user || booting) return; if (state !== 'err') setState('save'); clearTimeout(pushT); pushT = setTimeout(push, ms == null ? 1500 : ms); }
  async function push() {
    if (!user) return;
    if (busy) { again = true; return; }
    clearTimeout(pushT); clearTimeout(retryT);
    var keys = Object.keys(M.d);
    if (!keys.length) { setState('ok'); return; }
    busy = true; setState('save');
    try {
      var stamp = {}, ups = [], dels = [];
      keys.forEach(function (k) { stamp[k] = M.d[k]; var v = g(k); if (v === null) dels.push(k); else ups.push({ user_id: user.id, key: k, value: v }); });
      var batch = [], size = 0;
      var flush = async function () {
        if (!batch.length) return;
        var res = await client.from(TABLE).upsert(batch, { onConflict: 'user_id,key' }).select('key,updated_at');
        if (res.error) throw res.error;
        res.data.forEach(function (x) { M.st[x.key] = x.updated_at; if (M.d[x.key] === stamp[x.key]) delete M.d[x.key]; });
        saveMeta(); batch = []; size = 0;
      };
      for (var i = 0; i < ups.length; i++) {
        var len = ups[i].value.length;
        if (batch.length && size + len > 1500000) await flush();
        batch.push(ups[i]); size += len;
      }
      await flush();
      if (dels.length) {
        var d = await client.from(TABLE).delete().eq('user_id', user.id).in('key', dels);
        if (d.error) throw d.error;
        dels.forEach(function (k) { delete M.st[k]; if (M.d[k] === stamp[k]) delete M.d[k]; });
        saveMeta();
      }
      setState(Object.keys(M.d).length ? 'save' : 'ok');
    } catch (e) {
      setState('err', e);
      retryT = setTimeout(push, 20000);
    } finally {
      busy = false;
      if (again) { again = false; schedule(300); }
    }
  }

  function reload() {
    var n = 0; try { n = +(sessionStorage.getItem('apc-rl') || 0); } catch (e) {}
    if (n >= 2) { loading(false); return; }
    try { sessionStorage.setItem('apc-rl', String(n + 1)); } catch (e) {}
    loading(true);
    location.reload();
  }

  async function logout() {
    var pending = Object.keys(M.d).length;
    if (pending) { try { await push(); } catch (e) {} pending = Object.keys(M.d).length; }
    var ok = await askUser('Keluar dari akun cloud?', (pending ? 'Ada perubahan yang BELUM tersimpan ke cloud dan akan hilang. ' : 'Data tetap aman di cloud. ') + 'Data toko di perangkat ini akan dihapus dari browser ini.', 'Keluar');
    if (!ok) return;
    try { await client.auth.signOut({ scope: 'local' }); } catch (e) {}
    localKeys().forEach(function (k) { r(k); });
    r(META); r(AUTH_KEY);
    try { sessionStorage.removeItem('apa_view'); } catch (e) {}
    location.reload();
  }

  var lastPull = 0;
  async function bootSync() {
    try {
      var n = await pull(true);
      lastPull = Date.now();
      try { sessionStorage.removeItem('apc-rl'); } catch (e) {}
      if (n > 0) { reload(); return; }
      booting = false; loading(false);
      await push();
    } catch (e) { booting = false; loading(false); setState('err', e); retryT = setTimeout(push, 20000); }
  }
  async function focusCheck() {
    if (!user || busy || Date.now() - lastPull < 15000) return;
    lastPull = Date.now();
    try {
      if (Object.keys(M.d).length) await push();
      var n = await pull(false);
      if (n > 0) showBanner();
    } catch (e) {}
  }
  var banner = null;
  function showBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'apc-banner';
    banner.innerHTML = '<span>Ada data baru dari perangkat lain.</span><button type="button" class="btn primary sm">Muat ulang</button>';
    banner.querySelector('button').addEventListener('click', function () { bootSync(); });
    document.body.appendChild(banner);
  }

  /* ---------- start ---------- */
  function start() {
    if (!window.supabase || !window.supabase.createClient) { booting = false; loading(false); return; }
    client = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: AUTH_KEY } });
    client.auth.getSession().then(function (res) {
      var ses = res.data && res.data.session;
      user = ses ? ses.user : null;
      if (user && M.user !== user.id) { booting = false; loading(false); render(); return firstSync(); }
      if (!user) { booting = false; loading(false); render(); return; }
      setState('sync');
      return bootSync();
    }).catch(function (e) { booting = false; loading(false); setState('err', e); });
    client.auth.onAuthStateChange(function (ev, ses) {
      if (ev === 'SIGNED_OUT') { user = null; render(); }
      else if (ses && ses.user) { user = ses.user; }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { if (user && Object.keys(M.d).length) push(); }
      else focusCheck();
    });
    window.addEventListener('online', function () { if (user) push(); });
  }

  function onReady(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  onReady(mountUI);
  var tag = document.createElement('script');
  tag.src = LIB; tag.async = true;
  tag.onload = function () { onReady(start); };
  tag.onerror = function () { loading(false); setState('err', new Error('Gagal memuat layanan cloud')); };
  (document.head || html).appendChild(tag);
})();

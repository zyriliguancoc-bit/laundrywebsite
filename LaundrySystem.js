let role = 'customer';
let miniSidebar = false;
let currentEditUser = null;
// Holds currently logged-in user (set on successful login)
window.currentUser = null;

// ===== CACHE SYSTEM FOR LOGIN =====
const userCache = {}; // {username: {data, timestamp}}
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

window.getCachedUser = function(username) {
  const cached = userCache[username.toLowerCase()];
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('✅ Using cached user data for:', username);
    return cached.data;
  }
  return null;
}

window.setCachedUser = function(username, userData) {
  userCache[username.toLowerCase()] = {
    data: userData,
    timestamp: Date.now()
  };
  console.log('💾 Cached user data for:', username);
}

// ===== MATH CAPTCHA SYSTEM =====
let captchaData = null;

function generateMathCaptcha() {
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  const operator = '+';
  
  let answer;
  answer = num1 + num2;
  
  captchaData = {
    question: `${num1} ${operator} ${num2} = `,
    answer: answer
  };
  
  const questionDisplay = document.getElementById('captchaQuestionDisplay');
  const answerInput = document.getElementById('captchaAnswer');
  
  if (questionDisplay) {
    questionDisplay.textContent = captchaData.question;
  }
  if (answerInput) {
    answerInput.value = '';
  }
  
  console.log('🧮 Math CAPTCHA generated:', captchaData.question);
}

function validateCaptcha() {
  if (!captchaData) {
    console.warn('❌ CAPTCHA not initialized');
    return false;
  }
  
  const answerInput = document.getElementById('captchaAnswer');
  const captchaError = document.getElementById('captchaError');
  
  if (!answerInput || !answerInput.value) {
    if (captchaError) {
      captchaError.textContent = 'Please solve the math CAPTCHA';
      captchaError.style.display = 'block';
    }
    return false;
  }
  
  const userAnswer = parseInt(answerInput.value);
  
  if (userAnswer !== captchaData.answer) {
    if (captchaError) {
      captchaError.textContent = '❌ Incorrect answer. Try again!';
      captchaError.style.display = 'block';
    }
    // Generate new CAPTCHA on wrong answer
    generateMathCaptcha();
    return false;
  }
  
  if (captchaError) {
    captchaError.style.display = 'none';
    captchaError.textContent = '';
  }
  
  console.log('✅ CAPTCHA validation passed');
  return true;
}

const cNav = [
  {id:'dashboard',icon:'🏠',label:'Home'},
  {id:'book-laundry',icon:'🧺',label:'Book Laundry'},
  {id:'my-laundry-status',icon:'📋',label:'My Laundry'},
  {id:'archive',icon:'🗄️',label:'Archive'},
  {id:'set-address',icon:'📍',label:'Set Address'},
  {id:'notifications',icon:'🔔',label:'Notifications'},
  {id:'profile',icon:'👤',label:'Profile'},
];
const aNav = [
  {id:'admin-dashboard',icon:'📊',label:'Dashboard'},
  {id:'user-management',icon:'👥',label:'User Management'},
  {id:'laundry-management',icon:'🧼',label:'Laundry Management'},
  {id:'archive',icon:'🗄️',label:'Archive'},
  {id:'configuration',icon:'⚙️',label:'Configuration'},
  {id:'notifications',icon:'🔔',label:'Notifications'},
  {id:'profile',icon:'👤',label:'Profile'},
];
const dNav = [
  {id:'delivery-dashboard',icon:'🚚',label:'Dashboard'},
  {id:'delivery-tasks',icon:'📦',label:'My Tasks'},
  {id:'map',icon:'🗺️',label:'Map'},
  {id:'delivery-history',icon:'📜',label:'Completed Deliveries'},
  {id:'archive',icon:'🗄️',label:'Archive'},
  {id:'delivery-notifications',icon:'🔔',label:'Notifications'},
  {id:'delivery-profile',icon:'👤',label:'Profile'},
];
const titles = {
  'dashboard':'Dashboard','book-laundry':'Book Laundry','booking-summary':'Booking Summary',
  'map':'Map',
  'my-laundry-status':'My Laundry','archive':'Archive','set-address':'Set Address',
  'notifications':'Notifications','profile':'My Profile','edit-profile':'Edit Profile',
  'change-password':'Change Password','admin-dashboard':'Dashboard',
  'bookings':'📋 All Bookings','pending':'⏳ Pending Bookings','completed':'✅ Completed Bookings','active-users':'🧑‍🤝‍🧑 Active Users',
  'user-management':'👤 User Management','add-user':'Add / Edit User',
  'laundry-management':'🧼 Laundry Management','messaging':'💬 Messages & Notifications',
  'configuration':'⚙️ Configuration',
  'delivery-dashboard':'Dashboard','delivery-tasks':'My Tasks','delivery-history':'Completed Deliveries','delivery-notifications':'Notifications',
  'delivery-profile':'My Profile',
};

// ---------------- Status Tracking ----------------
// ordered list of all possible statuses that will be displayed to customers
const STATUS_STEPS = [
  {status:'Order Placed', desc:'Customer submits a laundry booking request through the system.'},
  {status:'Pending Confirmation', desc:'Booking request is received and waiting for shop approval.'},
  {status:'Confirmed', desc:'Shop approves the booking and schedules pickup.'},
  {status:'Rider Assigned', desc:'A rider is assigned to handle the pickup.'},
  {status:'For Pickup', desc:'Rider is on the way to the customer?s location.'},
  {status:'Picked Up', desc:'Laundry has been collected from the customer.'},
  {status:'Received at Shop', desc:'Laundry arrived at the shop and is weighed. Total price is computed.'},
  {status:'On Washing', desc:'Clothes are currently being washed.'},
  {status:'On Drying', desc:'Clothes are being dried.'},
  {status:'On Folding / Ironing', desc:'Clothes are being folded or pressed.'},
  {status:'Ready for Pickup', desc:'Laundry is fully finished and ready to be dispatched.'},
  {status:'Ready for Delivery', desc:'Laundry is prepared and scheduled for return to the customer.'},
  {status:'Out for Delivery', desc:'Rider is delivering the laundry to the customer.'},
  {status:'Delivered', desc:'Customer has received the laundry.'},
  {status:'Payment Received', desc:'Customer pays in cash upon delivery.'},
  {status:'Completed', desc:'Transaction is fully finished and officially closed in the system.'},
];

function normalizeStatus(s) {
  if (!s) return '';
  const map = {
    'Placed':'Order Placed',
    'Pending':'Pending Confirmation',
    'Processing':'On Washing',
    // keep others unchanged
  };
  return map[s] || s;
}
function getStatusIndex(s) {
  const norm = normalizeStatus(s);
  return STATUS_STEPS.findIndex(x => x.status === norm);
}
function isCompleted(s) {
  const idx = getStatusIndex(s);
  const doneIdx = STATUS_STEPS.findIndex(x => x.status === 'Delivered');
  return idx >= doneIdx && idx !== -1;
}
function getBadgeClassForStatus(s) {
  const idx = getStatusIndex(s);
  if (idx === -1) return 'b-grey';
  if (isCompleted(s)) return 'b-done';
  if (idx <= getStatusIndex('For Pickup')) return 'b-warn';
  if (idx < getStatusIndex('Ready for Pickup')) return 'b-prog';
  if (idx < getStatusIndex('Delivered')) return 'b-pick';
  return 'b-grey';
}

function renderStatusTimeline(currentStatus) {
  const idx = getStatusIndex(currentStatus);
  let html = '<div class="track">';
  STATUS_STEPS.forEach((step, i) => {
    const done = i < idx;
    const cur = i === idx;
    html += '<div class="t-step">';
    html += '<div class="t-dw">';
    html += `<div class="t-dot${done? ' done': ''}${cur? ' cur': ''}"></div>`;
    if (i < STATUS_STEPS.length - 1) {
      html += `<div class="t-line${done? ' done': ''}"></div>`;
    }
    html += '</div>';
    html += '<div class="t-ct">';
    html += `<h4>${step.status}</h4>`;
    html += `<p>${step.desc}</p>`;
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

// ===== API Functions - All data now uses Supabase PostgreSQL database =====
// API calls are made directly to Supabase via the JavaScript SDK (no PHP endpoints)

// derive base from current origin so that http vs https is respected
// if user opens the HTML via file:// the origin will be "null" and the
// requests will fail; we display an alert in that case so they know to use
// http://localhost/ or another server URL.
// Update laundry status (persist to database)
async function updateLaundryStatus(orderId, newStatus) {
  try {
    const res = await apiSaveBooking({ BookID: orderId, Status: newStatus });
    if (res && res.success) {
      alert('Order #' + orderId + ' status updated to: ' + newStatus);
      renderBookingsList();
      return;
    }
  } catch (e) { console.error('updateLaundryStatus error', e); }
  alert('Failed to update status (check console)');
}
if (window.location.protocol === 'file:') {
  const msg = '⚠️ Application must be served via HTTP; open http://localhost/LaundrySystem.html or similar. API calls will fail under file://';
  alert(msg);
  // add a persistent warning banner at top of page if DOM is available
  window.addEventListener('DOMContentLoaded', () => {
    const warn = document.createElement('div');
    warn.id = 'file-protocol-warning';
    warn.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:#ffcccc;color:#900;padding:10px;text-align:center;z-index:1000;font-weight:700;';
    warn.textContent = msg;
    document.body.appendChild(warn);
    // disable auth buttons to prevent further network calls
    ['login','s1','s2','forgot','reset'].forEach(id => {
      const wrap = document.getElementById('auth-'+id);
      if (wrap) {
        const btns = wrap.querySelectorAll('button');
        btns.forEach(b=>b.disabled=true);
      }
    });
  });
}
// if the frontend is served from a different port (e.g. Live Server on 5500)
// we can't rely on window.location.origin because PHP is running on port 80.
// default to localhost:80/api unless origin is already the same host.
// ? Supabase is initialized in laundrysupabase.js
// Access via 'supabase' global variable

// Cache for Supabase client - avoid re-initializing
let _supabasePromise = null;
let _supabaseCheckAttempts = 0;

// Ensure supabase is available in global scope
const getSupabase = async () => {
  // If already cached and ready, return immediately
  if (_supabasePromise) {
    return _supabasePromise;
  }
  
  // Try to get from global scope first (cached in window)
  if (typeof window.supabase !== 'undefined' && window.supabase && typeof window.supabase.from === 'function') {
    _supabasePromise = Promise.resolve(window.supabase);
    return window.supabase;
  }
  
  // Wait for supabase to be initialized - cache the promise to avoid duplicate waits
  const start = Date.now();
  let checkCount = 0;
  const maxWait = 5 * 60 * 1000; // 5 minutes - very long timeout
  
  console.log('⏳ Waiting for Supabase SDK...');
  
  while (typeof window.supabase === 'undefined' || !window.supabase || typeof window.supabase.from !== 'function') {
    checkCount++;
    const elapsed = Date.now() - start;
    
    // Log progress less frequently
    if (checkCount % 100 === 0) { // Log every 10 seconds
      const seconds = Math.round(elapsed / 1000);
      console.log(`⏳ Waiting for Supabase (${seconds}s)...`);
    }
    
    if (elapsed > maxWait) {
      const seconds = Math.round(elapsed / 1000);
      console.error(`❌ Supabase SDK not available after ${seconds}s`);
      console.error('   This usually means:');
      console.error('   - Network connectivity issues');
      console.error('   - CDN unavailable: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      console.error('   - Check Browser DevTools > Network tab for failed requests');
      throw new Error(`Supabase SDK init failed after ${seconds}s - see console`);
    }
    
    await new Promise(r => setTimeout(r, 10));
  }
  
  // Cache the result for future calls
  _supabasePromise = Promise.resolve(window.supabase);
  const totalTime = Date.now() - start;
  console.log(`✅ [getSupabase] Supabase ready after ${Math.round(totalTime / 1000)}s!`);
  return window.supabase;
};

// Global Toast Utility
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Choose emoji based on type
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'warning') icon = '⚠️';
  
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px">
      <span>${icon}</span>
      <span>${message}</span>
    </div>
    <button style="background:none; border:none; color:rgba(255,255,255,0.7); cursor:pointer; font-size:1.2rem;">&times;</button>
  `;

  container.appendChild(toast);

  const autoRemove = setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 4000);

  toast.querySelector('button').onclick = () => {
    clearTimeout(autoRemove);
    toast.remove();
  };
}

// Use localStorage as the source of truth when true (revert to original localStorage behavior)
// Set to false to enable server API / MySQL backend
const USE_LOCALSTORAGE = false;

// Supabase REST API config (no SDK needed)
const SUPABASE_URL = 'https://vgkvoanuaxzoenpcctyh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_15jbix7mwFXwRiEyqwiBIQ_U6fQUVBa';

// Supabase REST API helper (no SDK, direct fetch calls)
async function supabaseQuery(table, filters = {}, select = '*') {
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    
    // Build filter query string
    for (const [key, value] of Object.entries(filters)) {
      url += `&${key}=eq.${encodeURIComponent(value)}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    
    if (!response.ok) {
      let errorMsg = `Query failed: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMsg += ` | Supabase error: ${JSON.stringify(errorData)}`;
      } catch (err) {
        // ignore JSON parse errors
      }
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    return data;
  } catch (e) {
    console.error('Supabase REST API error:', e);
    throw e;
  }
}

async function supabaseInsert(table, data) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Insert failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (e) {
    console.error('Supabase REST API insert error:', e);
    throw e;
  }
}

async function supabaseUpdate(table, data, filters = {}) {
  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    
    // Build filter query string
    let first = true;
    for (const [key, value] of Object.entries(filters)) {
      if (!first) url += '&';
      url += `${key}=eq.${encodeURIComponent(value)}`;
      first = false;
    }
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    
    let result = [];
    let debugText = '';
    if (!response.ok) {
      let errorMsg = `Update failed: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMsg += ` | Supabase error: ${JSON.stringify(errorData)}`;
      } catch (err) {
        // ignore JSON parse errors
      }
      console.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      // Only read the body once
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch (err) {
        debugText = text;
        console.warn('Supabase PATCH response text:', debugText);
      }
      // If result is empty, log debug info
      if (!result || (Array.isArray(result) && result.length === 0)) {
        console.warn('Supabase PATCH returned empty array. Response text:', debugText || text);
      }
    }
    return result;
  } catch (e) {
    
    console.error('Supabase REST API update error:', e);
    throw e;
  }
}

// --- LocalStorage helpers (simple in-file DB replacement) ---
function _lsLoad(key, defaultValue) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(defaultValue)); } catch(e) { return defaultValue; }
}
function _lsSave(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch(e) { console.error('localStorage save failed', e); return false; } }

function lsGetUsers() {
  const users = _lsLoad('laundry_users', []);
  return users;
}
function lsSaveUser(user) {
  const users = lsGetUsers();
  if (user.UserID) {
    const idx = users.findIndex(u => String(u.UserID) === String(user.UserID));
    if (idx !== -1) { users[idx] = Object.assign({}, users[idx], user); _lsSave('laundry_users', users); return users[idx]; }
  }
  // create
  const id = (users.reduce((m,u)=>Math.max(m, Number(u.UserID||0)),0) || 0) + 1;
  const nu = Object.assign({UserID: id, Role: 'Customer', Status: 'Active'}, user);
  users.push(nu); _lsSave('laundry_users', users); return nu;
}
function lsDeleteUser(id) {
  let users = lsGetUsers();
  const before = users.length;
  users = users.filter(u => String(u.UserID) !== String(id));
  _lsSave('laundry_users', users);
  return users.length < before;
}

function lsGetBookings() { return _lsLoad('laundry_bookings', []); }
function lsSaveBooking(b) {
  const list = lsGetBookings();
  if (b.BookID) {
    const idx = list.findIndex(x => String(x.BookID) === String(b.BookID));
    if (idx !== -1) { list[idx] = Object.assign({}, list[idx], b); _lsSave('laundry_bookings', list); return list[idx]; }
  }
  const id = (list.reduce((m,x)=>Math.max(m, Number(x.BookID||0)),0) || 0) + 1;
  const nb = Object.assign({BookID: id, Status: 'Order Placed', CreatedAt: new Date().toISOString()}, b);
  list.push(nb); _lsSave('laundry_bookings', list); return nb;
}
function lsDeleteBooking(id) { let l = lsGetBookings(); const before = l.length; l = l.filter(b => String(b.BookID)!==String(id)); _lsSave('laundry_bookings', l); return l.length < before; }

function lsFindUserByUsername(username) { return lsGetUsers().find(u => String(u.Username).toLowerCase() === String(username).toLowerCase()); }
function lsVerifyUsername(username) { return !!lsFindUserByUsername(username); }
function lsSetUserPassword(userId, password) { const u = lsGetUsers().find(x=>String(x.UserID)===String(userId)); if(!u) return false; u.Password = password; _lsSave('laundry_users', lsGetUsers()); return true; }
function lsAuthenticate(username, password) { const u = lsFindUserByUsername(username); if(!u) return false; if(u.Password === password) { const copy = Object.assign({}, u); delete copy.Password; return copy; } return false; }


// ? Using Supabase SDK for all data operations - no PHP fetch calls needed

async function apiFetchUsers() {
  try {
    if (USE_LOCALSTORAGE) {
      console.log('👥 Fetching users from localStorage');
      return lsGetUsers();
    }
    
    console.log('👥 Fetching all users from Supabase via REST API');
    
    // Use Supabase REST API directly (no SDK required)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_tb?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Fetched', (data || []).length, 'users from Supabase');
    return data || [];
  } catch (e) {
    console.error('❌ Error fetching users:', e.message);
    return [];
  }
}

async function apiFetchUser(userId) {
  try {
    if (USE_LOCALSTORAGE) {
      const u = lsGetUsers().find(x=>String(x.UserID)===String(userId));
      if (!u) throw new Error('User not found');
      console.log('👤 Found user (localStorage):', u.UserID);
      return u;
    }
    
    console.log('👤 Fetching user:', userId);
    
    // Use Supabase REST API directly (no SDK required)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/user_tb?UserID=eq.${userId}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`User not found`);
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('User not found');
    }
    
    console.log('✅ Found user:', data[0].UserID);
    return data[0];
  } catch (e) {
    console.error('❌ Error fetching user:', e.message);
    throw e;
  }
}

async function apiSaveUser(user) {
  try {
    if (USE_LOCALSTORAGE) {
      const saved = lsSaveUser(user);
      return { success: true, data: saved, message: 'User saved (localStorage)' };
    }
    
    const sb = await getSupabase();
    
    // Validate required fields
    if (!user.FirstName || !user.LastName || !user.Username) {
      throw new Error('FirstName, LastName, and Username are required');
    }
    
    // Ensure proper field types
    const cleanUser = {
      ...user,
      ContactNo: user.ContactNo ? parseInt(user.ContactNo) : 0
    };
    
    console.log('💾 Saving user:', cleanUser);
    
    let result;
    if (user.UserID) {
      const { data, error } = await sb.from('user_tb').update(cleanUser).eq('UserID', user.UserID).select().single();
      if (error) {
        console.error('❌ Error updating user:', error);
        throw error;
      }
      result = data;
      console.log('✅ User updated:', result);
    } else {
      const { data, error } = await sb.from('user_tb').insert([cleanUser]).select().single();
      if (error) {
        console.error('❌ Error creating user:', error);
        throw error;
      }
      result = data;
      console.log('✅ User created:', result);
    }
    
    return { success: true, data: result || user, message: 'User saved' };
  } catch (e) {
    console.error('❌ Error saving user:', e);
    throw e;
  }
}

async function apiDeleteUser(id) {
  try {
    if (USE_LOCALSTORAGE) {
      console.log('🗑️ Deleting user from localStorage:', id);
      const ok = lsDeleteUser(id);
      if (ok) {
        console.log('✅ User deleted (localStorage)');
        return { success: true, message: 'User deleted (localStorage)' };
      } else {
        console.warn('⚠️ User not found in localStorage');
        return { success: false, message: 'User not found' };
      }
    }
    
    const sb = await getSupabase();
    console.log('🗑️ Deleting user from Supabase:', id);
    
    const { error } = await sb.from('user_tb').delete().eq('UserID', id);
    
    if (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
    
    console.log('✅ User deleted');
    return { success: true, message: 'User deleted' };
  } catch (e) {
    console.error('❌ Error deleting user:', e);
    throw e;
  }
}

async function apiLogin(username, password) {
  console.log('🔐 [apiLogin] Login attempt for user:', username);
  try {
    if (USE_LOCALSTORAGE) {
      const u = lsAuthenticate(username, password);
      if (!u) throw new Error('Login failed - invalid credentials');
      window.currentUser = u;
      console.log('✅ [apiLogin] Login successful (localStorage):', u);
      return { success: true, data: u, message: 'Login successful (localStorage)' };
    }
    
    // Check cache first (instant response)
    const cachedUser = window.getCachedUser(username);
    if (cachedUser && cachedUser.Password === password) {
      console.log('⚡ [apiLogin] Using cached credentials');
      const userWithoutPassword = { ...cachedUser };
      delete userWithoutPassword.Password;
      window.currentUser = userWithoutPassword;
      return { success: true, data: userWithoutPassword, message: 'Login successful (cached)' };
    }
    
    // Query Supabase REST API directly (no SDK)
    console.log('🔑 Querying Supabase...');
    const data = await supabaseQuery('user_tb', { Username: username }, 'UserID,Username,Password,FirstName,LastName,MiddleName,Role,Status,ContactNo');
    
    if (!data || data.length === 0) {
      console.error('❌ [apiLogin] User not found:', username);
      throw new Error('User not found');
    }
    
    const user = data[0];
    console.log('👤 [apiLogin] User found, verifying password...');
    
    if (user.Password !== password) {
      console.error('❌ [apiLogin] Invalid password for user:', username);
      throw new Error('Invalid password');
    }
    
    // Cache successful login
    window.setCachedUser(username, user);
    
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.Password;
    window.currentUser = userWithoutPassword;
    console.log('✅ [apiLogin] Login successful:', userWithoutPassword);
    return { success: true, data: userWithoutPassword, message: 'Login successful' };
  } catch (e) {
    console.error('❌ [apiLogin] Error during login:', e.message);
    throw e;
  }
}

async function apiVerifyUsername(username) {
  console.log('🔎 Verifying username:', username);
  try {
    if (USE_LOCALSTORAGE) {
      const u = lsFindUserByUsername(username);
      if (!u) throw new Error('Username not found');
      console.log('✅ Username verified (localStorage)');
      return { success: true, data: { UserID: u.UserID }, message: 'Username verified (localStorage)' };
    }
    
    const data = await supabaseQuery('user_tb', { Username: username }, 'UserID');
    
    if (!data || data.length === 0) {
      console.error('❌ Username not found:', username);
      throw new Error('Username not found');
    }
    
    console.log('✅ Username verified');
    return { success: true, data: { UserID: data[0].UserID }, message: 'Username verified' };
  } catch (e) {
    console.error('❌ Error verifying username:', e);
    throw e;
  }
}

async function apiResetPassword(userId, password) {
  console.log('🔐 Resetting password for user:', userId);
  try {
    if (USE_LOCALSTORAGE) {
      const ok = lsSetUserPassword(userId, password);
      if (!ok) throw new Error('Failed to reset password');
      console.log('✅ Password updated (localStorage)');
      return { success: true, message: 'Password updated (localStorage)' };
    }
    
    const sb = await getSupabase();
    const { error } = await sb.from('user_tb').update({ Password: password }).eq('UserID', userId);
    
    if (error) {
      console.error('❌ Error resetting password:', error);
      throw error;
    }
    
    console.log('✅ Password reset successfully');
    return { success: true, message: 'Password reset' };
  } catch (e) {
    console.error('❌ Error resetting password:', e);
    throw e;
  }
}

async function apiFetchBookings() {
  try {
    if (USE_LOCALSTORAGE) {
      console.log('📚 Fetching bookings from localStorage');
      return lsGetBookings();
    }
    
    console.log('📚 Fetching all bookings from Supabase via REST API');
    
    // Fetch bookings via REST API
    const bookingResponse = await fetch(`${SUPABASE_URL}/rest/v1/booking_tb?select=*&order=BookID.desc`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!bookingResponse.ok) {
      throw new Error(`HTTP ${bookingResponse.status}: ${bookingResponse.statusText}`);
    }
    
    const bookingsData = await bookingResponse.json();
    console.log('✅ Fetched', (bookingsData || []).length, 'bookings');
    
    // Fetch users to join with bookings for customer names
    const usersResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_tb?select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const usersData = usersResponse.ok ? await usersResponse.json() : [];
    const usersMap = {};
    usersData.forEach(u => { usersMap[u.UserID] = u; });
    
    // Map booking data to include FullName from joined user record
    const bookings = (bookingsData || []).map(b => {
      let fullName = '';
      if (usersMap[b.CustomerID]) {
        const usr = usersMap[b.CustomerID];
        fullName = [usr.FirstName, usr.MiddleName, usr.LastName].filter(Boolean).join(' ') || usr.Username || '';
      }
      return {
        ...b,
        FullName: fullName
      };
    });
    
    return bookings;
  } catch (e) {
    console.error('❌ Error fetching bookings:', e);
    return [];
  }
}

async function apiFetchBooking(bookingId) {
  try {
    if (USE_LOCALSTORAGE) {
      const b = lsGetBookings().find(x=>String(x.BookID)===String(bookingId));
      if (!b) throw new Error('Booking not found');
      console.log('📖 Found booking (localStorage):', b);
      return b;
    }
    
    console.log('📖 Fetching booking:', bookingId);
    
    // Fetch booking via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/booking_tb?BookID=eq.${bookingId}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Booking not found`);
    }
    
    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('Booking not found');
    }
    
    const bookingData = data[0];
    
    // Fetch user to get customer's full name
    let fullName = '';
    if (bookingData.CustomerID) {
      const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_tb?UserID=eq.${bookingData.CustomerID}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData && userData.length > 0) {
          const usr = userData[0];
          fullName = [usr.FirstName, usr.MiddleName, usr.LastName].filter(Boolean).join(' ') || usr.Username || '';
        }
      }
    }
    
    console.log('✅ Found booking:', bookingData);
    return {
      ...bookingData,
      FullName: fullName
    };
  } catch (e) {
    console.error('❌ Error fetching booking:', e);
    throw e;
  }
}

// Fetch today's bookings and populate the dashboard table
async function renderTodaysBookings() {
  try {
    let list = await apiFetchBookings();
    
    console.log('📚 Total bookings fetched:', list.length);
    if (list.length > 0) {
      console.log('📝 Sample booking:', list[0]);
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayString = today.getFullYear() + '-' + 
                        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(today.getDate()).padStart(2, '0');
    
    console.log('📅 Today\'s date:', todayString);
    
    // Filter bookings from today only (compare date part only)
    const todaysBookings = list.filter(b => {
      if (!b.CreatedAt) {
        console.warn('⚠️ Booking missing CreatedAt:', b);
        return false;
      }
      // Extract date part from ISO string (YYYY-MM-DD)
      const bookingDateString = b.CreatedAt.substring(0, 10);
      const isToday = bookingDateString === todayString;
      if (isToday) {
        console.log('✅ Found today\'s booking:', b.BookID, bookingDateString);
      }
      return isToday;
    });
    
    console.log('📅 Today\'s bookings count:', todaysBookings.length);
    
    // Populate the today's bookings table
    const tbody = document.querySelector('#todaysBookingsTable');
    if (!tbody) {
      console.warn('⚠️ Today\'s bookings table not found');
      return;
    }
    
    tbody.innerHTML = '';
    
    if (todaysBookings.length === 0) {
      console.log('ℹ️ No bookings found for today. Displaying all booked laundry data from booking_tb.');
      tbody.innerHTML = '';
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:20px">No bookings found</td></tr>';
        return;
      }
      list.forEach((b, idx) => {
        const statusColor = getBadgeClassForStatus(b.Status);
        const tr = document.createElement('tr');
        let actionBtns = `
          <button class="tbl-btn" onclick="showBookingDetails(${b.BookID})">View</button>
          <button class="tbl-btn secondary" onclick="nav('bookings'); setTimeout(() => updateBookingStatus(${b.BookID}, 'Confirmed'), 500)">Edit</button>
        `;
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td>${b.FullName || ''}</td>
          <td>${b.LaundryType || ''}</td>
          <td>${b.EstimatedWeight || ''}</td>
          <td>${b.SubmissionMethod || ''}</td>
          <td><span class="badge ${statusColor}">${normalizeStatus(b.Status) || 'Unknown'}</span></td>
          <td>₱${b.Total || '0'}</td>
          <td>
            <div class="tbl-action">
              ${actionBtns}
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
      return;
    }
    
    todaysBookings.forEach((b, idx) => {
      const statusColor = getBadgeClassForStatus(b.Status);
      const tr = document.createElement('tr');
      
      let actionBtns = `
        <button class="tbl-btn" onclick="showBookingDetails(${b.BookID})">View</button>
        <button class="tbl-btn secondary" onclick="nav('bookings'); setTimeout(() => updateBookingStatus(${b.BookID}, 'Confirmed'), 500)">Edit</button>
      `;
      
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${b.FullName || ''}</td>
        <td>${b.LaundryType || ''}</td>
        <td>${b.EstimatedWeight || ''}</td>
        <td>${b.SubmissionMethod || ''}</td>
        <td><span class="badge ${statusColor}">${normalizeStatus(b.Status) || 'Unknown'}</span></td>
        <td>₱${b.Total || '0'}</td>
        <td>
          <div class="tbl-action">
            ${actionBtns}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
  } catch (e) {
    console.error('❌ Error rendering today\'s bookings:', e);
    const tbody = document.querySelector('#todaysBookingsTable');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#e53935;padding:20px">Error loading bookings</td></tr>';
    }
  }
}

async function apiSaveBooking(booking) {
  try {
    if (USE_LOCALSTORAGE) {
      const saved = lsSaveBooking(booking);
      const bookings = lsGetBookings();
      window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: { bookings, updatedBooking: saved } }));
      try { if (typeof renderBookingsList === 'function') renderBookingsList(); } catch(e){}
      return { success: true, data: saved, message: 'Booking saved (localStorage)' };
    }
    
    // Ensure proper field types and remove UI-only fields
    const cleanBooking = { ...booking };
    // Remove UI-only fields
    delete cleanBooking.FullName;
    // Add more UI-only fields to remove if needed
    cleanBooking.EstimatedWeight = booking.EstimatedWeight ? parseFloat(booking.EstimatedWeight) : 0;
    cleanBooking.CustomerID = booking.CustomerID ? parseInt(booking.CustomerID) : null;
    cleanBooking.AvailabilityID = booking.AvailabilityID ? parseInt(booking.AvailabilityID) : 1;
    // Only update Status field if mystatus is present
    if (cleanBooking.mystatus) {
      cleanBooking.Status = cleanBooking.mystatus;
      delete cleanBooking.mystatus;
    }

    console.log('💾 Saving booking to Supabase via REST API:', cleanBooking);
    
    let savedBooking;
    if (booking.BookID) {
      // Update booking using Supabase REST API PATCH
      const url = `${SUPABASE_URL}/rest/v1/booking_tb?BookID=eq.${booking.BookID}`;
      console.log('[Supabase PATCH] URL:', url);
      console.log('[Supabase PATCH] Payload:', cleanBooking);
      const updateResponse = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(cleanBooking)
      });
      let errorText = '';
      if (!updateResponse.ok) {
        try {
          errorText = await updateResponse.text();
        } catch (e) { errorText = '(no error body)'; }
        console.error('[Supabase PATCH Error]', updateResponse.status, updateResponse.statusText, errorText);
        throw new Error(`Update booking failed: ${updateResponse.statusText} | ${errorText}`);
      }
      const updateData = await updateResponse.json();
      savedBooking = Array.isArray(updateData) ? updateData[0] : updateData;
      console.log('✅ Booking updated (REST):', savedBooking);
    } else {
      // Insert new booking via REST API
      const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/booking_tb`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(cleanBooking)
      });
      
      if (!insertResponse.ok) {
        throw new Error(`Create booking failed: ${insertResponse.statusText}`);
      }
      const insertData = await insertResponse.json();
      savedBooking = Array.isArray(insertData) ? insertData[0] : insertData;
      console.log('✅ Booking created:', savedBooking);
    }
    
    const bookings = await apiFetchBookings();
    window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: { bookings, updatedBooking: savedBooking } }));
    
    try {
      if (typeof renderBookingsList === 'function') renderBookingsList();
      if (typeof renderLaundryManagementBookings === 'function') renderLaundryManagementBookings();
      if (typeof renderMyOrders === 'function') renderMyOrders();
      if (typeof renderDeliveryTasks === 'function') renderDeliveryTasks();
      if (typeof updateDashboardBookingStats === 'function') updateDashboardBookingStats(bookings);
    } catch (e) { console.warn('post-save UI refresh failed', e); }

    return {success: true, data: savedBooking, message: 'Booking saved'};
  } catch (e) {
    console.error('❌ Error saving booking:', e);
    throw e;
  }
}

// Polling for bookings changes (used for real-time-like updates across sessions)
window._bookingsPoll = window._bookingsPoll || { timer: null, lastSnapshot: '' };
function startBookingsPolling(intervalMs = 10000) {
  try {
    if (window._bookingsPoll.timer) return; // already running
    const poll = async () => {
      try {
        const list = await apiFetchBookings();
        const snap = JSON.stringify(list.map(b => ({ BookID: b.BookID, Status: b.Status, UpdatedAt: b.UpdatedAt || b.ModifiedAt || b.Updated || null })));
        if (snap !== window._bookingsPoll.lastSnapshot) {
          window._bookingsPoll.lastSnapshot = snap;
          window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: { bookings: list } }));
        }
      } catch (e) { console.warn('bookings poll error', e); }
    };
    // run immediately then schedule
    poll();
    window._bookingsPoll.timer = setInterval(poll, intervalMs);
  } catch (e) { console.error('startBookingsPolling error', e); }
}

function stopBookingsPolling() {
  try {
    if (window._bookingsPoll.timer) {
      clearInterval(window._bookingsPoll.timer);
      window._bookingsPoll.timer = null;
    }
  } catch (e) { console.error('stopBookingsPolling error', e); }
}

// Polling for availability changes so customer/admin UIs update when admin edits
window._availabilityPoll = window._availabilityPoll || { timer: null, lastSnapshot: '' };
function startAvailabilityPolling(intervalMs = 10000) {
  try {
    if (window._availabilityPoll.timer) return;
    const poll = async () => {
      try {
        const av = await apiFetchAvailabilities();
        const a = av && av[0] ? av[0] : null;
        const snap = JSON.stringify({ Status: a ? a.Status : null });
        if (snap !== window._availabilityPoll.lastSnapshot) {
          window._availabilityPoll.lastSnapshot = snap;
          window.dispatchEvent(new CustomEvent('availabilityUpdated', { detail: a || {} }));
        }
      } catch (e) { console.warn('availability poll error', e); }
    };
    poll();
    window._availabilityPoll.timer = setInterval(poll, intervalMs);
  } catch (e) { console.error('startAvailabilityPolling error', e); }
}

function stopAvailabilityPolling() {
  try {
    if (window._availabilityPoll.timer) {
      clearInterval(window._availabilityPoll.timer);
      window._availabilityPoll.timer = null;
    }
  } catch (e) { console.error('stopAvailabilityPolling error', e); }
}

// When availability changes in any tab, refresh UI components
window.addEventListener('availabilityUpdated', async function(e) {
  try {
    if (typeof updateCustomerLaundryStatus === 'function') await updateCustomerLaundryStatus();
    if (typeof updateDashboardLaundryStatus === 'function') await updateDashboardLaundryStatus();
    try { updateBookingNavStatus(); } catch(e){}
    // If availability changed to closed/maintenance, and current user is a customer
    // ensure they aren't left on the booking page which must be blocked.
    try {
      const detail = e && e.detail ? e.detail : null;
      const roleKey = (role || window.userRole || '').toString().toLowerCase();
      if (!roleKey.includes('admin')) {
        let newStatus = null;
        if (detail && detail.Status) {
          const ds = detail.Status.toString().toLowerCase();
          newStatus = ds === 'open' ? 'open' : (ds.includes('maintenance') ? 'maintenance' : 'closed');
        }
        if (newStatus && newStatus !== 'open') {
          const currentView = document.querySelector('.view:not([style*="display:none"])');
          if (currentView && (currentView.id === 'v-book-laundry' || currentView.id === 'v-booking-summary')) {
            try { showAlert('Laundry is currently ' + ((detail && detail.Status) ? detail.Status : newStatus) + '. Booking is not available.'); } catch(_){}
            nav('dashboard');
          }
        }
      }
    } catch(innerErr) { console.warn('availabilityUpdated post-check failed', innerErr); }
  } catch (err) { console.error('availabilityUpdated handler error', err); }
});

// Global listener to refresh UIs when bookings change (either via in-tab save or polling)
window.addEventListener('bookingUpdated', (e) => {
  try {
    const detail = e && e.detail ? e.detail : {};
    // refresh common booking views
    if (typeof renderBookingsList === 'function') try{ renderBookingsList(); }catch(e){}
    if (typeof renderMyOrders === 'function') try{ renderMyOrders(); }catch(e){}
    if (typeof renderBookingDetails === 'function') try{ renderBookingDetails(); }catch(e){}
    if (typeof renderLaundryManagementBookings === 'function') try{ renderLaundryManagementBookings(); }catch(e){}
    if (typeof renderDeliveryTasks === 'function') try{ renderDeliveryTasks(); }catch(e){}
  } catch (ee) { console.error('bookingUpdated handler error', ee); }
});

async function apiDeleteBooking(id) {
  try {
    if (USE_LOCALSTORAGE) {
      console.log('🗑️ Deleting booking from localStorage:', id);
      const ok = lsDeleteBooking(id);
      if (ok) {
        console.log('✅ Booking deleted (localStorage)');
        return { success: true, message: 'Booking deleted (localStorage)' };
      } else {
        console.warn('⚠️ Booking not found in localStorage');
        return { success: false, message: 'Booking not found' };
      }
    }
    
    console.log('🗑️ Deleting booking from Supabase via REST API:', id);
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/booking_tb?BookID=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Delete booking failed: ${response.statusText}`);
    }
    
    console.log('✅ Booking deleted');
    return { success: true, message: 'Booking deleted' };
  } catch (e) {
    console.error('❌ Error deleting booking:', e);
    throw e;
  }
}

async function apiFetchAvailabilities() {
  try {
    console.log('🏪 Fetching shop availability via REST API');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/availability_tb?select=*&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const availabilities = data || [];
    console.log('✅ Fetched', availabilities.length, 'availability records');
    
    return availabilities.map(a => {
      const copy = Object.assign({}, a);
      const s = (copy.Status || '').toString().toLowerCase();
      copy.IsOpen = (s === 'open') ? 1 : 0;
      return copy;
    });
  } catch (e) {
    console.error('❌ Error fetching availability:', e);
    return [];
  }
}

// Update availability status (open/closed/maintenance) - Supabase
async function apiUpdateAvailability(availabilityId, status) {
      // Debug logging for API key and URL
      console.log('DEBUG: SUPABASE_KEY:', SUPABASE_KEY);
      console.log('DEBUG: SUPABASE_URL:', SUPABASE_URL);
      const debugHeaders = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
      console.log('DEBUG: Headers to be sent:', debugHeaders);
  try {
    console.log('🏪 Updating availability status via REST API:', { availabilityId, status });
    
    // Validate status is one of the allowed enum values
    const validStatuses = ['Open', 'Closed', 'Under Maintenance'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/availability_tb?AvailabilityID=eq.${availabilityId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ Status: status })
    });
    
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = '(Could not read error body)';
      }
      throw new Error(`Update availability failed: ${response.statusText} | ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Availability updated:', data);
    return true;
  } catch (e) {
    console.error('❌ Error updating availability:', e);
    throw e;
  }
}

// Global: update the sidebar booking nav enabled/disabled state
async function updateBookingNavStatus() {
  try {
    // only affect customers
    const roleKey = (role || window.userRole || '').toString().toLowerCase();
    if (roleKey.includes('admin')) return;
    const availList = await apiFetchAvailabilities();
    const avail = availList && availList[0] ? availList[0] : null;
    const bookEl = document.getElementById('sbi-book-laundry');
    if (!bookEl) return;
    // derive from Status to avoid stale IsOpen assumptions
    let isOpen = true;
    if (avail && avail.Status !== undefined) {
      const s = (avail.Status||'').toString().toLowerCase();
      isOpen = (s === 'open');
    }
    if (!isOpen) {
      bookEl.style.opacity = '0.5';
      bookEl.style.pointerEvents = 'none';
      bookEl.title = 'Booking unavailable: laundry closed or under maintenance';
    } else {
      bookEl.style.opacity = '';
      bookEl.style.pointerEvents = '';
      bookEl.title = bookEl.getAttribute('data-label') || 'Book Laundry';
    }
  } catch (e) { console.error('updateBookingNavStatus failed', e); }
}

async function apiSignup(firstName, middleName, lastName, contactNo, username, password) {
  try {
    // Validate required fields
    if (!firstName || !lastName || !username || !password) {
      throw new Error('First name, last name, username, and password are required');
    }
    
    console.log('📝 Creating new user account:', { firstName, lastName, username });
    
    // Ensure proper field types before insert
    const newUser = {
      FirstName: firstName.trim(),
      MiddleName: middleName ? middleName.trim() : '',
      LastName: lastName.trim(),
      ContactNo: contactNo ? parseInt(contactNo) : 0,  // Convert to int
      Username: username.trim(),
      Password: password,
      Role: 'Customer',
      Status: 'Active',
      LaundryPref: ''
    };
    
    const data = await supabaseInsert('user_tb', newUser);
    
    console.log('✅ Signup successful, user created:', data[0] ? data[0].UserID : 'unknown');
    return { success: true, data: data[0] || data, message: 'Signup successful' };
  } catch (e) {
    console.error('❌ Error during signup:', e);
    throw e;
  }
}

// ------------------- ARCHIVE FUNCTIONS -------------------

async function apiFetchArchivedBookings() {
  try {
    const sb = await getSupabase();
    console.log('📦 Fetching archived bookings');
    
    // Join with user_tb to get FullName from customer
    const { data, error } = await sb
      .from('bookingarchive_tb')
      .select(`
        *,
        user_tb!CustomerID(FirstName, MiddleName, LastName, Username)
      `)
      .order('BookID', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching archived bookings:', error);
      throw error;
    }
    
    console.log('✅ Fetched', (data || []).length, 'archived bookings');
    
    // Map the data to include FullName from joined user record
    const bookings = (data || []).map(b => {
      let fullName = '';
      if (b.user_tb) {
        const usr = b.user_tb;
        fullName = [usr.FirstName, usr.MiddleName, usr.LastName].filter(Boolean).join(' ') || usr.Username || '';
      }
      return {
        ...b,
        FullName: fullName
      };
    });
    return bookings;
  } catch (e) {
    console.error('❌ Error fetching archived bookings:', e);
    return [];
  }
}

async function apiArchiveBooking(bookingId) {
  try {
    console.log('📦 Archiving booking via REST API:', bookingId);
    
    // Fetch the booking first
    const fetchResponse = await fetch(`${SUPABASE_URL}/rest/v1/booking_tb?BookID=eq.${bookingId}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!fetchResponse.ok) {
      throw new Error('Error fetching booking to archive');
    }
    
    const bookingDataList = await fetchResponse.json();
    if (!bookingDataList || bookingDataList.length === 0) {
      throw new Error('Booking not found');
    }
    
    const bookingData = bookingDataList[0];
    console.log('Found booking to archive:', bookingData);
    
    // Extract only the fields that exist in booking_tb (without joined data)
    const bookingWithoutJoin = { ...bookingData };
    delete bookingWithoutJoin.user_tb; // Remove any joined user data
    delete bookingWithoutJoin.id; // Remove any row ID
    
    // Move to archive table via REST API
    const archiveResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookingarchive_tb`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(bookingWithoutJoin)
    });
    
    if (!archiveResponse.ok) {
      throw new Error('Error inserting to archive: ' + archiveResponse.statusText);
    }
    
    console.log('✅ Inserted to archive table');
    
    // Delete from active table via REST API
    const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/booking_tb?BookID=eq.${bookingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!deleteResponse.ok) {
      throw new Error('Error deleting from active table: ' + deleteResponse.statusText);
    }
    
    console.log('✅ Deleted from active table');
    return { success: true, message: 'Booking archived' };
  } catch (e) {
    console.error('❌ Error archiving booking:', e);
    throw e;
  }
}

async function apiRestoreArchivedBooking(bookingId) {
  try {
    console.log('↩️ Restoring archived booking via REST API:', bookingId);
    
    // Fetch from archive via REST API
    const fetchResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookingarchive_tb?BookID=eq.${bookingId}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!fetchResponse.ok) {
      throw new Error('Error fetching archived booking');
    }
    
    const bookingList = await fetchResponse.json();
    if (!bookingList || bookingList.length === 0) {
      throw new Error('Archived booking not found');
    }
    
    const booking = bookingList[0];
    console.log('Found archived booking:', booking);
    
    // Remove any non-existent fields before inserting
    const bookingToRestore = { ...booking };
    delete bookingToRestore.user_tb; // Remove any joined data
    delete bookingToRestore.id; // Remove any row ID from archive
    
    // Insert back to active via REST API
    const restoreResponse = await fetch(`${SUPABASE_URL}/rest/v1/booking_tb`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(bookingToRestore)
    });
    
    if (!restoreResponse.ok) {
      throw new Error('Error inserting to active table: ' + restoreResponse.statusText);
    }
    
    console.log('✅ Inserted back to active table');
    
    // Delete from archive via REST API
    const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookingarchive_tb?BookID=eq.${bookingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!deleteResponse.ok) {
      throw new Error('Error deleting from archive: ' + deleteResponse.statusText);
    }
    
    console.log('✅ Deleted from archive table');
    return { success: true, message: 'Booking restored' };
  } catch (e) {
    console.error('❌ Error restoring booking:', e);
    throw e;
  }
}

async function apiDeleteArchivedBookingPermanently(bookingId) {
  try {
    const sb = await getSupabase();
    console.log('🗑️ Permanently deleting archived booking:', bookingId);
    
    const { error } = await sb.from('bookingarchive_tb').delete().eq('BookID', bookingId);
    
    if (error) {
      console.error('❌ Error deleting archived booking:', error);
      throw error;
    }
    
    console.log('✅ Archived booking deleted permanently');
    return { success: true, message: 'Booking deleted permanently' };
  } catch (e) {
    console.error('❌ Error deleting archived booking:', e);
    throw e;
  }
}

// ------------------- NOTIFICATION FUNCTIONS -------------------

async function apiFetchNotifications(userId = null) {
  try {
    const sb = await getSupabase();
    let query = sb.from('notification_tb').select('*');
    
    if (userId) {
      query = query.eq('ReceiverID', userId);
      console.log('📬 Fetching notifications for user:', userId);
    } else {
      console.log('📬 Fetching all notifications');
    }
    
    const { data, error } = await query.order('NotificationID', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error;
    }
    
    console.log('✅ Fetched', (data || []).length, 'notifications');
    return data || [];
  } catch (e) {
    console.error('❌ Error fetching notifications:', e);
    return [];
  }
}

async function apiCreateNotification(title, body, receiverId = null, bookingId = null) {
  try {
    const sb = await getSupabase();
    const senderId = window.currentUser ? window.currentUser.UserID : null;
    
    // Validate required fields
    if (!title || !body) {
      throw new Error('Title and body are required for notifications');
    }
    
    console.log('📤 Creating notification:', { title, body, senderId, receiverId, bookingId });
    
    const { data, error } = await sb.from('notification_tb').insert([{
      Title: title,
      Body: body,
      SenderID: senderId,
      ReceiverID: receiverId,
      BookingID: bookingId
    }]).select().single();
    
    if (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
    
    console.log('✅ Notification created:', data);
    return { success: true, data: data, message: 'Notification created' };
  } catch (e) {
    console.error('❌ Error creating notification:', e);
    throw e;
  }
}

async function apiArchiveNotification(notificationId) {
  try {
    const sb = await getSupabase();
    
    console.log('📦 Archiving notification:', notificationId);
    
    // Fetch the notification first
    const { data: notif, error: fetchError } = await sb.from('notification_tb').select('*').eq('NotificationID', notificationId).single();
    if (fetchError) {
      console.error('❌ Error fetching notification to archive:', fetchError);
      throw fetchError;
    }
    
    console.log('Found notification to archive:', notif);
    
    // Move to archive table
    const { error: insertError } = await sb.from('notificationarchive_tb').insert([notif]);
    if (insertError) {
      console.error('❌ Error inserting to archive:', insertError);
      throw insertError;
    }
    
    console.log('✅ Inserted to archive table');
    
    // Delete from active table
    const { error: deleteError } = await sb.from('notification_tb').delete().eq('NotificationID', notificationId);
    if (deleteError) {
      console.error('❌ Error deleting from active table:', deleteError);
      throw deleteError;
    }
    
    console.log('✅ Deleted from active table');
    return { success: true, message: 'Notification archived' };
  } catch (e) {
    console.error('❌ Error archiving notification:', e);
    throw e;
  }
}

async function apiFetchArchivedNotifications(userId = null) {
  try {
    const sb = await getSupabase();
    let query = sb.from('notificationarchive_tb').select('*');
    
    if (userId) {
      query = query.eq('ReceiverID', userId);
      console.log('📦 Fetching archived notifications for user:', userId);
    } else {
      console.log('📦 Fetching all archived notifications');
    }
    
    const { data, error } = await query.order('NotificationID', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching archived notifications:', error);
      throw error;
    }
    
    console.log('✅ Fetched', (data || []).length, 'archived notifications');
    return data || [];
  } catch (e) {
    console.error('❌ Error fetching archived notifications:', e);
    return [];
  }
}

async function apiRestoreArchivedNotification(notificationId) {
  try {
    const sb = await getSupabase();
    console.log('↩️ Restoring archived notification:', notificationId);
    
    // Fetch from archive
    const { data: notif, error: fetchError } = await sb.from('notificationarchive_tb').select('*').eq('NotificationID', notificationId).single();
    if (fetchError) {
      console.error('❌ Error fetching archived notification:', fetchError);
      throw fetchError;
    }
    
    console.log('Found archived notification:', notif);
    
    // Insert back to active
    const { error: insertError } = await sb.from('notification_tb').insert([notif]);
    if (insertError) {
      console.error('❌ Error inserting to active table:', insertError);
      throw insertError;
    }
    
    console.log('✅ Inserted back to active table');
    
    // Delete from archive
    const { error: deleteError } = await sb.from('notificationarchive_tb').delete().eq('NotificationID', notificationId);
    if (deleteError) {
      console.error('❌ Error deleting from archive:', deleteError);
      throw deleteError;
    }
    
    console.log('✅ Deleted from archive table');
    return { success: true, message: 'Notification restored' };
  } catch (e) {
    console.error('❌ Error restoring notification:', e);
    throw e;
  }
}

async function apiDeleteArchivedNotificationPermanently(notificationId) {
  try {
    const sb = await getSupabase();
    console.log('🗑️ Permanently deleting archived notification:', notificationId);
    
    const { error } = await sb.from('notificationarchive_tb').delete().eq('NotificationID', notificationId);
    
    if (error) {
      console.error('❌ Error deleting archived notification:', error);
      throw error;
    }
    
    console.log('✅ Archived notification deleted permanently');
    return { success: true, message: 'Notification deleted permanently' };
  } catch (e) {
    console.error('❌ Error deleting archived notification:', e);
    throw e;
  }
}

function showAuth(w) {
  ['login','s1','s2','forgot','reset'].forEach(k => {
    const el = document.getElementById('auth-'+k);
    if(el) el.style.display = 'none';
  });
  document.getElementById('auth-'+w).style.display = 'block';
  
  // Generate new CAPTCHA when login page is shown
  if (w === 'login') {
    generateMathCaptcha();
  }
}

// Form Validation Functions
function validateName(value) {
  return value && value.trim().length >= 2;
}

function validateContact(value) {
  return value && /^\d{11}$/.test(value);
}

function validateEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePassword(value) {
  return value && value.length >= 6;
}

function validateUsername(value) {
  return value && value.trim().length >= 3;
}

function validateRequired(field) {
  const value = field.value.trim();
  if (!value) {
    field.classList.add('error');
    const errMsg = field.parentElement.querySelector('.error-msg');
    if (errMsg) {
      errMsg.textContent = 'This field is required';
      errMsg.style.display = 'block';
    }
    return false;
  }
  field.classList.remove('error');
  const errMsg = field.parentElement.querySelector('.error-msg');
  if (errMsg) errMsg.style.display = 'none';
  return true;
}

function validateFormField(field) {
  const label = field.previousElementSibling?.textContent.toLowerCase() || '';
  const value = field.value.trim();
  let isValid = true;
  let errorMsg = '';

  if (!value) {
    isValid = false;
    errorMsg = 'This field is required';
  } else if (label.includes('name')) {
    isValid = validateName(value);
    errorMsg = 'Please enter a valid name (at least 2 characters)';
  } else if (label.includes('contact') || label.includes('phone') || label.includes('mobile')) {
    isValid = validateContact(value);
    errorMsg = 'Please enter an 11-digit number';
  } else if (label.includes('email')) {
    isValid = validateEmail(value);
    errorMsg = 'Please enter a valid email address';
  } else if (label.includes('password') && !label.includes('current')) {
    isValid = validatePassword(value);
    errorMsg = 'Password must be at least 6 characters';
  } else if (label.includes('username')) {
    isValid = validateUsername(value);
    errorMsg = 'Username must be at least 3 characters';
  }

  if (!isValid) {
    field.classList.add('error');
    const errMsg = field.parentElement.querySelector('.error-msg');
    if (errMsg) {
      errMsg.textContent = errorMsg;
      errMsg.style.display = 'block';
    }
  } else {
    field.classList.remove('error');
    const errMsg = field.parentElement.querySelector('.error-msg');
    if (errMsg) errMsg.style.display = 'none';
  }

  return isValid;
}

// Search functionality in User Management (filters all panels and updates stat cards)
function searchUsers(query) {
  const q = (query || (document.getElementById('userSearch') ? document.getElementById('userSearch').value : '') || '').toString().toLowerCase();
  const allRows = Array.from(document.querySelectorAll('#userList .u-row'));
  const activeRows = Array.from(document.querySelectorAll('#activeUserList .u-row'));
  const inactiveRows = Array.from(document.querySelectorAll('#inactiveUserList .u-row'));

  // if the query is empty, reset visibility and recalc counts
  if (!q) {
    allRows.concat(activeRows, inactiveRows).forEach(r => r.style.display = 'flex');
    if (statAll) statAll.querySelector('.stat-val').textContent = allRows.length;
    if (statActive) statActive.querySelector('.stat-val').textContent = activeRows.length;
    if (statInactive) statInactive.querySelector('.stat-val').textContent = inactiveRows.length;
    return;
  }

  // filter each row in every panel
  [allRows, activeRows, inactiveRows].forEach(rows => {
    rows.forEach(row => {
      const userName = (row.querySelector('.u-info strong')?.textContent || '').toLowerCase();
      const userInfo = (row.querySelector('.u-info span')?.textContent || '').toLowerCase();
      if (userName.includes(q) || userInfo.includes(q)) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });
  });

  // update stat card values to reflect filtered lists
  if (statAll) statAll.querySelector('.stat-val').textContent = allRows.filter(r=>r.style.display!=='none').length;
  if (statActive) statActive.querySelector('.stat-val').textContent = activeRows.filter(r=>r.style.display!=='none').length;
  if (statInactive) statInactive.querySelector('.stat-val').textContent = inactiveRows.filter(r=>r.style.display!=='none').length;
}

// Edit user with autofill
// Edit user - fetch from server by UserID
async function editUser(fullName, userId) {
  if (!userId) {
    alert('User ID is required');
    return;
  }
  
  const u = await apiFetchUser(userId);
  if (!u) {
    alert('User not found');
    return;
  }
  
  currentEditUser = u.UserID;
  nav('add-user');
  
  // Autofill form from server data (instant, no delay)
  document.querySelector('#v-add-user .f-input[placeholder="Full Name"]').value = u.FirstName || '';
  const inputs = document.querySelectorAll('#v-add-user .f-input');
  inputs.forEach(inp => {
    if (inp.placeholder.includes('Middle')) inp.value = u.MiddleName || '';
    if (inp.placeholder.includes('Last')) inp.value = u.LastName || '';
    if (inp.placeholder.includes('Contact')) inp.value = u.ContactNo || '';
    if (inp.placeholder.includes('Username')) inp.value = u.Username || '';
  });
  
  const selects = document.querySelectorAll('#v-add-user .f-sel');
  if (selects && selects[0]) {
    selects[0].querySelectorAll('option').forEach(opt => {
      if (opt.textContent === u.Role) selects[0].value = opt.value;
    });
  }
  if (selects && selects[1]) {
    selects[1].querySelectorAll('option').forEach(opt => {
      if (opt.textContent === u.Status) selects[1].value = opt.value;
    });
  }
}

// Render user list from usersDb into All / Active / Inactive panels
function renderUserList() {
  const allContainer = document.getElementById('userList');
  const activeContainer = document.getElementById('activeUserList');
  const inactiveContainer = document.getElementById('inactiveUserList');
  const statAll = document.getElementById('userStatAll');
  const statActive = document.getElementById('userStatActive');
  const statInactive = document.getElementById('userStatInactive');
  if (!allContainer || !activeContainer || !inactiveContainer) return;
  allContainer.innerHTML = '';
  activeContainer.innerHTML = '';
  inactiveContainer.innerHTML = '';
  if (statAll) statAll.querySelector('.stat-val').textContent = '0';
  if (statActive) statActive.querySelector('.stat-val').textContent = '0';
  if (statInactive) statInactive.querySelector('.stat-val').textContent = '0';

  apiFetchUsers().then(list => {
    if (!Array.isArray(list) || list.length === 0) {
      const emptyMsg = '<p style="padding:12px;color:var(--muted);font-size:.85rem">No users found. <a href="#" onclick="addUser();return false" style="color:var(--sky);text-decoration:underline">Add one</a></p>';
      allContainer.innerHTML = emptyMsg;
      activeContainer.innerHTML = emptyMsg;
      inactiveContainer.innerHTML = emptyMsg;
      return;
    }

    // Filter out admin accounts
    list = list.filter(u => !String(u.Role || '').toLowerCase().includes('admin'));

    list.forEach(u => {
      const fullName = [u.FirstName, u.MiddleName, u.LastName].filter(Boolean).join(' ') || u.Username || 'User';
      const role = u.Role || 'Customer';
      const status = (u.Status || 'Active');
      const safeName = fullName.replace(/'/g, "\\'");

      const makeRow = () => {
        const row = document.createElement('div');
        row.className = 'u-row';
        row.innerHTML = `
          <div class="u-av">${fullName.charAt(0).toUpperCase()}</div>
          <div class="u-info">
            <strong>${fullName}</strong>
            <span>${role} • ID: ${u.UserID}</span>
          </div>
          <span class="badge ${status==='Active'?'b-grn':'b-red'}">${status}</span>
            <button class="btn btn-outline btn-sm" onclick="editUser('${safeName}', ${u.UserID})">Edit</button>
        `;
        return row;
      };

      // All users
      allContainer.appendChild(makeRow());
      if (statAll) statAll.querySelector('.stat-val').textContent = String(parseInt(statAll.querySelector('.stat-val').textContent||'0')+1);

      // Active / Inactive
      if (String(status).toLowerCase() === 'active') {
        activeContainer.appendChild(makeRow());
        if (statActive) statActive.querySelector('.stat-val').textContent = String(parseInt(statActive.querySelector('.stat-val').textContent||'0')+1);
      } else {
        inactiveContainer.appendChild(makeRow());
        if (statInactive) statInactive.querySelector('.stat-val').textContent = String(parseInt(statInactive.querySelector('.stat-val').textContent||'0')+1);
      }
    });

  }).catch(err => {
    const errMsg = '<p style="padding:12px;color:var(--red);font-size:.85rem">Error loading users</p>';
    allContainer.innerHTML = errMsg;
    activeContainer.innerHTML = errMsg;
    inactiveContainer.innerHTML = errMsg;
  });
}

// Switch user management tabs
window.showUserTab = function(tab) {
  document.querySelectorAll('.users-panel').forEach(p => p.style.display = 'none');
  const all = document.getElementById('allUsersPanel');
  const active = document.getElementById('activeUsersPanel');
  const inactive = document.getElementById('inactiveUsersPanel');
  if (tab === 'all' && all) all.style.display = 'block';
  if (tab === 'active' && active) active.style.display = 'block';
  if (tab === 'inactive' && inactive) inactive.style.display = 'block';
  // clear search when switching
  const s = document.getElementById('userSearch'); if (s) s.value = '';
};



// Prepare Add User form
function addUser() {
  currentEditUser = null;
  nav('add-user');
  // Clear form instantly (no delay)
  const form = document.getElementById('v-add-user');
  if (form) {
    form.querySelectorAll('.f-input').forEach(i => i.value = '');
    const selects = form.querySelectorAll('.f-sel');
    if (selects && selects.length >= 2) {
      selects[0].selectedIndex = 0;
      selects[1].selectedIndex = 0;
    }
  }
}

// Save user (add or update)
async function saveUser() {
  const inputs = document.querySelectorAll('#v-add-user .f-input');
  const firstField = inputs[0];
  const contactField = Array.from(inputs).find(inp => inp.placeholder.includes('Contact'));
  const usernameField = Array.from(inputs).find(inp => inp.placeholder.includes('Username'));
  
  const validName = validateFormField(firstField);
  const validContact = validateFormField(contactField);
  const validUsername = validateFormField(usernameField);

  if (!validName || !validContact || !validUsername) {
    alert('Please fix validation errors before saving.');
    return;
  }

  const firstName = firstField.value.trim();
  let middleName = '';
  let lastName = '';
  
  // Parse full name into first/middle/last or use as first name
  const parts = firstName.split(' ');
  if (parts.length >= 3) {
    middleName = parts.slice(1, -1).join(' ');
    lastName = parts[parts.length - 1];
  } else if (parts.length === 2) {
    lastName = parts[1];
  }

  const contact = contactField.value.trim();
  const username = usernameField.value.trim();
  const selects = document.querySelectorAll('#v-add-user .f-sel');
  const role = selects && selects[0] ? selects[0].options[selects[0].selectedIndex].text : 'Customer';
  const status = selects && selects[1] ? selects[1].options[selects[1].selectedIndex].text : 'Active';

  const passwordField = Array.from(inputs).find(inp => inp.type === 'password');
  const laundryPrefField = Array.from(inputs).find(inp => inp.placeholder && inp.placeholder.toLowerCase().includes('laundry preferences'));
  const payload = {
    FirstName: firstName,
    MiddleName: middleName,
    LastName: lastName || firstName,
    ContactNo: contact,
    Username: username,
    Password: passwordField ? passwordField.value : '',
    Role: role,
    LaundryPref: laundryPrefField ? laundryPrefField.value : '',
    Status: status
  };

  if (currentEditUser !== null && currentEditUser !== undefined) {
    payload.UserID = currentEditUser;
  }

  try {
    let res;
    if (payload.UserID) {
      // Ensure types and only valid columns for update
      const updateFields = {
        FirstName: payload.FirstName,
        MiddleName: payload.MiddleName || '',
        LastName: payload.LastName,
        ContactNo: payload.ContactNo ? parseInt(payload.ContactNo) : null,
        Username: payload.Username,
        Password: payload.Password || '',
        Role: payload.Role,
        LaundryPref: payload.LaundryPref || '',
        Status: payload.Status
      };
      console.log('[DEBUG] Updating user with UserID:', payload.UserID, 'Payload:', updateFields);
      res = await supabaseUpdate('user_tb', updateFields, { UserID: payload.UserID });
      console.log('[DEBUG] Supabase update response:', res);
    } else {
      // Insert new user
      const insertFields = {
        FirstName: payload.FirstName,
        MiddleName: payload.MiddleName || '',
        LastName: payload.LastName,
        ContactNo: payload.ContactNo ? parseInt(payload.ContactNo) : null,
        Username: payload.Username,
        Password: payload.Password || '',
        Role: payload.Role,
        LaundryPref: payload.LaundryPref || '',
        Status: payload.Status
      };
      console.log('[DEBUG] Inserting user. Payload:', insertFields);
      res = await supabaseInsert('user_tb', insertFields);
      console.log('[DEBUG] Supabase insert response:', res);
    }
    if (res && res.length > 0) {
      currentEditUser = null;
      renderUserList();
      nav('user-management');
    } else {
      // Try to fetch more error info from Supabase
      let errorMsg = 'Save failed: No data returned.';
      if (typeof res === 'object' && res && res.error) {
        errorMsg += '\nSupabase error: ' + JSON.stringify(res.error);
      } else if (typeof res === 'object' && res && res.message) {
        errorMsg += '\nSupabase message: ' + res.message;
      } else {
        errorMsg += '\nSupabase response: ' + JSON.stringify(res);
      }
      alert(errorMsg);
      console.error('Supabase response:', res);
    }
  } catch (e) {
    alert('Save failed: ' + (e.message || 'Unknown error'));
  }
}

async function doLogin(e) {
  if (e) e.preventDefault();

  // Validate CAPTCHA first
  if (!validateCaptcha()) {
    return;
  }

  // Disable login button while processing
  const loginBtn = document.querySelector('[onclick*="doLogin"]') || document.querySelector('button[type="submit"]');
  if (loginBtn) {
    loginBtn.disabled = true;
  }

  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const selectedRole = document.getElementById('loginRole').value;
  const userErr = document.getElementById('loginUserError');
  const passErr = document.getElementById('loginPassError');
  const roleErr = document.getElementById('loginRoleError');
  
  // Clear previous errors
  if (userErr) { userErr.style.display = 'none'; userErr.textContent = ''; }
  if (passErr) { passErr.style.display = 'none'; passErr.textContent = ''; }
  if (roleErr) { roleErr.style.display = 'none'; roleErr.textContent = ''; }

  console.log('🔐 [doLogin] Starting login process');

  // Validate all fields
  if (!username) {
    console.warn('❌ Username is empty');
    if (userErr) { userErr.textContent = 'Username is required'; userErr.style.display = 'block'; }
    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Login'; }
    return;
  }

  if (!password) {
    console.warn('❌ Password is empty');
    if (passErr) { passErr.textContent = 'Password is required'; passErr.style.display = 'block'; }
    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Login'; }
    return;
  }

  // if user didn't pick a role, default to customer
  let selectedRoleFinal = selectedRole || 'customer';
  console.log('📝 Input received:', { username, role: selectedRoleFinal });
  
  // Attempt login with credentials
  let loginRes = null;
  try {
    console.log('🔑 Calling apiLogin...');
    loginRes = await apiLogin(username, password);
    console.log('🔑 apiLogin returned:', loginRes);
  } catch (err) {
    // apiLogin throws on failure, capture message
    console.error('❌ apiLogin error:', err);
    loginRes = { success: false, message: err.message };
  }

  if (!(loginRes && loginRes.success && loginRes.data)) {
    const msg = loginRes && loginRes.message ? loginRes.message : 'Invalid username or password';
    console.warn('❌ Login failed:', msg);
    // Show error instantly
    if (passErr) { passErr.textContent = '❌ ' + msg; passErr.style.display = 'block'; }
    showToast('❌ ' + msg, 'error');
    // Reset button instantly
    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Login'; }
    return;
  }

  console.log('✅ Login successful');
    // Show dashboard and hide login form
    document.getElementById('app-wrap').classList.add('show');
    document.getElementById('auth-wrap').style.display = 'none';
  const userData = loginRes.data;
  const userRole = userData.Role ? userData.Role.toLowerCase() : 'customer';
  const detectedRole = userRole.includes('admin') ? 'admin' : 
                       userRole.includes('delivery') ? 'delivery' : 
                       'customer';

  // Verify selected role matches user's role
  if (selectedRoleFinal !== detectedRole) {
    // Reset button instantly
    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Login'; }
    console.warn('❌ Role mismatch:', { selected: selectedRoleFinal, detected: detectedRole });
    if (roleErr) { roleErr.textContent = `User role (${detectedRole}) does not match selected role (${selectedRoleFinal})`; roleErr.style.display = 'block'; }
    showToast('❌ Role mismatch. Please select the correct role.', 'error');
    return;
  }

  // Set user and role
  window.currentUser = userData;
  window.userRole = selectedRoleFinal;
  role = selectedRoleFinal;

  console.log('👤 User logged in:', { id: userData.UserID, name: userData.FirstName, role: selectedRoleFinal });

  // Update UI with user info
  const fullName = [userData.FirstName, userData.MiddleName, userData.LastName].filter(Boolean).join(' ') || userData.Username;
  const letter = fullName.charAt(0).toUpperCase();

  document.getElementById('sfAv').textContent = letter;
  document.getElementById('sfName').textContent = fullName;
  const roleText = selectedRoleFinal === 'admin' ? 'Admin / Staff' : selectedRoleFinal === 'delivery' ? 'Delivery Staff' : 'Customer';
  document.getElementById('sfRole').textContent = roleText;
  document.getElementById('tbAv').textContent = letter;
  document.getElementById('profName').textContent = fullName;
  document.getElementById('profRoleLbl').textContent = roleText;
  const profFullEl = document.getElementById('profFull');
  if (profFullEl) profFullEl.value = fullName;

  // Show app, hide auth
  console.log('🎨 Building UI...');
  buildNav();
  document.getElementById('auth-wrap').style.display = 'none';
  document.getElementById('app-wrap').classList.add('show');
  applyLayout();

  // Route to appropriate dashboard based on role
  const defaultPage = selectedRoleFinal === 'admin' ? 'admin-dashboard' : 
                      selectedRoleFinal === 'delivery' ? 'delivery-dashboard' : 
                      'dashboard';
  console.log('📍 Navigating to:', defaultPage);
  nav(defaultPage);

  // Render role-appropriate data
  console.log('📊 Rendering data...');
  try {
    renderBookingsList();
    if (selectedRoleFinal === 'delivery') {
      renderDeliveryTasks();
    } else if (selectedRoleFinal !== 'admin') {
      renderUserList();
    }
    showToast('Welcome, ' + (userData.FirstName || 'User') + '!', 'success');
  } catch (renderErr) {
    console.warn('⚠️ Error rendering initial data:', renderErr);
  }
  
  console.log('✅ Login complete');
}

function doLogout() {
  // Clear user session
  window.currentUser = null;
  window.userRole = null;
  role = 'customer';
  // Clear cached users
  for (const key in userCache) {
    delete userCache[key];
  }
  
  // Clear login form
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginRole').value = '';
  const lu = document.getElementById('loginUserError'); if(lu){lu.textContent=''; lu.style.display='none';}
  const lp = document.getElementById('loginPassError'); if(lp){lp.textContent=''; lp.style.display='none';}
  const lr = document.getElementById('loginRoleError'); if(lr){lr.textContent=''; lr.style.display='none';}
  
  // clear guest booking tracking as well
  window.lastBooking = null;
  try { localStorage.removeItem('lastBookingID'); } catch(e) {}
  // Hide app, show login
  document.getElementById('app-wrap').classList.remove('show');
  document.getElementById('auth-wrap').style.display = 'flex';
  showAuth('login');
}

function applyLayout() {
  const sb = document.getElementById('sidebar');
  const tb = document.getElementById('topbar');
  const cw = document.getElementById('contentWrap');
  if(miniSidebar) {
    sb.classList.add('mini');
    tb.style.left = '64px';
    cw.classList.add('mini');
  } else {
    sb.classList.remove('mini');
    tb.style.left = '240px';
    cw.classList.remove('mini');
  }
}

function toggleSidebar() {
  miniSidebar = !miniSidebar;
  applyLayout();
}

function buildNav() {
  const sbEl = document.getElementById('sbNav');
  sbEl.innerHTML = '';
  if (role === 'admin') {
    aNav.forEach(item => {
      const d = document.createElement('div');
      d.className = 'sb-item';
      d.id = 'sbi-'+item.id;
      d.setAttribute('data-label', item.label);
      d.title = item.label;
      d.innerHTML = `<span class="si">${item.icon}</span><span class="sl">${item.label}</span>`;
      d.onclick = () => nav(item.id);
      sbEl.appendChild(d);
    });
  }
  // Always show logout button
  const ld = document.createElement('div');
  ld.className = 'sb-item sb-logout';
  ld.id = 'sbi-logout';
  ld.setAttribute('data-label', 'Logout');
  ld.title = 'Logout';
  ld.style.marginTop = 'auto';
  ld.innerHTML = `<span class="si">🚪</span><span class="sl">Logout</span>`;
  ld.onclick = () => doLogout();
  sbEl.appendChild(ld);
  // Disable/hide booking nav when shop is closed/maintenance for customers
  // (use global updateBookingNavStatus so other modules can call it)
  try { updateBookingNavStatus(); } catch(e) { console.error('buildNav availability check failed', e); }
  // Poll for availability changes every 30 seconds to show real-time updates
  window.availabilityPollInterval = setInterval(updateBookingNavStatus, 30000);
  // Also refresh when page becomes visible (browser tab switched back)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { updateBookingNavStatus(); }
  });
}

// navigation helper; can be called from many places but we mark it async so we
// can perform availability checks before showing certain views. callers ignore
// the returned promise so there is no need to await in most places.
async function nav(page) {
  // Block access to messaging for unauthorized roles
  try {
    const resolvedRoleCheck = (window.userRole || role || '').toString().toLowerCase();
    if (page === 'messaging' && !(resolvedRoleCheck === 'admin' || resolvedRoleCheck === 'delivery')) {
      alert('Messaging is available to admin and delivery staff only.');
      return;
    }
    // restrict access to the Map view to delivery users only
    if (page === 'map' && resolvedRoleCheck !== 'delivery') {
      alert('Map is available to delivery drivers only.');
      return;
    }
  } catch (e) { /* ignore */ }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const t = document.getElementById('v-'+page);
  if(t) t.classList.add('active');
  document.querySelectorAll('.sb-item').forEach(s => s.classList.remove('active'));
  const si = document.getElementById('sbi-'+page);
  if(si) si.classList.add('active');
  document.getElementById('tbTitle').textContent = titles[page] || page;
  window.scrollTo(0,0);
  // Trigger lightweight render hooks for certain views
  try {
    if (page === 'my-laundry-status' || page === 'laundry-status') {
      if (typeof renderCustomerDashboard === 'function') renderCustomerDashboard();
      if (typeof renderMyOrders === 'function') {
        renderMyOrders();
        if (typeof showOrderTab === 'function') showOrderTab('current');
      }
      if (typeof renderNotifications === 'function') renderNotifications();
    }
    // prevent unauthenticated users from reaching booking form and warn if shop
    // is not open. also auto-fill name/contact for convenience.
    if (page === 'booking' || page === 'book-laundry') {
      // customers may browse booking form without logging in
      // (they'll be prompted to enter name/contact manually)

      // initialize address picker for booking form after view animation completes and is fully painted
      try {
        // wait for view animation (0.22s) plus additional render time
        await new Promise(r => setTimeout(r, 280));
        await setupBookingAddressMap();
      } catch(e) { console.error('booking address map init failed', e); }

      // check availability state from server (or localStorage) before changing view
      try {
        const avails = await apiFetchAvailabilities();
        const avail = avails && avails[0] ? avails[0] : null;
        // If availability info is missing, do not block booking (avoid false 'closed' alerts)
        if (avail && typeof avail.IsOpen !== 'undefined') {
          const isOpen = Number(avail.IsOpen) === 1;
          if (!isOpen) {
            const statusText = (avail.Status || 'closed').toString().toLowerCase();
            alert('Laundry is currently ' + statusText + '. You cannot make a booking right now.');
            // return to customer home/dashboard
            nav('dashboard');
            return;
          }
        } else {
          console.warn('Availability data unavailable; allowing booking by default');
        }
      } catch (e) {
        console.error('Availability check failed', e);
        // let them continue, booking will fail later server-side
      }

      // autofill name and contact with current user info
      const nameEl = document.getElementById('bookingName');
      const contactEl = document.getElementById('bookingContact');
      if (nameEl) {
        const u = window.currentUser || {};
        const fullName = [u.FirstName, u.MiddleName, u.LastName].filter(Boolean).join(' ') || u.Username || '';
        nameEl.value = fullName;
      }
      if (contactEl) {
        contactEl.value = window.currentUser ? window.currentUser.ContactNo || '' : '';
      }
    }
    if (page === 'admin-dashboard' && typeof updateDashboardLaundryStatus === 'function') updateDashboardLaundryStatus();
    if (page === 'admin-dashboard' && typeof renderTodaysBookings === 'function') renderTodaysBookings();
    if (page === 'dashboard' && typeof updateCustomerLaundryStatus === 'function') updateCustomerLaundryStatus();
    if (page === 'notifications' && typeof renderNotifications === 'function') renderNotifications();
    if (page === 'delivery-notifications' && typeof renderDeliveryNotifications === 'function') renderDeliveryNotifications();
    if (page === 'booking-details' && typeof renderBookingDetails === 'function') renderBookingDetails();
    if (page === 'archive') {
      const s = document.getElementById('archiveSearchInput'); if (s) s.value = '';
      if (typeof renderArchive === 'function') renderArchive();
    }
    if (page === 'set-address') {
      try {
        // wait for view animation (0.22s) plus additional render time
        await new Promise(r => setTimeout(r, 280));
        await setupSetAddressMap();
      } catch(e){ console.error('set-address map init failed', e); }
    }
    if (page === 'delivery-tasks' && typeof renderDeliveryTasks === 'function') renderDeliveryTasks();
    if (page === 'laundry-management' && typeof renderLaundryManagementBookings === 'function') {
      renderLaundryManagementBookings().catch(e => console.error('renderLaundryManagementBookings error:', e));
    }
    if (page === 'user-management' && typeof renderUserList === 'function') {
      const searchInput = document.getElementById('userSearch'); if (searchInput) searchInput.value = '';
      renderUserList();
    }
    if (page === 'configuration' && typeof loadConfiguration === 'function') {
      // Load configuration without blocking - handles offline gracefully
      loadConfiguration().catch(e => console.error('Config load error:', e));
    }

    // initialize map view when opened
    try {
      if (page === 'map') {
        if (typeof initDeliveryMap === 'function') {
          await initDeliveryMap();
          // ensure Leaflet redraws after initialization completes
          setTimeout(() => { try { if (window.deliveryMap) window.deliveryMap.invalidateSize(true); } catch(e){} }, 200);
          setTimeout(() => { try { if (window.deliveryTileLayer) window.deliveryTileLayer.redraw(); } catch(e){} }, 400);
          setTimeout(() => { try { if (window.deliveryMap) window.deliveryMap.invalidateSize(true); } catch(e){} }, 600);
        }
      }
    } catch(e) { console.error('Map initialization error:', e); }

    // Start/stop admin bookings polling based on current page and role
    try {
      const roleKey = (window.userRole || role || '').toString().toLowerCase();
      if (roleKey === 'admin' && (page === 'admin-dashboard' || page === 'bookings')) {
        // Note: DO NOT enable polling for laundry-management; it uses renderLaundryManagementBookings() instead
        startBookingsPolling();
      } else {
        stopBookingsPolling();
      }
    } catch (e) { /* ignore */ }

  } catch (e) { console.error('nav render hook', e); }
}

// Role-aware back navigation for profile
window.navigateBackToDashboard = function() {
  const resolvedRole = window.userRole || (typeof role !== 'undefined' ? role : window.role) || 'customer';
  const r = String(resolvedRole).toLowerCase();
  if (r === 'admin') return nav('admin-dashboard');
  if (r === 'delivery' || r === 'driver') return nav('delivery-dashboard');
  return nav('dashboard');
};

// Navigate to laundry management with specific tab (instant)
window.navToLaundryTab = function(tabName) {
  nav('laundry-management');
  if (typeof showLaundryManagementTab === 'function') {
    showLaundryManagementTab(tabName);
  }
};

// Navigate to user management with specific tab (instant)
window.navToUserTab = function(tabName) {
  nav('user-management');
  if (typeof showUserTab === 'function') {
    showUserTab(tabName);
  }
};

// Add search event listener and initialize list
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Math CAPTCHA
  generateMathCaptcha();
  
  const searchInput = document.getElementById('userSearch') || document.querySelector('#v-user-management .search input');
  if (searchInput) {
    searchInput.addEventListener('input', function(e) {
      searchUsers(e.target.value);
    });
  }

  // archive search listener
  const archiveSearch = document.getElementById('archiveSearchInput');
  if (archiveSearch) {
    archiveSearch.addEventListener('input', function() {
      if (typeof searchArchive === 'function') searchArchive();
    });
  }

  // Add validation to all form inputs
  document.querySelectorAll('.f-input').forEach(input => {
    input.addEventListener('blur', function() {
      validateFormField(this);
    });
    input.addEventListener('focus', function() {
      this.classList.remove('error');
      const errMsg = this.parentElement.querySelector('.error-msg');
      if (errMsg) errMsg.style.display = 'none';
    });
  });

  // Toggle password visibility (uses neutral SVG eye icons)
  window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const eyeOpen = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const eyeClosed = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2l20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 12s4-8 11-8c2.2 0 4.3.5 6.1 1.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    if (!button) return;

    if (input.type === 'password') {
      input.type = 'text';
      button.innerHTML = eyeClosed;
    } else {
      input.type = 'password';
      button.innerHTML = eyeOpen;
    }
  };

  // Sign up step 1: Validate inputs before continuing
  window.validateSignupStep1 = function() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const address = document.getElementById('address').value.trim();
    const contact = document.getElementById('contactNo').value.trim();

    // Clear previous errors
    const fnErr = document.getElementById('firstNameError'); if(fnErr){fnErr.style.display='none';fnErr.textContent='';}
    const lnErr = document.getElementById('lastNameError'); if(lnErr){lnErr.style.display='none';lnErr.textContent='';}
    const addrErr = document.getElementById('addressError'); if(addrErr){addrErr.style.display='none';addrErr.textContent='';}
    const cErr = document.getElementById('contactNoError'); if(cErr){cErr.style.display='none';cErr.textContent='';}

    // Validation
    if (!firstName) { if(fnErr){fnErr.textContent='First name is required'; fnErr.style.display='block';} return; }
    if (!lastName) { if(lnErr){lnErr.textContent='Last name is required'; lnErr.style.display='block';} return; }
    if (!address) { if(addrErr){addrErr.textContent='Address is required'; addrErr.style.display='block';} return; }
    if (!contact) { if(cErr){cErr.textContent='Contact number is required'; cErr.style.display='block';} return; }

    // Validate contact number format (09xxxxxxxxx)
    if (!/^09\d{9}$/.test(contact.replace(/[^0-9]/g, ''))) { if(cErr){cErr.textContent='Please enter a valid contact number (09123456789 format)'; cErr.style.display='block';} return; }

    // All validations passed, proceed to step 2
    showAuth('s2');
  };

  // Password reset: Verify username
  window.verifyUsernameForReset = async function() {
    const username = document.getElementById('forgotUser').value.trim();
    const errEl = document.getElementById('forgotUserError');
    if (errEl){ errEl.style.display='none'; errEl.textContent=''; }
    
    if (!username) {
      if (errEl){ errEl.textContent = 'Username is required'; errEl.style.display='block'; }
      return;
    }

    try {
      const response = await apiVerifyUsername(username);

      if (response && response.success) {
        const uid = response.data && response.data.UserID;
        if (uid) {
          window.sessionStorage.setItem('resetUserID', uid);
          // Hide forgot form, show reset form
          document.getElementById('auth-forgot').style.display = 'none';
          document.getElementById('auth-reset').style.display = 'block';
          document.getElementById('resetPass1').value = '';
          document.getElementById('resetPass2').value = '';
          const r1 = document.getElementById('resetPass1Error'); if(r1){r1.style.display='none';r1.textContent='';}
          const r2 = document.getElementById('resetPass2Error'); if(r2){r2.style.display='none';r2.textContent='';}
          const rs = document.getElementById('resetSuccess'); if(rs){rs.style.display='none';rs.textContent='';}
        } else {
          // unexpected, no userID returned
          if (errEl){ errEl.textContent = 'Unable to verify username'; errEl.style.display='block'; }
          console.error('verifyUsername succeeded but no UserID', response);
        }
      } else {
        if (errEl){ errEl.textContent = response && response.message ? response.message : 'Username not found'; errEl.style.display='block'; }
        console.error('verifyUsername failed:', response);
      }
    } catch (error) {
      if (errEl){ errEl.textContent = 'Error verifying username: ' + error.message; errEl.style.display='block'; }
      console.error(error);
    }
  };

  // Password reset: Submit new password
  window.resetUserPassword = async function() {
    const pass1 = document.getElementById('resetPass1').value;
    const pass2 = document.getElementById('resetPass2').value;
    const pass1Error = document.getElementById('resetPass1Error');
    const pass2Error = document.getElementById('resetPass2Error');
    const successDiv = document.getElementById('resetSuccess');
    
    if(pass1Error){pass1Error.style.display='none';pass1Error.textContent='';}
    if(pass2Error){pass2Error.style.display='none';pass2Error.textContent='';}
    if(successDiv){successDiv.style.display='none';successDiv.textContent='';}

    // Validation
    if (!pass1) { if(pass1Error){pass1Error.textContent='New password is required'; pass1Error.style.display='block';} return; }
    if (!pass2) { if(pass2Error){pass2Error.textContent='Please confirm your password'; pass2Error.style.display='block';} return; }
    if (pass1 !== pass2) { if(pass2Error){pass2Error.textContent='Passwords do not match'; pass2Error.style.display='block';} return; }
    if (pass1.length < 6) { if(pass1Error){pass1Error.textContent='Password must be at least 6 characters'; pass1Error.style.display='block';} return; }

    try {
      const userID = window.sessionStorage.getItem('resetUserID');
      if (!userID) {
        if(pass1Error){pass1Error.textContent='Session expired. Please verify username again.'; pass1Error.style.display='block';}
        return;
      }

      const response = await apiResetPassword(userID, pass1);

      if (response && response.success) {
        if(successDiv){ successDiv.textContent = 'Password reset successfully! Redirecting to login...'; successDiv.style.display = 'block'; }
        window.sessionStorage.removeItem('resetUserID');
        // Redirect instantly to login (no delay)
        document.getElementById('auth-reset').style.display = 'none';
        document.getElementById('auth-forgot').style.display = 'none';
        document.getElementById('auth-login').style.display = 'block';
        document.getElementById('loginUser').value = '';
        document.getElementById('loginPass').value = '';
      } else {
        if(pass1Error){ pass1Error.textContent = response && response.message ? response.message : 'Error resetting password'; pass1Error.style.display='block'; }
        console.error('Reset password failed:', response);
      }
    } catch (error) {
      if(pass1Error){ pass1Error.textContent = 'Error: ' + error.message; pass1Error.style.display='block'; }
    }
  };

  // Sign up: Register new user
  window.registerUser = async function() {
    // Collect step 1 data
    const firstName = document.getElementById('firstName').value.trim();
    const middleName = document.getElementById('middleName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const address = document.getElementById('address').value.trim();
    const contact = document.getElementById('contactNo').value.trim();
    
    // Collect step 2 data
    const username = document.getElementById('signupUser').value.trim();
    const password = document.getElementById('signupPass').value;
    
    const userErr = document.getElementById('signupUserError');
    const passErr = document.getElementById('signupPassError');
    const successDiv = document.getElementById('signupSuccess');
    if(userErr){userErr.style.display='none'; userErr.textContent='';}
    if(passErr){passErr.style.display='none'; passErr.textContent='';}
    if(successDiv){successDiv.style.display='none'; successDiv.textContent='';}

    // Ensure step1 fields are present (fallback)
    const fnErr = document.getElementById('firstNameError');
    const cErr = document.getElementById('contactNoError');
    if (!firstName) { if(fnErr){fnErr.textContent='First name is required'; fnErr.style.display='block';} return; }
    if (!lastName) { if(document.getElementById('lastNameError')){document.getElementById('lastNameError').textContent='Last name is required';document.getElementById('lastNameError').style.display='block';} return; }
    if (!contact) { if(cErr){cErr.textContent='Contact number is required'; cErr.style.display='block';} return; }

    // Validate contact number format (09xxxxxxxxx)
    if (!/^09\d{9}$/.test(contact.replace(/[^0-9]/g, ''))) { if(cErr){cErr.textContent='Please enter a valid contact number (09123456789 format)'; cErr.style.display='block';} return; }

    if (!username) { if(userErr){userErr.textContent='Username is required'; userErr.style.display='block';} return; }
    if (!password) { if(passErr){passErr.textContent='Password is required'; passErr.style.display='block';} return; }
    if (password.length < 6) { if(passErr){passErr.textContent='Password must be at least 6 characters'; passErr.style.display='block';} return; }

    try {
      const response = await apiSignup(firstName, middleName, lastName, contact, username, password);

      if (response && response.success) {
        // Log User_ID for reference
        const userId = response.data?.UserID || 'N/A';
        console.log('✅ New user registered with User_ID:', userId);
        alert(`✅ Account created successfully!\n\nUser ID: ${userId}\n\nYou can now login with your credentials.`);
        
        // Redirect instantly to login
        document.getElementById('auth-s1').style.display = 'none';
        document.getElementById('auth-s2').style.display = 'none';
        document.getElementById('auth-login').style.display = 'block';
        document.getElementById('loginUser').value = '';
        document.getElementById('loginPass').value = '';
      } else {
        if(userErr){ userErr.textContent = (response && response.message) ? response.message : 'Error creating account'; userErr.style.display='block'; }
        console.error('Signup failed:', response);
      }
    } catch (error) {
      if(userErr){ userErr.textContent = 'Error: ' + error.message; userErr.style.display='block'; }
      console.error('Signup exception:', error);
    }
  };

  // Note: apiFetchBookings, apiSaveBooking, etc. are already defined above
  // They all use the database API (no localStorage fallback)

  // Booking flow: review then confirm
  window.reviewBooking = function() {
    // Basic validation
    const name = document.getElementById('bookingName').value.trim();
    const contact = document.getElementById('bookingContact').value.trim();
    const address = document.getElementById('bookingAddress').value.trim();
    if (!name || !contact || !address) {
      alert('Please fill in name, contact and address');
      return;
    }
    // before showing the summary, make sure shop is still open
    apiFetchAvailabilities().then(avails => {
      const avail = avails && avails[0] ? avails[0] : null;
      // If availability info is present, check Status; otherwise allow booking
      if (avail && avail.Status) {
        const s = avail.Status.toString().toLowerCase();
        if (s !== 'open') {
          const statusText = s.includes('maintenance') ? 'maintenance' : 'closed';
          alert('Cannot proceed ? laundry is currently ' + statusText + '.');
          return;
        }
      } else {
        console.warn('Availability data missing during reviewBooking; allowing navigation to summary');
      }
      // populate summary (quick approach)
      // You can extend to show actual values in the summary view
      nav('booking-summary');
    }).catch(e => {
      console.error('reviewBooking availability check failed', e);
      // still navigate; server will block if necessary
      nav('booking-summary');
    });
  };

  window.confirmBooking = async function() {
    console.log('[BOOKING] confirmBooking called. User:', window.currentUser, 'Role:', window.userRole);
    
    // login not required; customers can book as guest
    // if logged in, we'll include their ID and contact info later

    // Validate required form fields
    const name = document.getElementById('bookingName').value.trim();
    const contact = document.getElementById('bookingContact').value.trim();
    const address = document.getElementById('bookingAddress').value.trim();
    const laundryType = document.getElementById('bookingLaundryType').value;
    const clothesType = document.getElementById('bookingClothesType').value;
    const weight = document.getElementById('bookingWeight').value.trim();
    const submissionMethod = document.getElementById('bookingSubmissionMethod').value;
    const receivingMethod = document.getElementById('bookingReceivingMethod').value;
    
    if (!name || !contact || !address || !laundryType || !clothesType || !weight || !submissionMethod || !receivingMethod) {
      alert('Please fill in all required fields (Name, Contact, Address, Service Type, Clothes Type, Weight, Submission & Receiving Methods)');
      console.warn('[BOOKING] Missing fields:', { name, contact, address, laundryType, clothesType, weight, submissionMethod, receivingMethod });
      return;
    }

    // Check availability before sending payload
    try {
      const avails = await apiFetchAvailabilities();
      const avail = avails && avails[0] ? avails[0] : null;
      if (avail && avail.Status) {
        const s = avail.Status.toString().toLowerCase();
        if (s !== 'open') {
          const statusText = s.includes('maintenance') ? 'maintenance' : 'closed';
          alert('Cannot create booking ? laundry is currently ' + statusText + '.');
          return;
        }
      } else {
        console.warn('Availability data missing during confirmBooking; proceeding and letting server validate');
      }
    } catch (e) {
      console.error('confirmBooking availability check failed', e);
      // continue and let server enforce to avoid blocking customer due to fetch error
    }

    const payload = {
      CustomerID: (window.currentUser && window.currentUser.UserID) ? window.currentUser.UserID : null,
      ContactNo: parseInt(contact) || 0,  // Convert to int8
      Address: address,
      LaundryType: laundryType,
      ClothesType: clothesType,
      EstimatedWeight: parseFloat(weight) || 0,  // Convert to numeric
      SubmissionMethod: submissionMethod,
      ReceivingMethod: receivingMethod,
      PaymentMethod: 'In person',
      Status: 'Order Placed',
      AvailabilityID: 1
    };

    console.log('[BOOKING] Sending payload to API:', payload);

    try {
      const res = await apiSaveBooking(payload);
      if (res && res.success) {
        console.log('[BOOKING] Booking created successfully:', res.data);
        // remember this booking so guest can see it
        window.lastBooking = res.data;
        try { localStorage.setItem('lastBookingID', res.data.BookID); } catch(e) {}
        alert('? Booking created (ID: ' + (res.data && res.data.BookID) + ')!\nStatus: Order Placed - waiting for admin confirmation.');
        nav('my-laundry-status');
      } else {
        let msg = (res && res.message) ? res.message : 'Unknown error';
        console.error('[BOOKING] API response error:', res);
        alert('? Failed to create booking:\n' + msg);
        if (msg.toLowerCase().includes('authentication')) {
          alert('Your session expired. Please sign in again.');
          nav('login');
        }
      }
    } catch (e) {
      console.error('[BOOKING] Exception:', e);
      alert('? Error creating booking:\n' + e.message);
      if (e.message.toLowerCase().includes('authentication')) {
        alert('Your session expired. Please sign in again.');
        nav('login');
      }
    }
  };

  // Initial render of users (only if container exists)
  try {
    if (document.getElementById('userList')) {
      renderUserList();
    }
  } catch (e) {
    console.warn('renderUserList error on init:', e);
  }
});

// Archive function for orders and records - now uses database
async function archiveRecord(type, id) {
  if (confirm('Archive this ' + type + '? You can restore it later from the Archive section.')) {
    try {
      if (type === 'booking') {
        await archiveBooking(id);
      } else if (type === 'notification') {
        archiveNotification(id);
      }
      alert(type + ' #' + id + ' archived successfully');
      // Refresh the current view without full reload
      try {
        if (typeof renderBookingsList === 'function') renderBookingsList();
        if (typeof renderLaundryManagementBookings === 'function') renderLaundryManagementBookings();
        if (typeof renderNotifications === 'function') renderNotifications();
      } catch (e) {}
    } catch (e) {
      alert('Failed to archive: ' + e.message);
    }
  }
}

// (removed small unused helpers)

// Update laundry status (persist to database)
async function updateLaundryStatus(orderId, newStatus) {
  try {
    const res = await apiSaveBooking({ BookID: orderId, Status: newStatus });
    if (res && res.success) {
      alert('Order #' + orderId + ' status updated to: ' + newStatus);
      renderBookingsList();
      return;
    }
  } catch (e) { console.error('updateLaundryStatus error', e); }
  alert('Failed to update status (check console)');
}

// Render bookings list in admin views
async function renderBookingsList() {
  try {
    let list = await apiFetchBookings();

    // FILTER BY USER ROLE: Only show relevant bookings
    const userRole = window.userRole || role;
    if (userRole === 'customer') {
      // Customer sees only their own bookings
      const currentUserId = window.currentUser ? window.currentUser.UserID : null;
      list = list.filter(b => String(b.CustomerID) === String(currentUserId));
    } else if (userRole === 'delivery') {
      // Delivery staff doesn't see bookings table, they see tasks
      return;
    }
    // Admin sees all bookings (no filter)

    // Populate admin bookings table
    const tbBookings = document.querySelector('#v-bookings table.tbl tbody');
    if (tbBookings) {
      tbBookings.innerHTML = '';
      if (list.length === 0) {
        tbBookings.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999">No bookings found</td></tr>';
      }
      list.forEach(b => {
        const statusColor = getBadgeClassForStatus(b.Status);
        const tr = document.createElement('tr');
        let actionBtns = '';
        
        const userRole = window.userRole || role;
        if (userRole === 'admin') {
          // Admin can approve, update status
          const ns = normalizeStatus(b.Status);
          if (ns === 'Pending Confirmation' || ns === 'Order Placed') {
            actionBtns = `<button class="btn btn-success btn-sm" onclick="approveBooking(${b.BookID})">Approve</button>`;
          } else if (ns === 'Confirmed') {
            actionBtns = `<button class="btn btn-primary btn-sm" onclick="updateBookingStatus(${b.BookID}, 'Ready for Pickup')">Ready for Pickup</button>`;
          } else if (ns === 'Ready for Pickup' || ns === 'Picked Up') {
            actionBtns = `<button class="btn btn-outline btn-sm" onclick="updateBookingStatus(${b.BookID}, 'Delivered')">Complete</button>`;
          }
          actionBtns += `<button class="btn btn-danger btn-sm" onclick="archiveRecord('booking', ${b.BookID})">Archive</button>`;
        } else if (userRole === 'customer') {
          // Customer can cancel pending bookings or view
          if (!isCompleted(b.Status)) {
            actionBtns = `<button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.BookID})">Cancel</button>`;
          } else {
            actionBtns = `<button class="btn btn-outline btn-sm" onclick="showBookingDetails(${b.BookID})">View Details</button>`;
          }
        }
        
        // Build clean row HTML with proper formatting
        const customerName = b.FullName || b.CustomerName || '';
        const service = b.LaundryType || b.ServiceType || '';
        const weight = b.EstimatedWeight || b.Weight || '';
        const method = b.SubmissionMethod || '';
        const total = Number(b.Total || 0);
        const totalFormatted = total > 0 ? `₱${total.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '₱0.00';
        tr.innerHTML = `<td>${String(b.BookID).padStart(3,'0')}</td><td>${customerName}</td><td>${service}</td><td>${weight}</td><td>${method}</td><td><span class="badge ${statusColor}">${normalizeStatus(b.Status)||'Unknown'}</span></td><td>${totalFormatted}</td><td><div style="display:flex;gap:6px">${actionBtns}</div></td>`;
        tbBookings.appendChild(tr);
      });
    }

    // Populate laundry-management table if present (for customers)
    // NOTE: Laundry Management view is now rendered by renderLaundryManagementBookings() instead
    // Do NOT render here to avoid conflicts and flickering

    // Render delivery tasks (bookings ready for pickup/in transit)
    renderDeliveryTasks(list);

    // Update admin dashboard stats
    updateDashboardBookingStats(list);

    // Render admin and delivery mini-views if present
    try { renderAdminDashboard(list); } catch(e) { console.error(e); }
    try { renderDeliveryDashboard(list); } catch(e) { console.error(e); }

    // Render today's bookings table
    try { renderTodaysBookings(); } catch(e) { console.error(e); }

    // Update customer dashboard, archive, and notifications (if applicable)
    try { renderCustomerDashboard(); } catch(e) { console.error(e); }
    try { renderArchive(); } catch(e) { console.error(e); }

    try { renderNotifications(); } catch(e) { console.error(e); }
  } catch (e) { console.error('renderBookingsList', e); }
}

// count dashboard stats for bookings
function updateDashboardBookingStats(bookings) {
  const totalEl = document.getElementById('dashBookingTotal');
  const pendingEl = document.getElementById('dashBookingPending');
  const completedEl = document.getElementById('dashBookingCompleted');
  if (!bookings) {
    bookings = [];
  }
  const total = bookings.length;
  const pending = bookings.filter(b => !isCompleted(b.Status)).length;
  const completed = bookings.filter(b => isCompleted(b.Status)).length;
  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (completedEl) completedEl.textContent = completed;
}

// MULTI-PORTAL SYNC: Render delivery portal tasks (Real-time linked to bookings)
async function renderDeliveryTasks(bookingsList = null) {
  try {
    const list = bookingsList || await apiFetchBookings();
    // any booking that hasn't reached 'Delivered' stage yet is considered a task
    const allTasks = list.filter(b => !isCompleted(b.Status));
    const deliveryTasks = allTasks.filter(b => String(b.ReceivingMethod).toLowerCase() === 'delivery');
    const pickupTasks = allTasks.filter(b => String(b.ReceivingMethod).toLowerCase() === 'pickup');
    
    // Render All Tasks
    renderTasksTable('allTasksTable', allTasks);
    
    // Render Delivery Tasks
    renderTasksTable('deliveryTasksTable', deliveryTasks);
    
    // Render Pickup Tasks
    renderTasksTable('pickupTasksTable', pickupTasks);
  } catch (e) { console.error('renderDeliveryTasks', e); }
}

// Helper to render tasks in a table
function renderTasksTable(tableId, tasks) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;
  
  tbody.innerHTML = '';
  if (tasks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999">No tasks</td></tr>';
  } else {
    tasks.forEach(b => {
      const isPickup = b.SubmissionMethod === 'Pickup';
      const taskType = isPickup ? 'Pickup' : 'Delivery';
      const statusBadge = b.Status === 'Picked Up' ? '<span class="badge b-yel">For Delivery</span>' : b.Status === 'Ready for Pickup' ? '<span class="badge b-yel">Ready</span>' : '<span class="badge b-prog">Scheduled</span>';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${String(b.BookID).padStart(3,'0')}</td><td>${taskType}</td><td>${(b.FullName||'')}</td><td>${(b.Address||'N/A')}</td><td>${b.LaundryType||''}</td><td>${statusBadge}</td><td><div style="display:flex;gap:6px"><button class="btn btn-outline btn-sm" onclick="showBookingDetails(${b.BookID})">View</button><button class="btn btn-outline btn-sm" onclick="markDeliveryStatus(${b.BookID}, '${taskType.toLowerCase()}')">Mark ${taskType === 'Pickup' ? 'Picked Up' : 'Delivered'}</button></div></td>`;
      tbody.appendChild(tr);
    });
  }
}

// Render a compact admin dashboard list (recent bookings)
async function renderAdminDashboard(bookingsList = null) {
  try {
    const list = bookingsList || await apiFetchBookings();
    // support legacy container id 'latestBookingsContainer' in HTML
    const el = document.getElementById('adminRecentBookings') || document.getElementById('latestBookingsContainer');
    if (!el) return;
    const recent = list.slice().reverse().slice(0,5);
    if (!recent || recent.length === 0) {
      el.innerHTML = '<div style="color:#999">No recent bookings</div>';
      return;
    }
    let html = '<div class="admin-recent-list">';
    recent.forEach(b => {
      const ns = normalizeStatus(b.Status).toLowerCase();
      const tab = isCompleted(b.Status) ? 'completed' : 'pending';
        html += `<div style="padding:6px 0;border-bottom:1px solid #f1f1f1;cursor:pointer" onclick="navToLaundryTab('${tab}')"><strong>#${String(b.BookID).padStart(3,'0')}</strong> ${b.FullName || ''} <span style="color:#666">${normalizeStatus(b.Status) || 'Pending'}</span></div>`;
    });
    html += '</div>';
    el.innerHTML = html;
  } catch (e) { console.error('renderAdminDashboard', e); }
}

// Render a compact delivery dashboard list (recent delivery tasks)
async function renderDeliveryDashboard(bookingsList = null) {
  try {
    const list = bookingsList || await apiFetchBookings();
    // support legacy container id 'recentTasksContainer' in HTML
    const el = document.getElementById('deliveryRecentTasks') || document.getElementById('recentTasksContainer');
    if (!el) return;
    const tasks = list.filter(b => !isCompleted(b.Status) && String(b.ReceivingMethod).toLowerCase() === 'delivery');
    const recent = tasks.slice().reverse().slice(0,5);
    if (!recent || recent.length === 0) { el.innerHTML = '<div style="color:#999">No delivery tasks</div>'; return; }
    let html = '<div class="delivery-recent-list">';
    recent.forEach(b => {
      html += `<div style="padding:6px 0;border-bottom:1px solid #f1f1f1"><strong>#${String(b.BookID).padStart(3,'0')}</strong> ${b.FullName || ''} ? <span style="color:#666">${b.Status || ''}</span><div style="font-size:0.85em;color:#666">${b.Address || 'No address'}</div></div>`;
    });
    html += '<div style="margin-top:8px"><a onclick="nav(\'delivery-tasks\')">View tasks</a></div>';
    html += '</div>';
    el.innerHTML = html;
  } catch (e) { console.error('renderDeliveryDashboard', e); }
}

// Update delivery dashboard stats and recent tasks
async function updateDeliveryDashboard() {
  try {
    const bookings = await apiFetchBookings();
    const allTasks = bookings.filter(b => !isCompleted(b.Status));
    const pendingTasks = bookings.filter(b => !isCompleted(b.Status)).length;
    const completedTasks = bookings.filter(b => isCompleted(b.Status)).length;
    
    // Update stat counters
    const taskCount = document.getElementById('statTasksCount');
    const pendingCount = document.getElementById('statPendingCount');
    const completedCount = document.getElementById('statCompletedCount');
    
    if (taskCount) taskCount.textContent = allTasks.length;
    if (pendingCount) pendingCount.textContent = pendingTasks;
    if (completedCount) completedCount.textContent = completedTasks;
    
    // Update recent tasks
    const recentContainer = document.getElementById('recentTasksContainer');
    if (recentContainer) {
      recentContainer.innerHTML = '';
      const recent = allTasks.slice(0, 2);
      if (recent.length === 0) {
        recentContainer.innerHTML = '<div style="color:#999;padding:20px;text-align:center">No tasks assigned yet</div>';
      } else {
        recent.forEach(b => {
          const taskType = b.SubmissionMethod === 'Pickup' ? '🚚' : '🏠';
          const statusBadge = b.Status === 'Picked Up' ? 'b-yel' : 'b-prog';
          const card = document.createElement('div');
          card.className = 'o-card';
          card.style.cursor = 'pointer';
          card.onclick = () => showBookingDetails(b.BookID);
          card.innerHTML = `<div class="o-ic">${taskType}</div><div class="o-info"><strong>${b.FullName||'Customer'}</strong><p>${b.LaundryType||''} ? ${b.EstimatedWeight||''}</p></div><span class="badge ${statusBadge}">${b.Status||'Unknown'}</span>`;
          recentContainer.appendChild(card);
        });
      }
    }
  } catch (e) { console.error('updateDeliveryDashboard', e); }
}

// Tab switching for Delivery Tasks
window.showDeliveryTaskTab = function(tab) {
  document.querySelectorAll('.archive-panel').forEach(p => p.style.display = 'none');
  const allPanel = document.getElementById('allTasksPanel');
  const deliveryPanel = document.getElementById('deliveryTasksPanel');
  const pickupPanel = document.getElementById('pickupTasksPanel');
  
  if (tab === 'all' && allPanel) allPanel.style.display = 'block';
  if (tab === 'delivery' && deliveryPanel) deliveryPanel.style.display = 'block';
  if (tab === 'pickup' && pickupPanel) pickupPanel.style.display = 'block';
  
  renderDeliveryTasks();
};

// Tab switching for Laundry Management in Admin Portal
window.showLaundryManagementTab = function(tab) {
  document.querySelectorAll('.bookings-panel').forEach(p => p.style.display = 'none');
  const allPanel = document.getElementById('allBookingsPanel');
  const pendingPanel = document.getElementById('pendingBookingsPanel');
  const completedPanel = document.getElementById('completedBookingsPanel');
  
  if (tab === 'all' && allPanel) allPanel.style.display = 'block';
  if (tab === 'pending' && pendingPanel) pendingPanel.style.display = 'block';
  if (tab === 'completed' && completedPanel) completedPanel.style.display = 'block';
  
  // Clear search input when switching tabs
  const searchInput = document.getElementById('laundrySearchInput');
  if (searchInput) searchInput.value = '';
  
  renderLaundryManagementBookings();
};

// Render laundry management bookings by status
async function renderLaundryManagementBookings() {
  try {
    const bookings = await apiFetchBookings();
    console.debug('renderLaundryManagementBookings: fetched', Array.isArray(bookings) ? bookings.length : typeof bookings, bookings && bookings.slice ? bookings.slice(0,3) : bookings);
    
    if (bookings.length > 0) {
      console.log('📋 Sample booking structure:', bookings[0]);
    }
    
    // All bookings (Total Bookings panel)
    const allContainer = document.getElementById('allBookingsContainer');
    if (allContainer) {
      // there is no reliable date column in table, just render everything
      renderBookingsInContainer(bookings, allContainer);
    }
    
    // Pending bookings (any status not "Completed")
    const pendingBookings = bookings.filter(b => {
      const s = (b.Status || '').toString().toLowerCase();
      return s !== 'completed';
    });
    const pendingContainer = document.getElementById('pendingBookingsContainer');
    if (pendingContainer) {
      renderBookingsInContainer(pendingBookings, pendingContainer); 
    }
    
    // Completed bookings (status exactly "Completed")
    const completedBookings = bookings.filter(b => (b.Status || '').toString().toLowerCase() === 'completed');
    const completedContainer = document.getElementById('completedBookingsContainer');
    if (completedContainer) {
      renderBookingsInContainer(completedBookings, completedContainer); // <-- use completedBookings
    }
  } catch (e) { console.error('renderLaundryManagementBookings', e); }
}

// Helper to render bookings in a container
function renderBookingsInContainer(bookings, container) {
  // clear container
  if (!container) return;
  // If bookings empty, show placeholder
  if (!Array.isArray(bookings) || bookings.length === 0) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#999">No bookings to display</div>';
    return;
  }

  // Find a tbody within the container; some templates wrap table differently
  let tbody = null;
  if (container.tagName && container.tagName.toLowerCase() === 'tbody') tbody = container;
  else tbody = container.querySelector('tbody');
  if (!tbody) {
    // as a last resort, replace container innerHTML with a full table
    const rows = bookings.map((b,i) => renderBookingRow(b,i)).join('');
    container.innerHTML = `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>#</th><th>Customer</th><th>Service</th><th>Weight</th><th>Method</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }

  tbody.innerHTML = bookings.map((b, i) => renderBookingRow(b, i)).join('');
}

function renderBookingRow(b, i){
  const statusBadgeClass = getBadgeClassForStatus(b.Status);
  const displayStatus = normalizeStatus(b.Status) || 'Pending';
  
  // Get correct field values - use multiple field name options
  const customerName = b.FullName || b.CustomerName || 'N/A';
  const service = b.LaundryType || b.ServiceType || 'N/A';
  const weight = b.EstimatedWeight || b.Weight || 'N/A';
  const method = b.SubmissionMethod || 'N/A';
  const total = Number(b.Total || 0);
  
  // Format currency as peso
  const totalFormatted = total > 0 
    ? `₱${total.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
    : '₱0.00';
  
  return `
      <tr>
        <td>${String(b.BookID || (i+1)).padStart(3, '0')}</td>
        <td>${customerName}</td>
        <td>${service}</td>
        <td>${weight}${typeof weight === 'number' || weight === 'N/A' ? '' : ' kg'}</td>
        <td>${method}</td>
        <td><span class="badge ${statusBadgeClass}">${displayStatus}</span></td>
        <td>${totalFormatted}</td>
        <td>
          <div class="tbl-action">
            <button class="tbl-btn" onclick="showBookingDetails('${b.BookID}')">View</button>
            ${!isCompleted(b.Status) ? `<button class="tbl-btn danger" onclick="cancelBooking('${b.BookID}')">Cancel</button>` : ''}
          </div>
        </td>
      </tr>
    `;
}

// Search laundry bookings
window.searchLaundryBookings = async function() {
  const searchTerm = document.getElementById('laundrySearchInput').value.toLowerCase();
  const bookings = await apiFetchBookings();
  
  // Filter bookings based on search term
  const filteredBookings = bookings.filter(b => {
    const bookingId = String(b.BookID || '').padStart(3, '0').toLowerCase();
    const customerName = (b.FullName || '').toLowerCase();
    const laundryType = (b.LaundryType || '').toLowerCase();
    
    return bookingId.includes(searchTerm) || 
           customerName.includes(searchTerm) || 
           laundryType.includes(searchTerm);
  });
  
  // Render based on current active tab
  const allPanel = document.getElementById('allBookingsPanel');
  const pendingPanel = document.getElementById('pendingBookingsPanel');
  const completedPanel = document.getElementById('completedBookingsPanel');
  
  if (allPanel && allPanel.style.display !== 'none') {
    const allContainer = document.getElementById('allBookingsContainer');
    if (allContainer) renderBookingsInContainer(filteredBookings, allContainer);
  } else if (pendingPanel && pendingPanel.style.display !== 'none') {
    const pendingFiltered = filteredBookings.filter(b => !isCompleted(b.Status));
    const pendingContainer = document.getElementById('pendingBookingsContainer');
    if (pendingContainer) renderBookingsInContainer(pendingFiltered, pendingContainer);
  } else if (completedPanel && completedPanel.style.display !== 'none') {
    const completedFiltered = filteredBookings.filter(b => ['Delivered', 'Completed'].includes(b.Status));
    const completedContainer = document.getElementById('completedBookingsContainer');
    if (completedContainer) renderBookingsInContainer(completedFiltered, completedContainer);
  }
};


// helper for archive search bar
window.searchArchive = function() {
  if (typeof renderArchive === 'function') renderArchive();
};

// Tab switching for My Laundry Status
window.showOrderTab = function(tab) {
  document.querySelectorAll('.orders-panel').forEach(p => p.style.display = 'none');
  const currentPanel = document.getElementById('currentOrdersPanel');
  const completedPanel = document.getElementById('completedOrdersPanel');

  if (tab === 'current' && currentPanel) currentPanel.style.display = 'block';
  if (tab === 'completed' && completedPanel) completedPanel.style.display = 'block';

  renderMyOrders();
};

// Render all orders by status (current vs completed)
async function renderMyOrders() {
  try {
    // Render orders for the currently logged-in customer
    const currentContainer = document.getElementById('currentOrdersContainer');
    const completedContainer = document.getElementById('completedOrdersContainer');
    const bookings = await apiFetchBookings();
    console.log('[ORDERS] fetched', bookings.length, 'records from API', bookings);
    const uid = window.currentUser ? window.currentUser.UserID : null;
    let userBookings;
    if (uid) {
      userBookings = bookings.filter(b => String(b.CustomerID) === String(uid));
      console.log('[ORDERS] filtering for user', uid, 'found', userBookings.length);
    } else {
      // guest path: attempt to restore from localStorage/id or lastBooking fallback
      const lastId = localStorage.getItem('lastBookingID');
      console.log('[ORDERS] guest path, lastId=', lastId, 'window.lastBooking=', window.lastBooking);
      if (lastId) {
        const found = bookings.find(b => String(b.BookID) === String(lastId));
        if (found) {
          userBookings = [found];
        } else if (window.lastBooking) {
          userBookings = [window.lastBooking];
        }
      } else if (window.lastBooking) {
        userBookings = [window.lastBooking];
      }
      console.log('[ORDERS] guest userBookings=', userBookings);
    }
    if (!userBookings || userBookings.length === 0) {
      const msg = uid
        ? '<div style="color:#999;padding:20px;text-align:center">You have no orders yet.<br/><a href="#" onclick="nav(\'book-laundry\'); return false;" style="color:#0066cc;text-decoration:underline;cursor:pointer">Book now ?</a></div>'
        : '<div style="color:#999;padding:20px;text-align:center">Please login to see your orders</div>';
      if (currentContainer) currentContainer.innerHTML = msg;
      if (completedContainer) completedContainer.innerHTML = msg;
      return;
    }
    const currentOrders = userBookings.filter(b => !isCompleted(b.Status));
    const completedOrders = userBookings.filter(b => isCompleted(b.Status));

    if (currentContainer) renderOrdersInContainer(currentOrders, currentContainer);
    if (completedContainer) renderOrdersInContainer(completedOrders, completedContainer);
  } catch (e) { console.error('renderMyOrders', e); }
}

// Helper to render orders in a container
function renderOrdersInContainer(orders, container) {
  container.innerHTML = '';
  if (orders.length === 0) {
    container.innerHTML = '<div style="color:#999;padding:20px;text-align:center">No orders in this category</div>';
    return;
  }
  
  // Create table structure
  let tableHtml = `
    <div style="overflow-x:auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Customer</th>
            <th>Service</th>
            <th>Weight</th>
            <th>Submission</th>
            <th>Receiving</th>
            <th>Status</th>
            <th>Total</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  orders.forEach((b, i) => {
    const statusClass = getBadgeClassForStatus(b.Status);
    const displayStatus = normalizeStatus(b.Status) || 'Pending';
    tableHtml += `
      <tr>
        <td>${String(b.BookID).padStart(3,'0')}</td>
        <td>${b.FullName||'N/A'}</td>
        <td>${b.LaundryType||'N/A'}</td>
        <td>${b.EstimatedWeight||'N/A'}</td>
        <td>${b.SubmissionMethod||'N/A'}</td>
        <td>${b.ReceivingMethod||'N/A'}</td>
        <td><span class="badge ${statusClass}">${displayStatus}</span></td>
        <td>?${b.Total||'0'}</td>
        <td>
          <div class="tbl-action">
            <button class="tbl-btn" onclick="showBookingDetails('${b.BookID}')">View</button>
            ${!isCompleted(b.Status) ? `<button class="tbl-btn danger" onclick="cancelBooking('${b.BookID}')">Cancel</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  });
  
  tableHtml += `
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = tableHtml;
}

// ADMIN: Approve pending booking
// Render customer-facing dashboard sections (bookings & my laundry)
async function renderCustomerDashboard() {
  try {
    const el = document.getElementById('dashboardBookings');
    const bookings = await apiFetchBookings();
    const uid = window.currentUser ? window.currentUser.UserID : null;
    if (!el) return;
    if (!uid) {
      el.innerHTML = '<div style="color:#999">No bookings yet. <a onclick="nav(\'book-laundry\')">Book laundry</a></div>';
      return;
    }

    const userBookings = bookings.filter(b => String(b.CustomerID) === String(uid));
    if (!userBookings || userBookings.length === 0) {
      el.innerHTML = '<div style="color:#999">No bookings yet. <a onclick="nav(\'book-laundry\')">Book laundry</a></div>';
      return;
    }

    // show up to 3 recent bookings on dashboard
    const recent = userBookings.slice().reverse().slice(0,3);
    let html = '<div class="dashboard-bookings-list">';
    recent.forEach(b => {
      html += '<div class="db-booking">';
      html += '<div><strong>Booking #' + (b.BookID || '') + '</strong> ? ' + (b.Status || 'Pending') + '</div>';
      html += '<div style="font-size:0.9em;color:#666">Service: ' + (b.LaundryType || 'Laundry') + ' ? Weight: ' + (b.EstimatedWeight || '-') + '</div>';
      html += '<div style="font-size:0.9em;color:#666">Picked: ' + (b.SubmissionMethod || '-') + ' ? Receive: ' + (b.ReceivingMethod || '-') + '</div>';
      html += '</div>';
    });
    html += '<div style="margin-top:8px"><a onclick="nav(\'my-laundry-status\')">View all orders</a></div>';
    html += '</div>';
    el.innerHTML = html;
  } catch (e) { console.error('renderCustomerDashboard', e); }
}

// Render notifications for current user/role (using Supabase)
async function renderNotifications() {
  try {
    const el = document.getElementById('notificationList');
    if (!el) return;
    const uid = window.currentUser ? window.currentUser.UserID : null;
    const roleKey = (window.userRole || role || 'customer').toString().toLowerCase();
    
    const notes = await apiFetchNotifications(uid);
    
    el.innerHTML = '';
    if (notes.length === 0) {
      el.innerHTML = '<div style="color:#999">No notifications</div>';
      renderComposeButton(roleKey);
      return;
    }
    notes.slice().reverse().forEach(n => {
      const d = document.createElement('div');
      d.className = 'notif-item';
      const ts = n.CreatedAt ? new Date(n.CreatedAt).toLocaleString() : '';
      d.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${n.Title || ''}</strong><div style="color:#666">${n.Body || ''}</div></div><div style="font-size:12px;color:#999">${ts}</div></div>`;
      el.appendChild(d);
    });
    renderComposeButton(roleKey);
  } catch (e) { console.error('renderNotifications', e); }
}

// Helper to render compose button for admin/delivery roles
function renderComposeButton(roleKey) {
  try {
    const area = document.getElementById('composeMessageArea');
    if (area) {
      area.innerHTML = '';
      if (roleKey === 'admin' || roleKey === 'delivery') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.title = 'Compose Message';
        btn.style.cssText = "width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;box-shadow:0 8px 22px rgba(0,0,0,.14);padding:0;border:none";
        btn.textContent = '+';
        btn.onclick = function() { nav('messaging'); };
        area.appendChild(btn);
      }
    }
  } catch (e) { /* ignore */ }
}

// Render delivery notifications with compose button (using API)
async function renderDeliveryNotifications() {
  try {
    const el = document.getElementById('deliveryNotificationsContainer');
    if (!el) return;
    const roleKey = (window.userRole || role || 'delivery').toString().toLowerCase();
    
    const notes = await apiFetchNotifications();
    
    el.innerHTML = '';
    if (notes.length === 0) {
      el.innerHTML = '<div style="color:#999">No notifications</div>';
      renderComposeButtonForDelivery(roleKey);
      return;
    }
    notes.slice().reverse().forEach(n => {
      const d = document.createElement('div');
      d.className = 'notif-item';
      const ts = n.CreatedAt ? new Date(n.CreatedAt).toLocaleString() : '';
      d.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${n.Title || ''}</strong><div style="color:#666">${n.Body || ''}</div></div><div style="font-size:12px;color:#999">${ts}</div></div>`;
      el.appendChild(d);
    });
    renderComposeButtonForDelivery(roleKey);
  } catch (e) { console.error('renderDeliveryNotifications', e); }
}

// Render compose button for delivery portal
function renderComposeButtonForDelivery(roleKey) {
  try {
    const area = document.getElementById('deliveryComposeMessageArea');
    if (area) {
      area.innerHTML = '';
      if (roleKey === 'delivery') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.title = 'Compose Message';
        btn.style.cssText = "width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;box-shadow:0 8px 22px rgba(0,0,0,.14);padding:0;border:none";
        btn.textContent = '+';
        btn.onclick = function() { nav('messaging'); };
        area.appendChild(btn);
      }
    }
  } catch (e) { /* ignore */ }
}

// Show booking details (navigate and set current booking)
function showBookingDetails(bookingId) {
  window.currentBookingId = bookingId;
  nav('booking-details');
}

// Render booking details into #bookingDetailsContainer
async function renderBookingDetails() {
  try {
    const id = window.currentBookingId;
    const container = document.getElementById('bookingDetailsContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!id) {
      container.innerHTML = '<div style="color:#999">No booking selected</div>';
      return;
    }
    const b = await apiFetchBooking(id);
    const statusClass = getBadgeClassForStatus(b.Status);
    const displayStatus = normalizeStatus(b.Status) || 'Unknown';
    const parts = [];
    parts.push(`<h3>#${String(b.BookID).padStart(3,'0')} <span class="badge ${statusClass}">${displayStatus}</span></h3>`);
    parts.push(`<div style="margin-top:8px"><strong>Customer:</strong> ${b.FullName||''} ? ${b.ContactNo||''}</div>`);
    parts.push(`<div><strong>Address:</strong> ${b.Address||'N/A'}</div>`);
    parts.push(`<div style="margin-top:8px"><strong>Service:</strong> ${b.LaundryType||''} (${b.ClothesType||''}) ? ${b.EstimatedWeight||''}</div>`);
    parts.push(`<div><strong>Submission ? Receiving:</strong> ${b.SubmissionMethod||''} ? ${b.ReceivingMethod||''}</div>`);
    parts.push(`<div><strong>Payment:</strong> ${b.PaymentMethod||''} ? ?${b.Total||'0'}</div>`);
    // add status timeline after basic info
    parts.push('<div style="margin-top:16px"><strong>Order Progress</strong>');
    parts.push(renderStatusTimeline(b.Status));
    parts.push('</div>');
    if (b.PickedUpAt) parts.push(`<div><strong>Picked Up At:</strong> ${new Date(b.PickedUpAt).toLocaleString()}</div>`);
    if (b.DeliveredAt) parts.push(`<div><strong>Delivered At:</strong> ${new Date(b.DeliveredAt).toLocaleString()}</div>`);
    parts.push(`<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">`);
    const userRole = window.userRole || role;
    if (userRole === 'customer' && !isCompleted(b.Status)) {
      parts.push(`<button class="btn btn-danger" onclick="cancelBooking(${b.BookID})">Cancel Booking</button>`);
    }
    if (userRole === 'admin' || userRole === 'delivery') {
      // status change select
      parts.push('<div style="flex:1;min-width:200px;display:flex;gap:6px;align-items:center">');
      parts.push('<select id="statusSelector" class="f-sel">');
      STATUS_STEPS.forEach(s => {
        const sel = normalizeStatus(b.Status) === s.status ? ' selected' : '';
        parts.push(`<option value="${s.status}"${sel}>${s.status}</option>`);
      });
      parts.push('</select>');
      parts.push(`<button class="btn btn-primary btn-sm" onclick="applyStatusChange(${b.BookID})">Update</button>`);
      parts.push('</div>');
    }
    parts.push(`</div>`);
    container.innerHTML = parts.join('');
  } catch (e) { console.error('renderBookingDetails', e); document.getElementById('bookingDetailsContainer').innerHTML = '<div style="color:#c00">Error loading booking details</div>'; }
}

// Render latest bookings for admin dashboard


// Render archive with two tabs: bookings and notifications (now using Supabase)
async function renderArchive() {
  try {
    const userRole = window.userRole || role;
    const uid = window.currentUser ? window.currentUser.UserID : null;
    const searchTerm = (document.getElementById('archiveSearchInput') ? document.getElementById('archiveSearchInput').value.toLowerCase() : '');
    
    // Render booking archive
    const bookingArchiveTable = document.getElementById('bookingsArchiveTable');
    if (bookingArchiveTable) {
      try {
        let archivedBookings = await apiFetchArchivedBookings();
        let filtered = archivedBookings;
        
        // Apply role filter
        if (userRole === 'customer' && uid) {
          filtered = filtered.filter(b => String(b.CustomerID) === String(uid));
        } else if (userRole === 'delivery') {
          filtered = [];
        }
        
        // Apply search filter if user entered text
        if (searchTerm) {
          filtered = filtered.filter(b => {
            const idStr = String(b.BookID || '').padStart(3, '0').toLowerCase();
            const name = (b.FullName || '').toLowerCase();
            const laundry = (b.LaundryType || '').toLowerCase();
            return idStr.includes(searchTerm) || name.includes(searchTerm) || laundry.includes(searchTerm);
          });
        }
        
        bookingArchiveTable.innerHTML = '';
        if (filtered.length === 0) {
          bookingArchiveTable.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999">No archived bookings</td></tr>';
        } else {
          filtered.forEach(b => {
            const tr = document.createElement('tr');
            const statusColor = b.Status === 'Delivered' ? 'b-success' : 'b-sec';
            tr.innerHTML = `
              <td>${String(b.BookID).padStart(3,'0')}</td>
              <td>${b.FullName || 'N/A'}</td>
              <td>${b.LaundryType || 'N/A'}</td>
              <td>${b.EstimatedWeight || 'N/A'}</td>
              <td>${(b.SubmissionMethod || '')} ? ${(b.ReceivingMethod || '')}</td>
              <td><span class="badge ${statusColor}">${b.Status || 'Unknown'}</span></td>
              <td>?${b.Total || '0'}</td>
              <td>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-outline btn-sm" onclick="restoreArchived('booking', ${b.BookID})">Restore</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteArchivedPermanently('booking', ${b.BookID})">Delete</button>
                </div>
              </td>
            `;
            bookingArchiveTable.appendChild(tr);
          });
        }
      } catch (e) {
        console.error('Error fetching archived bookings:', e);
        bookingArchiveTable.innerHTML = '<tr><td colspan="8" style="color:#c00">Error loading archived bookings</td></tr>';
      }
    }
    
    // Render notification archive from Supabase
    const notifArchiveContainer = document.getElementById('notificationsArchiveContainer');
    if (notifArchiveContainer) {
      try {
        let archivedNotifs = await apiFetchArchivedNotifications(uid);
        let filtered = archivedNotifs;
        
        // apply search filter for notifications
        if (searchTerm) {
          filtered = filtered.filter(n => {
            const title = (n.Title || '').toLowerCase();
            const body  = (n.Body || '').toLowerCase();
            return title.includes(searchTerm) || body.includes(searchTerm);
          });
        }
        
        notifArchiveContainer.innerHTML = '';
        if (filtered.length === 0) {
          notifArchiveContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#999">No archived notifications</div>';
        } else {
          filtered.slice().reverse().forEach(n => {
            const d = document.createElement('div');
            d.className = 'notif-item';
            const ts = n.CreatedAt ? new Date(n.CreatedAt).toLocaleString() : '';
            d.innerHTML = `
              <div style="display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid var(--border)">
                <div style="flex:1">
                  <strong>${n.Title || ''}</strong>
                  <div style="color:#666;font-size:.85rem;margin-top:4px">${n.Body || ''}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;margin-left:12px">
                  <div style="font-size:12px;color:#999;text-align:right">${ts}</div>
                  <button class="btn btn-outline btn-sm" onclick="restoreArchived('notification', ${n.NotificationID})">Restore</button>
                </div>
              </div>
            `;
            notifArchiveContainer.appendChild(d);
          });
        }
      } catch (e) {
        console.error('Error fetching archived notifications:', e);
        notifArchiveContainer.innerHTML = '<div style="color:#c00">Error loading notifications</div>';
      }
    }
  } catch (e) {
    console.error('renderArchive', e);
  }
}

// Switch between booking and notification archive tabs
window.showArchiveTab = function(tab) {
  document.querySelectorAll('.archive-panel').forEach(p => p.style.display = 'none');
  const bookingsPanel = document.getElementById('bookingsArchivePanel');
  const notificationsPanel = document.getElementById('notificationsArchivePanel');
  
  if (tab === 'bookings' && bookingsPanel) bookingsPanel.style.display = 'block';
  if (tab === 'notifications' && notificationsPanel) notificationsPanel.style.display = 'block';
  
  // keep existing search term; focus for mobile if desired
  renderArchive();
};

// Archive a booking by moving it to archived table (using Supabase)
async function archiveBooking(bookingId) {
  try {
    const result = await apiArchiveBooking(bookingId);
    return result.success;
  } catch (e) {
    console.error('archiveBooking error', e);
    return false;
  }
}

// Archive a notification by moving it to archive table
async function archiveNotification(notificationId) {
  try {
    const result = await apiArchiveNotification(notificationId);
    if (result.success) {
      try { renderNotifications(); } catch (e) {}
      return true;
    }
    return false;
  } catch (e) {
    console.error('archiveNotification error', e);
    return false;
  }
}

// Restore an archived item back to active (using Supabase)
async function restoreArchived(type, id) {
  try {
    if (type === 'booking') {
      const result = await apiRestoreArchivedBooking(id);
      if (result.success) {
        alert('Booking restored successfully');
        window.dispatchEvent(new CustomEvent('bookingUpdated', { detail: { bookings: [] } }));
        renderArchive();
        return;
      }
    } else if (type === 'notification') {
      const result = await apiRestoreArchivedNotification(id);
      if (result.success) {
        alert('Notification restored successfully');
        renderArchive();
        return;
      }
    }
  } catch (e) {
    console.error('restoreArchived error', e);
    alert('Failed to restore: ' + e.message);
  }
}

// Delete archived item permanently (using Supabase)
async function deleteArchivedPermanently(type, id) {
  if (!confirm('Delete this ' + type + ' permanently? This cannot be undone.')) return;
  
  try {
    if (type === 'booking') {
      const result = await apiDeleteArchivedBookingPermanently(id);
      if (result.success) {
        alert('Booking deleted permanently');
        renderArchive();
      }
    } else if (type === 'notification') {
      const result = await apiDeleteArchivedNotificationPermanently(id);
      if (result.success) {
        alert('Notification deleted permanently');
        renderArchive();
      }
    }
  } catch (e) {
    console.error('deleteArchivedPermanently error', e);
    alert('Failed to delete: ' + e.message);
  }
}

// Mark all notifications as read for current user (using API)
async function markAllNotificationsRead() {
  try {
    const uid = window.currentUser ? window.currentUser.UserID : null;
    if (!uid) return alert('You must be logged in to mark notifications');
    // In a real implementation, update notification_recipients table
    // For now, just refresh
    renderNotifications();
    alert('Marked notifications as read');
  } catch (e) { console.error('markAllNotificationsRead', e); }
}
async function approveBooking(bookingId) {
  try {
    const booking = await apiFetchBooking(bookingId);
    if (!booking) throw new Error('Booking not found');
    
    const res = await apiSaveBooking({ ...booking, Status: 'Confirmed' });
    if (res && res.success) {
      showToast('Booking #' + String(bookingId).padStart(3,'0') + ' has been approved!', 'success');
      await renderBookingsList();
    }
  } catch (e) {
    alert('Error approving booking: ' + e.message);
  }
}

// ADMIN: Update booking status (Pending ? Confirmed ? Ready for Pickup ? Picked Up ? Delivered)
async function updateBookingStatus(bookingId, newStatus) {
  try {
    const booking = await apiFetchBooking(bookingId);
    if (!booking) throw new Error('Booking not found');

    // Use apiSaveBooking to update booking and preserve all fields
    // Ensure all booking fields are present and correct
    const fullBooking = await apiFetchBooking(bookingId);
    if (!fullBooking) throw new Error('Booking not found for update');
    const updatedBooking = { ...fullBooking, Status: newStatus };
    const res = await apiSaveBooking(updatedBooking);
    if (!res || !res.success) {
      console.error('[Supabase Update Failed]', res);
      showToast('Supabase update failed: ' + (res && res.message ? res.message : 'Unknown error'), 'error');
      return;
    }
    if (res && res.success) {
      showToast('Status updated to: ' + newStatus, 'success');
      await renderBookingsList();
      if (window.currentBookingId && String(window.currentBookingId) === String(bookingId)) {
        const refreshedBooking = await apiFetchBooking(bookingId);
        console.log('[AFTER UPDATE] Booking fetched:', refreshedBooking);
        if (typeof renderBookingDetails === 'function') renderBookingDetails();
      }
      if (typeof updateCustomerLaundryStatus === 'function') {
        await updateCustomerLaundryStatus();
      }
      if (document.getElementById('statusTimelineContainer')) {
        const refreshedBooking = await apiFetchBooking(bookingId);
        document.getElementById('statusTimelineContainer').innerHTML = renderStatusTimeline(refreshedBooking.Status);
      }
    } else {
      alert('Error updating status: ' + (res && res.message ? res.message : 'Unknown error'));
    }
  } catch (e) {
    alert('Error updating status: ' + e.message);
  }
}

// generic status change called from select dropdown inside booking details
function applyStatusChange(bookingId) {
  const sel = document.getElementById('statusSelector');
  if (!sel) return;
  const newStatus = sel.value;
  // Call updateBookingStatus to update booking_tb
  updateBookingStatus(bookingId, newStatus);
}

// CUSTOMER: Cancel pending booking
async function cancelBooking(bookingId) {
  if (!confirm('Cancel this booking?')) return;
  try {
    await apiDeleteBooking(bookingId);
    showToast('Booking #' + String(bookingId).padStart(3,'0') + ' has been cancelled.', 'info');
    await renderBookingsList();
  } catch (e) {
    alert('Error cancelling booking: ' + e.message);
  }
}

// Save profile (edit profile) ? updates current logged-in user
async function saveProfile() {
  if (!window.currentUser || !window.currentUser.UserID) {
    alert('You must be logged in to save profile');
    return;
  }
  const full = document.getElementById('profFull').value.trim();
  const contact = document.getElementById('profContact').value.trim();
  const names = full.split(' ');
  const payload = {
    UserID: window.currentUser.UserID,
    FirstName: names[0] || full,
    MiddleName: names.length > 2 ? names.slice(1,-1).join(' ') : '',
    LastName: names.length > 1 ? names[names.length-1] : (names[0] || ''),
    ContactNo: contact
  };
  try {
    const res = await apiSaveUser(payload);
    if (res && res.success) {
      showToast('Profile updated successfully!', 'success');
      // update UI
      const fullName = [payload.FirstName, payload.MiddleName, payload.LastName].filter(Boolean).join(' ');
      document.getElementById('sfName').textContent = fullName;
      document.getElementById('profName').textContent = fullName;
      window.currentUser = { ...window.currentUser, ...payload };
      renderUserList();
      return;
    }
  } catch (e) { console.error('saveProfile error', e); }
  showToast('Failed to update profile. Please try again.', 'error');
}

// Change password: verifies current password then updates
async function changePassword(isAdmin = false) {
  const curId = isAdmin ? 'adminCurrentPass' : 'currentPass';
  const newId = isAdmin ? 'adminNewPass' : 'newPass';
  const confId = isAdmin ? 'adminConfirmPass' : 'confirmPass';

  const curEl = document.getElementById(curId);
  const newEl = document.getElementById(newId);
  const confEl = document.getElementById(confId);

  const currentPass = curEl ? curEl.value : '';
  const newPass = newEl ? newEl.value : '';
  const confirm = confEl ? confEl.value : '';

  if (!newPass || newPass.length < 6) { alert('New password must be at least 6 characters'); return; }
  if (newPass !== confirm) { alert('Passwords do not match'); return; }
  if (!window.currentUser || !window.currentUser.UserID) { alert('Please login first'); return; }

  try {
    // verify current password (if provided)
    if (curEl && currentPass) {
      try {
        const verifyRes = await apiLogin(window.currentUser.Username, currentPass);
        if (!verifyRes || !verifyRes.success) { alert('Current password is incorrect'); return; }
      } catch (e) { alert('Password verification failed'); return; }
    }

    // Reset password via API
    const res = await apiResetPassword(window.currentUser.UserID, newPass);
    if (res && res.success) { showToast('Password changed successfully!', 'success'); return; }
  } catch (e) { console.error('changePassword error', e); }
  alert('Failed to update password');
}

// Edit laundry status from admin dashboard
function editLaundryStatus(status) {
  alert('Laundry status changed to: ' + (status === 'open' ? 'OPEN' : 'CLOSED'));
}

// Send message to customers/delivery (using API)
async function sendMessage() {
  try {
    const resolvedRole = (window.userRole || role || '').toString().toLowerCase();
    if (!(resolvedRole === 'admin' || resolvedRole === 'delivery')) {
      alert('Only admin and delivery staff can send messages.');
      return;
    }
  } catch (e) { /* ignore */ }
  
  const select = document.querySelector('#v-messaging .f-sel');
  const title = document.querySelector('#v-messaging .f-input[placeholder*="title"]').value;
  const message = document.querySelector('#v-messaging textarea').value;
  
  if (!select.value || !title || !message) {
    alert('Please fill in all fields');
    return;
  }
  
  try {
    const to = select.value; // e.g. 'customers' | 'delivery' | specific role
    
    // Map role selection to user role filter
    let targetRoles = [];
    if (to === 'customers') {
      targetRoles = ['customer'];
    } else if (to === 'delivery') {
      targetRoles = ['delivery'];
    } else if (to === 'admin') {
      targetRoles = ['admin', 'staff'];
    }
    
    // Fetch all users matching the target role(s)
    const allUsers = await apiFetchUsers();
    const targetUsers = allUsers.filter(u => {
      const userRole = (u.Role || '').toLowerCase();
      return targetRoles.some(role => userRole.includes(role));
    });
    
    if (targetUsers.length === 0) {
      alert('No users found with the selected role.');
      return;
    }
    
    // Create notification for each target user using Supabase
    let successCount = 0;
    for (let user of targetUsers) {
      try {
        await apiCreateNotification(title, message, user.UserID, window.userRole || 'admin');
        successCount++;
      } catch (e) {
        console.error('Error creating notification for user ' + user.UserID, e);
      }
    }
    
    // Update UI
    try { renderNotifications(); } catch(e){}
    showToast(`Notification sent to ${successCount} ${select.options[select.selectedIndex].text}`, 'success');
    nav('admin-dashboard');
  } catch (e) {
    console.error('sendMessage error', e);
    alert('Failed to send message: ' + e.message);
  }
}

// Set laundry status (open/closed/maintenance)
async function setLaundryStatus(status) {
  console.log('setLaundryStatus called with', status);
  // require admin or staff role before proceeding
  const roleKey = (window.userRole || '').toString().toLowerCase();
  if (!roleKey.includes('admin') && !roleKey.includes('staff')) {
    alert('You must be logged in as admin/staff to change the laundry status.');
    return;
  }
  // determine which availability record to update (avoid hard-coded ID)
  let availId = 1;
  try {
    const avails = await apiFetchAvailabilities();
    if (avails && avails[0] && avails[0].AvailabilityID) {
      availId = avails[0].AvailabilityID;
    } else {
      console.warn('setLaundryStatus: no availability record found, defaulting to ID 1');
    }
  } catch(e) {
    console.error('setLaundryStatus: error fetching avail ID', e);
  }
  const btnOpen = document.getElementById('laundryStatusOpen');
  const btnClosed = document.getElementById('laundryStatusClosed');
  const btnMaintenance = document.getElementById('laundryStatusMaintenance');
  const statusText = document.getElementById('laundryStatusText');
  
  // Reset all buttons to inactive state
  btnOpen.style.background = 'transparent';
  btnOpen.style.color = 'var(--muted)';
  btnOpen.style.border = '1px solid var(--border)';
  btnClosed.style.background = 'transparent';
  btnClosed.style.color = 'var(--muted)';
  btnClosed.style.border = '1px solid var(--border)';
  btnMaintenance.style.background = 'transparent';
  btnMaintenance.style.color = 'var(--muted)';
  btnMaintenance.style.border = '1px solid var(--border)';
  
  if (status === 'open') {
    console.log('setLaundryStatus: attempting to change status to OPEN');
    btnOpen.style.background = '#e8f5e9';
    btnOpen.style.color = '#2e7d32';
    btnOpen.style.border = '2px solid #4caf50';
    statusText.textContent = 'Laundry is currently Open';
    try {
      await apiUpdateAvailability(availId, 'Open');
      window.dispatchEvent(new CustomEvent('availabilityUpdated', { detail: { Status: 'Open' } }));
      showToast('Laundry status updated to Open', 'success');
    } catch (err) { 
      console.error('Failed to set status:', err);
      showToast('Could not update status: ' + err.message, 'error');
    }
  } else if (status === 'closed') {
    console.log('setLaundryStatus: attempting to change status to CLOSED');
    btnClosed.style.background = '#ffebee';
    btnClosed.style.color = 'var(--red)';
    btnClosed.style.border = '2px solid var(--red)';
    statusText.textContent = 'Laundry is currently Closed';
    try {
      await apiUpdateAvailability(availId, 'Closed');
      window.dispatchEvent(new CustomEvent('availabilityUpdated', { detail: { Status: 'Closed' } }));
      showToast('Laundry status updated to Closed', 'success');
    } catch (err) { 
      console.error('Failed to set status:', err);
      showToast('Failed to update laundry status: ' + err.message, 'error');
    }
  } else if (status === 'maintenance') {
    console.log('setLaundryStatus: attempting to change status to MAINTENANCE');
    btnMaintenance.style.background = '#fff3e0';
    btnMaintenance.style.color = '#f57c00';
    btnMaintenance.style.border = '2px solid #ff9800';
    statusText.textContent = 'Laundry is Under Maintenance';
    try {
      await apiUpdateAvailability(availId, 'Under Maintenance');
      window.dispatchEvent(new CustomEvent('availabilityUpdated', { detail: { Status: 'Under Maintenance' } }));
      showToast('Laundry status updated to Under Maintenance', 'success');
    } catch (err) { 
      console.error('Failed to set status:', err);
      showToast('Failed to update laundry status: ' + err.message, 'error');
    }
  }
  // Refresh admin dashboard and customer UI immediately
  try { await updateDashboardLaundryStatus(); } catch(e){}
  try { await updateCustomerLaundryStatus(); } catch(e){}
  try { updateBookingNavStatus(); } catch(e){}
}

// Update dashboard laundry status display
async function updateDashboardLaundryStatus() {
  let status = 'open';
  try {
    const av = await apiFetchAvailabilities();
    const availability = av && av[0] ? av[0] : null;
    console.log('[LAUNDRY STATUS] Fetched availability:', availability);
    if (availability) {
      // derive open/closed/maintenance from Status text (enum values)
      const s = (availability.Status || '').toString().toLowerCase();
      if (s === 'open') {
        status = 'open';
      } else if (s.includes('maintenance')) {
        status = 'maintenance';
      } else {
        status = 'closed';
      }
    }
  } catch(e) {
    console.error('Failed to fetch status:', e);
  }
  const display = document.getElementById('laundryStatusDisplay');
  if (!display) return;
  
  let emoji = 'ℹ️';
  let title = 'Laundry is Open!';
  let className = 'open';
  
  if (status === 'closed') {
    emoji = '🚫';
    title = 'Laundry is Closed!';
    className = 'closed';
  } else if (status === 'maintenance') {
    emoji = '🛠️';
    title = 'Laundry is Under Maintenance!';
    className = 'maintenance';
  }
  
  display.className = 'sb-info ' + className;
  display.querySelector('.si-em').textContent = emoji;
  display.querySelector('h3').textContent = title;
  
  // Also update admin control buttons to reflect current status
  const btnOpen = document.getElementById('laundryStatusOpen');
  const btnClosed = document.getElementById('laundryStatusClosed');
  const btnMaintenance = document.getElementById('laundryStatusMaintenance');
  const statusText = document.getElementById('laundryStatusText');
  
  if (btnOpen && btnClosed && btnMaintenance && statusText) {
    // Reset all buttons
    btnOpen.style.background = 'transparent';
    btnOpen.style.color = 'var(--muted)';
    btnOpen.style.border = '1px solid var(--border)';
    btnClosed.style.background = 'transparent';
    btnClosed.style.color = 'var(--muted)';
    btnClosed.style.border = '1px solid var(--border)';
    btnMaintenance.style.background = 'transparent';
    btnMaintenance.style.color = 'var(--muted)';
    btnMaintenance.style.border = '1px solid var(--border)';
    
    // Highlight the active status button
    if (status === 'open') {
      btnOpen.style.background = '#e8f5e9';
      btnOpen.style.color = '#2e7d32';
      btnOpen.style.border = '2px solid #4caf50';
      statusText.textContent = 'Laundry is currently Open';
    } else if (status === 'closed') {
      btnClosed.style.background = '#ffebee';
      btnClosed.style.color = 'var(--red)';
      btnClosed.style.border = '2px solid var(--red)';
      statusText.textContent = 'Laundry is currently Closed';
    } else if ((status === 'Maintenance' || status === 'Under Maintenance') && btnMaintenance) {
      btnMaintenance.style.background = '#fff3e0';
      btnMaintenance.style.color = '#f57c00';
      btnMaintenance.style.border = '2px solid #ff9800';
      statusText.textContent = 'Laundry is Under Maintenance';
    }
  }
}

// Update customer laundry status display
async function updateCustomerLaundryStatus() {
  let status = 'open';
  try {
    const av = await apiFetchAvailabilities();
    const availability = av && av[0] ? av[0] : null;
    console.log('[LAUNDRY STATUS] Fetched availability:', availability);
    if (availability) {
      const s = (availability.Status || '').toString().toLowerCase();
      if (s === 'open') {
        status = 'open';
      } else if (s.includes('maintenance')) {
        status = 'maintenance';
      } else {
        status = 'closed';
      }
    }
  } catch(e) {
    console.error('Failed to fetch status:', e);
  }
  const display = document.getElementById('customerLaundryStatusDisplay');
  const btn = document.getElementById('dashBookNowBtn');
  
  // Update the display element if it exists
  if (display) {
    let emoji = 'ℹ️';
    let title = 'Laundry is Open!';
    let message = 'Ready to serve you';
    let className = 'open';
    let showBtn = true;
    
    if (status === 'closed') {
      emoji = '🚫';
      title = 'Laundry is Closed!';
      message = 'We are currently closed';
      className = 'closed';
      showBtn = false;
    } else if (status === 'maintenance') {
      emoji = '🛠️';
      title = 'Laundry is Under Maintenance!';
      message = 'We will be back soon';
      className = 'maintenance';
      showBtn = false;
    }
    
    console.log('[LAUNDRY STATUS] Setting button visibility to:', showBtn, 'Status:', status);
    display.className = 'sb-info ' + className;
    display.querySelector('.si-em').textContent = emoji;
    display.querySelector('h3').textContent = title;
    display.querySelector('p').textContent = message;
    if (btn) btn.style.display = showBtn ? 'block' : 'none';
  }
  
  // Do not auto-navigate customers to booking page; booking must be initiated from
  // the dedicated Book Laundry view. This avoids unexpected redirects.
}

// Initialize laundry status on page load
async function initLaundryStatus() {
  await updateDashboardLaundryStatus();
  await updateCustomerLaundryStatus();
}

// ===== ADMIN CONFIGURATION MANAGEMENT =====

// Initialize availability table with default if empty
async function initializeAvailabilityTable() {
  try {
    console.log('🏪 Initializing availability table via REST API...');

    // Check if table has any records
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/availability_tb?select=AvailabilityID&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!checkResponse.ok) {
      console.warn('⚠️ Could not check availability table');
      return false;
    }

    const existingData = await checkResponse.json();
    if (existingData && existingData.length > 0) {
      console.log('✅ Table already has data');
      return true;
    }

    console.log('📝 availability_tb is empty, creating initial record...');
    
    const initialData = {
      AvailabilityID: 1,
      Price: 60,
      PickupFee: 30,
      DeliveryFee: 50,
      OperatingHours: '08:00-17:00',
      Status: 'Open'
    };

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/availability_tb`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(initialData)
    });

    if (!insertResponse.ok) {
      console.warn('⚠️ Could not initialize table:', insertResponse.statusText);
      console.warn('This might be a permissions/RLS issue - see console for details');
      return false;
    }

    const insertData = await insertResponse.json();
    console.log('✅ Table initialized with default values:', insertData);
    return true;
  } catch (e) {
    console.warn('⚠️ Initialization check failed:', e);
    return false;
  }
}

// Configuration storage key for localStorage fallback
const CONFIG_STORAGE_KEY = 'laundry_system_config';

// Attempt to get Supabase client (non-blocking, with timeout)
async function tryGetSupabase(timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (window.supabase && typeof window.supabase.from === 'function') {
      console.log('✅ Supabase client available');
      return window.supabase;
    }
    await new Promise(r => setTimeout(r, 100));
  }
  console.warn('⚠️ Supabase not available after ' + timeout + 'ms, using local storage');
  return null;
}

// Load configuration from Supabase or localStorage fallback
async function loadConfiguration() {
  try {
    // Verify admin role
    const roleKey = (window.userRole || '').toString().toLowerCase();
    if (!roleKey.includes('admin')) {
      console.warn('❌ Non-admin user attempted to load configuration');
      showToast('You must be an admin to access configuration', 'error');
      return false;
    }

    console.log('📥 Loading configuration...');
    
    // First, ensure the table has at least one record
    console.log('🔍 Checking if table is initialized...');
    await initializeAvailabilityTable();

    // Try to load from Supabase first
    const sb = await tryGetSupabase(1000);
    
    if (sb) {
      try {
        const { data, error } = await sb.from('availability_tb').select('*').limit(1).single();
        
        if (!error && data) {
          console.log('✅ Configuration loaded from Supabase:', data);
          populateConfigurationUI(data);
          return true;
        }
      } catch (e) {
        console.warn('⚠️ Could not load from Supabase:', e.message);
      }
    }
    
    // Fallback to localStorage
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        console.log('✅ Configuration loaded from localStorage:', config);
        populateConfigurationUI(config);
        return true;
      } catch (e) {
        console.warn('⚠️ Could not parse localStorage config:', e);
      }
    }
    
    // Use all defaults
    console.log('ℹ️ Using default configuration');
    setDefaultConfigurationUI();
    return true;
    
  } catch (e) {
    console.error('❌ Error loading configuration:', e);
    console.warn('Using default values instead');
    setDefaultConfigurationUI();
    return true; // Return success so page doesn't show error
  }
}

// Populate UI from configuration object
function populateConfigurationUI(data) {
  // Try to parse JSON fields first (from localStorage)
  let pricing = {};
  let additionalCharges = {};
  let operatingHours = {};

  // If data has stringified JSON, parse it
  if (data.Pricing && typeof data.Pricing === 'string') {
    try {
      pricing = JSON.parse(data.Pricing);
    } catch (e) {
      console.warn('Could not parse Pricing JSON');
    }
  }
  
  if (data.AdditionalCharges && typeof data.AdditionalCharges === 'string') {
    try {
      additionalCharges = JSON.parse(data.AdditionalCharges);
    } catch (e) {
      console.warn('Could not parse AdditionalCharges JSON');
    }
  }

  // Handle OperatingHours - could be JSON or string like "08:00-17:00"
  if (data.OperatingHours) {
    if (typeof data.OperatingHours === 'string') {
      if (data.OperatingHours.includes('-')) {
        // Format: "08:00-17:00"
        const [open, close] = data.OperatingHours.split('-');
        operatingHours = { openTime: open, closeTime: close };
      } else {
        try {
          // Try parsing as JSON
          operatingHours = JSON.parse(data.OperatingHours);
        } catch (e) {
          operatingHours = { openTime: '08:00', closeTime: '17:00' };
        }
      }
    }
  }

  // Populate pricing fields - use individual columns if available, otherwise JSON
  const pricingInputs = document.querySelectorAll('[placeholder="₱"]');
  if (pricingInputs.length >= 6) {
    pricingInputs[0].value = data.Price || pricing.washDry || 60;          // Wash & Dry (main price)
    pricingInputs[1].value = pricing.washOnly || 40;                         // Wash Only
    pricingInputs[2].value = pricing.dryCleaning || 80;                      // Dry Cleaning
    pricingInputs[3].value = pricing.ironingOnly || 25;                      // Ironing Only
    pricingInputs[4].value = pricing.premiumCare || 100;                     // Premium Care
    pricingInputs[5].value = pricing.washFold || 50;                         // Wash & Fold
  }

  // Populate additional charges - use individual columns if available, otherwise JSON
  const additionalInputs = document.querySelectorAll('[class="f-input"]');
  if (additionalInputs.length >= 10) {
    additionalInputs[6].value = data.PickupFee || additionalCharges.pickupFee || 30;      // Pickup Fee
    additionalInputs[7].value = data.DeliveryFee || additionalCharges.deliveryFee || 50;  // Delivery Fee
    additionalInputs[8].value = additionalCharges.rushFee || 50;                           // Rush Fee
    additionalInputs[9].value = additionalCharges.sameDayFee || 100;                       // Same Day Fee
  }

  // Populate operating hours
  const timeInputs = document.querySelectorAll('[type="time"]');
  if (timeInputs.length >= 2) {
    timeInputs[0].value = operatingHours.openTime || '08:00';   // Opening time
    timeInputs[1].value = operatingHours.closeTime || '17:00';  // Closing time
  }

  // Set laundry status buttons
  const statusText = data.Status || 'Open';
  setLaundryStatusDisplay(statusText);
}

// Set default configuration values in UI
function setDefaultConfigurationUI() {
  // Default pricing
  const pricingInputs = document.querySelectorAll('[placeholder="₱"]');
  if (pricingInputs.length >= 6) {
    pricingInputs[0].value = 60;   // Wash & Dry
    pricingInputs[1].value = 40;   // Wash Only
    pricingInputs[2].value = 80;   // Dry Cleaning
    pricingInputs[3].value = 25;   // Ironing Only
    pricingInputs[4].value = 100;  // Premium Care
    pricingInputs[5].value = 50;   // Wash & Fold
  }

  // Default additional charges
  const additionalInputs = document.querySelectorAll('[class="f-input"]');
  if (additionalInputs.length >= 10) {
    additionalInputs[6].value = 30;   // Pickup Fee
    additionalInputs[7].value = 50;   // Delivery Fee
    additionalInputs[8].value = 50;   // Rush Fee
    additionalInputs[9].value = 100;  // Same Day Fee
  }

  // Default hours
  const timeInputs = document.querySelectorAll('[type="time"]');
  if (timeInputs.length >= 2) {
    timeInputs[0].value = '08:00';  // Opening
    timeInputs[1].value = '17:00';  // Closing
  }

  // Set status to Open
  setLaundryStatusDisplay('Open');
}

// Helper function to set laundry status button display
function setLaundryStatusDisplay(status) {
  const btnOpen = document.getElementById('laundryStatusOpen');
  const btnClosed = document.getElementById('laundryStatusClosed');
  const btnMaintenance = document.getElementById('laundryStatusMaintenance');
  const statusText = document.getElementById('laundryStatusText');

  // Reset all buttons
  [btnOpen, btnClosed, btnMaintenance].forEach(btn => {
    if (btn) {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--muted)';
      btn.style.border = '1px solid var(--border)';
    }
  });

  // Activate the correct button
  if (status === 'Open' && btnOpen) {
    btnOpen.style.background = '#e8f5e9';
    btnOpen.style.color = '#2e7d32';
    btnOpen.style.border = '2px solid #4caf50';
    if (statusText) statusText.textContent = 'Laundry is currently Open';
  } else if (status === 'Closed' && btnClosed) {
    btnClosed.style.background = '#ffebee';
    btnClosed.style.color = 'var(--red)';
    btnClosed.style.border = '2px solid var(--red)';
    if (statusText) statusText.textContent = 'Laundry is currently Closed';
  } else if ((status === 'Maintenance' || status === 'Under Maintenance') && btnMaintenance) {
    btnMaintenance.style.background = '#fff3e0';
    btnMaintenance.style.color = '#f57c00';
    btnMaintenance.style.border = '2px solid #ff9800';
    if (statusText) statusText.textContent = 'Laundry is Under Maintenance';
  }
}

// Global flag to prevent duplicate configuration saves
let isSavingConfiguration = false;

// Save pricing configuration to availability_tb or localStorage
async function saveConfiguration() {
  // Prevent multiple simultaneous saves
  if (isSavingConfiguration) {
    console.warn('⚠️ Configuration save already in progress, ignoring duplicate request');
    return false;
  }

  try {
    isSavingConfiguration = true;
    
    // Verify admin role
    const roleKey = (window.userRole || '').toString().toLowerCase();
    if (!roleKey.includes('admin')) {
      console.warn('❌ Non-admin user attempted to save configuration');
      showToast('❌ You must be an admin to save configuration', 'error');
      isSavingConfiguration = false;
      return false;
    }

    // Add loading state to button
    const saveBtn = document.querySelector('[onclick*="saveConfiguration"]');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Saving...';
    }

    console.log('💾 Collecting configuration data...');

    // Collect pricing data
    const pricingInputs = document.querySelectorAll('[placeholder="₱"]');
    if (pricingInputs.length < 6) {
      throw new Error('Configuration form is incomplete. Please refresh and try again.');
    }

    // Get main pricing (Wash & Dry is used as the base Price field)
    const mainPrice = parseFloat(pricingInputs[0].value) || 60;

    // Collect additional charges
    const additionalInputs = document.querySelectorAll('[class="f-input"]');
    if (additionalInputs.length < 10) {
      throw new Error('Configuration form is incomplete. Please refresh and try again.');
    }

    const pickupFee = parseFloat(additionalInputs[6].value) || 30;
    const deliveryFee = parseFloat(additionalInputs[7].value) || 50;

    // Collect operating hours
    const timeInputs = document.querySelectorAll('[type="time"]');
    if (timeInputs.length < 2) {
      throw new Error('Operating hours not found. Please refresh and try again.');
    }

    const openTime = timeInputs[0].value || '08:00';
    const closeTime = timeInputs[1].value || '17:00';
    
    // Try multiple formats for OperatingHours since Supabase might have different column types
    // Format 1: "08:00-17:00" (string range)
    // Format 2: "08:00" (just opening time for timetz columns)
    const operatingHours = `${openTime}-${closeTime}`;  // Keep full format in case column is TEXT
    const operatingHoursTimeOnly = openTime;  // Fallback for TIME/TIMETZ columns

    // Get current laundry status
    const btnOpen = document.getElementById('laundryStatusOpen');
    let currentStatus = 'Open';
    if (btnOpen && btnOpen.style.background === 'transparent') {
      const btnClosed = document.getElementById('laundryStatusClosed');
      const btnMaintenance = document.getElementById('laundryStatusMaintenance');
      if (btnClosed && btnClosed.style.background !== 'transparent') {
        currentStatus = 'Closed';
      } else if (btnMaintenance && btnMaintenance.style.background !== 'transparent') {
        currentStatus = 'Maintenance';
      }
    }

    // Store full pricing data for localStorage/reference
    const pricing = {
      washDry: parseFloat(pricingInputs[0].value) || 60,
      washOnly: parseFloat(pricingInputs[1].value) || 40,
      dryCleaning: parseFloat(pricingInputs[2].value) || 80,
      ironingOnly: parseFloat(pricingInputs[3].value) || 25,
      premiumCare: parseFloat(pricingInputs[4].value) || 100,
      washFold: parseFloat(pricingInputs[5].value) || 50
    };

    const additionalCharges = {
      pickupFee: pickupFee,
      deliveryFee: deliveryFee,
      rushFee: parseFloat(additionalInputs[8].value) || 50,
      sameDayFee: parseFloat(additionalInputs[9].value) || 100
    };

    // Prepare configuration object for Supabase
    const configDataForDB = {
      AvailabilityID: 1,  // Use fixed ID
      Price: mainPrice,
      PickupFee: pickupFee,
      DeliveryFee: deliveryFee,
      OperatingHours: operatingHours,
      Status: currentStatus
    };

    // Alternative format if column type is TIME/TIMETZ (single time value)
    const configDataForDB_TimeOnly = {
      AvailabilityID: 1,
      Price: mainPrice,
      PickupFee: pickupFee,
      DeliveryFee: deliveryFee,
      OperatingHours: operatingHoursTimeOnly,  // Just "08:00" instead of "08:00-17:00"
      Status: currentStatus
    };

    // Prepare full config for localStorage (includes all pricing details)
    const configDataFull = {
      AvailabilityID: 1,
      Price: mainPrice,
      PickupFee: pickupFee,
      DeliveryFee: deliveryFee,
      OperatingHours: operatingHours,
      Status: currentStatus,
      Pricing: JSON.stringify(pricing),
      AdditionalCharges: JSON.stringify(additionalCharges),
      UpdatedAt: new Date().toISOString(),
      UpdatedBy: window.currentUser ? window.currentUser.Username : 'admin'
    };

    console.log('📤 Data to save:', configDataForDB);

    // Try to save to Supabase first (non-blocking with short timeout)
    console.log('📤 Attempting to save to Supabase...');
    const sb = await tryGetSupabase(8000);
    let savedToSupabase = false;
    
    if (sb) {
      try {
        console.log('📤 Sending data to Supabase (Format 1: Full range)...');
        console.log('📊 Data being sent:', JSON.stringify(configDataForDB, null, 2));

        // Try UPSERT first with full format
        let result = await sb
          .from('availability_tb')
          .upsert(configDataForDB, { onConflict: 'AvailabilityID' })
          .select();

        const { data, error } = result;
        
        if (error && error.message && (error.message.includes('type') || error.message.includes('operator'))) {
          // Data type mismatch - try alternative format
          console.warn('⚠️ Data type mismatch detected, trying alternative format...');
          console.log('📤 Trying Format 2: Time-only value...');
          console.log('📊 Data being sent:', JSON.stringify(configDataForDB_TimeOnly, null, 2));
          
          result = await sb
            .from('availability_tb')
            .upsert(configDataForDB_TimeOnly, { onConflict: 'AvailabilityID' })
            .select();
        }

        if (error) {
          console.error('❌ UPSERT Error:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // If UPSERT fails, try INSERT with delete first
          console.log('⚠️ UPSERT failed, trying INSERT approach...');
          
          // Determine which data format to use based on previous error
          const dataToInsert = error.message && error.message.includes('type') 
            ? configDataForDB_TimeOnly 
            : configDataForDB;
          
          try {
            await sb.from('availability_tb').delete().eq('AvailabilityID', 1);
            console.log('🗑️ Deleted existing record');
          } catch (deleteErr) {
            console.warn('Could not delete existing record:', deleteErr);
          }

          // Now try insert with appropriate format
          console.log('📤 Attempting INSERT with data format...');
          console.log('📊 Insert data:', JSON.stringify(dataToInsert, null, 2));
          
          const insertResult = await sb
            .from('availability_tb')
            .insert([dataToInsert])
            .select();

          if (insertResult.error) {
            throw insertResult.error;
          }

          console.log('✅ INSERT successful:', insertResult.data);
          data = insertResult.data;
        }

        console.log('✅ Configuration saved to Supabase:', data);
        savedToSupabase = true;
      } catch (e) {
        console.error('❌ Supabase Error Details:');
        console.error('   Message:', e.message);
        console.error('   Code:', e.code);
        console.error('   Details:', e.details);
        console.error('   Hint:', e.hint);
        console.error('   Full error:', e);
        
        // Check if it's a permissions issue
        if (e.message && (e.message.includes('permission') || e.message.includes('policy'))) {
          console.error('🔐 Permission/Policy Issue Detected:');
          console.error('   - Check Row Level Security (RLS) policies');
          console.error('   - Admin user may not have INSERT permission');
          console.error('   - Try disabling RLS temporarily for testing');
        }
        
        showToast('⚠️ Database save failed (using local storage): ' + e.message, 'error');
      }
    } else {
      console.log('⚠️ Supabase not available, using localStorage only');
    }

    // Always save to localStorage as backup
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configDataFull));
      console.log('✅ Configuration saved to localStorage');
    } catch (e) {
      console.warn('⚠️ Could not save to localStorage:', e);
    }

    // Show appropriate success message
    if (savedToSupabase) {
      showToast('✅ Configuration saved to database successfully!', 'success');
      console.log('✅ Data saved to Supabase availability_tb table');
      console.log('📊 Data saved:', configDataForDB);
    } else {
      showToast('⚠️ Configuration saved locally (check console for details)', 'success');
      console.warn('⚠️ Using localStorage only - Check browser console (F12) for Supabase errors');
      console.warn('📊 To fix: Check Supabase RLS policies or ensure table exists');
    }
    
    // Dispatch event for other parts of the app
    window.dispatchEvent(new CustomEvent('configurationUpdated', { detail: configDataFull }));
    
    // Refresh related displays after short delay
    setTimeout(async () => {
      try {
        if (typeof updateDashboardLaundryStatus === 'function') {
          await updateDashboardLaundryStatus();
        }
        if (typeof updateCustomerLaundryStatus === 'function') {
          await updateCustomerLaundryStatus();
        }
        if (typeof updateBookingNavStatus === 'function') {
          await updateBookingNavStatus();
        }
      } catch (e) {
        console.warn('Non-critical update error:', e);
      }
      nav('admin-dashboard');
    }, 1000);

    return true;
  } catch (e) {
    console.error('❌ Exception saving configuration:', e);
    showToast('❌ Error: ' + e.message, 'error');
    
    // Restore button state
    const saveBtn = document.querySelector('[onclick*="saveConfiguration"]');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save All Settings';
    }
    
    return false;
  } finally {
    isSavingConfiguration = false;
    
    // Restore button state if still loading
    const saveBtn = document.querySelector('[onclick*="saveConfiguration"]');
    if (saveBtn && saveBtn.disabled) {
      saveBtn.disabled = false;
      if (saveBtn.textContent === '⏳ Saving...') {
        saveBtn.textContent = 'Save All Settings';
      }
    }
  }
}

// Create a bypass/test booking via database API
window.createBypassBooking = async function(overrides) {
  try {
    const now = new Date().toISOString();
    const sample = {
      CustomerID: window.currentUser ? window.currentUser.UserID : 1,
      FullName: (overrides && overrides.FullName) || 'Test Customer',
      ContactNo: (overrides && overrides.ContactNo) || '09000000000',
      LaundryType: (overrides && overrides.LaundryType) || 'Wash & Dry',
      ClothesType: (overrides && overrides.ClothesType) || 'Mixed',
      EstimatedWeight: (overrides && overrides.EstimatedWeight) || 2,
      Address: (overrides && overrides.Address) || '123 Test St',
      SubmissionMethod: (overrides && overrides.SubmissionMethod) || 'Drop off',
      ReceivingMethod: (overrides && overrides.ReceivingMethod) || 'Delivery',
      PaymentMethod: (overrides && overrides.PaymentMethod) || 'In person',
      Status: (overrides && overrides.Status) || 'Order Placed'
    };
    const res = await apiSaveBooking(sample);
    if (res && res.success) {
      showToast('Bypass booking created: #' + res.data, 'success');
      await renderBookingsList();
      await renderLaundryManagementBookings();
      await renderDeliveryTasks();
      return res.data;
    } else {
      throw new Error(res ? res.message : 'Failed to create booking');
    }
  } catch (e) {
    console.error('createBypassBooking error', e);showToast('Failed to create bypass booking: ' + e.message, 'error');
    showToast('Failed to create bypass booking: ' + e.message, 'error');
  }
};

// Update delivery task status
// Updated to use actual booking status
async function markDeliveryStatus(bookingId, taskType) {
  try {
    const booking = await apiFetchBooking(bookingId);
    if (!booking) throw new Error('Booking not found');
    
    const newStatus = taskType === 'pickup' ? 'Picked Up' : 'Delivered';
    const res = await apiSaveBooking({ ...booking, Status: newStatus, PickedUpAt: taskType === 'pickup' ? new Date().toISOString() : booking.PickedUpAt, DeliveredAt: taskType === 'delivery' ? new Date().toISOString() : booking.DeliveredAt });
    
    if (res && res.success) {
      showToast('Order #' + String(bookingId).padStart(3,'0') + ' is now ' + newStatus, 'success');
      await renderDeliveryTasks();
      await renderBookingsList();
    }
  } catch (e) {
    showToast('Error updating status: ' + e.message, 'error');
  }
}

function updateTaskStatus(taskId, newStatus) {
  const statusText = newStatus === 'picked-up' ? 'Picked Up' : 'Delivered';
  showToast('Task #' + taskId + ' marked as ' + statusText, 'success');
  nav('delivery-tasks');
}

// Show alert messages
function showAlert(msg) {
  showToast(msg, 'info');
}

// Initialize app and show login screen
window.addEventListener('load', function() {
  // Set up multi-portal sync listeners
  // Storage event listener removed - using database API for all data
  
  // bookingUpdated handler now async so we can await inside it
  window.addEventListener('bookingUpdated', async function(e) {
    console.log('[SYNC] Booking updated in this tab');
    // Refresh global bookings list (admin/customer views)
    if (typeof renderBookingsList === 'function') renderBookingsList();
    // Refresh admin laundry management specific view
    if (typeof renderLaundryManagementBookings === 'function') renderLaundryManagementBookings();
    // Update dashboard booking stats (total/pending/completed)
    if (typeof updateDashboardBookingStats === 'function') {
      try {
        const all = await apiFetchBookings();
        updateDashboardBookingStats(all);
      } catch (err) { console.warn('updateDashboardBookingStats failed', err); }
    }
    // Refresh customer "My Laundry" current/completed panels
    if (typeof renderMyOrders === 'function') renderMyOrders();
    // Refresh driver/delivery tasks
    if (typeof renderDeliveryTasks === 'function') renderDeliveryTasks();
  });
  
  // Show login screen
  showAuth('login');
  
  // Clear any previous login session
  window.currentUser = null;
  window.userRole = null;
  role = 'customer';
  
  // Initialize laundry status
  initLaundryStatus();
  // start polling for availability and bookings so changes propagate across tabs/clients
  try { startAvailabilityPolling(10000); } catch(e) {}
  try { startBookingsPolling(10000); } catch(e) {}
  
  console.log('🧺 Mr. Laba-Laba System Ready - Multi-portal sync activated');
});

  // ---------------- Delivery Map + OSRM Integration ----------------
  // Uses Leaflet for map display, Nominatim for geocoding, and OSRM for routing
  window.shopLocation = window.shopLocation || { lat: 8.4542, lon: 124.6319 }; // default center (adjust as needed)

  async function initDeliveryMap() {
    try {
      if (!document.getElementById('v-map')) return;
      const cnt = document.getElementById('mapContainer');
      if (!cnt) return;

      // ensure Leaflet available: try to load dynamically if missing
      if (typeof L === 'undefined') {
        console.warn('Leaflet not loaded ? attempting dynamic load');
        await new Promise((resolve, reject) => {
          try {
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.async = true;
            s.onload = () => { console.log('Leaflet loaded dynamically'); resolve(); };
            s.onerror = () => { console.error('Failed to load Leaflet'); reject(new Error('Leaflet load failed')); };
            document.head.appendChild(s);
            // also ensure CSS is present
            if (!document.querySelector('link[href*="leaflet"]')) {
              const l = document.createElement('link');
              l.rel = 'stylesheet';
              l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
              document.head.appendChild(l);
            }
          } catch (err) { reject(err); }
        }).catch(err => { console.error('Leaflet dynamic load error', err); });

        if (typeof L === 'undefined') {
          console.warn('Leaflet still unavailable after dynamic load');
          return;
        }
      }

      // if a map already exists, remove it and start fresh to avoid rendering glitches
      if (window.deliveryMap) {
        try { window.deliveryMap.remove(); } catch(e) { console.warn('failed to remove existing map', e); }
        window.deliveryMap = null;
      }

      // ensure container has visible size (some CSS may collapse it when view hidden)
      // use setAttribute with !important to force sizing regardless of CSS cascade
      cnt.setAttribute('style', 'display:block !important; position:relative !important; width:100% !important; height:420px !important; min-height:420px !important; background:#f6f8fa; border:1px solid #d0dde8; overflow:hidden !important; box-sizing:border-box;');
      
      // force browser layout recalculation by reading offsetHeight (triggers synchronous reflow)
      let h = cnt.offsetHeight;
      let w = cnt.offsetWidth;
      console.log(`Map container verified (attempt 1): ${w}x${h}px`);
      
      // if container still has no size, give it explicit size
      if (h < 100 || w < 100) {
        console.warn(`Container size invalid (${w}x${h}), forcing dimensions and waiting for reflow`);
        cnt.style.cssText = 'display:block !important; position:relative !important; width:100% !important; height:420px !important; min-height:420px !important; background:#f6f8fa; border:1px solid #d0dde8; overflow:hidden !important; box-sizing:border-box; visibility:visible !important;';
        // force multiple reflows
        for (let i = 0; i < 3; i++) {
          const _ = cnt.offsetHeight;
        }
        const h2 = cnt.offsetHeight;
        const w2 = cnt.offsetWidth;
        console.log(`After forced reflow: ${w2}x${h2}px`);
      }
      
      // clear any old content
      cnt.innerHTML = '';

      // wait for view animation to complete + browser rendering
      // use requestAnimationFrame multiple times to ensure native paint cycle completes
      await new Promise(r => {
        let frameCount = 0;
        const waitForFrames = () => {
          frameCount++;
          if (frameCount < 3) {
            requestAnimationFrame(waitForFrames);
          } else {
            // after 3 frames, wait additional 350ms for CSS animations to settle
            setTimeout(r, 350);
          }
        };
        requestAnimationFrame(waitForFrames);
      });
      
      const map = L.map('mapContainer').setView([window.shopLocation.lat, window.shopLocation.lon], 12);
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      window.deliveryMap = map;
      window.deliveryTileLayer = tileLayer;
      window.deliveryMarkers = [];
      window.deliveryRouteLayer = null;

      // helper to invalidate and redraw tiles
      const refreshMap = () => {
        try { map.invalidateSize(true); } catch(e){ console.debug('invalidateSize error (expected if map destroyed)', e); }
        try { if (window.deliveryTileLayer) window.deliveryTileLayer.redraw(); } catch(e){}
      };

      // immediately correct size (in case layout just changed)
      refreshMap();
      // schedule extra invalidations at optimal intervals
      setTimeout(refreshMap, 0);
      setTimeout(refreshMap, 50);
      setTimeout(refreshMap, 150);
      setTimeout(refreshMap, 300);
      setTimeout(refreshMap, 500);
      setTimeout(refreshMap, 800);

      // also refresh once map is ready
      map.whenReady(() => { 
        refreshMap();
        setTimeout(() => refreshMap(), 100);
      });
      
      // force refresh when tiles load
      try { tileLayer.on('load', () => { try { map.invalidateSize(true); } catch(e){} }); } catch(e){}

      // load delivery tasks and place markers
      const bookings = await apiFetchBookings();
      const tasks = bookings.filter(b => !isCompleted(b.Status) && String(b.ReceivingMethod).toLowerCase() === 'delivery');
      for (const b of tasks) {
        if (!b.Address) continue;
        const coords = await geocodeAddress(b.Address);
        if (!coords) continue;
        const marker = L.marker([coords.lat, coords.lon]).addTo(map).bindPopup(`<strong>#${String(b.BookID).padStart(3,'0')} ${b.FullName||''}</strong><br>${b.Address}`);
        marker.booking = b;
        marker.coords = coords;
        marker.on('click', async function() {
          // draw route from shop to this marker
          const from = [window.shopLocation.lon, window.shopLocation.lat];
          const to = [marker.coords.lon, marker.coords.lat];
          await drawRouteOSRM(from, to);
        });
        window.deliveryMarkers.push(marker);
        // throttle geocoding requests
        await new Promise(r => setTimeout(r, 800));
      }

      if (window.deliveryMarkers.length) {
        const group = L.featureGroup(window.deliveryMarkers);
        map.fitBounds(group.getBounds(), { padding: [40,40] });
      }

      // watch for container size changes (e.g. sidebar toggle) and re-invalidate
      if (window.deliveryMapObserver) {
        try { window.deliveryMapObserver.disconnect(); } catch(e){}
        window.deliveryMapObserver = null;
      }
      try {
        const ro = new ResizeObserver(() => { 
          try { 
            map.invalidateSize(true); 
            if (window.deliveryTileLayer) window.deliveryTileLayer.redraw();
          } catch(e){ console.debug('ResizeObserver error', e); }
        });
        ro.observe(cnt);
        window.deliveryMapObserver = ro;
      } catch (e) {
        console.debug('ResizeObserver unavailable', e);
      }
    } catch (e) {
      console.error('initDeliveryMap error', e);
    }
  }

  async function geocodeAddress(address) {
    try {
      const q = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data && data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (e) { console.error('geocodeAddress error', e); }
    return null;
  }

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (data && data.display_name) return data.display_name;
    } catch (e) { console.error('reverseGeocode error', e); }
    return '';
  }

  // generic address picker: injects a leaflet map into container and syncs with input
  async function initAddressPicker(opts) {
    const {container, input, defaultCenter} = opts;
    if (!container) return null;
    if (container._picker) return container._picker; // already initialized

    // ensure Leaflet exists (dynamic load if necessary)
    if (typeof L === 'undefined') {
      console.warn('Leaflet not loaded for address picker ? attempting dynamic load');
      await new Promise((resolve, reject) => {
        try {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          s.async = true;
          s.onload = () => { console.log('Leaflet loaded dynamically'); resolve(); };
          s.onerror = () => { console.error('Failed to load Leaflet'); reject(new Error('Leaflet load failed')); };
          document.head.appendChild(s);
          if (!document.querySelector('link[href*="leaflet"]')) {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(l);
          }
        } catch (err) { reject(err); }
      }).catch(err => { console.error('Leaflet dynamic load error', err); });
      if (typeof L === 'undefined') {
        console.warn('Leaflet still unavailable after dynamic load');
        return null;
      }
    }

    // prepare container with explicit height to prevent Leaflet sizing issues
    // use !important to override any conflicting CSS
    container.innerHTML = '';
    container.setAttribute('style', 'display:block !important; position:relative !important; width:100% !important; height:280px !important; min-height:280px !important; border-radius:10px; border:2px solid #00a8cc; overflow:hidden !important; cursor:crosshair; background-color:#e8f4f8;');
    
    // force browser layout recalculation by reading offsetHeight (triggers synchronous reflow)
    let pickerH = container.offsetHeight;
    let pickerW = container.offsetWidth;
    console.log(`Address picker container verified (attempt 1): ${pickerW}x${pickerH}px`);
    
    // if still no size, force it
    if (pickerH < 100 || pickerW < 100) {
      console.warn(`Address picker size invalid (${pickerW}x${pickerH}), forcing reflow`);
      container.style.cssText = 'display:block !important; position:relative !important; width:100% !important; height:280px !important; min-height:280px !important; border-radius:10px; border:2px solid #00a8cc; overflow:hidden !important; cursor:crosshair; background-color:#e8f4f8; visibility:visible !important;';
      for (let i = 0; i < 3; i++) { const _ = container.offsetHeight; }
      pickerH = container.offsetHeight;
      pickerW = container.offsetWidth;
      console.log(`After forced reflow: ${pickerW}x${pickerH}px`);
    }

    // wait for browser to complete rendering: multiple RAF frames + additional time
    await new Promise(r => {
      let frameCount = 0;
      const waitForFrames = () => {
        frameCount++;
        if (frameCount < 3) {
          requestAnimationFrame(waitForFrames);
        } else {
          setTimeout(r, 200);
        }
      };
      requestAnimationFrame(waitForFrames);
    });

    const map = L.map(container, {attributionControl: true}).setView(
      defaultCenter || [window.shopLocation.lat, window.shopLocation.lon],
      defaultCenter ? 14 : 12
    );
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // helper to invalidate and redraw tiles
    const refreshAddressPickerMap = () => {
      try { map.invalidateSize(true); } catch(e){ console.debug('invalidateSize error', e); }
      try { if (tileLayer) tileLayer.redraw(); } catch(e){}
    };

    // immediately invalidate size right after map creation (synchronous call)
    refreshAddressPickerMap();
    
    // schedule aggressive refresh attempts at critical intervals
    setTimeout(() => { refreshAddressPickerMap(); }, 0);
    setTimeout(() => { refreshAddressPickerMap(); }, 50);
    setTimeout(() => { refreshAddressPickerMap(); }, 150);
    setTimeout(() => { refreshAddressPickerMap(); }, 300);
    setTimeout(() => { refreshAddressPickerMap(); }, 500);
    
    // refresh again once map is ready and after load
    map.whenReady(() => { 
      refreshAddressPickerMap();
      setTimeout(() => { refreshAddressPickerMap(); }, 100);
    });
    
    // force refresh when tiles load
    tileLayer.on('load', () => { try { map.invalidateSize(true); } catch(e){} });

    let marker = L.marker(map.getCenter(), {draggable:true}).addTo(map);

    const updateAndFill = async (lat, lon) => {
      try {
        const addr = await reverseGeocode(lat, lon);
        if (addr && input) input.value = addr;
      } catch(e){console.error(e)}
    };

    marker.on('dragend', e => {
      const p = marker.getLatLng();
      map.setView(p);
      updateAndFill(p.lat, p.lng);
    });

    map.on('click', e => {
      marker.setLatLng(e.latlng);
      map.setView(e.latlng);
      updateAndFill(e.latlng.lat, e.latlng.lng);
    });

    if (input) {
      // when user edits text, reflect on map
      input.addEventListener('change', async () => {
        const addr = input.value.trim();
        if (addr) {
          const c = await geocodeAddress(addr);
          if (c) {
            marker.setLatLng([c.lat, c.lon]);
            map.setView([c.lat, c.lon], 14);
          }
        }
      });
      // if input already contains an address, position map accordingly
      const initAddr = input.value.trim();
      if (initAddr) {
        geocodeAddress(initAddr).then(c => {
          if (c) {
            marker.setLatLng([c.lat, c.lon]);
            map.setView([c.lat, c.lon], 14);
          }
        }).catch(e => console.error('initAddressPicker geocode error',e));
      }
    }

    container._picker = {map, marker, tileLayer};
    
    // watch for container size changes and re-invalidate map
    try {
      const ro = new ResizeObserver(() => { 
        try { 
          map.invalidateSize(true);
          if (tileLayer) tileLayer.redraw();
        } catch(e){ console.debug('ResizeObserver error', e); }
      });
      ro.observe(container);
    } catch (e) {
      console.debug('ResizeObserver not supported:', e);
    }
    
    return container._picker;
  }

  async function setupBookingAddressMap() {
    const container = document.getElementById('bookingMapPlaceholder');
    const input = document.getElementById('bookingAddress');
    await initAddressPicker({container, input});
  }

  async function setupSetAddressMap() {
    const container = document.getElementById('setAddressMapPlaceholder');
    const input = document.getElementById('setAddressInput');
    await initAddressPicker({container, input});
  }

  async function drawRouteOSRM(fromLonLat, toLonLat) {
    try {
      if (!window.deliveryMap) return;
      const coords = `${fromLonLat[0]},${fromLonLat[1]};${toLonLat[0]},${toLonLat[1]}`;
      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const j = await res.json();
      if (j && j.routes && j.routes[0]) {
        const geom = j.routes[0].geometry;
        if (window.deliveryRouteLayer) { window.deliveryMap.removeLayer(window.deliveryRouteLayer); }
        window.deliveryRouteLayer = L.geoJSON(geom, { style: { color: '#007bff', weight: 4 } }).addTo(window.deliveryMap);
        window.deliveryMap.fitBounds(window.deliveryRouteLayer.getBounds(), { padding: [40,40] });
      }
    } catch (e) { console.error('drawRouteOSRM error', e); showToast('Routing failed: ' + (e.message || e), 'error'); }
  }

// Auto-fill booking name field when Book Laundry view is shown
function autoFillBookingName() {
  const nameField = document.getElementById('bookingName');
  if (nameField && window.currentUser) {
    const { FirstName, MiddleName, LastName } = window.currentUser;
    const fullName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ');
    nameField.value = fullName;
  }
}

// Ensure auto-fill runs when Book Laundry view is shown
const observer = new MutationObserver(() => {
  const bookLaundryView = document.getElementById('v-book-laundry');
  if (bookLaundryView && bookLaundryView.style.display !== 'none') {
    autoFillBookingName();
  }
});
observer.observe(document.body, { childList: true, subtree: true });


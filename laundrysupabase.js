const supabaseUrl = 'https://vgkvoanuaxzoenpcctyh.supabase.co'
const supabaseKey = 'sb_publishable_jYgZSQVMyikSk8tPMZ9b0A_RvLWtM8w'

// Initialize Supabase - wait for SDK to load first
let supabase = null;
let supabaseReady = false; // Flag to track initialization status

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

async function initSupabaseClient() {
  // Wait for window.supabase SDK to be available (loaded from CDN)
  let attempts = 0;
  const maxAttempts = 12000; // 120 seconds max (12000 * 10ms)
  
  console.log('⏳ Waiting for Supabase SDK from CDN...');
  console.log('📍 Current window.supabase status:', typeof window.supabase);
  
  let sdkLoaded = false;
  while (!sdkLoaded && attempts < maxAttempts) {
    attempts++;
    
    // Check various conditions for SDK availability
    const hasSupabaseObj = typeof window.supabase !== 'undefined' && window.supabase !== null;
    const hasCreateClient = hasSupabaseObj && typeof window.supabase.createClient === 'function';
    
    // Log progress every 10 attempts  
    if (attempts % 10 === 0) {
      console.log(`⏳ [${attempts}] Checking SDK... hasObject: ${hasSupabaseObj}, hasMethod: ${hasCreateClient}`);
    }
    
    if (hasSupabaseObj && hasCreateClient) {
      sdkLoaded = true;
      console.log(`✅ SDK loaded after ${attempts * 10}ms`);
      break;
    }
    await new Promise(r => setTimeout(r, 10));
  }
  
  if (!sdkLoaded) {
    console.error(`❌ Supabase SDK failed to load after ${attempts * 100}ms`);
    console.error('❌ This usually means:');
    console.error('   1. CDN is unreachable or slow');
    console.error('   2. Network connectivity issue');
    console.error('   3. Browser blocked the script');
    console.warn('⚠️ Attempting to continue without SDK...');
    supabaseReady = true; // Mark as attempted
    return false;
  }
  
  try {
    // Create the client and store it
    console.log('🔧 Creating Supabase client...');
    const supabaseSDK = window.supabase;
    // Add connection pooling options for better performance
    supabase = supabaseSDK.createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
      auth: { persistSession: true },
      global: { headers: { 'x-client-info': 'laundry-system' } }
    });
    window.supabase = supabase; // Replace window.supabase with the client instance
    supabaseReady = true; // Mark as ready
    console.log("✅ Supabase client initialized successfully!");
    return true;
  } catch (e) {
    console.error('❌ Failed to create Supabase client:', e.message);
    console.error('Stack:', e.stack);
    supabaseReady = true; // Mark as attempted
    return false;
  }
}

// Initialize immediately when this script loads (non-blocking)
initSupabaseClient().catch(e => console.error('❌ Supabase init error:', e));

// -------------- AUTH FUNCTIONS --------------

// Show/Hide Auth Cards
function showAuth(cardId) {
  document.querySelectorAll('.auth-card').forEach(card => card.style.display = 'none')
  const card = document.getElementById(`auth-${cardId}`)
  if (card) card.style.display = 'block'
}

// Toggle Password Visibility
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId)
  input.type = input.type === 'password' ? 'text' : 'password'
}

// -------------- REGISTRATION --------------

async function validateSignupStep1() {
  const firstName = document.getElementById('firstName').value
  const lastName = document.getElementById('lastName').value
  const address = document.getElementById('address').value
  const contactNo = document.getElementById('contactNo').value

  let isValid = true

  if (!firstName.trim()) {
    document.getElementById('firstNameError').innerText = "First name required"
    document.getElementById('firstNameError').style.display = 'block'
    isValid = false
  }

  if (!lastName.trim()) {
    document.getElementById('lastNameError').innerText = "Last name required"
    document.getElementById('lastNameError').style.display = 'block'
    isValid = false
  }

  if (!address.trim()) {
    document.getElementById('addressError').innerText = "Address required"
    document.getElementById('addressError').style.display = 'block'
    isValid = false
  }

  if (!contactNo.trim() || contactNo.length < 10) {
    document.getElementById('contactNoError').innerText = "Valid contact number required"
    document.getElementById('contactNoError').style.display = 'block'
    isValid = false
  }

  if (isValid) {
    showAuth('s2')
  }
}

async function registerUser() {
  console.log("📝 Starting registration...")

  // Disable signup button while processing
  const signupBtn = document.querySelector('[onclick*="registerUser"]');
  if (signupBtn) {
    signupBtn.disabled = true;
  }

  // Clear previous errors
  const errorElements = ['signupUserError', 'signupPassError'];
  errorElements.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.innerText = ''; el.style.display = 'none'; }
  });

  const contactNoVal = parseInt(document.getElementById('contactNo').value) || 0;
  const userData = {
    FirstName: document.getElementById('firstName').value.trim(),
    LastName: document.getElementById('lastName').value.trim(),
    MiddleName: document.getElementById('middleName') ? document.getElementById('middleName').value.trim() : '',
    ContactNo: contactNoVal,
    Username: document.getElementById('signupUser').value.trim(),
    Password: document.getElementById('signupPass').value,
    Role: 'Customer',
    Status: 'Active',
    LaundryPref: ''
  }

  // Validate
  if (!userData.FirstName || !userData.LastName) {
    console.warn('❌ First/Last name missing');
    document.getElementById('signupUserError').innerText = "First and last name are required"
    document.getElementById('signupUserError').style.display = 'block'
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = 'Sign Up';
    }
    return
  }

  if (!userData.Username || userData.Username.length < 3) {
    console.warn('❌ Invalid username');
    document.getElementById('signupUserError').innerText = "Username must be 3+ characters"
    document.getElementById('signupUserError').style.display = 'block'
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = 'Sign Up';
    }
    return
  }

  if (!userData.Password || userData.Password.length < 6) {
    console.warn('❌ Invalid password');
    document.getElementById('signupPassError').innerText = "Password must be 6+ characters"
    document.getElementById('signupPassError').style.display = 'block'
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = 'Sign Up';
    }
    return
  }

  try {
    const sb = await getSupabase();
    if (!sb) {
      throw new Error('Supabase not initialized yet')
    }

    console.log('📤 Inserting user to Supabase:', { ...userData, Password: '***' });

    const { data, error } = await sb
      .from('user_table')
      .insert([userData])
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase Error:", error)
      const errMsg = error.message || error.details || "Registration failed";
      document.getElementById('signupUserError').innerText = "Error: " + errMsg
      document.getElementById('signupUserError').style.display = 'block'
      if (signupBtn) {
        signupBtn.disabled = false;
        signupBtn.textContent = 'Sign Up';
      }
      return
    }

    console.log("✅ Registration successful! User ID:", data.UserID)
    
    // Redirect immediately without showing success message
    showAuth('login')
    
    // Clear form fields
    document.getElementById('firstName').value = ''
    document.getElementById('lastName').value = ''
    if (document.getElementById('middleName')) document.getElementById('middleName').value = ''
    if (document.getElementById('address')) document.getElementById('address').value = ''
    document.getElementById('contactNo').value = ''
    document.getElementById('signupUser').value = ''
    document.getElementById('signupPass').value = ''
    
    // Reset button
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = 'Sign Up';
    }
    
    // Hide success message instantly
    if (successDiv) {
      successDiv.style.display = 'none';
      successDiv.innerText = '';
    }

  } catch (err) {
    console.error("❌ Exception:", err)
    // Show error instantly
    const errMsg = err.message || "Please try again";
    document.getElementById('signupUserError').innerText = "❌ Connection error: " + errMsg
    document.getElementById('signupUserError').style.display = 'block'
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = 'Sign Up';
    }
  }
}

// -------------- LOGIN --------------
// Login function is in LaundrySystem.js

// -------------- PASSWORD RESET --------------

let userToReset = ""

async function verifyUsernameForReset() {
  const username = document.getElementById('forgotUser').value.trim()
  const errEl = document.getElementById('forgotUserError')

  if (errEl) { errEl.innerText = ""; errEl.style.display = 'none'; }

  if (!username) {
    console.warn('❌ Username is empty');
    if (errEl) { errEl.innerText = "Enter your username"; errEl.style.display = 'block'; }
    return
  }

  try {
    const sb = await getSupabase();
    if (!sb) {
      throw new Error('Supabase not initialized')
    }

    console.log('🔎 Verifying username:', username);

    const { data, error } = await sb
      .from('user_table')
      .select('Username, UserID')
      .eq('Username', username)
      .single()

    if (error || !data) {
      console.error("❌ Username not found:", error);
      if (errEl) { errEl.innerText = "❌ Username not found"; errEl.style.display = 'block'; }
      return
    }

    console.log('✅ Username verified:', data.UserID);
    userToReset = data.Username
    if (errEl) errEl.style.display = 'none'
    showAuth('reset')

  } catch (err) {
    console.error("❌ Error:", err)
    if (errEl) { errEl.innerText = "Error occurred: " + (err.message || "Please try again"); errEl.style.display = 'block'; }
  }
}

async function resetUserPassword() {
  const p1 = document.getElementById('resetPass1').value
  const p2 = document.getElementById('resetPass2').value
  const errEl = document.getElementById('resetPass1Error')
  const successEl = document.getElementById('resetSuccess')

  if (errEl) { errEl.innerText = ""; errEl.style.display = 'none'; }

  if (p1 !== p2) {
    console.warn('❌ Passwords do not match');
    if (errEl) { errEl.innerText = "Passwords don't match"; errEl.style.display = 'block'; }
    return
  }

  if (!p1 || p1.length < 6) {
    console.warn('❌ Password too short');
    if (errEl) { errEl.innerText = "Password must be 6+ characters"; errEl.style.display = 'block'; }
    return
  }

  try {
    const sb = await getSupabase();
    if (!sb) {
      throw new Error('Supabase not initialized')
    }

    console.log('🔐 Resetting password for user:', userToReset);

    const { error } = await sb
      .from('user_table')
      .update({ Password: p1 })
      .eq('Username', userToReset)

    if (error) {
      console.error('❌ Error updating password:', error);
      if (errEl) { errEl.innerText = "Error: " + (error.message || error.details || 'Update failed'); errEl.style.display = 'block'; }
      return
    }

    console.log('✅ Password reset successfully');
    
    // Redirect instantly without showing success message
    showAuth('login')
    document.getElementById('resetPass1').value = ''
    document.getElementById('resetPass2').value = ''
    userToReset = "";

  } catch (err) {
    console.error("❌ Error:", err)
    if (errEl) { errEl.innerText = "Connection error: " + (err.message || "Please try again"); errEl.style.display = 'block'; }
  }
}

// -------------- LOGOUT --------------

function doLogout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem('currentUser')
    document.getElementById('auth-wrap').style.display = 'flex'
    document.getElementById('app-wrap').classList.remove('show')
    showAuth('login')
    // Clear all forms
    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.type !== 'hidden') el.value = ''
    })
  }
}

// -------------- APP NAVIGATION --------------

function nav(viewId) {
  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active')
  })

  // Show selected view
  const view = document.getElementById(`v-${viewId}`)
  if (view) {
    view.classList.add('active')
    
    // Update topbar title
    const titles = {
      'dashboard': '?? Dashboard',
      'book-laundry': '?? Book Laundry',
      'booking-summary': '?? Booking Summary',
      'my-laundry-status': '?? My Orders',
      'profile': '?? Profile',
      'edit-profile': '?? Edit Profile',
      'change-password': '?? Change Password',
      'notifications': '?? Notifications',
      'admin-dashboard': '????? Admin Dashboard',
      'user-management': '?? User Management',
      'laundry-management': '?? Laundry Management',
      'configuration': '?? Configuration',
      'delivery-dashboard': '?? Delivery Dashboard'
    }
    
    const title = titles[viewId] || viewId
    document.getElementById('tbTitle').innerText = title
  }
}

function navigateBackToDashboard() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'))
  if (!currentUser) {
    doLogout()
    return
  }

  if (currentUser.Role === 'Admin') {
    nav('admin-dashboard')
  } else if (currentUser.Role === 'Delivery') {
    nav('delivery-dashboard')
  } else {
    nav('dashboard')
  }
}

// -------------- APP INITIALIZATION --------------

function initializeApp(role) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'))

  // Update topbar user info
  document.getElementById('tbAv').innerText = currentUser.FirstName.charAt(0).toUpperCase()
  document.getElementById('sfName').innerText = currentUser.FirstName + ' ' + currentUser.LastName
  document.getElementById('sfRole').innerText = currentUser.Role

  // Update profile
  document.getElementById('profAv').innerText = currentUser.FirstName.charAt(0).toUpperCase()
  document.getElementById('profName').innerText = currentUser.FirstName + ' ' + currentUser.LastName
  document.getElementById('profRoleLbl').innerText = currentUser.Role

  // Build sidebar navigation
  buildSidebar(role)

  // Navigate to appropriate dashboard
  if (role === 'Admin') {
    nav('admin-dashboard')
  } else if (role === 'Delivery') {
    nav('delivery-dashboard')
  } else {
    nav('dashboard')
  }
}

function buildSidebar(role) {
  const navContainer = document.getElementById('sbNav')
  navContainer.innerHTML = ''

  const navItems = {
    'Customer': [
      { label: 'Dashboard', id: 'dashboard', icon: '??' },
      { label: 'Book Laundry', id: 'book-laundry', icon: '??' },
      { label: 'My Orders', id: 'my-laundry-status', icon: '??' },
      { label: 'Notifications', id: 'notifications', icon: '??' },
      { label: 'Profile', id: 'profile', icon: '??' }
    ],
    'Admin': [
      { label: 'Dashboard', id: 'admin-dashboard', icon: '?????' },
      { label: 'User Management', id: 'user-management', icon: '??' },
      { label: 'Laundry Management', id: 'laundry-management', icon: '??' },
      { label: 'Configuration', id: 'configuration', icon: '??' },
      { label: 'Profile', id: 'admin-profile', icon: '??' }
    ],
    'Delivery': [
      { label: 'Dashboard', id: 'delivery-dashboard', icon: '??' },
      { label: 'My Tasks', id: 'delivery-tasks', icon: '??' },
      { label: 'History', id: 'delivery-history', icon: '??' },
      { label: 'Notifications', id: 'delivery-notifications', icon: '??' },
      { label: 'Profile', id: 'delivery-profile', icon: '??' }
    ]
  }

  const items = navItems[role] || navItems['Customer']

  items.forEach(item => {
    const navItem = document.createElement('div')
    navItem.className = 'sb-item'
    navItem.setAttribute('data-label', item.label)
    navItem.onclick = () => nav(item.id)
    navItem.innerHTML = `
      <span class="si">${item.icon}</span>
      <span class="sl">${item.label}</span>
    `
    navContainer.appendChild(navItem)
  })

  // Add logout at bottom
  const logoutItem = document.createElement('div')
  logoutItem.className = 'sb-item sb-logout'
  logoutItem.setAttribute('data-label', 'Logout')
  logoutItem.onclick = doLogout
  logoutItem.innerHTML = `
    <span class="si">??</span>
    <span class="sl">Logout</span>
  `
  navContainer.appendChild(logoutItem)
}

// -------------- SIDEBAR TOGGLE --------------

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar')
  const content = document.getElementById('contentWrap')
  const topbar = document.getElementById('topbar')

  sidebar.classList.toggle('mini')
  content.classList.toggle('mini')
  topbar.style.left = sidebar.classList.contains('mini') ? '64px' : '240px'
}

// -------------- PROFILE FUNCTIONS --------------

async function saveProfile() {
  try {
    if (!window.currentUser) {
      throw new Error('No user logged in');
    }

    console.log('💾 Saving profile for user:', window.currentUser.UserID);

    const sb = await getSupabase();
    if (!sb) {
      throw new Error('Supabase not initialized');
    }

    // Update user profile fields
    const updateData = {
      FirstName: (document.getElementById('profFirstName') || {}).value || window.currentUser.FirstName,
      LastName: (document.getElementById('profLastName') || {}).value || window.currentUser.LastName,
      ContactNo: parseInt((document.getElementById('profContact') || {}).value || window.currentUser.ContactNo) || 0
    };

    console.log('📤 Updating profile:', updateData);

    const { error } = await sb
      .from('user_table')
      .update(updateData)
      .eq('UserID', window.currentUser.UserID);

    if (error) {
      console.error("❌ Error updating profile:", error)
      alert("❌ Error: " + (error.message || error.details || 'Update failed'))
      return
    }

    // Update local user object
    window.currentUser = { ...window.currentUser, ...updateData };
    console.log('✅ Profile updated successfully');
    alert("✅ Profile updated successfully!")
  } catch (err) {
    console.error("❌ Error:", err)
    alert("❌ Connection error: " + (err.message || 'Please try again'))
  }
}

async function changePassword(isAdmin = false) {
  const currentPass = isAdmin ? 
    (document.getElementById('adminCurrentPass') || {}).value : 
    (document.getElementById('currentPass') || {}).value
  
  const newPass = isAdmin ? 
    (document.getElementById('adminNewPass') || {}).value : 
    (document.getElementById('newPass') || {}).value
  
  const confirmPass = isAdmin ? 
    (document.getElementById('adminConfirmPass') || {}).value : 
    (document.getElementById('confirmPass') || {}).value

  if (!currentPass || !newPass || !confirmPass) {
    console.warn('❌ Missing password fields');
    alert("❌ Please fill in all password fields")
    return
  }

  if (newPass !== confirmPass) {
    console.warn('❌ Passwords do not match');
    alert("❌ Passwords don't match!")
    return
  }

  if (newPass.length < 6) {
    console.warn('❌ New password too short');
    alert("❌ New password must be at least 6 characters")
    return
  }

  if (!window.currentUser) {
    console.error('❌ No user logged in');
    alert("❌ No user session found")
    return
  }

  try {
    const sb = await getSupabase();
    if (!sb) {
      throw new Error('Supabase not initialized');
    }

    console.log('🔐 Changing password for user:', window.currentUser.UserID);

    // Verify current password by attempting to fetch user
    const { data: userData, error: verifyError } = await sb
      .from('user_table')
      .select('Password')
      .eq('UserID', window.currentUser.UserID)
      .single()

    if (verifyError || !userData) {
      console.error('❌ Failed to fetch user data:', verifyError);
      alert("❌ Could not verify user")
      return
    }

    if (userData.Password !== currentPass) {
      console.warn('❌ Current password is incorrect');
      alert("❌ Current password is incorrect")
      return
    }

    console.log('✅ Current password verified, updating to new password...');

    // Update password
    const { error } = await sb
      .from('user_table')
      .update({ Password: newPass })
      .eq('UserID', window.currentUser.UserID)

    if (error) {
      console.error('❌ Error updating password:', error);
      alert("❌ Error: " + (error.message || error.details || 'Update failed'))
      return
    }

    console.log('✅ Password updated successfully');
    alert("✅ Password updated successfully!")
    // Logout instantly - no delay
    doLogout()

  } catch (err) {
    console.error("❌ Error:", err)
    alert("❌ Connection error: " + (err.message || 'Please try again'))
  }
}

// -------------- CHECK LOGIN ON PAGE LOAD --------------

window.addEventListener('load', async () => {
  console.log('📄 Page loaded, checking for active session...');
  
  // Wait for Supabase to initialize
  try {
    await getSupabase();
  } catch (e) {
    console.warn('⚠️ Supabase initialization issue:', e.message);
  }
  
  if (window.currentUser) {
    console.log('✅ User already logged in (from memory):', window.currentUser.UserID);
    document.getElementById('auth-wrap').style.display = 'none'
    document.getElementById('app-wrap').classList.add('show')
    buildNav()
    applyLayout()
  } else {
    console.log('❌ No active user session');
    document.getElementById('auth-wrap').style.display = 'flex'
    document.getElementById('app-wrap').classList.remove('show')
    showAuth('login')
  }
})
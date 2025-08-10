// Supabase Configuration (replace if needed)
const SUPABASE_URL = 'https://vemubkmthzjjzpgbseox.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlbXVia210aHpqanpwZ2JzZW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDY4NjgsImV4cCI6MjA3MDM4Mjg2OH0.-EqAxZq0xbkgsZnUWvvuPjpPdmhj13KTqvAZgMVqEuQ';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// DOM elements (must match HTML)
const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authPasswordConfirmField = document.getElementById('password-confirm-field');
const authPasswordConfirmInput = document.getElementById('auth-password-confirm');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authBtnText = document.getElementById('auth-btn-text');
const authSpinner = document.getElementById('auth-spinner');
const authStatusMessage = document.getElementById('auth-status-message');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loadingSpinner = document.getElementById('loading-spinner');
const appContent = document.getElementById('app-content');
const logoutBtn = document.getElementById('logout-btn');

const ledgersList = document.getElementById('ledgers-list');
const noLedgersMessage = document.getElementById('no-ledgers-message');
const addLedgerBtn = document.getElementById('add-ledger-btn');
const selectedLedgerName = document.getElementById('selected-ledger-name');
const transactionsList = document.getElementById('transactions-list');
const noTransactionsMessage = document.getElementById('no-transactions-message');
const addTransactionBtn = document.getElementById('add-transaction-btn');
const totalCreditsElem = document.getElementById('total-credits');
const totalDebitsElem = document.getElementById('total-debits');
const ledgerBalanceElem = document.getElementById('ledger-balance');

const ledgerModal = document.getElementById('ledger-modal');
const ledgerModalTitle = document.getElementById('ledger-modal-title');
const ledgerNameInput = document.getElementById('ledger-name-input');
const cancelLedgerBtn = document.getElementById('cancel-ledger-btn');
const confirmLedgerBtn = document.getElementById('confirm-ledger-btn');

const transactionModal = document.getElementById('transaction-modal');
const transactionModalTitle = document.getElementById('transaction-modal-title');
const transactionDescriptionInput = document.getElementById('transaction-description');
const transactionCategoryInput = document.getElementById('transaction-category');
const suggestCategoryBtn = document.getElementById('suggest-category-btn');
const transactionDebitInput = document.getElementById('transaction-debit');
const transactionCreditInput = document.getElementById('transaction-credit');
const cancelTransactionBtn = document.getElementById('cancel-transaction-btn');
const confirmTransactionBtn = document.getElementById('confirm-transaction-btn');

const messageModal = document.getElementById('message-modal');
const messageModalTitle = document.getElementById('message-modal-title');
const messageModalContent = document.getElementById('message-modal-content');
const closeMessageBtn = document.getElementById('close-message-btn');

// State
let currentUser = null;
let selectedLedgerId = null;
let isRegisterMode = false;
let editingLedgerId = null;
let editingTransactionId = null;

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkSession();
});

function setupEventListeners() {
  authForm.addEventListener('submit', handleAuthSubmit);
  loginTab.addEventListener('click', () => switchAuthMode(false));
  registerTab.addEventListener('click', () => switchAuthMode(true));
  logoutBtn.addEventListener('click', logout);

  addLedgerBtn.addEventListener('click', () => openLedgerModal('add'));
  cancelLedgerBtn.addEventListener('click', () => hideModal(ledgerModal));
  confirmLedgerBtn.addEventListener('click', handleLedgerSubmit);

  addTransactionBtn.addEventListener('click', () => openTransactionModal('add'));
  cancelTransactionBtn.addEventListener('click', () => hideModal(transactionModal));
  confirmTransactionBtn.addEventListener('click', handleTransactionSubmit);
  suggestCategoryBtn.addEventListener('click', suggestCategory);

  closeMessageBtn.addEventListener('click', () => hideModal(messageModal));
  window.addEventListener('online', handleNetworkChange);
  window.addEventListener('offline', handleNetworkChange);
}

// AUTH
async function checkSession() {
  showLoading();
  try {
    // quick connection test
    const ok = await testSupabaseConnection();
    if (!ok) return;

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session && session.user) {
      currentUser = session.user;
      hideAuthModal();
      appContent.classList.remove('hidden');
      await loadUserData();
    } else {
      showAuthModal();
    }
  } catch (err) {
    console.error(err);
    showAuthModal();
    showMessage('Error', 'Session check failed. Refresh and try again.');
  } finally {
    hideLoading();
  }
}

async function testSupabaseConnection() {
  try {
    // attempt to select zero rows; if RLS blocks, it may error if not authenticated
    const { data, error } = await supabase.from('ledgers').select('id').limit(1);
    if (error && error.code) {
      // still consider connection attempt succeeded but may require auth for table access
      console.log('Supabase query returned error (likely RLS/permission):', error.message);
    }
    return true;
  } catch (err) {
    console.error('Connection test failed:', err);
    showMessage('Connection Error', 'Unable to reach Supabase. Check network or keys.');
    return false;
  }
}

function switchAuthMode(register) {
  isRegisterMode = register;
  if (register) {
    loginTab.classList.remove('text-indigo-600', 'border-indigo-600');
    loginTab.classList.add('text-gray-500');
    registerTab.classList.remove('text-gray-500');
    registerTab.classList.add('text-indigo-600', 'border-indigo-600');
    authPasswordConfirmField.classList.remove('hidden');
    authBtnText.textContent = 'Register';
  } else {
    registerTab.classList.remove('text-indigo-600', 'border-indigo-600');
    registerTab.classList.add('text-gray-500');
    loginTab.classList.remove('text-gray-500');
    loginTab.classList.add('text-indigo-600', 'border-indigo-600');
    authPasswordConfirmField.classList.add('hidden');
    authBtnText.textContent = 'Login';
  }
  clearAuthErrors();
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value.trim();
  const passwordConfirm = authPasswordConfirmInput.value.trim();

  if (!email || !password) { showAuthError('Email and password required'); return; }
  if (isRegisterMode && password !== passwordConfirm) { showAuthError('Passwords do not match'); return; }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters'); return; }

  try {
    showAuthLoading();
    clearAuthErrors();
    if (isRegisterMode) {
      await registerUser(email, password);
    } else {
      await loginUser(email, password);
    }
  } catch (err) {
    console.error('Auth error:', err);
    showAuthError(err.message || 'Auth failed');
  } finally {
    hideAuthLoading();
  }
}

async function registerUser(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: window.location.origin }
  });
  if (error) throw error;
  showMessage('Registration', 'Please check your email to confirm your account. Then login.', 'success');
  switchAuthMode(false);
}

async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentUser = data.user;
  hideAuthModal();
  appContent.classList.remove('hidden');
  await loadUserData();
}

async function logout() {
  try {
    showLoading();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    currentUser = null;
    selectedLedgerId = null;
    appContent.classList.add('hidden');
    showAuthModal();
    clearAuthForm();
  } catch (err) {
    console.error('Logout error:', err);
    showMessage('Logout Failed', err.message || 'Could not logout', 'error');
  } finally {
    hideLoading();
  }
}

// DATA
async function loadUserData() {
  try {
    showLoading();
    const { data: ledgers, error } = await supabase
      .from('ledgers')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    renderLedgers(ledgers || []);
    if (ledgers && ledgers.length > 0) {
      selectLedger(ledgers[0].id);
    } else {
      selectedLedgerName.textContent = 'No ledger selected';
      renderTransactions([]);
    }
  } catch (err) {
    console.error('Data load error:', err);
    showMessage('Error', 'Failed loading data. Try again.', 'error');
  } finally {
    hideLoading();
  }
}

async function loadTransactions(ledgerId) {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('ledger_id', ledgerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    renderTransactions(transactions || []);
  } catch (err) {
    console.error('Transactions load error:', err);
    showMessage('Error', 'Failed to load transactions.', 'error');
  }
}

// RENDER
function renderLedgers(ledgers) {
  ledgersList.innerHTML = '';
  if (!ledgers || ledgers.length === 0) {
    noLedgersMessage.classList.remove('hidden');
    return;
  }
  noLedgersMessage.classList.add('hidden');

  ledgers.forEach(ledger => {
    const wrapper = document.createElement('div');
    wrapper.className = `p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${selectedLedgerId === ledger.id ? 'bg-indigo-50 border-indigo-200' : ''}`;
    wrapper.innerHTML = `
      <div class="flex justify-between items-center">
        <h3 class="font-medium">${escapeHtml(ledger.name)}</h3>
        <div class="flex space-x-2">
          <button class="text-gray-400 hover:text-indigo-600 edit-ledger" data-id="${ledger.id}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>
          </button>
          <button class="text-gray-400 hover:text-red-600 delete-ledger" data-id="${ledger.id}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Clicking card selects ledger
    wrapper.addEventListener('click', () => selectLedger(ledger.id));
    // Edit button
    wrapper.querySelector('.edit-ledger').addEventListener('click', (e) => {
      e.stopPropagation();
      editingLedgerId = ledger.id;
      openLedgerModal('edit', ledger.id, ledger.name);
    });
    // Delete button
    wrapper.querySelector('.delete-ledger').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLedger(ledger.id);
    });

    ledgersList.appendChild(wrapper);
  });
}

function renderTransactions(transactions) {
  transactionsList.innerHTML = '';
  if (!transactions || transactions.length === 0) {
    noTransactionsMessage.classList.remove('hidden');
    addTransactionBtn.disabled = (selectedLedgerId ? false : true); // allow add when a ledger is selected
    totalCreditsElem.textContent = '$0.00';
    totalDebitsElem.textContent = '$0.00';
    ledgerBalanceElem.textContent = '$0.00';
    return;
  }

  noTransactionsMessage.classList.add('hidden');
  addTransactionBtn.disabled = (selectedLedgerId ? false : true);

  let totalCredits = 0;
  let totalDebits = 0;

  transactions.forEach(tx => {
    // numeric fields from Postgres may come as strings — coerce safely
    const credit = Number(tx.credit || 0);
    const debit = Number(tx.debit || 0);
    totalCredits += credit;
    totalDebits += debit;

    const txEl = document.createElement('div');
    txEl.className = 'p-3 border rounded-md bg-white';
    txEl.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-medium">${escapeHtml(tx.description || '')}</h4>
          <p class="text-sm text-gray-500">${escapeHtml(tx.category || 'Uncategorized')}</p>
        </div>
        <div class="text-right">
          ${debit ? `<p class="text-red-600">-$${debit.toFixed(2)}</p>` : ''}
          ${credit ? `<p class="text-green-600">+$${credit.toFixed(2)}</p>` : ''}
        </div>
      </div>
      <div class="flex justify-between mt-2 text-xs text-gray-400">
        <span>${new Date(tx.created_at).toLocaleString()}</span>
        <div class="flex space-x-2">
          <button class="hover:text-indigo-600 edit-transaction" data-id="${tx.id}">Edit</button>
          <button class="hover:text-red-600 delete-transaction" data-id="${tx.id}">Delete</button>
        </div>
      </div>
    `;

    txEl.querySelector('.edit-transaction').addEventListener('click', (e) => {
      e.stopPropagation();
      editingTransactionId = tx.id;
      openTransactionModal('edit', tx);
    });
    txEl.querySelector('.delete-transaction').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTransaction(tx.id);
    });

    transactionsList.appendChild(txEl);
  });

  totalCreditsElem.textContent = `$${totalCredits.toFixed(2)}`;
  totalDebitsElem.textContent = `$${totalDebits.toFixed(2)}`;
  ledgerBalanceElem.textContent = `$${(totalCredits - totalDebits).toFixed(2)}`;
}

// LEDGER functions
function selectLedger(ledgerId) {
  selectedLedgerId = ledgerId;
  // highlight selected ledger UI
  const ledgerElements = document.querySelectorAll('#ledgers-list > div');
  ledgerElements.forEach(el => {
    const editBtn = el.querySelector('.edit-ledger');
    if (!editBtn) return;
    const id = editBtn.dataset.id;
    if (id === ledgerId) {
      el.classList.add('bg-indigo-50', 'border-indigo-200');
      selectedLedgerName.textContent = el.querySelector('h3').textContent;
    } else {
      el.classList.remove('bg-indigo-50', 'border-indigo-200');
    }
  });
  addTransactionBtn.disabled = false;
  loadTransactions(ledgerId);
}

function openLedgerModal(mode = 'add', ledgerId = null, ledgerName = '') {
  if (mode === 'add') {
    ledgerModalTitle.textContent = 'Add New Ledger';
    ledgerNameInput.value = '';
    confirmLedgerBtn.textContent = 'Add Ledger';
    editingLedgerId = null;
  } else {
    ledgerModalTitle.textContent = 'Edit Ledger';
    ledgerNameInput.value = ledgerName || '';
    confirmLedgerBtn.textContent = 'Update Ledger';
    editingLedgerId = ledgerId;
  }
  showModal(ledgerModal);
}

async function handleLedgerSubmit() {
  const name = ledgerNameInput.value.trim();
  if (!name) { showMessage('Error', 'Ledger name cannot be empty', 'error'); return; }

  try {
    showLoading();
    if (confirmLedgerBtn.textContent === 'Add Ledger') {
      const { data, error } = await supabase
        .from('ledgers')
        .insert([{ user_id: currentUser.id, name }])
        .select();
      if (error) throw error;
      await loadUserData();
      showMessage('Success', 'Ledger created successfully', 'success');
      if (data && data[0]) selectLedger(data[0].id);
    } else {
      // update existing ledger
      if (!editingLedgerId) { throw new Error('No ledger selected for update'); }
      const { error } = await supabase
        .from('ledgers')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', editingLedgerId);
      if (error) throw error;
      await loadUserData();
      showMessage('Success', 'Ledger updated successfully', 'success');
    }
    hideModal(ledgerModal);
  } catch (err) {
    console.error('Ledger error:', err);
    showMessage('Error', err.message || 'Failed to save ledger', 'error');
  } finally {
    hideLoading();
  }
}

async function deleteLedger(ledgerId) {
  if (!confirm('Are you sure you want to delete this ledger and all its transactions?')) return;
  try {
    showLoading();
    const { error: txError } = await supabase.from('transactions')

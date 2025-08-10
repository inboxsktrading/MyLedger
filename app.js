// Supabase Configuration
const SUPABASE_URL = 'https://vemubkmthzjjzpgbseox.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlbXVia210aHpqanpwZ2JzZW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDY4NjgsImV4cCI6MjA3MDM4Mjg2OH0.-EqAxZq0xbkgsZnUWvvuPjpPdmhj13KTqvAZgMVqEuQ';

// Initialize Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// DOM Elements
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

// Ledger Elements
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

// Modal Elements
const ledgerModal = document.getElementById('ledger-modal');
const ledgerNameInput = document.getElementById('ledger-name-input');
const cancelLedgerBtn = document.getElementById('cancel-ledger-btn');
const confirmLedgerBtn = document.getElementById('confirm-ledger-btn');

const transactionModal = document.getElementById('transaction-modal');
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

// App State
let currentUser = null;
let selectedLedgerId = null;
let isRegisterMode = false;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkSession();
});

// Event Listeners
function setupEventListeners() {
    // Auth Form
    authForm.addEventListener('submit', handleAuthSubmit);
    loginTab.addEventListener('click', () => switchAuthMode(false));
    registerTab.addEventListener('click', () => switchAuthMode(true));
    logoutBtn.addEventListener('click', logout);

    // Ledger Modals
    addLedgerBtn.addEventListener('click', openLedgerModal);
    cancelLedgerBtn.addEventListener('click', () => hideModal(ledgerModal));
    confirmLedgerBtn.addEventListener('click', handleLedgerSubmit);

    // Transaction Modals
    addTransactionBtn.addEventListener('click', openTransactionModal);
    cancelTransactionBtn.addEventListener('click', () => hideModal(transactionModal));
    confirmTransactionBtn.addEventListener('click', handleTransactionSubmit);
    suggestCategoryBtn.addEventListener('click', suggestCategory);

    // Message Modal
    closeMessageBtn.addEventListener('click', () => hideModal(messageModal));

    // Network status monitoring
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
}

// Auth Functions
async function checkSession() {
    showLoading();
    try {
        // First test the connection
        const connectionOk = await testSupabaseConnection();
        if (!connectionOk) return;
        
        // Then check session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            hideAuthModal();
            appContent.classList.remove('hidden');
            await loadUserData();
        } else {
            showAuthModal();
        }
    } catch (error) {
        console.error('Session error:', error);
        showAuthModal();
        showMessage('Error', 'Failed to check session. Please refresh the page.');
    } finally {
        hideLoading();
    }
}

async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('ledgers')
            .select('*')
            .limit(1);
        
        if (error) throw error;
        
        console.log('Supabase connection test successful');
        return true;
    } catch (error) {
        console.error('Supabase connection test failed:', error);
        showMessage('Connection Error', 'Failed to connect to database. Please check your internet connection and try again.');
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
    
    // Validation
    if (!email || !password) {
        showAuthError('Email and password are required');
        return;
    }
    
    if (isRegisterMode && password !== passwordConfirm) {
        showAuthError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
    }
    
    try {
        showAuthLoading();
        clearAuthErrors();
        
        if (isRegisterMode) {
            await registerUser(email, password);
        } else {
            await loginUser(email, password);
        }
    } catch (error) {
        console.error('Auth error:', error);
        showAuthError(error.message);
    } finally {
        hideAuthLoading();
    }
}

async function registerUser(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: 'https://inboxsktrading.github.io/MyLedger/'
        }
    });
    
    if (error) throw error;
    
    showMessage(
        'Registration Successful', 
        'Please check your email to confirm your account. You can now login.',
        'success'
    );
    
    switchAuthMode(false);
}

async function loginUser(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    
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
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('Logout Failed', error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Data Loading Functions
async function loadUserData() {
    try {
        showLoading();
        
        // Load ledgers
        const { data: ledgers, error } = await supabase
            .from('ledgers')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        
        renderLedgers(ledgers);
        
        // Select first ledger if available
        if (ledgers.length > 0) {
            selectLedger(ledgers[0].id);
        } else {
            renderTransactions([]);
        }
    } catch (error) {
        console.error('Data load error:', error);
        showMessage('Error', 'Failed to load data. Please try again.');
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
        
        renderTransactions(transactions);
    } catch (error) {
        console.error('Transactions load error:', error);
        showMessage('Error', 'Failed to load transactions.');
    }
}

// Rendering Functions
function renderLedgers(ledgers) {
    ledgersList.innerHTML = '';
    
    if (ledgers.length === 0) {
        noLedgersMessage.classList.remove('hidden');
        return;
    }
    
    noLedgersMessage.classList.add('hidden');
    
    ledgers.forEach(ledger => {
        const ledgerElement = document.createElement('div');
        ledgerElement.className = `p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${selectedLedgerId === ledger.id ? 'bg-indigo-50 border-indigo-200' : ''}`;
        ledgerElement.innerHTML = `
            <div class="flex justify-between items-center">
                <h3 class="font-medium">${ledger.name}</h3>
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
        
        ledgerElement.addEventListener('click', () => selectLedger(ledger.id));
        ledgerElement.querySelector('.edit-ledger').addEventListener('click', (e) => {
            e.stopPropagation();
            openLedgerModal('edit', ledger.id, ledger.name);
        });
        ledgerElement.querySelector('.delete-ledger').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteLedger(ledger.id);
        });
        
        ledgersList.appendChild(ledgerElement);
    });
}

function renderTransactions(transactions) {
    transactionsList.innerHTML = '';
    
    if (transactions.length === 0) {
        noTransactionsMessage.classList.remove('hidden');
        addTransactionBtn.disabled = true;
        return;
    }
    
    noTransactionsMessage.classList.add('hidden');
    addTransactionBtn.disabled = false;
    
    let totalCredits = 0;
    let totalDebits = 0;
    
    transactions.forEach(transaction => {
        totalCredits += transaction.credit || 0;
        totalDebits += transaction.debit || 0;
        
        const transactionElement = document.createElement('div');
        transactionElement.className = 'p-3 border rounded-md bg-white';
        transactionElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-medium">${transaction.description}</h4>
                    <p class="text-sm text-gray-500">${transaction.category || 'Uncategorized'}</p>
                </div>
                <div class="text-right">
                    ${transaction.debit ? `<p class="text-red-600">-$${transaction.debit.toFixed(2)}</p>` : ''}
                    ${transaction.credit ? `<p class="text-green-600">+$${transaction.credit.toFixed(2)}</p>` : ''}
                </div>
            </div>
            <div class="flex justify-between mt-2 text-xs text-gray-400">
                <span>${new Date(transaction.created_at).toLocaleString()}</span>
                <div class="flex space-x-2">
                    <button class="hover:text-indigo-600 edit-transaction" data-id="${transaction.id}">Edit</button>
                    <button class="hover:text-red-600 delete-transaction" data-id="${transaction.id}">Delete</button>
                </div>
            </div>
        `;
        
        transactionElement.querySelector('.edit-transaction').addEventListener('click', () => {
            openTransactionModal('edit', transaction);
        });
        
        transactionElement.querySelector('.delete-transaction').addEventListener('click', () => {
            deleteTransaction(transaction.id);
        });
        
        transactionsList.appendChild(transactionElement);
    });
    
    // Update summary
    totalCreditsElem.textContent = `$${totalCredits.toFixed(2)}`;
    totalDebitsElem.textContent = `$${totalDebits.toFixed(2)}`;
    ledgerBalanceElem.textContent = `$${(totalCredits - totalDebits).toFixed(2)}`;
}

// Ledger Functions
function selectLedger(ledgerId) {
    selectedLedgerId = ledgerId;
    const ledgerElements = document.querySelectorAll('#ledgers-list > div');
    ledgerElements.forEach(el => {
        if (el.querySelector('.edit-ledger').dataset.id === ledgerId) {
            el.classList.add('bg-indigo-50', 'border-indigo-200');
            selectedLedgerName.textContent = el.querySelector('h3').textContent;
        } else {
            el.classList.remove('bg-indigo-50', 'border-indigo-200');
        }
    });
    loadTransactions(ledgerId);
}

function openLedgerModal(mode = 'add', ledgerId = null, ledgerName = '') {
    if (mode === 'add') {
        ledgerModalTitle.textContent = 'Add New Ledger';
        ledgerNameInput.value = '';
        confirmLedgerBtn.textContent = 'Add Ledger';
    } else {
        ledgerModalTitle.textContent = 'Edit Ledger';
        ledgerNameInput.value = ledgerName;
        confirmLedgerBtn.textContent = 'Update Ledger';
    }
    
    showModal(ledgerModal);
}

async function handleLedgerSubmit() {
    const name = ledgerNameInput.value.trim();
    
    if (!name) {
        showMessage('Error', 'Ledger name cannot be empty', 'error');
        return;
    }
    
    try {
        showLoading();
        
        if (confirmLedgerBtn.textContent === 'Add Ledger') {
            const { data, error } = await supabase
                .from('ledgers')
                .insert([{
                    user_id: currentUser.id,
                    name: name
                }])
                .select();
            
            if (error) throw error;
            
            showMessage('Success', 'Ledger created successfully');
            await loadUserData();
            selectLedger(data[0].id);
        } else {
            const { error } = await supabase
                .from('ledgers')
                .update({ name })
                .eq('id', selectedLedgerId);
            
            if (error) throw error;
            
            showMessage('Success', 'Ledger updated successfully');
            await loadUserData();
        }
        
        hideModal(ledgerModal);
    } catch (error) {
        console.error('Ledger error:', error);
        showMessage('Error', 'Failed to save ledger. Please try again.');
    } finally {
        hideLoading();
    }
}

async function deleteLedger(ledgerId) {
    if (!confirm('Are you sure you want to delete this ledger and all its transactions?')) {
        return;
    }
    
    try {
        showLoading();
        
        // First delete all transactions
        const { error: txError } = await supabase
            .from('transactions')
            .delete()
            .eq('ledger_id', ledgerId);
        
        if (txError) throw txError;
        
        // Then delete the ledger
        const { error } = await supabase
            .from('ledgers')
            .delete()
            .eq('id', ledgerId);
        
        if (error) throw error;
        
        showMessage('Success', 'Ledger deleted successfully');
        await loadUserData();
        
        if (selectedLedgerId === ledgerId) {
            selectedLedgerId = null;
            renderTransactions([]);
        }
    } catch (error) {
        console.error('Delete error:', error);
        showMessage('Error', 'Failed to delete ledger. Please try again.');
    } finally {
        hideLoading();
    }
}

// Transaction Functions
function openTransactionModal(mode = 'add', transaction = null) {
    if (!selectedLedgerId) {
        showMessage('Error', 'Please select a ledger first', 'error');
        return;
    }
    
    if (mode === 'add') {
        transactionModalTitle.textContent = 'Add New Transaction';
        transactionDescriptionInput.value = '';
        transactionCategoryInput.value = '';
        transactionDebitInput.value = '';
        transactionCreditInput.value = '';
        confirmTransactionBtn.textContent = 'Add Transaction';
    } else {
        transactionModalTitle.textContent = 'Edit Transaction';
        transactionDescriptionInput.value = transaction.description || '';
        transactionCategoryInput.value = transaction.category || '';
        transactionDebitInput.value = transaction.debit || '';
        transactionCreditInput.value = transaction.credit || '';
        confirmTransactionBtn.textContent = 'Update Transaction';
    }
    
    showModal(transactionModal);
}

async function handleTransactionSubmit() {
    const description = transactionDescriptionInput.value.trim();
    const category = transactionCategoryInput.value.trim();
    const debit = parseFloat(transactionDebitInput.value) || 0;
    const credit = parseFloat(transactionCreditInput.value) || 0;
    
    if (!description) {
        showMessage('Error', 'Description cannot be empty', 'error');
        return;
    }
    
    if (debit === 0 && credit === 0) {
        showMessage('Error', 'Please enter either a debit or credit amount', 'error');
        return;
    }
    
    try {
        showLoading();
        
        if (confirmTransactionBtn.textContent === 'Add Transaction') {
            const { error } = await supabase
                .from('transactions')
                .insert([{
                    ledger_id: selectedLedgerId,
                    description,
                    category,
                    debit,
                    credit
                }]);
            
            if (error) throw error;
            
            showMessage('Success', 'Transaction added successfully');
        } else {
            const { error } = await supabase
                .from('transactions')
                .update({
                    description,
                    category,
                    debit,
                    credit,
                    updated_at: new Date().toISOString()
                })
                .eq('id', transactionId);
            
            if (error) throw error;
            
            showMessage('Success', 'Transaction updated successfully');
        }
        
        hideModal(transactionModal);
        await loadTransactions(selectedLedgerId);
    } catch (error) {
        console.error('Transaction error:', error);
        showMessage('Error', 'Failed to save transaction. Please try again.');
    } finally {
        hideLoading();
    }
}

async function deleteTransaction(transactionId) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }
    
    try {
        showLoading();
        
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', transactionId);
        
        if (error) throw error;
        
        showMessage('Success', 'Transaction deleted successfully');
        await loadTransactions(selectedLedgerId);
    } catch (error) {
        console.error('Delete error:', error);
        showMessage('Error', 'Failed to delete transaction. Please try again.');
    } finally {
        hideLoading();
    }
}

async function suggestCategory() {
    const description = transactionDescriptionInput.value.trim();
    
    if (!description) {
        showMessage('Error', 'Please enter a description first', 'error');
        return;
    }
    
    try {
        showLoading();
        // Simple category suggestion logic
        const suggestions = {
            'food': ['restaurant', 'groceries', 'takeout', 'dinner', 'lunch'],
            'transport': ['gas', 'uber', 'taxi', 'bus', 'train', 'metro'],
            'bills': ['electricity', 'water', 'internet', 'phone', 'rent'],
            'shopping': ['clothes', 'electronics', 'grocery', 'store'],
            'entertainment': ['movie', 'concert', 'game', 'netflix']
        };
        
        let suggestedCategory = 'Other';
        const descLower = description.toLowerCase();
        
        for (const [category, keywords] of Object.entries(suggestions)) {
            if (keywords.some(keyword => descLower.includes(keyword))) {
                suggestedCategory = category;
                break;
            }
        }
        
        transactionCategoryInput.value = suggestedCategory.charAt(0).toUpperCase() + suggestedCategory.slice(1);
    } catch (error) {
        console.error('Suggestion error:', error);
        showMessage('Error', 'Failed to suggest category. Please try again.');
    } finally {
        hideLoading();
    }
}

// UI Helper Functions
function showModal(modal) {
    modal.classList.remove('hidden');
}

function hideModal(modal) {
    modal.classList.add('hidden');
}

function showMessage(title, message, type = 'error') {
    messageModalTitle.textContent = title;
    messageModalContent.textContent = message;
    messageModalContent.className = `mb-4 ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
    showModal(messageModal);
}

function showAuthModal() {
    authModal.classList.remove('hidden');
    clearAuthForm();
    clearAuthErrors();
}

function hideAuthModal() {
    authModal.classList.add('hidden');
}

function showAuthLoading() {
    authSubmitBtn.disabled = true;
    authSpinner.classList.remove('hidden');
    authBtnText.textContent = isRegisterMode ? 'Registering...' : 'Logging in...';
}

function hideAuthLoading() {
    authSubmitBtn.disabled = false;
    authSpinner.classList.add('hidden');
    authBtnText.textContent = isRegisterMode ? 'Register' : 'Login';
}

function showAuthError(message) {
    authStatusMessage.textContent = message;
    authStatusMessage.classList.remove('hidden');
}

function clearAuthErrors() {
    authStatusMessage.textContent = '';
    authStatusMessage.classList.add('hidden');
}

function clearAuthForm() {
    authForm.reset();
}

function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function handleNetworkChange() {
    if (!navigator.onLine) {
        showMessage('Offline', 'You are currently offline. Some features may not work.', 'warning');
    }
}

// Debugging
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
});

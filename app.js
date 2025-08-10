// After successful registration
async function registerUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        
        if (error) throw error;
        
        // The trigger will automatically create the profile
        // No need to manually insert into profiles table
        
        showMessage(
            'Registration Successful', 
            'Please check your email to confirm your account. You can now login.',
            'success'
        );
        
        switchAuthMode(false);
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// When loading user data
async function loadUserData() {
    try {
        showLoading();
        
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('No user found');
        
        // Fetch user's ledgers
        const { data: ledgers, error: ledgersError } = await supabase
            .from('ledgers')
            .select('*')
            .eq('user_id', user.id);
        
        if (ledgersError) throw ledgersError;
        
        // Process and display the ledgers
        // ... rest of your ledger handling code
        
    } catch (error) {
        console.error('Data load error:', error);
        showMessage('Error', error.message, 'error');
    } finally {
        hideLoading();
    }
}
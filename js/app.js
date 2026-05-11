/**
 * Main Application Module
 * Orchestrates all modules and handles app initialization
 */

class TradingJournal {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      ui.showLoading();

      // 1. Initialize Auth
      const authInitialized = await auth.initialize();
      if (!authInitialized) {
        throw new Error('Authentication initialization failed');
      }

      // 2. Set Supabase client for trades module
      trades.setSuabase(auth.supabase);

      // 3. Check if user is already logged in
      const isLoggedIn = await auth.restoreSession();

      if (isLoggedIn && auth.isAuthenticated()) {
        // Load trades and show main app
        await this.initializeMainApp();
      } else {
        // Show login screen
        ui.showLoginScreen();
        this.setupAuthListeners();
      }

      ui.hideLoading();
      this.isInitialized = true;
    } catch (error) {
      console.error('App initialization failed:', error);
      ui.hideLoading();
      ui.showMessage('Failed to initialize app', 'error');
    }
  }

  /**
   * Initialize main application
   */
  async initializeMainApp() {
    try {
      ui.showMainApp();

      // Load trades for current user
      const userId = auth.getCurrentUser().id;
      const loadResult = await trades.loadTrades(userId);

      if (loadResult.success) {
        this.updateDashboard();
        this.setupEventListeners();
      } else {
        ui.showToast('Failed to load trades', 'error');
      }
    } catch (error) {
      console.error('Main app initialization failed:', error);
      ui.showToast('Failed to initialize main app', 'error');
    }
  }

  /**
   * Setup authentication event listeners
   */
  setupAuthListeners() {
    // Login form submission
    ui.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

    // Magic link button
    ui.elements.magicLinkBtn.addEventListener('click', () => this.handleMagicLink());

    // Toggle signup/login
    ui.elements.toggleSignup.addEventListener('click', () => this.toggleAuthMode());

    // Listen for auth state changes
    auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        this.initializeMainApp();
      } else if (event === 'SIGNED_OUT') {
        ui.showLoginScreen();
      }
    });
  }

  /**
   * Setup main app event listeners
   */
  setupEventListeners() {
    // Trade form submission
    ui.elements.tradeForm.addEventListener('submit', (e) => this.handleAddTrade(e));

    // Logout button
    ui.elements.logoutBtn.addEventListener('click', () => this.handleLogout());

    // Set default trade date
    ui.setDefaultTradeDate();

    // Populate pair autocomplete
    this.setupPairAutocomplete();
  }

  /**
   * Handle login
   */
  async handleLogin(e) {
    e.preventDefault();

    const email = ui.elements.loginEmail.value.trim();
    const password = ui.elements.loginPassword.value;

    // Validate inputs
    if (!Auth.isValidEmail(email)) {
      ui.showMessage(CONFIG.ERRORS.INVALID_EMAIL, 'error');
      return;
    }

    if (!Auth.isValidPassword(password)) {
      ui.showMessage(CONFIG.ERRORS.INVALID_PASSWORD, 'error');
      return;
    }

    ui.setLoginButtonState(true);

    const result = await auth.loginWithEmail(email, password);

    if (result.success) {
      ui.showMessage(CONFIG.SUCCESS.LOGIN_SUCCESS, 'success');
      auth.saveSession(await auth.getToken());
      this.initializeMainApp();
    } else {
      ui.showMessage(result.error, 'error');
    }

    ui.setLoginButtonState(false);
  }

  /**
   * Handle magic link
   */
  async handleMagicLink() {
    const email = ui.elements.loginEmail.value.trim();

    if (!Auth.isValidEmail(email)) {
      ui.showMessage(CONFIG.ERRORS.INVALID_EMAIL, 'error');
      return;
    }

    ui.setMagicLinkButtonState(true);

    const result = await auth.sendMagicLink(email);

    if (result.success) {
      ui.showMessage(result.message, 'success');
    } else {
      ui.showMessage(result.error, 'error');
    }

    ui.setMagicLinkButtonState(false);
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    const result = await auth.logout();

    if (result.success) {
      ui.showLoginScreen();
      ui.clearForm();
      ui.showToast(CONFIG.SUCCESS.LOGOUT_SUCCESS, 'success');
    } else {
      ui.showToast(result.error, 'error');
    }
  }

  /**
   * Handle add trade
   */
  async handleAddTrade(e) {
    e.preventDefault();

    const formData = ui.getFormData();
    const userId = auth.getCurrentUser().id;

    ui.disableForm(true);

    const result = await trades.addTrade(formData, userId);

    if (result.success) {
      ui.clearForm();
      ui.setDefaultTradeDate();
      this.updateDashboard();
      ui.showToast(result.message, 'success');
    } else {
      ui.showToast(result.error, 'error');
    }

    ui.disableForm(false);
  }

  /**
   * Update dashboard
   */
  updateDashboard() {
    const stats = trades.getStats();
    ui.updateStats(stats);
    ui.renderTrades(trades.trades);
  }

  /**
   * Setup pair autocomplete
   */
  setupPairAutocomplete() {
    const pairInput = ui.elements.pair;
    
    pairInput.addEventListener('input', (e) => {
      const value = e.target.value.toUpperCase();
      const matches = CONFIG.PAIRS.filter(pair => 
        pair.startsWith(value) && value.length > 0
      );

      // Simple autocomplete (could be enhanced with datalist)
      if (matches.length > 0) {
        pairInput.value = matches[0];
      }
    });
  }

  /**
   * Toggle auth mode (signup/login)
   */
  toggleAuthMode() {
    // This would toggle between login and signup forms
    // Implementation depends on your UI structure
    console.log('Toggle auth mode');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new TradingJournal();
  await app.initialize();
});

// Global functions for inline onclick handlers
async function editTrade(tradeId) {
  console.log('Edit trade:', tradeId);
  // Implementation for edit trade
}

async function deleteTrade(tradeId) {
  if (confirm('Are you sure you want to delete this trade?')) {
    const userId = auth.getCurrentUser().id;
    const result = await trades.deleteTrade(tradeId, userId);
    
    if (result.success) {
      ui.showToast(result.message, 'success');
      // Update dashboard
      const stats = trades.getStats();
      ui.updateStats(stats);
      ui.renderTrades(trades.trades);
    } else {
      ui.showToast(result.error, 'error');
    }
  }
}

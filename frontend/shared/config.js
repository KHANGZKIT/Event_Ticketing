// API Configuration
// Automatically detect environment and use correct API URL
const API_CONFIG = {
    // Production Gateway URL
    PRODUCTION_URL: 'https://gateway-production-6a61.up.railway.app',

    // Local development URL
    LOCAL_URL: 'http://localhost:4000',

    // Set to true to always use production API (for testing production from localhost)
    FORCE_PRODUCTION: true,

    // Detect environment
    get BASE_URL() {
        // Force production mode
        if (this.FORCE_PRODUCTION) {
            return this.PRODUCTION_URL;
        }
        // If running on localhost, use local API
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return this.LOCAL_URL;
        }
        // Otherwise use production API
        return this.PRODUCTION_URL;
    },

    get API_URL() {
        return this.BASE_URL + '/api';
    },

    get SOCKET_URL() {
        return this.BASE_URL;
    }
};

// Export for use in other scripts
window.API_CONFIG = API_CONFIG;

// Backwards compatibility
const API_BASE = API_CONFIG.API_URL;

// PromptGrammerly Configuration

const PRODUCTION_URL = 'https://prompter-production-76a3.up.railway.app';
const DEV_URL = 'http://localhost:8000';

function isProduction() {
    try {
        // Unpacked extensions (development) don't have an update_url
        return !!chrome.runtime.getManifest().update_url;
    } catch {
        return true;
    }
}

window.CONFIG = {
    API_BASE_URL: PRODUCTION_URL,
    DEV_API_BASE_URL: DEV_URL,
    getApiUrl: () => isProduction() ? PRODUCTION_URL : DEV_URL,
    isProduction
};

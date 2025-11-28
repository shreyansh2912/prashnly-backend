(function (window) {
    class Prashnly {
        constructor() {
            this.apiKey = null;
            this.baseUrl = 'http://localhost:3000'; // Frontend URL
            this.apiUrl = 'http://localhost:5000';   // Backend URL
        }

        init(config) {
            if (!config.apiKey) {
                console.error('Prashnly: API Key is required');
                return;
            }
            this.apiKey = config.apiKey;
            this.baseUrl = config.baseUrl || this.baseUrl;
        }

        render(containerId) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`Prashnly: Container #${containerId} not found`);
                return;
            }

            // Create Iframe
            const iframe = document.createElement('iframe');
            // We will point this to a special embed page on the frontend
            // passing the API key to identify the bot owner
            iframe.src = `${this.baseUrl}/embed?apiKey=${this.apiKey}`;
            iframe.style.width = '100%';
            iframe.style.height = '600px';
            iframe.style.border = 'none';
            iframe.style.borderRadius = '10px';
            iframe.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';

            container.appendChild(iframe);
        }
    }

    window.Prashnly = new Prashnly();
})(window);

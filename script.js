/**
 * UK Merchant Capital - Analytics & Site Scripts
 * Rebranded from Dojo Funding
 *
 * This script initializes privacy-friendly analytics
 * and handles SPA-like page view tracking.
 */

(function() {
    'use strict';

    // --- Configuration ---
    var CONFIG = {
        domain: 'ukmerchantcapital.co.uk', // Update with your actual domain
        apiEndpoint: window.location.origin + '/api/event',
        enableAnalytics: true
    };

    var location = window.location;
    var document = window.document;
    var currentScript = document.currentScript;
    var apiEndpoint = currentScript.getAttribute("data-api") || CONFIG.apiEndpoint;

    // --- Utility: Warning / Callback ---
    function warn(message, options) {
        if (message) {
            console.warn("[UKMC Analytics] Ignoring Event: " + message);
        }
        if (options && options.callback) {
            options.callback();
        }
    }

    // --- Core Tracking Function ---
    function track(eventName, options) {
        // Skip tracking for local development
        if (/^localhost$|^127(\.[0-9]+){0,2}\.[0-9]+$|^\[::1?\]$/.test(location.hostname) || "file:" === location.protocol) {
            return warn("localhost", options);
        }

        // Skip tracking for automated tools / bots
        if ((window._phantom || window.__nightmare || window.navigator.webdriver || window.Cypress) && !window.__plausible) {
            return warn(null, options);
        }

        // Skip tracking if user has opted out
        try {
            if ("true" === window.localStorage.plausible_ignore) {
                return warn("localStorage flag", options);
            }
        } catch (e) {
            // localStorage may be unavailable in private browsing
        }

        // Build payload
        var payload = {
            n: eventName,                          // Event name
            u: location.href,                      // Current URL
            d: currentScript.getAttribute("data-domain") || CONFIG.domain,
            r: document.referrer || null,          // Referrer
            m: options && options.meta ? JSON.stringify(options.meta) : undefined,
            p: options && options.props ? options.props : undefined
        };

        // Send via XMLHttpRequest
        var xhr = new XMLHttpRequest();
        xhr.open("POST", apiEndpoint, true);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.send(JSON.stringify(payload));

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && options && options.callback) {
                options.callback({ status: xhr.status });
            }
        };
    }

    // --- Initialize Plausible-style Queue ---
    var queue = (window.plausible && window.plausible.q) || [];
    window.plausible = track;

    // Process any queued events
    for (var i = 0; i < queue.length; i++) {
        track.apply(this, queue[i]);
    }

    // --- SPA Page View Tracking ---
    var lastPath = null;

    function pageview() {
        if (lastPath !== location.pathname) {
            lastPath = location.pathname;
            track("pageview");
        }
    }

    // Hook into History API for SPA navigation
    var history = window.history;
    if (history.pushState) {
        var originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            pageview();
        };
        window.addEventListener("popstate", pageview);
    }

    // Initial pageview (handle prerender state)
    if (document.visibilityState === "prerender") {
        document.addEventListener("visibilitychange", function() {
            if (!lastPath && document.visibilityState === "visible") {
                pageview();
            }
        });
    } else {
        pageview();
    }

    // --- Expose Public API ---
    window.UKMCAnalytics = {
        track: track,
        config: CONFIG
    };

})();
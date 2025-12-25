/**
 * Simple in-memory cache with TTL (Time To Live) support
 * for caching performance data to improve function execution time
 */

class PerformanceCache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }

    /**
     * Set a value in cache with TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttlMs - Time to live in milliseconds (default: 5 minutes)
     */
    set(key, value, ttlMs = 5 * 60 * 1000) {
        // Clear existing timer if any
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Set the value
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });

        // Set expiration timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttlMs);

        this.timers.set(key, timer);
    }

    /**
     * Get a value from cache
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found/expired
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            return null;
        }
        return item.value;
    }

    /**
     * Check if a key exists in cache
     * @param {string} key - Cache key
     * @returns {boolean} True if key exists and not expired
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Delete a key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        // Clear timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
        // Remove from cache
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        // Clear all timers
        this.timers.forEach((timer) => clearTimeout(timer));
        this.timers.clear();
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {object} Cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }

    /**
     * Generate a cache key for CRE performance
     * @param {string} creId - CRE ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {string} Cache key
     */
    static generateCREPerformanceKey(creId, startDate, endDate) {
        const start = startDate.getTime();
        const end = endDate.getTime();
        return `cre_performance_${creId}_${start}_${end}`;
    }

    /**
     * Generate a cache key for performance-based CRE selection
     * @param {number} position - Position parameter
     * @param {number} performanceRangeDays - Performance range in days
     * @returns {string} Cache key
     */
    static generatePerformanceBasedCREKey(position, performanceRangeDays) {
        const today = new Date().toDateString(); // Use date string for daily cache
        return `performance_based_cre_${position}_${performanceRangeDays}_${today}`;
    }
}

// Create a singleton instance
const performanceCache = new PerformanceCache();

module.exports = performanceCache;

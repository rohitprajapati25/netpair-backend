/**
 * cluster.ts — Node.js Cluster Load Balancer
 *
 * Uses Node's built-in cluster module to fork one worker per CPU core.
 * The master process distributes incoming connections across all workers
 * using round-robin (default on Linux/Mac) or OS-level balancing (Windows).
 *
 * Socket.io sticky sessions are handled via the 'sticky-session' approach:
 * each worker shares the same Redis adapter so events broadcast correctly.
 */
export {};
//# sourceMappingURL=cluster.d.ts.map
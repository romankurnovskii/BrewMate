/**
 * Utility functions for PATH environment variable management
 * Specifically handles brew installation paths on macOS
 */

/**
 * Gets environment variables with brew installation paths added to PATH
 * Common brew installation locations on macOS:
 * - /opt/homebrew/bin (Apple Silicon/M1/M2)
 * - /usr/local/bin (Intel Mac)
 * - /opt/homebrew/sbin (Apple Silicon sbin)
 * - /usr/local/sbin (Intel Mac sbin)
 * - /home/linuxbrew/.linuxbrew/bin (Linux)
 *
 * @returns Process environment with brew paths prepended to PATH
 */
export function getEnvWithBrewPath(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const currentPath = env.PATH || '';

  // Common brew installation locations on macOS
  const brewPaths = [
    '/opt/homebrew/bin', // Apple Silicon (M1/M2)
    '/usr/local/bin', // Intel Mac
    '/opt/homebrew/sbin', // Apple Silicon sbin
    '/usr/local/sbin', // Intel Mac sbin
    '/home/linuxbrew/.linuxbrew/bin', // Linux (if applicable)
  ];

  // Add brew paths to PATH if they're not already there
  // Iterate in reverse to maintain priority order (first in array should be first in PATH)
  const pathArray = currentPath.split(':');
  const newPathArray = [...pathArray];

  for (let i = brewPaths.length - 1; i >= 0; i--) {
    const brewPath = brewPaths[i];
    if (!newPathArray.includes(brewPath)) {
      newPathArray.unshift(brewPath); // Add to beginning
    }
  }

  env.PATH = newPathArray.join(':');
  return env;
}

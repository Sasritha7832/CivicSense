
const { createRedisClient } = require('../config/redis');

let isCompatible = null;

const checkRedisVersion = async () => {
  if (isCompatible !== null) return isCompatible;
  
  const client = createRedisClient();
  try {
    const info = await client.info('server');
    const versionMatch = info.match(/redis_version:([0-9.]+)/);
    if (versionMatch) {
      const version = versionMatch[1];
      const major = parseInt(version.split('.')[0]);
      isCompatible = major >= 5;
      console.log(`[Redis] Version ${version} detected. Compatible with BullMQ: ${isCompatible}`);
    } else {
      isCompatible = false;
    }
  } catch (err) {
    console.warn('[Redis] Could not check version, assuming incompatible:', err.message);
    isCompatible = false;
  }
  return isCompatible;
};

module.exports = { checkRedisVersion };

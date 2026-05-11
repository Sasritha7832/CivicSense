const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO } = require('../config/socket');

const BADGE_TIERS = [
  { name: 'Civic Starter', points: 50, icon: '🥉' },
  { name: 'Active Citizen', points: 150, icon: '🥈' },
  { name: 'Community Leader', points: 500, icon: '🥇' },
  { name: 'Local Hero', points: 1000, icon: '🦸' }
];

const checkAndAwardBadges = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    let awarded = false;
    let newestBadge = null;

    for (const tier of BADGE_TIERS) {
      if (user.points >= tier.points && !user.badges.includes(tier.name)) {
        user.badges.push(tier.name);
        awarded = true;
        newestBadge = tier;
      }
    }

    if (awarded) {
      await user.save();
      
      // Notify User
      await Notification.create({
        userId: user._id,
        type: 'badge_earned',
        message: `Congratulations! You've earned the ${newestBadge.icon} ${newestBadge.name} badge!`
      });

      const io = getIO();
      if (io) {
        io.to(`user:${user._id}`).emit('notification:push', {
          title: 'New Badge Unlocked!',
          message: `You earned ${newestBadge.name}!`,
        });
        // Also tell them to refresh their profile
        io.to(`user:${user._id}`).emit('user:updated');
      }
    }
  } catch (err) {
    console.error('Error awarding badges:', err);
  }
};

module.exports = { checkAndAwardBadges };

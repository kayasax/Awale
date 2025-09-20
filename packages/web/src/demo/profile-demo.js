/**
 * Profile System Demo and Testing
 * Run this in browser console to test the profile system functionality
 */

// Import the ProfileService (this assumes it's available globally or can be imported)
// In a real browser, you'd need to access it through the window object or module system

console.log('🎮 Profile System Demo Starting...\n');

// Test 1: Get or create initial profile
console.log('1️⃣ Testing profile creation/retrieval:');
try {
  const profile = ProfileService.getProfile();
  console.log('Initial profile:', profile);
  console.log(`Player ID: ${profile.id}`);
  console.log(`Player Name: ${profile.name}`);
  console.log(`Games Played: ${profile.stats.gamesPlayed}`);
  console.log(`Win Rate: ${profile.stats.winRate}%`);
} catch (error) {
  console.error('Profile creation failed:', error);
}

// Test 2: Update player name
console.log('\n2️⃣ Testing name update:');
try {
  const updatedProfile = ProfileService.updateName('TestPlayer');
  console.log('Updated name:', updatedProfile.name);
} catch (error) {
  console.error('Name update failed:', error);
}

// Test 3: Update avatar
console.log('\n3️⃣ Testing avatar update:');
try {
  const profileWithAvatar = ProfileService.updateAvatar('🏆');
  console.log('Updated avatar:', profileWithAvatar.avatar);
} catch (error) {
  console.error('Avatar update failed:', error);
}

// Test 4: Record game results
console.log('\n4️⃣ Testing game result recording:');
try {
  // Simulate a few game results
  const gameResults = [
    { won: true, seedsCaptured: 28, gameDuration: 120, opponent: 'AI', timestamp: Date.now() - 100000 },
    { won: false, seedsCaptured: 20, gameDuration: 90, opponent: 'AI', timestamp: Date.now() - 50000 },
    { won: true, seedsCaptured: 35, gameDuration: 180, opponent: 'Human', timestamp: Date.now() }
  ];
  
  gameResults.forEach((result, index) => {
    const profile = ProfileService.recordGameResult(result);
    console.log(`Game ${index + 1} recorded:`, {
      won: result.won,
      seeds: result.seedsCaptured,
      duration: `${result.gameDuration}s`,
      newStats: {
        played: profile.stats.gamesPlayed,
        won: profile.stats.gamesWon,
        winRate: `${Math.round(profile.stats.winRate)}%`,
        totalSeeds: profile.stats.totalSeeds,
        avgTime: `${Math.round(profile.stats.averageGameTime)}s`
      }
    });
  });
} catch (error) {
  console.error('Game result recording failed:', error);
}

// Test 5: Update preferences
console.log('\n5️⃣ Testing preferences update:');
try {
  const profileWithPrefs = ProfileService.updatePreferences({
    theme: 'wood',
    soundEnabled: false,
    animationsEnabled: true
  });
  console.log('Updated preferences:', profileWithPrefs.preferences);
} catch (error) {
  console.error('Preferences update failed:', error);
}

// Test 6: Export/Import functionality
console.log('\n6️⃣ Testing export/import:');
try {
  const exportedData = ProfileService.exportProfile();
  console.log('Exported profile length:', exportedData.length, 'characters');
  
  // Test import (this would normally be from external data)
  const importedProfile = ProfileService.importProfile(exportedData);
  console.log('Imported profile ID:', importedProfile.id);
  console.log('Import successful!');
} catch (error) {
  console.error('Export/import failed:', error);
}

// Test 7: Avatar options
console.log('\n7️⃣ Available avatars:');
console.log('Avatar options:', AVATAR_OPTIONS.join(' '));

// Test 8: Utility functions
console.log('\n8️⃣ Testing utility functions:');
try {
  console.log('Format 65 seconds:', formatGameTime(65));
  console.log('Format 125 seconds:', formatGameTime(125));
  console.log('Format 75% win rate:', formatWinRate(75.6));
} catch (error) {
  console.error('Utility functions failed:', error);
}

// Final state check
console.log('\n✅ Final Profile State:');
try {
  const finalProfile = ProfileService.getProfile();
  console.log('Final profile summary:', {
    name: finalProfile.name,
    avatar: finalProfile.avatar,
    gamesPlayed: finalProfile.stats.gamesPlayed,
    gamesWon: finalProfile.stats.gamesWon,
    winRate: `${Math.round(finalProfile.stats.winRate)}%`,
    totalSeeds: finalProfile.stats.totalSeeds,
    averageGameTime: `${Math.round(finalProfile.stats.averageGameTime)}s`,
    theme: finalProfile.preferences.theme,
    sounds: finalProfile.preferences.soundEnabled ? 'ON' : 'OFF',
    animations: finalProfile.preferences.animationsEnabled ? 'ON' : 'OFF'
  });
} catch (error) {
  console.error('Final state check failed:', error);
}

console.log('\n🎯 Profile System Demo Complete!');

// Optional: Reset for clean testing
// console.log('\n🧹 Resetting profile for clean testing...');
// ProfileService.resetProfile();
import React, { useState } from 'react';
import { ProfileService, PlayerProfile } from '../services/profile';
import { ProfileSetup, MiniProfile } from './ProfileSetup';

interface ProfileBarProps {
  className?: string;
}

/**
 * Profile Bar Component
 * Shows mini profile and allows editing in the top of the application
 */
export const ProfileBar: React.FC<ProfileBarProps> = ({ className = '' }) => {
  const [profile, setProfile] = useState<PlayerProfile>(ProfileService.getProfile());
  const [showSetup, setShowSetup] = useState(false);

  const handleProfileUpdate = (updatedProfile: PlayerProfile) => {
    setProfile(updatedProfile);
    setShowSetup(false);
  };

  const handleProfileClick = () => {
    setShowSetup(true);
  };

  return (
    <div className={`profile-bar ${className}`}>
      <MiniProfile 
        profile={profile}
        onClick={handleProfileClick}
        className="profile-bar-mini"
      />
      
      {showSetup && (
        <ProfileSetup
          existingProfile={profile}
          onComplete={handleProfileUpdate}
          onCancel={() => setShowSetup(false)}
          isModal={true}
        />
      )}
    </div>
  );
};
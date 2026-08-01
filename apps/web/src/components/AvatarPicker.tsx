import React from 'react';
import { DOG_AVATARS } from '@segue/shared';
import type { DogBreedAvatar } from '@segue/shared';
import { playClickSound } from '../services/sound';

interface AvatarPickerProps {
  selectedAvatarId: string;
  onSelectAvatar: (avatar: DogBreedAvatar) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ selectedAvatarId, onSelectAvatar }) => {
  return (
    <div className="space-y-3">
      <label className="block text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">
        Escolha seu Avatar Canino (Raça da Matilha)
      </label>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
        {DOG_AVATARS.map((avatar) => {
          const isSelected = avatar.id === selectedAvatarId;
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => {
                playClickSound();
                onSelectAvatar(avatar);
              }}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-2 border-[#DDA15E] bg-[#11161D] shadow-lg scale-105'
                  : 'border border-[#2D3139] bg-[#0A0E14] opacity-75 hover:opacity-100 hover:border-[#606C38]'
              }`}
            >
              <div className="w-11 h-11 rounded-full bg-[#05070A] border border-[#2D3139] flex items-center justify-center text-2xl shadow-inner mb-1">
                {avatar.emoji}
              </div>
              <span className="text-[10px] font-bold text-[#FEFAE0] truncate w-full text-center">
                {avatar.breed}
              </span>

              {isSelected && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#DDA15E] rounded-full border-2 border-[#05070A] flex items-center justify-center text-[10px] text-[#05070A] font-black">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// src/pages/principalregistry/RegistryComingSoon.tsx
// ============================================================
// Temporary placeholder used by registry routes that don't have a real
// page built yet. Swap each usage out for the real component as it's
// built — search this repo for "RegistryComingSoon" to find every spot
// still pending.

import React from 'react';

interface RegistryComingSoonProps {
  title: string;
}

const RegistryComingSoon: React.FC<RegistryComingSoonProps> = ({ title }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
    <p className="mt-2 text-sm text-gray-500">This page is under construction.</p>
  </div>
);

export default RegistryComingSoon;
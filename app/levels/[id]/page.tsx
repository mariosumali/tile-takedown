'use client';

import { use } from 'react';
import LevelGame from '@/components/game/LevelGame';

export default function LevelPlay({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <LevelGame levelId={id} />;
}

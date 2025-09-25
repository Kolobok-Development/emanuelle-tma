'use client';

import { Title, Text, Card, Button } from '@telegram-apps/telegram-ui';
import { Page } from '@/components/Page';
import { CardChip } from '@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardChip/CardChip';
import { CardCell } from '@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardCell/CardCell';
import React from 'react';

export default function Shop() {
  const shopItems = [
    {
      id: "1",
      name: "Premium Pack",
      description: "Get 100 diamonds + 50 energy",
      price: "99₽",
      image: "https://storage.yandexcloud.net/pet-projects/openart-image_UwtF7xYJ_1754242349353_raw.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJE8gKjOxKaPpaO_RXn7kub%2F20250921%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20250921T161358Z&X-Amz-Expires=2592000&X-Amz-Signature=6b915a0f26ab49526da464bf8ba6ed2689e2453e147b8957aa60828a9a125cc7&X-Amz-SignedHeaders=host",
      category: "premium",
    },
    {
      id: "2",
      name: "Energy Boost",
      description: "Instant +20 energy",
      price: "49₽",
      image: "https://storage.yandexcloud.net/pet-projects/openart-make-her-wear-a-black-off-shoulder-cocktail-dress-leaning-on-a-velvet-bar-.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJE8gKjOxKaPpaO_RXn7kub%2F20250921%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20250921T161423Z&X-Amz-Expires=2592000&X-Amz-Signature=0141aef2061262fb0045e80f36d0c6d4fb5ac91f4fa1246c7dcdecabc154aadb&X-Amz-SignedHeaders=host",
      category: "energy",
    },
    {
      id: "3",
      name: "Diamond Pack",
      description: "50 diamonds for purchases",
      price: "199₽",
      image: "https://storage.yandexcloud.net/pet-projects/openart-make-her-wear-a-white-thong-bikini-standing-with-back-to-camera-looking-ov.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJE8gKjOxKaPpaO_RXn7kub%2F20250921%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20250921T161501Z&X-Amz-Expires=2592000&X-Amz-Signature=4ee09db8641ac65456a3dec4b80e455f22b0a974caffb7683b0c1170e0fc0f84&X-Amz-SignedHeaders=host",
      category: "diamonds",
    },
    {
      id: "4",
      name: "VIP Access",
      description: "Unlock premium features",
      price: "299₽",
      image: "https://storage.yandexcloud.net/pet-projects/openart-8bit-style-ai-character-with-retro-aesthetics.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJE8gKjOxKaPpaO_RXn7kub%2F20250921%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20250921T161501Z&X-Amz-Expires=2592000&X-Amz-Signature=4ee09db8641ac65456a3dec4b80e455f22b0a974caffb7683b0c1170e0fc0f84&X-Amz-SignedHeaders=host",
      category: "vip",
    },
  ];

  return (
      <div className="min-h-screen cosmic-background">
      
      </div>
  );
}

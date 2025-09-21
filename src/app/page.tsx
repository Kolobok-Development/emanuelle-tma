'use client';

import { Section, Cell, Image, List, Text, Title, Spinner, Subheadline, Button, Header, Badge, Card } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Link } from '@/components/Link/Link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher/LocaleSwitcher';
import { Page } from '@/components/Page';

import tonSvg from './_assets/ton.svg';
import { useAppContext } from '@/context/AppContext';
import React from 'react';
import { CardChip } from '@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardChip/CardChip';
import { CardCell } from '@telegram-apps/telegram-ui/dist/components/Blocks/Card/components/CardCell/CardCell';

export default function Home() {
  const t = useTranslations('i18n');
  const { user, isAuthenticated } = useAppContext();



  const [selectedCategory, setSelectedCategory] = useState<"girls" | "guys">("girls");

  const aiFriends = [
    {
      id: "1",
      name: "Анна",
      personality: "Соблазнительная мачеха",
      avatar: "https://storage.yandexcloud.net/pet-projects/openart-image_UwtF7xYJ_1754242349353_raw.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJE8gKjOxKaPpaO_RXn7kub%2F20250921%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20250921T161358Z&X-Amz-Expires=2592000&X-Amz-Signature=6b915a0f26ab49526da464bf8ba6ed2689e2453e147b8957aa60828a9a125cc7&X-Amz-SignedHeaders=host",
      status: "online",
      specialty: "Флирт и романтика",
      mood: "Игривая 💋",
      lastMessage: "Привет, красавчик...",
      unreadCount: 3,
      category: "girls",
    },
    {
      id: "2",
      name: "Майя",
      personality: "Игривая сводная сестра",
      avatar: "https://storage.yandexcloud.net/pet-projects/openart-make-her-wear-a-black-off-shoulder-cocktail-dress-leaning-on-a-velvet-bar-.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJE8gKjOxKaPpaO_RXn7kub%2F20250921%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20250921T161423Z&X-Amz-Expires=2592000&X-Amz-Signature=0141aef2061262fb0045e80f36d0c6d4fb5ac91f4fa1246c7dcdecabc154aadb&X-Amz-SignedHeaders=host",
      status: "online",
      specialty: "Дружба и поддержка",
      mood: "Веселая 😊",
      lastMessage: "Как дела, братик?",
      unreadCount: 1,
      category: "girls",
    },
    {
      id: "3",
      name: "Кристина",
      personality: "Звезда K-pop",
      avatar: "https://storage.yandexcloud.net/pet-projects/openart-make-her-wear-a-white-thong-bikini-standing-with-back-to-camera-looking-ov.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=YCAJE8gKjOxKaPpaO_RXn7kub%2F20250921%2Fru-central1%2Fs3%2Faws4_request&X-Amz-Date=20250921T161501Z&X-Amz-Expires=2592000&X-Amz-Signature=4ee09db8641ac65456a3dec4b80e455f22b0a974caffb7683b0c1170e0fc0f84&X-Amz-SignedHeaders=host",
      status: "busy",
      specialty: "Музыка и танцы",
      mood: "Танцую 💃",
      lastMessage: "Слушай мою новую песню!",
      unreadCount: 0,
      category: "girls",
    },
    
  ];

  const filteredFriends = aiFriends.filter((friend) => friend.category === selectedCategory);

  if (!isAuthenticated) {
    return (
      <Page back={false}>
        <div className='flex flex-col w-full h-screen items-center justify-center cosmic-background'>
          <div className='flex flex-col w-full h-screen items-center justify-center neon-grid-pattern fade-bottom'> 
            <Spinner className='mb-10 w-10 h-10' size="l" />
            <Subheadline
              level="2"
              weight="2"
            >
              Preparing your session...
            </Subheadline>
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page back={false}> 
      <div className="min-h-screen cosmic-background">
        <div className="px-4 py-4">
          {/* Friends Grid */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {filteredFriends.map((friend, index) => (
                 <Card key={friend.id} type="ambient">
                 <React.Fragment>
                   <img
                     alt="ai-companion"
                     src={friend.avatar}
                     style={{
                       display: 'block',
                       height: 308,
                       objectFit: 'cover',
                       width: 254
                     }}
                    />
                    <CardCell
                     readOnly
                     subtitle={friend.personality}
                     >
                       {friend.name}
                     </CardCell>
                 </React.Fragment>
               </Card>  
            ))}
          </div>
        </div>
          
      </div>
    </Page>
  );
}

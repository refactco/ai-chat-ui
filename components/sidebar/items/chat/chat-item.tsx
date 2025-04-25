import { ChatbotUIContext } from '@/context/context';
import { LLM_LIST } from '@/lib/models/llm/llm-list';
import { cn } from '@/lib/utils';
import { Tables } from '@/supabase/types';
import { LLM } from '@/types';
import { IconRobotFace } from '@tabler/icons-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { FC, useContext, useRef } from 'react';
import { DeleteChat } from './delete-chat';
import { UpdateChat } from './update-chat';

interface ChatItemProps {
  chat: Tables<'chats'>;
}

export const ChatItem: FC<ChatItemProps> = ({ chat }) => {
  const {
    selectedWorkspace,
    selectedChat,
    availableLocalModels,
    assistantImages,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext);

  const router = useRouter();
  const params = useParams();
  const isActive = params.chatid === chat.id || selectedChat?.id === chat.id;

  const itemRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (!selectedWorkspace) return;
    return router.push(`/${selectedWorkspace.id}/chat/${chat.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      itemRef.current?.click();
    }
  };

  const MODEL_DATA = [
    ...LLM_LIST,
    ...availableLocalModels,
    ...availableOpenRouterModels
  ].find(llm => llm.modelId === chat.model) as LLM;

  const assistantImage = assistantImages.find(
    image => image.assistantId === chat.assistant_id
  )?.base64;

  return (
    <div
      ref={itemRef}
      className={cn(
        'hover:bg-accent focus:bg-accent group flex w-full cursor-pointer items-center rounded p-2 hover:opacity-50 focus:outline-none',
        isActive && 'bg-accent'
      )}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      {chat.assistant_id ? (
        assistantImage ? (
          <Image
            style={{ width: '30px', height: '30px' }}
            className="rounded"
            src={assistantImage}
            alt="Assistant image"
            width={30}
            height={30}
          />
        ) : (
          <IconRobotFace
            className="bg-primary text-secondary border-primary rounded border-DEFAULT p-1"
            size={30}
          />
        )
      ) : null}

      <div className="ml-2 flex-1 truncate text-sm">{chat.name}</div>

      <div
        onClick={e => {
          e.stopPropagation();
          e.preventDefault();
        }}
        className={`ml-2 flex space-x-2 ${!isActive && 'w-11 opacity-0 group-hover:opacity-100'}`}
      >
        <UpdateChat chat={chat} />

        <DeleteChat chat={chat} />
      </div>
    </div>
  );
};

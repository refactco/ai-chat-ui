import { ChatbotUIContext } from '@/context/context';
import { getAssistantCollectionsByAssistantId } from '@/db/assistant-collections';
import { getAssistantFilesByAssistantId } from '@/db/assistant-files';
import { getAssistantToolsByAssistantId } from '@/db/assistant-tools';
import { getCollectionFilesByCollectionId } from '@/db/collection-files';
import { deleteMessagesIncludingAndAfter } from '@/db/messages';
import { ChatMessage, LLMID } from '@/types';
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const useChatHandler = () => {
  const router = useRouter();

  const {
    userInput,
    chatFiles,
    setUserInput,
    setNewMessageImages,
    profile,
    setIsGenerating,
    setChatMessages,
    setFirstTokenReceived,
    selectedChat,
    selectedWorkspace,
    setSelectedChat,
    setChats,
    setSelectedTools,
    availableLocalModels,
    availableOpenRouterModels,
    abortController,
    setAbortController,
    chatSettings,
    newMessageImages,
    selectedAssistant,
    chatMessages,
    chatImages,
    setChatImages,
    setChatFiles,
    setNewMessageFiles,
    setShowFilesDisplay,
    newMessageFiles,
    chatFileItems,
    setChatFileItems,
    setToolInUse,
    useRetrieval,
    sourceCount,
    setIsPromptPickerOpen,
    setIsFilePickerOpen,
    selectedTools,
    selectedPreset,
    setChatSettings,
    models,
    isPromptPickerOpen,
    isFilePickerOpen,
    isToolPickerOpen
  } = useContext(ChatbotUIContext);

  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isPromptPickerOpen || !isFilePickerOpen || !isToolPickerOpen) {
      chatInputRef.current?.focus();
    }
  }, [isPromptPickerOpen, isFilePickerOpen, isToolPickerOpen]);

  const handleNewChat = async () => {
    if (!selectedWorkspace) return;

    setUserInput('');
    setChatMessages([]);
    setSelectedChat(null);
    setChatFileItems([]);

    setIsGenerating(false);
    setFirstTokenReceived(false);

    setChatFiles([]);
    setChatImages([]);
    setNewMessageFiles([]);
    setNewMessageImages([]);
    setShowFilesDisplay(false);
    setIsPromptPickerOpen(false);
    setIsFilePickerOpen(false);

    setSelectedTools([]);
    setToolInUse('none');

    if (selectedAssistant) {
      setChatSettings({
        model: selectedAssistant.model as LLMID,
        prompt: selectedAssistant.prompt,
        temperature: selectedAssistant.temperature,
        contextLength: selectedAssistant.context_length,
        includeProfileContext: selectedAssistant.include_profile_context,
        includeWorkspaceInstructions:
          selectedAssistant.include_workspace_instructions,
        embeddingsProvider: selectedAssistant.embeddings_provider as
          | 'openai'
          | 'local',
        asanaApiKey: ''
      });

      let allFiles = [];

      const assistantFiles = (
        await getAssistantFilesByAssistantId(selectedAssistant.id)
      ).files;
      allFiles = [...assistantFiles];
      const assistantCollections = (
        await getAssistantCollectionsByAssistantId(selectedAssistant.id)
      ).collections;
      for (const collection of assistantCollections) {
        const collectionFiles = (
          await getCollectionFilesByCollectionId(collection.id)
        ).files;
        allFiles = [...allFiles, ...collectionFiles];
      }
      const assistantTools = (
        await getAssistantToolsByAssistantId(selectedAssistant.id)
      ).tools;

      setSelectedTools(assistantTools);
      setChatFiles(
        allFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          file: null
        }))
      );

      if (allFiles.length > 0) setShowFilesDisplay(true);
    } else if (selectedPreset) {
      setChatSettings({
        model: selectedPreset.model as LLMID,
        prompt: selectedPreset.prompt,
        temperature: selectedPreset.temperature,
        contextLength: selectedPreset.context_length,
        includeProfileContext: selectedPreset.include_profile_context,
        includeWorkspaceInstructions:
          selectedPreset.include_workspace_instructions,
        embeddingsProvider: selectedPreset.embeddings_provider as
          | 'openai'
          | 'local',
        asanaApiKey: ''
      });
    } else if (selectedWorkspace) {
      // setChatSettings({
      //   model: (selectedWorkspace.default_model ||
      //     "gpt-4-1106-preview") as LLMID,
      //   prompt:
      //     selectedWorkspace.default_prompt ||
      //     "You are a friendly, helpful AI assistant.",
      //   temperature: selectedWorkspace.default_temperature || 0.5,
      //   contextLength: selectedWorkspace.default_context_length || 4096,
      //   includeProfileContext:
      //     selectedWorkspace.include_profile_context || true,
      //   includeWorkspaceInstructions:
      //     selectedWorkspace.include_workspace_instructions || true,
      //   embeddingsProvider:
      //     (selectedWorkspace.embeddings_provider as "openai" | "local") ||
      //     "openai"
      // })
    }

    return router.push(`/${selectedWorkspace.id}/chat`);
  };

  const handleFocusChatInput = () => {
    chatInputRef.current?.focus();
  };

  const handleStopMessage = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleSendMessage = async (
    messageContent: string,
    chatMessages: ChatMessage[],
    isRegeneration: boolean
  ) => {
    try {
      setIsGenerating(true);
      setUserInput('');
      setIsPromptPickerOpen(false);
      setIsFilePickerOpen(false);

      // Create temporary messages for immediate UI feedback
      const userMessage: ChatMessage = {
        message: {
          id: uuidv4(),
          chat_id: selectedChat?.id || '',
          assistant_id: null,
          user_id: profile?.user_id || '',
          content: messageContent,
          model: chatSettings?.model || '',
          role: 'user',
          sequence_number: chatMessages.length,
          image_paths: [],
          created_at: new Date().toISOString(),
          updated_at: null
        },
        fileItems: []
      };

      const tempAssistantMessage: ChatMessage = {
        message: {
          id: uuidv4(),
          chat_id: selectedChat?.id || '',
          assistant_id: selectedAssistant?.id || null,
          user_id: profile?.user_id || '',
          content: '',
          model: chatSettings?.model || '',
          role: 'assistant',
          sequence_number: chatMessages.length + 1,
          image_paths: [],
          created_at: new Date().toISOString(),
          updated_at: null
        },
        fileItems: []
      };

      // Add messages to chat immediately
      setChatMessages([...chatMessages, userMessage, tempAssistantMessage]);

      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: messageContent })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const fullResponse = data.response;

      // Create a new array with the current messages
      const currentMessages = [
        ...chatMessages,
        userMessage,
        tempAssistantMessage
      ];

      // Update the content letter by letter
      for (let i = 0; i < fullResponse.length; i++) {
        // Update the last message's content
        currentMessages[currentMessages.length - 1].message.content =
          fullResponse.substring(0, i + 1);

        // Create a new array to trigger a re-render
        setChatMessages([...currentMessages]);

        // Add a small delay between each character
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      setIsGenerating(false);
    } catch (error) {
      console.log({ error });
      toast.error('Failed to send message');
      setIsGenerating(false);
    }
  };

  const handleSendEdit = async (
    editedContent: string,
    sequenceNumber: number
  ) => {
    if (!selectedChat) return;

    await deleteMessagesIncludingAndAfter(
      selectedChat.user_id,
      selectedChat.id,
      sequenceNumber
    );

    const filteredMessages = chatMessages.filter(
      chatMessage => chatMessage.message.sequence_number < sequenceNumber
    );

    setChatMessages(filteredMessages);

    handleSendMessage(editedContent, filteredMessages, false);
  };

  return {
    chatInputRef,
    prompt,
    handleNewChat,
    handleSendMessage,
    handleFocusChatInput,
    handleStopMessage,
    handleSendEdit
  };
};

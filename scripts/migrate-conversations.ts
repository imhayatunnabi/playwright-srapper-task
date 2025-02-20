import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

interface Message {
  sender: string;
  text: string;
  timestamp: string;
}

interface Conversation {
  personName: string;
  messages: Message[];
}

async function main() {
  try {
    const conversationsPath = path.join(__dirname, '../tests/https/linkedin-scrap/linkedIn-session/conversations.json');
    const conversationsData: Conversation[] = JSON.parse(fs.readFileSync(conversationsPath, 'utf-8'));

    console.log(`Found ${conversationsData.length} conversations to process`);

    for (const convo of conversationsData) {
      const existingConversation = await prisma.conversation.findFirst({
        where: { personName: convo.personName },
        include: { messages: true }
      });

      if (existingConversation) {
        const uniqueMessages = convo.messages.filter((newMsg: Message) => 
          !existingConversation.messages.some(existingMsg => 
            existingMsg.sender === newMsg.sender &&
            existingMsg.text === newMsg.text &&
            existingMsg.timestamp === newMsg.timestamp
          )
        );

        if (uniqueMessages.length > 0) {
          await prisma.conversation.update({
            where: { id: existingConversation.id },
            data: {
              messages: {
                create: uniqueMessages.map((msg: Message) => ({
                  sender: msg.sender,
                  text: msg.text,
                  timestamp: msg.timestamp || 'unknown'
                }))
              }
            }
          });
          console.log(`Updated ${convo.personName}'s conversation with ${uniqueMessages.length} new messages`);
        } else {
          console.log(`Skipped ${convo.personName}'s conversation - no new messages`);
        }
      } else {
        const conversation = await prisma.conversation.create({
          data: {
            personName: convo.personName,
            messages: {
              create: convo.messages.map((msg: Message) => ({
                sender: msg.sender,
                text: msg.text,
                timestamp: msg.timestamp || 'unknown'
              }))
            }
          }
        });
        console.log(`Created new conversation with ${conversation.personName}`);
      }
    }

    const finalStats = await prisma.conversation.findMany({
      include: { _count: { select: { messages: true } } }
    });
    
    console.log('\nMigration Summary:');
    console.log(`Total conversations: ${finalStats.length}`);
    console.log(`Total messages: ${finalStats.reduce((acc, conv) => acc + conv._count.messages, 0)}`);

  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  try {
    // Get all conversations with their messages
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: true
      }
    });

    console.log(`Found ${conversations.length} conversations`);
    conversations.forEach(convo => {
      console.log(`\nConversation with ${convo.personName}:`);
      console.log(`Messages: ${convo.messages.length}`);
    });
  } catch (error) {
    console.error('Error querying conversations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
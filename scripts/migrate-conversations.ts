import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient()

async function main() {
  try {
    // Read the conversations JSON file
    const conversationsPath = path.join(__dirname, '../tests/https/linkedin-scrap/linkedIn-session/conversations.json')
    const conversationsData = JSON.parse(fs.readFileSync(conversationsPath, 'utf-8'))

    console.log(`Found ${conversationsData.length} conversations to migrate`)

    // Migrate each conversation
    for (const convo of conversationsData) {
      const conversation = await prisma.conversation.create({
        data: {
          personName: convo.personName,
          messages: {
            create: convo.messages.map((msg: any) => ({
              sender: msg.sender,
              text: msg.text,
              timestamp: msg.timestamp || 'unknown'
            }))
          }
        }
      })
      console.log(`Migrated conversation with ${conversation.personName}`)
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Error during migration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
# Web Scraping and Data Management with Playwright

This project demonstrates automated web scraping using Playwright for LinkedIn messages and includes a database integration for storing the scraped data.

## Features

- LinkedIn Authentication and Session Management
- Automated Message Scraping
- SQLite Database Integration with Prisma
- JSON data storage with timestamps
- Environment variable configuration
- Robust error handling and retry mechanisms

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- LinkedIn account credentials
- SQLite (included with project)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd playwright-task
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory:

```env
LINKEDIN_EMAIL=your_linkedin_email
LINKEDIN_PASSWORD=your_linkedin_password
```

## Database Setup

1. Initialize Prisma:
```bash
npx prisma generate
```

2. Run database migrations:
```bash
npm run migrate
```

## Available Scripts

### Test Scripts
```bash
# Run LinkedIn message scraping
npx playwright test linkedin-scrap.spec.ts
```

### Database Scripts
```bash
# Migrate conversations to database
npm run migrate:conversations

# Query stored conversations
npm run query
```

## Component Details

### 1. LinkedIn Message Scraper
- Handles LinkedIn authentication
- Maintains session state for faster subsequent runs
- Scrapes conversation history
- Extracts sender, message content, and timestamps
- Saves data to JSON format

### 2. Database Integration
- SQLite database with Prisma ORM
- Stores conversations and messages
- Maintains relationships between data
- Provides easy querying capabilities

### 3. Data Models
```prisma
model Conversation {
  id         Int       @id @default(autoincrement())
  personName String
  messages   Message[]
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

model Message {
  id             Int          @id @default(autoincrement())
  sender         String
  text           String
  timestamp      String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  conversationId Int
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}
```

## File Structure
```
playwright-task/
├── prisma/
│   └── schema.prisma       # Database schema
├── scripts/
│   ├── migrate-conversations.ts    # Data migration script
│   └── query-conversations.ts      # Data query script
├── tests/
│   └── https/
│       └── linkedin-scrap/
│           ├── linkedin-scrap.spec.ts   # Main test script
│           └── linkedIn-session/        # Session storage
└── .env                    # Environment variables
```

## Security Notes

- Never commit your `.env` file
- Protect your LinkedIn credentials
- Be mindful of rate limiting
- Handle session data securely
- Regularly rotate credentials

## Error Handling

The scripts include error handling for:
- Network issues
- Authentication failures
- Session validation
- Database operations
- File system operations
- Data parsing and validation

## Troubleshooting

### Common Issues:

1. **Session Invalid**
   - Delete the session files in `linkedIn-session` folder
   - Run the test again to create a new session

2. **Database Migration Errors**
   - Ensure Prisma is properly initialized
   - Check if SQLite database file exists
   - Verify schema migrations are up to date

3. **Scraping Failures**
   - Check LinkedIn credentials
   - Verify network connectivity
   - Ensure selectors are up to date

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

This updated README provides a comprehensive guide for setting up and using the LinkedIn scraping and data management functionality, including database operations and troubleshooting steps.

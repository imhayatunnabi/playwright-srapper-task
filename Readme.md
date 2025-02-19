Here's a README.md for your web scraping project:

# Web Scraping with Playwright

This project demonstrates automated web scraping using Playwright for multiple websites including GitHub repositories and PHP function statistics.

## Features

- GitHub Authentication with 2FA support
- Repository data scraping with pagination
- PHP functions statistics scraping
- JSON data storage with timestamps
- Environment variable configuration
- Error handling and retry mechanisms

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- GitHub account with 2FA enabled (optional)

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
Create a `.env` file in the root directory with the following content:

```env
GITHUB_USERNAME=your_github_username
GITHUB_PASSWORD=your_github_password
GITHUB_OTP=your_2fa_code
OUTPUT_FILENAME=github-repository.json
```

## Available Scripts

Run the tests:

```bash
npx playwright test
```

Run specific test files:
```bash
# GitHub repository scraping
npx playwright test github-repos.spec.ts

# GitHub authentication
npx playwright test github-sign-in.spec.ts

# PHP functions statistics
npx playwright test the-top-100-php-functions-in-2024.spec.ts
```

## Test Descriptions

### 1. GitHub Repository Scraper

- Authenticates with GitHub
- Navigates through repository pages
- Extracts repository names, URLs, and last update times
- Saves data to JSON file

### 2. GitHub Authentication

- Handles login with credentials
- Supports 2FA authentication
- Verifies successful login
- Navigates to user profile

### 3. PHP Functions Statistics

- Scrapes table data from exakat.io
- Extracts top 100 PHP functions
- Saves structured data to JSON

## Output Files

- `github-repository.json`: Contains GitHub repository data
- `the-top-100-php-functions-in-2024.json`: Contains PHP functions statistics

## Security Notes

- Never commit your `.env` file
- Use environment variables for sensitive data
- Regularly rotate your credentials
- Be mindful of rate limiting on scraped websites

## Error Handling

The scripts include error handling for:

- Network issues
- Authentication failures
- Missing data
- File system operations

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

ISC

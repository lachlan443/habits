# Everyday Habits Tracker

A habit tracking application inspired by everyday.app, built with Express.js, React, and SQLite.

## Features

- Track daily habits with visual calendar grid
- Custom frequency support (specific days of week)
- Mark habits as completed or skipped
- Streak tracking (current and longest streaks)
- Completion rate statistics
- Color-coded habits
- Archive and delete habits
- User authentication with secure password hashing
- Fully containerized with Docker

## Tech Stack

- **Backend**: Express.js (Node.js) with SQLite database
- **Frontend**: React with vanilla CSS
- **Authentication**: JWT tokens with bcrypt
- **Deployment**: Docker with volume persistence

## Development Setup

### Prerequisites
- Node.js 18+
- npm

### Running Locally

1. **Start the backend server:**
   ```bash
   npm start
   ```
   Server will run on http://localhost:7160

2. **Start the React development server (in a new terminal):**
   ```bash
   cd client
   npm start
   ```
   Frontend will run on http://localhost:3000 and proxy API requests to port 7160

3. **Access the application:**
   Open http://localhost:3000 in your browser

## Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker build -t habits-tracker .

# Run with docker-compose
docker-compose up -d
```

### Using Docker Compose (Recommended)

The `docker-compose.yml` is configured to:
- Mount `/home/lach/configs/habits` to `/config` in the container
- Expose port 7160
- Auto-restart unless stopped
- Include health checks

```yaml
services:
  habits:
    build: .
    container_name: habits
    volumes:
      - /home/lach/configs/habits:/config
    ports:
      - "7160:7160"
    restart: unless-stopped
```

### Data Persistence

All configuration and data is stored in `/config`:
- `/config/habits.db` - SQLite database
- `/config/jwt_secret.txt` - JWT signing secret (auto-generated on first run)

This allows you to:
- Recreate the container without losing data
- Back up your habits by copying the `/config` directory
- Migrate to a new server by moving the `/config` directory

## Usage

### First Time Setup

1. Access the application at http://localhost:7160
2. Click "Sign up" to create an account
3. Enter a username and password (minimum 8 characters)
4. You'll be automatically logged in

### Creating Habits

1. Click "+ New Habit" button
2. Enter habit name
3. Choose a color from the palette
4. Select frequency:
   - **Every day**: Habit applies to all days
   - **Custom**: Select specific days of the week
5. Click "Create Habit"

### Tracking Habits

- **Mark as complete**: Click an empty square
- **Skip a day**: Click a completed square, then click "Skip"
- **Undo**: Click any square and select "Undo"

### Visual Indicators

- **Filled square**: Habit completed (shown in habit's color)
- **Diagonal lines**: Day skipped
- **Grey square**: Non-applicable day (for custom frequency habits)
- **Green border**: Today's date

### Viewing Statistics

Click on any habit name to see:
- Current streak
- Longest streak
- Total completions
- Overall completion rate

### Managing Habits

Click the "⋯" button next to a habit to:
- Edit name, color, or frequency
- Archive habit (hides from dashboard, preserves data)
- Delete habit permanently

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Habits
- `GET /api/habits` - Get all habits
- `POST /api/habits` - Create habit
- `GET /api/habits/:id` - Get habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `GET /api/habits/:id/stats` - Get habit statistics

### Completions
- `GET /api/completions` - Get completions (with date range)
- `POST /api/completions` - Create/update completion
- `DELETE /api/completions/by-date` - Delete completion

## Environment Variables

- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (default: 7160)
- `DB_PATH` - SQLite database path (default: /config/habits.db)
- `JWT_SECRET_FILE` - Path to JWT secret file (default: /config/jwt_secret.txt)

## License

ISC

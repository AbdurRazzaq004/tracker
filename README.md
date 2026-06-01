# 💰 WealthTracker - Personal Expense Manager

A full-stack expense tracking application built with React, TypeScript, Express, and MongoDB. Track your daily spending, visualize expenses by category, and manage your budget efficiently.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)

## ✨ Features

### 📊 Dashboard
- Real-time spending analytics (daily, weekly, monthly)
- Visual category breakdown with interactive pie charts
- Recent transaction history
- Budget progress tracking

### 💳 Expense Management
- Add expenses with amount, category, description, and date
- Custom category creation
- Filter expenses by date range and category
- Delete unwanted expenses

### 👥 User Management
- Secure registration with admin approval workflow
- Role-based access control (Super Admin & Users)
- Session-based authentication
- User-scoped data isolation

### 🎨 UI/UX
- Modern, clean interface with Shadcn UI components
- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Smooth animations and transitions
- Professional emerald green color scheme

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/WealthTracker.git
   cd WealthTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your MongoDB connection string:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   SESSION_SECRET=your_session_secret
   PORT=5000
   NODE_ENV=development
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:5000
   ```

### Default Super Admin
- **Email:** `abdurrazzaq00000@gmail.com`
- **Password:** `razzaq@143@@`

⚠️ **Important:** Change these credentials in `server/db.ts` before deploying to production!

## 📦 Tech Stack

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Shadcn UI** - Component library
- **React Query** - Data fetching & caching
- **Wouter** - Lightweight routing
- **Recharts** - Data visualization
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Express Session** - Authentication
- **bcryptjs** - Password hashing

## 📂 Project Structure

```
WealthTracker/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities & API client
│   │   └── App.tsx        # Root component
│   └── public/            # Static assets
├── server/                # Backend Express app
│   ├── db.ts             # MongoDB connection & models
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── index.ts          # Server entry point
├── shared/               # Shared types & schemas
│   └── schema.ts         # Zod schemas
└── script/               # Build scripts
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Run dev server with hot reload
npm run dev:client       # Run only Vite dev server

# Production
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:push          # Push schema changes to database

# Type Checking
npm run check            # Run TypeScript type checking
```

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for:
- ✅ Render (Recommended - Free tier)
- Railway
- Fly.io
- Heroku

### Quick Deploy to Render

1. Push code to GitHub
2. Connect repository on [render.com](https://render.com)
3. Render auto-detects `render.yaml` configuration
4. Click "Apply" - Done! 🎉

## 🔒 Security Notes

### Before Production:
1. **Update super admin credentials** in `server/db.ts`
2. **Change MongoDB credentials** (current ones are in code)
3. **Set strong SESSION_SECRET** environment variable
4. **Enable MongoDB IP whitelist** (or allow 0.0.0.0/0)
5. **Use HTTPS** (automatic on most hosting platforms)

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Expenses
- `GET /api/expenses` - Get all user expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get single expense
- `DELETE /api/expenses/:id` - Delete expense

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category

### Admin
- `GET /api/admin/requests` - Get pending users
- `POST /api/admin/requests/:id/approve` - Approve user
- `POST /api/admin/requests/:id/reject` - Reject user

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for beautiful components
- [TailwindCSS](https://tailwindcss.com/) for utility-first CSS
- [Recharts](https://recharts.org/) for data visualization

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

Made with ❤️ by [Your Name]

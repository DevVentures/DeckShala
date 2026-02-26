# DeckShala — AI Presentation Generator

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Plate JS](https://img.shields.io/badge/Plate.js-3B82F6?logoColor=white)](https://platejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**DeckShala** is an open-source, AI-powered presentation generator — a self-hostable alternative to Gamma.app that creates beautiful, fully editable slides in minutes.

[Live Demo](http://deckshala.com) · [Report a Bug](https://github.com/DevVentures/DeckShala/issues) · [Request a Feature](https://github.com/DevVentures/DeckShala/issues) · [Discord](https://discord.gg/fsMHMhAHRV)

</div>

<https://github.com/user-attachments/assets/a21dbd49-75b8-4822-bcec-a75b581d9c60>

## 🔗 Quick Links

- [Live Demo](http://deckshala.com)
- [Discord Community](https://discord.gg/fsMHMhAHRV)
- [Contributing Guidelines](CONTRIBUTING.md)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
- [Usage](#-usage)
  - [Creating a Presentation](#creating-a-presentation)
  - [Custom Themes](#custom-themes)
- [Local Models Guide](#-local-models-guide)
- [Project Structure](#-project-structure)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)
- [Support](#-support)

## 🌟 Features

### Core Functionality

- **AI-Powered Content Generation**: Create complete presentations on any topic with AI
- **Customizable Slides**: Choose the number of slides, language, and page style
- **Editable Outlines**: Review and modify AI-generated outlines before finalizing
- **Real-Time Generation**: Watch your presentation build live as content is created
- **Auto-Save**: Everything saves automatically as you work

### Design & Customization

- **Multiple Themes**: 9 built-in themes with more coming soon
- **Custom Theme Creation**: Create and save your own themes from scratch
- **Full Editability**: Modify text, fonts, and design elements as needed
- **Image Generation**: Choose different AI image generation models for your slides
- **Audience-Focused Styles**: Select between professional and casual presentation styles

### Presentation Tools

- **Presentation Mode**: Present directly from the application
- **Rich Text Editing**: Powered by Plate Editor for comprehensive text and image handling
- **Drag and Drop**: Intuitive slide reordering and element manipulation

## 🧰 Tech Stack

| Category           | Technologies               |
| ------------------ | -------------------------- |
| **Framework**      | Next.js, React, TypeScript |
| **Styling**        | Tailwind CSS               |
| **Database**       | PostgreSQL with Prisma ORM |
| **AI Integration** | OpenAI API, Together AI    |
| **Authentication** | NextAuth.js                |
| **UI Components**  | Radix UI                   |
| **Text Editor**    | Plate Editor               |
| **File Uploads**   | UploadThing                |
| **Drag & Drop**    | DND Kit                    |

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18.x or higher
- npm, yarn, or pnpm package manager
- PostgreSQL database
- **Ollama** (for local AI models - **RECOMMENDED**, see [Ollama Setup Guide](OLLAMA_SETUP.md))
- Required for authentication:
  - Google Client ID and Secret (for authentication)
- Optional (only if not using Ollama):
  - OpenAI API key
  - Together AI API key

> 💡 **NEW**: This project now uses Ollama for local AI inference by default! No expensive API keys required. See [OLLAMA_SETUP.md](OLLAMA_SETUP.md) for complete setup instructions.

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/DevVentures/DeckShala.git
   cd DeckShala
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory with the following variables:

   ```env
   # Ollama Configuration (Local AI - RECOMMENDED)
   OLLAMA_BASE_URL="http://localhost:11434"

   # AI Providers (Optional - only if not using Ollama)
   OPENAI_API_KEY=""
   TOGETHER_AI_API_KEY=""

   # Next Auth Configuration
   NEXTAUTH_SECRET=""
   NEXTAUTH_URL="http://localhost:3000"

   # Google OAuth Provider
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""

   # File Upload Service
   UPLOADTHING_TOKEN=""

   UNSPLASH_ACCESS_KEY=""
   TAVILY_API_KEY=""

   # PostgreSQL Database
   DATABASE_URL="postgresql://username:password@localhost:5432/presentation_ai"
   ```

   > 💡 **Tip**: Copy `.env.example` to `.env` and fill in your actual values.

### Database Setup

1. **Initialize the database**

   ```bash
   pnpm db:push
   ```

1. **Start the development server**

   ```bash
   pnpm dev
   ```

1. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 💻 Usage

### Creating a Presentation

Follow these steps to create your first AI-generated presentation:

1. Login the website
1. Navigate to the dashboard
1. Enter your presentation topic
1. Choose the number of slides (recommended: 5-10)
1. Select your preferred language
1. Choose a page style
1. Toggle web search (if you want)
1. Click **"Generate Outline"**
1. Review and edit the AI-generated outline
1. Select a theme for your presentation
1. Choose an image source (ai / stock)
1. Select your presentation style (Professional/Casual)
1. Click **"Generate Presentation"**
1. Wait for the AI to create your slides in real-time
1. Preview, edit, and refine your presentation as needed
1. Present directly from the app or export your presentation

### Custom Themes

Create personalized themes to match your brand or style:

1. Click **"Create New Theme"**
2. Start from scratch or derive from an existing theme
3. Customize colors, fonts, and layout
4. Save your theme for future use

## 🧠 Local Models Guide

You can use either Ollama or LM Studio for using local models in DeckShala.

### LM Studio

1. Install [LM Studio](https://lmstudio.ai).
2. In the LM Studio app, turn the Server ON and enable CORS.
3. Download any model you want to use inside LM Studio.

### Ollama

1. Install [Ollama](https://ollama.com).
2. Download whichever model you want to use (for example: `ollama pull llama3.1`).

### Using Local Models in the App

1. Open the app and open the text model selector.
2. Chose the model you want to use (it must be downloaded in lm studio or ollama)
3. Enjoy the generation

Notes:

- Models will automatically appear in the Model Selector when the LM Studio server or the Ollama daemon is running.
- Make sure LM Studio has CORS enabled so the browser can connect.

## 📁 Project Structure

```text
deckshala/
├── .next/                      # Next.js build output
├── node_modules/               # Dependencies
├── prisma/                     # Database schema and migrations
│   └── schema.prisma          # Prisma database model
├── src/                        # Source code
│   ├── app/                   # Next.js app router
│   ├── components/            # Reusable UI components
│   │   ├── auth/             # Authentication components
│   │   ├── presentation/     # Presentation-related components
│   │   │   ├── dashboard/   # Dashboard UI
│   │   │   ├── editor/      # Presentation editor
│   │   │   │   ├── custom-elements/   # Custom editor elements
│   │   │   │   ├── dnd/              # Drag and drop functionality
│   │   │   │   └── native-elements/  # Native editor elements
│   │   │   ├── outline/     # Presentation outline components
│   │   │   ├── theme/       # Theme-related components
│   │   │   └── utils/       # Presentation utilities
│   │   ├── prose-mirror/    # ProseMirror editor for outlines
│   │   ├── plate/           # Text editor components
│   │   │   ├── hooks/       # Editor hooks
│   │   │   ├── lib/         # Editor libraries
│   │   │   ├── ui/          # Plate editor UI components
│   │   │   ├── utils/       # Functions necessary for platejs
│   │   │   └── plugins/     # Editor plugins
│   │   └── ui/              # Shared UI components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions and shared code
│   ├── provider/             # Context providers
│   ├── server/               # Server-side code
│   ├── states/               # State management
│   ├── styles/               # Styles required in the project
│   ├── middleware.ts         # Next.js middleware
│   └── env.js                # Environment configuration
├── .env                       # Environment variables (not in git)
├── .env.example              # Example environment variables
├── next.config.js            # Next.js configuration
├── package.json              # Project dependencies and scripts
├── tailwind.config.ts        # Tailwind CSS configuration
└── tsconfig.json             # TypeScript configuration
```

## 🗺️ Roadmap

| Feature                      | Status            | Notes                                                                                         |
| ---------------------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| Export to PowerPoint (.pptx) | 🟡 Partially Done | Works but the images and other component do not translate one to one                          |
| Media embedding              | 🟡 Partially Done | Functionality is there, but ui/ux need improvement                                            |
| Additional built-in themes   | 🟡 In Progress    | Currently have 9 themes, planning to add 15+ more                                             |
| Mobile responsiveness        | 🟡 In Progress    | Improving layout and interactions for mobile devices                                          |
| Advanced charts              | 🟡 Started        | Support for AI generated charts                                                               |
| Write e2e tests              | 🔴 Not Started    | Writing test to check the core features, so that we can catch if any changes break anything   |
| Real-time collaboration      | 🔴 Not Started    | Multiple users editing the same presentation simultaneously                                   |
| Export to PDF                | 🔴 Not Started    | High priority - allow users to download presentations as PDFs                                 |
| Template library             | 🔴 Not Started    | Pre-built templates for common presentation types (pitch decks, reports, etc.)                |
| Animation and transitions    | 🔴 Not Started    | Add slide transitions and element animations                                                  |
| Voice-over recording         | 🔴 Not Started    | Record and attach voice narration to slides                                                   |
| Cloud storage integration    | 🔴 Not Started    | Connect with Google Drive, Dropbox, OneDrive                                                  |
| Presentation analytics       | 🔴 Not Started    | Track views, engagement, and presentation performance                                         |
| AI presenter notes           | 🔴 Not Started    | Auto-generate speaker notes for each slide                                                    |
| Custom font uploads          | 🔴 Not Started    | Allow users to upload and use their own fonts                                                 |
| Plugin system                | 🔴 Not Started    | Allow community to build and share extensions                                                 |
| API                          | 🔴 Not Started    | Allow developers to use DeckShala to generate presentation content in their own applications. |

> 📝 **Note**: This roadmap is subject to change based on community feedback and priorities. Want to contribute to any of these features? Check out our [Contributing Guidelines](CONTRIBUTING.md)!

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Commit your changes**

   ```bash
   git commit -m 'Add some amazing feature'
   ```

4. **Push to the branch**

   ```bash
   git push origin feature/amazing-feature
   ```

5. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style and conventions
- Write clear commit messages
- Be respectful and constructive in discussions

For more details, please read our [Contributing Guidelines](CONTRIBUTING.md).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

Special thanks to the following projects and organizations:

- [OpenAI](https://openai.com/) for AI generation capabilities
- [Plate Editor](https://plate.udecode.io/) for rich text editing
- [Radix UI](https://www.radix-ui.com/) for accessible UI components
- [Next.js](https://nextjs.org/) for the React framework
- All our open-source [contributors](https://github.com/DevVentures/DeckShala/graphs/contributors)

## 💬 Support and Sponsors

Need help or have questions?

- 💬 [Discord Community](https://discord.gg/fsMHMhAHRV)
- 🐛 [Report a Bug](https://github.com/DevVentures/DeckShala/issues)
- 💡 [Request a Feature](https://github.com/DevVentures/DeckShala/issues)
- 📧 Contact us via GitHub Issues or Discord

---

**Built with ❤️ by [techySPHINX](https://github.com/techySPHINX)**

**[⭐ Star us on GitHub](https://github.com/DevVentures/DeckShala)**

[![Star History Chart](https://api.star-history.com/svg?repos=DevVentures/DeckShala&type=date&legend=top-left)](https://www.star-history.com/#DevVentures/DeckShala&type=date&legend=top-left)

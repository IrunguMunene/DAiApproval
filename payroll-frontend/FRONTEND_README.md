# AI-Orchestrated Payroll System - Frontend

A modern Angular 20 frontend application for the AI-Orchestrated Payroll System. This application provides an intuitive interface for generating, managing, and testing payroll rules using AI technology.

## 🚀 Features

- **Interactive Demo Page** - Showcase system capabilities with guided scenarios
- **AI Rule Generation** - Natural language to C# code conversion with real-time feedback
- **Rule Management Dashboard** - View, activate, and deactivate payroll rules
- **Shift Testing Interface** - Validate rules against sample or custom shift data
- **Syntax Highlighting** - Beautiful C# code display with PrismJS
- **Responsive Design** - Mobile-friendly interface that works on all devices
- **Material Design** - Modern UI components with Angular Material

## 🛠️ Technology Stack

- **Angular 20** - Latest Angular framework
- **TypeScript** - Type-safe development
- **Angular Material** - Material Design components
- **PrismJS** - Syntax highlighting for code display
- **SCSS** - Enhanced CSS with variables and mixins
- **RxJS** - Reactive programming with observables

## 📦 Prerequisites

- Node.js 18+ and npm
- Angular CLI 20+

## 🏃‍♂️ Quick Start

### Installation

```bash
# Navigate to frontend directory
cd payroll-frontend

# Install dependencies
npm install

# Start development server
ng serve
```

The application will be available at `http://localhost:4200`.

### Development Server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## 🌟 Application Structure

```
src/
├── app/
│   ├── components/          # Reusable components
│   │   └── code-display/    # Code highlighting component
│   ├── models/              # TypeScript interfaces
│   │   ├── shift.model.ts
│   │   ├── payroll.model.ts
│   │   └── rule.model.ts
│   ├── pages/               # Main application pages
│   │   ├── demo/            # Interactive demo page
│   │   ├── rule-generation/ # AI rule generation interface
│   │   ├── rule-management/ # Rule management dashboard
│   │   └── shift-testing/   # Shift validation interface
│   ├── services/            # Application services
│   │   ├── api.service.ts   # REST API integration
│   │   └── code-highlight.service.ts # PrismJS wrapper
│   ├── app.ts               # Root component
│   └── app-module.ts        # Main application module
└── environments/            # Environment configurations
```

## 🎯 Key Features

### Interactive Demo
- Step-by-step walkthrough of the system
- Real-time AI rule generation simulation
- Sample rule testing with visual results
- Architecture overview with flow diagrams

### Rule Generation
- Natural language input for rule descriptions
- AI-powered intent extraction display
- Generated C# code with syntax highlighting
- Compilation status with error handling
- Rule testing with sample data
- One-click rule activation

### Rule Management
- View all generated rules
- Activate/deactivate rules with toggle controls
- Rule performance metrics
- Code preview with copy functionality
- Rule history and audit trail

### Shift Testing
- Manual shift data entry
- CSV file upload for batch testing
- Real-time classification results
- Rule-by-rule breakdown of applied logic

## 🎨 UI/UX Features

- **Material Design** - Consistent, modern UI components
- **Responsive Layout** - Works on desktop, tablet, and mobile
- **Loading States** - Progress indicators during API calls
- **Error Handling** - User-friendly error messages and recovery
- **Snackbar Notifications** - Success and error notifications
- **Form Validation** - Real-time input validation with helpful messages
- **Code Highlighting** - Syntax-highlighted C# code display
- **Copy to Clipboard** - One-click code copying functionality

## 🔧 Configuration

The application is configured to work with the backend API running on `http://localhost:5163`. 

To change the API URL, update the `environment.ts` files:

```typescript
export const environment = {
  production: false,
  apiUrl: 'your-api-url-here'
};
```

## 📱 Mobile Responsiveness

The application is fully responsive and provides an optimal experience across all device sizes:

- **Desktop** (1200px+) - Full-featured layout with side navigation
- **Tablet** (768px-1200px) - Optimized layout with collapsible navigation
- **Mobile** (< 768px) - Compact layout with bottom navigation

## 🎭 Theming

The application supports both light and dark themes based on user preferences:

```scss
@media (prefers-color-scheme: dark) {
  // Dark theme styles
}
```

## 🔗 Integration

The frontend integrates seamlessly with the backend API:

- **Rule Generation** - `POST /api/rule/generate`
- **Rule Activation** - `POST /api/rule/{id}/activate`
- **Rule Management** - `GET /api/rule/active`
- **Shift Classification** - `POST /api/shift/classify`
- **Rule Testing** - `POST /api/shift/test-rule/{id}`

## 🚀 Deployment

For production deployment:

1. Build the application:
   ```bash
   ng build --configuration production
   ```

2. Deploy the `dist/` folder to your web server

3. Configure your web server to serve the Angular app (with fallback to index.html for client-side routing)

## 🤝 Contributing

1. Follow Angular coding standards
2. Use TypeScript strict mode
3. Implement proper error handling
4. Add appropriate loading states
5. Ensure mobile responsiveness
6. Write meaningful commit messages

## 📄 License

This project is part of the AI-Orchestrated Payroll System and is licensed under the MIT License.
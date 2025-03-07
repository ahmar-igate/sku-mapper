# SKU Mapper Frontend

SKU Mapper Frontend is a modern web application built using Vite, TypeScript, and Material UI (MUI). It serves as the user interface for managing and mapping SKUs, seamlessly interacting with the SKU Mapper Backend.

## Features

- **TypeScript**: Using typescript for type-safe code.
- **Material UI (MUI)**: Using MUI specifically for dark/light mode and datatables.
- **Backend Integration**: Connects with the [SKU Mapper Backend](https://github.com/ahmar-igate/sku-mapper-b.git) to fetch, update, and map SKU data.
- **Responsive Design**: Optimized for both desktop and mobile experiences.

## Prerequisites

- **Node.js**: v14 or later (using 22.11.0)
- **npm** or **Yarn** (using npm)
- **MUI**: Using pro version for datagrid

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/ahmar-igate/shopify-connector-f.git
   cd shopify-connector-f

2. **Install Dependencies**

    Using npm (recommended):

   ```
   npm install
   ```
   Using yarn:
   ```
   yarn
   ```
    
4. **Environment Configuration**
    
    Create a `.env.local` file in the root directory to configure environment-specific settings. For example:

    VITE_BASE_URL=http://127.0.0.1:8000/api



## Running the Application

Start the development server with:

Using npm:

    npm run dev

Using yarn:

    yarn 
    
By default, the application will be accessible at http://127.0.0.1:5173.

## Building for Production
To build an optimized production version of the application, run:

Using npm:

    npm run build

Using yarn:

    yarn build

The build output will be generated in the `dist` directory.

## API Integration

SKU Mapper Frontend interacts with the SKU Mapper Backend to perform operations such as:

- Fetching SKU data
- Mapping and updating SKUs
- Managing SKU records

Make sure the `VITE_BASE_URL` in your `.env.local` file correctly points to your backend server.

## Contact
For questions or support, please reach out at ahmaraamir33@gmail.com.

# Documentazione Tecnica - Artigianato Online 2.0

## Indice
1. [Architettura Tecnica](#architettura-tecnica)
2. [Ambiente di Sviluppo](#ambiente-di-sviluppo)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [Docker Configuration](#docker-configuration)
6. [Testing](#testing)
7. [Deployment](#deployment)

## Architettura Tecnica

### Stack Tecnologico
- **Runtime**: Node.js v18.x
- **Framework**: Express.js v4.x
- **Database**: PostgreSQL v15
- **ORM**: node-postgres (pg)
- **Authentication**: JWT (jsonwebtoken v9.x)
- **Password Hashing**: bcrypt v5.x
- **Containerization**: Docker & Docker Compose v3.8
- **Frontend**: 
  - HTML5/CSS3
  - Bootstrap v5.x
  - Vanilla JavaScript (ES6+)

### Struttura del Progetto
```
artigianato-online-2/
├── db/                     # Database configuration
│   ├── db.js              # Database connection and initialization
│   ├── seed.js            # Seed data
│   └── tables.sql         # Database schema
├── jobs/                  # Scheduled jobs
│   ├── index.js
│   ├── orderStatusUpdater.js
│   └── userSuspensionManager.js
├── middleware/            # Custom middleware
│   └── auth.js           # Authentication middleware
├── routes/               # API routes
│   ├── admin.js
│   ├── auth.js
│   ├── cart.js
│   ├── index.js
│   ├── orders.js
│   ├── products.js
│   ├── reports.js
│   └── ...
├── services/             # Business logic services
│   └── emailService.js
├── public/              # Static files
│   ├── admin.html
│   ├── cart.html
│   ├── catalog.html
│   ├── dashboard.html
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── images/
├── .dockerignore        # Docker ignore file
├── .env                 # Environment variables
├── .gitignore          # Git ignore file
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose configuration
├── package.json        # Project dependencies
├── package-lock.json   # Lock file for dependencies
└── app.js             # Main application file
```

## Database Schema

### ERD
```sql
utente (
  id SERIAL PRIMARY KEY,
  nome_utente VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(60) NOT NULL,
  ruolo_id INTEGER REFERENCES ruoli(ruolo_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

prodotti (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  prezzo DECIMAL(10,2) NOT NULL,
  artigiano_id INTEGER REFERENCES utente(id),
  CHECK (prezzo > 0)
)
```

## API Reference

### Authentication Endpoints

#### POST /auth/signup
```javascript
Request Body: {
  username: string,
  email: string,     // format: email
  password: string,  // min: 8 chars
  role: number      // enum: [1,2,3]
}

Response: {
  success: boolean,
  token: string,     // JWT token
  user: {
    id: number,
    username: string,
    role: number
  }
}
```

### Error Handling
```javascript
{
  success: false,
  error: {
    code: string,    // error code
    message: string, // user message
    details: object  // technical details
  }
}
```

## Docker Configuration

### Development Environment
```yaml
version: '3.8'
services:
  app:
    build: 
      context: .
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

### Production Environment
```yaml
version: '3.8'
services:
  app:
    build: 
      context: .
      target: production
    environment:
      - NODE_ENV=production
```

## Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Test Coverage
```bash
npm run test:coverage
```

## Deployment

### Prerequisites
- Node.js v18.x
- Docker v24.x
- Docker Compose v3.8
- PostgreSQL v15

### Environment Variables
```env
NODE_ENV=production
DB_HOST=postgres
DB_PORT=5432
DB_NAME=artigianato_online
DB_USER=postgres
DB_PASSWORD=<secure-password>
JWT_SECRET=<random-string>
```

### Deployment Commands
```bash
# Build production image
docker build -t artigianato-online:prod --target production .

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Database migrations
npm run migrate:prod
```

## Troubleshooting

### Common Issues
1. **Database Connection**
   ```bash
   # Check DB container logs
   docker-compose logs db
   
   # Verify network connectivity
   docker network inspect artigianato-network
   ```

2. **Authentication Errors**
   ```javascript
   // JWT verification failed
   jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
     if (err) console.error('JWT Error:', err.name, err.message);
   });
   ```

3. **Docker Issues**
   ```bash
   # Reset Docker environment
   docker-compose down -v
   docker system prune -a
   docker-compose up --build
   ```
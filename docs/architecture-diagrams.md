# Architecture Diagrams - Polyglot Microservices BookStore

Tài liệu này chứa các biểu đồ kiến trúc được vẽ bằng Mermaid.js.

---

## 1. System Architecture Overview

```mermaid
graph TB
    Client[Client Applications<br/>Web/Mobile]
    
    Gateway[API Gateway<br/>Django DRF<br/>Port 8000]
    
    subgraph "Python Services - Django DRF"
        Customer[Customer Service<br/>Port 8001<br/>PostgreSQL]
        Book[Book Service<br/>Port 8002<br/>MySQL]
        Cart[Cart Service<br/>Port 8003<br/>MySQL]
        Staff[Staff Service<br/>Port 8004<br/>PostgreSQL]
        Manager[Manager Service<br/>Port 8005<br/>PostgreSQL]
        Catalog[Catalog Service<br/>Port 8006<br/>MySQL]
        Recommender[Recommender AI<br/>Port 8007<br/>PostgreSQL]
    end
    
    subgraph "Java Services - Spring Boot"
        Order[Order Service<br/>Port 9001<br/>PostgreSQL]
        Pay[Pay Service<br/>Port 9002<br/>PostgreSQL]
        Ship[Ship Service<br/>Port 9003<br/>PostgreSQL]
    end
    
    subgraph "Node.js Services - Express"
        Comment[Comment & Rate<br/>Port 3001<br/>MySQL]
    end
    
    subgraph "Databases - PostgreSQL"
        DB_Customer[(customer_db)]
        DB_Staff[(staff_db)]
        DB_Manager[(manager_db)]
        DB_Recommender[(recommender_db)]
        DB_Order[(order_db)]
        DB_Payment[(payment_db)]
        DB_Shipment[(shipment_db)]
    end
    
    subgraph "Databases - MySQL"
        DB_Book[(book_db)]
        DB_Cart[(cart_db)]
        DB_Catalog[(catalog_db)]
        DB_Comment[(comment_db)]
    end
    
    Client -->|HTTP/HTTPS| Gateway
    
    Gateway -->|JWT Auth| Customer
    Gateway -->|Forward| Book
    Gateway -->|Forward| Cart
    Gateway -->|Forward| Staff
    Gateway -->|Forward| Manager
    Gateway -->|Forward| Catalog
    Gateway -->|Forward| Recommender
    Gateway -->|Forward| Order
    Gateway -->|Forward| Pay
    Gateway -->|Forward| Ship
    Gateway -->|Forward| Comment
    
    Customer -.->|Connect| DB_Customer
    Book -.->|Connect| DB_Book
    Cart -.->|Connect| DB_Cart
    Staff -.->|Connect| DB_Staff
    Manager -.->|Connect| DB_Manager
    Catalog -.->|Connect| DB_Catalog
    Recommender -.->|Connect| DB_Recommender
    Order -.->|Connect| DB_Order
    Pay -.->|Connect| DB_Payment
    Ship -.->|Connect| DB_Shipment
    Comment -.->|Connect| DB_Comment
    
    style Gateway fill:#ff6b6b
    style Customer fill:#4ecdc4
    style Book fill:#4ecdc4
    style Cart fill:#4ecdc4
    style Staff fill:#4ecdc4
    style Manager fill:#4ecdc4
    style Catalog fill:#4ecdc4
    style Recommender fill:#4ecdc4
    style Order fill:#95e1d3
    style Pay fill:#95e1d3
    style Ship fill:#95e1d3
    style Comment fill:#f3a683
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant CustomerService as Customer Service
    participant StaffService as Staff Service
    
    Client->>+Gateway: POST /api/auth/login<br/>{username, password}
    Gateway->>+CustomerService: POST /customers/verify-credentials
    CustomerService->>CustomerService: Validate credentials<br/>Hash password check
    CustomerService-->>-Gateway: {valid: true, user_id, role}
    Gateway->>Gateway: Generate JWT Token
    Gateway-->>-Client: {access_token, refresh_token, user}
    
    Note over Client,Gateway: Subsequent Requests
    
    Client->>+Gateway: GET /api/books<br/>Authorization: Bearer <token>
    Gateway->>Gateway: Validate JWT Token
    Gateway->>+BookService: GET /books
    BookService-->>-Gateway: Books data
    Gateway-->>-Client: Books response
```

---

## 2.1. Add Book Flow (Via API Gateway)

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant BookService as Book Service
    participant BookDB as book_db (MySQL)

    Client->>+Gateway: POST /api/books/create<br/>Authorization: Bearer <staff_or_manager_token><br/>{isbn, title, author, price, stock_quantity}
    Gateway->>Gateway: Validate JWT token
    Gateway->>+BookService: POST /books/create/<br/>{book payload}

    BookService->>BookService: Validate input<br/>(required fields, ISBN, price, stock)

    alt Valid request
        BookService->>+BookDB: INSERT INTO books (...)
        BookDB-->>-BookService: New book_id
        BookService-->>-Gateway: 201 Created<br/>{id, isbn, title, ...}
        Gateway-->>-Client: 201 Created<br/>{id, isbn, title, ...}
    else Invalid payload / business rule failed
        BookService-->>-Gateway: 400 Bad Request<br/>{error, details}
        Gateway-->>-Client: 400 Bad Request<br/>{error, details}
    end
```

---

## 3. Order Processing Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Cart as Cart Service
    participant Order as Order Service
    participant Book as Book Service
    participant Pay as Pay Service
    participant Ship as Ship Service
    
    Client->>+Gateway: POST /api/orders<br/>Authorization: Bearer <token>
    Gateway->>+Order: POST /orders<br/>{customer_id, address_id}
    
    Order->>+Cart: GET /carts/{customer_id}
    Cart-->>-Order: Cart items
    
    Order->>+Book: Verify stock for each book
    Book-->>-Order: Stock confirmation
    
    Order->>Order: Create order record
    Order->>Book: Update stock quantities
    
    Order->>+Pay: POST /payments<br/>{order_id, amount}
    Pay->>Pay: Process payment
    Pay-->>-Order: Payment success
    
    Order->>+Ship: POST /shipments<br/>{order_id, address}
    Ship->>Ship: Create shipment
    Ship-->>-Order: Shipment created
    
    Order->>Cart: DELETE /carts/{customer_id}
    
    Order-->>-Gateway: Order created response
    Gateway-->>-Client: {order_id, status, tracking}
```

---

## 4. Order Processing Flow - Two-Phase Commit (2PC)

### 4.1. Happy Path - Success Scenario

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Cart as Cart Service
    participant Order as Order Service
    participant Book as Book Service
    participant Pay as Pay Service
    participant Ship as Ship Service
    
    Client->>+Gateway: POST /api/orders<br/>{customer_id, address, payment_method}
    Gateway->>+Order: POST /orders/2pc<br/>{customer_id, address, payment_method}
    
    Note over Order: PHASE 1: PREPARE
    Order->>+Cart: GET /carts/{customer_id}
    Cart-->>-Order: Cart items
    
    Order->>+Book: POST /transactions/prepare-stock<br/>{transaction_id, items[]}
    Book->>Book: Lock stock (Redis)
    Book-->>-Order: VOTE_COMMIT
    
    Order->>+Pay: POST /transactions/prepare-payment<br/>{transaction_id, amount, method}
    Pay->>Pay: Validate payment info
    Pay-->>-Order: VOTE_COMMIT
    
    Order->>+Ship: POST /transactions/prepare-shipment<br/>{transaction_id, address}
    Ship->>Ship: Validate address
    Ship-->>-Order: VOTE_COMMIT
    
    Note over Order: All participants voted COMMIT
    Note over Order: PHASE 2: COMMIT
    
    Order->>Order: Create order record
    
    Order->>+Book: POST /transactions/commit-stock<br/>{transaction_id}
    Book->>Book: Reduce actual stock<br/>Release lock
    Book-->>-Order: COMMITTED
    
    Order->>+Pay: POST /transactions/commit-payment<br/>{transaction_id}
    Pay->>Pay: Execute payment
    Pay-->>-Order: COMMITTED
    
    Order->>+Ship: POST /transactions/commit-shipment<br/>{transaction_id}
    Ship->>Ship: Create shipment record
    Ship-->>-Order: COMMITTED
    
    Order->>Cart: DELETE /carts/{customer_id}
    
    Order-->>-Gateway: {order_id, status: "CONFIRMED"}
    Gateway-->>-Client: Order created successfully
```

### 4.2. Rollback Scenario - Prepare Phase Failure

```mermaid
sequenceDiagram
    participant Client
    participant Order as Order Service
    participant Book as Book Service
    participant Pay as Pay Service
    participant Ship as Ship Service
    
    Client->>+Order: POST /orders/2pc<br/>{customer_id, ...}
    
    Note over Order: PHASE 1: PREPARE
    
    Order->>+Book: POST /transactions/prepare-stock
    Book-->>-Order: VOTE_COMMIT
    
    Order->>+Pay: POST /transactions/prepare-payment
    Pay->>Pay: Insufficient balance
    Pay-->>-Order: VOTE_ABORT
    
    Note over Order: Payment voted ABORT<br/>Trigger rollback
    Note over Order: PHASE 2: ABORT
    
    Order->>+Book: POST /transactions/rollback-stock<br/>{transaction_id}
    Book->>Book: Release lock<br/>Restore original stock
    Book-->>-Order: ABORTED
    
    Order->>+Pay: POST /transactions/rollback-payment<br/>{transaction_id}
    Pay->>Pay: Clear prepared state
    Pay-->>-Order: ABORTED
    
    Order->>Order: Mark order as CANCELLED
    
    Order-->>-Client: Order failed:<br/>Insufficient payment balance
```

---

## 5. Order Processing Flow - Saga Pattern (Orchestration)

### 5.1. Happy Path - All Steps Succeed

```mermaid
sequenceDiagram
    participant Client
    participant Order as Order Service<br/>(Orchestrator)
    participant Kafka as Kafka Topics
    participant Book as Book Service
    participant Pay as Pay Service
    participant Ship as Ship Service
    
    Client->>+Order: POST /orders/saga<br/>{customer_id, address, payment_method}
    
    Note over Order: SAGA START
    Order->>Order: Create order (PENDING)
    
    Note over Order,Book: STEP 1: Reserve Book
    Order->>Kafka: PUBLISH saga-book-cmd<br/>{saga_id, step: BOOK_RESERVE, items[]}
    Kafka->>Book: CONSUME saga-book-cmd
    Book->>Book: Reserve stock<br/>(Reduce quantity)
    Book->>Kafka: PUBLISH saga-book-reply<br/>{saga_id, status: SUCCESS}
    Kafka->>Order: CONSUME saga-book-reply
    Order->>Order: Update saga state<br/>(BOOK_RESERVED)
    
    Note over Order,Pay: STEP 2: Process Payment
    Order->>Kafka: PUBLISH saga-payment-cmd<br/>{saga_id, step: PAYMENT_PROCESS, amount}
    Kafka->>Pay: CONSUME saga-payment-cmd
    Pay->>Pay: Create payment record<br/>Process payment
    Pay->>Kafka: PUBLISH saga-payment-reply<br/>{saga_id, status: SUCCESS, payment_id}
    Kafka->>Order: CONSUME saga-payment-reply
    Order->>Order: Update saga state<br/>(PAYMENT_PROCESSED)<br/>Store payment_id
    
    Note over Order,Ship: STEP 3: Schedule Shipment
    Order->>Kafka: PUBLISH saga-shipment-cmd<br/>{saga_id, step: SHIPMENT_SCHEDULE, address}
    Kafka->>Ship: CONSUME saga-shipment-cmd
    Ship->>Ship: Create shipment record
    Ship->>Kafka: PUBLISH saga-shipment-reply<br/>{saga_id, status: SUCCESS, shipment_id}
    Kafka->>Order: CONSUME saga-shipment-reply
    Order->>Order: Update saga state<br/>(COMPLETED)<br/>Order status: CONFIRMED
    
    Note over Order: SAGA COMPLETE
    Order-->>-Client: {order_id, status: "CONFIRMED"}
```

### 5.2. Compensation Flow - Shipment Service Down

```mermaid
sequenceDiagram
    participant Client
    participant Order as Order Service<br/>(Orchestrator)
    participant Kafka as Kafka Topics
    participant Book as Book Service
    participant Pay as Pay Service
    participant Ship as Ship Service
    
    Client->>+Order: POST /orders/saga
    
    Note over Order: SAGA START
    Order->>Order: Create order (PENDING)
    
    Note over Order,Book: STEP 1: Reserve Book
    Order->>Kafka: PUBLISH saga-book-cmd<br/>{step: BOOK_RESERVE}
    Kafka->>Book: CONSUME
    Book->>Book: Reduce stock
    Book->>Kafka: PUBLISH saga-book-reply<br/>{status: SUCCESS}
    Kafka->>Order: CONSUME
    
    Note over Order,Pay: STEP 2: Process Payment
    Order->>Kafka: PUBLISH saga-payment-cmd<br/>{step: PAYMENT_PROCESS}
    Kafka->>Pay: CONSUME
    Pay->>Pay: Create payment
    Pay->>Kafka: PUBLISH saga-payment-reply<br/>{status: SUCCESS, payment_id}
    Kafka->>Order: CONSUME
    
    Note over Order,Ship: STEP 3: Schedule Shipment (Failed)
    Order->>Kafka: PUBLISH saga-shipment-cmd<br/>{step: SHIPMENT_SCHEDULE}
    Note over Ship: Service is DOWN<br/>No consumer
    
    Note over Order: TIMEOUT (30s)<br/>No reply received
    Order->>Order: Saga timeout detected<br/>Trigger COMPENSATION
    
    Note over Order,Ship: COMPENSATE 3: Cancel Shipment (SKIP)
    Note over Ship: Service down,<br/>nothing to compensate
    
    Note over Order,Pay: COMPENSATE 2: Refund Payment
    Order->>Kafka: PUBLISH saga-payment-cmd<br/>{step: PAYMENT_REFUND, payment_id}
    Kafka->>Pay: CONSUME
    Pay->>Pay: Refund payment<br/>Update status: REFUNDED
    Pay->>Kafka: PUBLISH saga-payment-reply<br/>{status: SUCCESS}
    Kafka->>Order: CONSUME
    
    Note over Order,Book: COMPENSATE 1: Release Book Stock
    Order->>Kafka: PUBLISH saga-book-cmd<br/>{step: BOOK_RELEASE, items[]}
    Kafka->>Book: CONSUME
    Book->>Book: Restore stock<br/>(Add back quantity)
    Book->>Kafka: PUBLISH saga-book-reply<br/>{status: SUCCESS}
    Kafka->>Order: CONSUME
    
    Note over Order: SAGA COMPENSATED
    Order->>Order: Update order status<br/>CANCELLED
    
    Order-->>-Client: Order failed:<br/>Shipment service timeout
```

### 5.3. Compensation Flow - Payment Failure

```mermaid
sequenceDiagram
    participant Order as Order Service<br/>(Orchestrator)
    participant Kafka as Kafka Topics
    participant Book as Book Service
    participant Pay as Pay Service
    
    Note over Order: SAGA IN PROGRESS
    
    Note over Order,Book: STEP 1: Reserve Book
    Order->>Kafka: PUBLISH saga-book-cmd<br/>{step: BOOK_RESERVE}
    Kafka->>Book: CONSUME
    Book->>Book: Reduce stock
    Book->>Kafka: PUBLISH saga-book-reply<br/>{status: SUCCESS}
    Kafka->>Order: CONSUME
    
    Note over Order,Pay: STEP 2: Process Payment (Failed)
    Order->>Kafka: PUBLISH saga-payment-cmd<br/>{step: PAYMENT_PROCESS}
    Kafka->>Pay: CONSUME
    Pay->>Pay: Payment failed:<br/>Insufficient balance
    Pay->>Kafka: PUBLISH saga-payment-reply<br/>{status: FAILED, error_message}
    Kafka->>Order: CONSUME
    
    Note over Order: Payment FAILED<br/>Trigger COMPENSATION
    
    Note over Order,Book: COMPENSATE 1: Release Book Stock
    Order->>Kafka: PUBLISH saga-book-cmd<br/>{step: BOOK_RELEASE, items[]}
    Kafka->>Book: CONSUME
    Book->>Book: Restore stock<br/>(Add back quantity)
    Book->>Kafka: PUBLISH saga-book-reply<br/>{status: SUCCESS}
    Kafka->>Order: CONSUME
    
    Note over Order: SAGA COMPENSATED
    Order->>Order: Order status: CANCELLED
```

---

## 6. Service Dependencies Graph

```mermaid
graph LR
    Gateway[API Gateway]
    
    Customer[Customer Service]
    Book[Book Service]
    Cart[Cart Service]
    Staff[Staff Service]
    Manager[Manager Service]
    Catalog[Catalog Service]
    Recommender[Recommender AI]
    Order[Order Service]
    Pay[Pay Service]
    Ship[Ship Service]
    Comment[Comment & Rate]
    
    Gateway --> Customer
    Gateway --> Book
    Gateway --> Cart
    Gateway --> Staff
    Gateway --> Manager
    Gateway --> Catalog
    Gateway --> Recommender
    Gateway --> Order
    Gateway --> Pay
    Gateway --> Ship
    Gateway --> Comment
    
    Cart -.->|Verify book| Book
    Catalog -.->|Get book info| Book
    Recommender -.->|Get book details| Book
    Recommender -.->|Get purchase history| Order
    
    Order -.->|Get cart items| Cart
    Order -.->|Verify stock| Book
    Order -.->|Process payment| Pay
    Order -.->|Create shipment| Ship
    
    Manager -.->|Get sales data| Order
    Manager -.->|Get inventory| Book
    Manager -.->|Get revenue| Pay
    
    style Gateway fill:#ff6b6b
    style Customer fill:#4ecdc4
    style Book fill:#4ecdc4
    style Cart fill:#4ecdc4
    style Order fill:#95e1d3
    style Pay fill:#95e1d3
    style Ship fill:#95e1d3
    style Comment fill:#f3a683
```

---

## 7. Database Schema Diagram

```mermaid
erDiagram
    CUSTOMER ||--o{ CUSTOMER_ADDRESS : has
    CUSTOMER ||--o{ CART : owns
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER ||--o{ REVIEW : writes
    
    CART ||--o{ CART_ITEM : contains
    CART_ITEM }o--|| BOOK : references
    
    BOOK ||--o{ ORDER_ITEM : "ordered in"
    BOOK ||--o{ BOOK_CATEGORY : "belongs to"
    BOOK ||--o{ BOOK_GENRE : "tagged with"
    BOOK ||--o{ REVIEW : "reviewed in"
    
    CATEGORY ||--o{ BOOK_CATEGORY : includes
    GENRE ||--o{ BOOK_GENRE : tags
    
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER ||--|| PAYMENT : "paid by"
    ORDER ||--|| SHIPMENT : "shipped via"
    
    SHIPMENT ||--o{ SHIPMENT_HISTORY : tracks
    PAYMENT ||--o{ PAYMENT_HISTORY : logs
    
    REVIEW ||--o{ REVIEW_REPLY : "has replies"
    
    STAFF ||--o{ STAFF_ACTIVITY : performs
    MANAGER ||--o{ REPORT : generates
    
    CUSTOMER {
        uuid id PK
        string username
        string email
        string password_hash
        string full_name
        string phone
        timestamp created_at
    }
    
    BOOK {
        bigint id PK
        string isbn UK
        string title
        string author
        decimal price
        int stock_quantity
    }
    
    ORDER {
        uuid id PK
        string customer_id FK
        string order_status
        decimal total_amount
        timestamp created_at
    }
    
    PAYMENT {
        uuid id PK
        uuid order_id FK
        string payment_status
        decimal amount
        string transaction_id
    }
    
    SHIPMENT {
        uuid id PK
        uuid order_id FK
        string tracking_number
        string shipping_status
        date estimated_delivery
    }
```

---

## 8. Deployment Architecture (Docker Compose)

```mermaid
graph TB
    subgraph "Docker Network: bookstore-network"
        subgraph "Service Layer"
            GW[api-gateway:8000]
            C1[customer-service:8001]
            C2[book-service:8002]
            C3[cart-service:8003]
            C4[staff-service:8004]
            C5[manager-service:8005]
            C6[catalog-service:8006]
            C7[recommender-ai-service:8007]
            J1[order-service:9001]
            J2[pay-service:9002]
            J3[ship-service:9003]
            N1[comment-rate-service:3001]
        end
        
        subgraph "PostgreSQL Containers"
            PG1[(postgres-customer:5432)]
            PG2[(postgres-staff:5433)]
            PG3[(postgres-manager:5434)]
            PG4[(postgres-recommender:5435)]
            PG5[(postgres-order:5436)]
            PG6[(postgres-payment:5437)]
            PG7[(postgres-shipment:5438)]
        end
        
        subgraph "MySQL Containers"
            MY1[(mysql-book:3306)]
            MY2[(mysql-cart:3307)]
            MY3[(mysql-catalog:3308)]
            MY4[(mysql-comment:3309)]
        end
        
        C1 -.->|DB Connection| PG1
        C4 -.->|DB Connection| PG2
        C5 -.->|DB Connection| PG3
        C7 -.->|DB Connection| PG4
        J1 -.->|DB Connection| PG5
        J2 -.->|DB Connection| PG6
        J3 -.->|DB Connection| PG7
        
        C2 -.->|DB Connection| MY1
        C3 -.->|DB Connection| MY2
        C6 -.->|DB Connection| MY3
        N1 -.->|DB Connection| MY4
    end
    
    Client[External Client]
    Client -->|Port 8000| GW
    
    style GW fill:#ff6b6b
    style C1 fill:#4ecdc4
    style C2 fill:#4ecdc4
    style C3 fill:#4ecdc4
    style C4 fill:#4ecdc4
    style C5 fill:#4ecdc4
    style C6 fill:#4ecdc4
    style C7 fill:#4ecdc4
    style J1 fill:#95e1d3
    style J2 fill:#95e1d3
    style J3 fill:#95e1d3
    style N1 fill:#f3a683
```

---

## 9. Health Check & Monitoring Flow

```mermaid
graph TB
    Monitor[Monitoring System]
    
    subgraph "Health Endpoints"
        H1[/health - Gateway]
        H2[/health - Customer]
        H3[/health - Book]
        H4[/health - Cart]
        H5[/health - Staff]
        H6[/health - Manager]
        H7[/health - Catalog]
        H8[/health - Recommender]
        H9[/health - Order]
        H10[/health - Pay]
        H11[/health - Ship]
        H12[/health - Comment]
    end
    
    subgraph "Metrics Endpoints"
        M1[/metrics - Gateway]
        M2[/metrics - Customer]
        M3[/metrics - Book]
        M4[/metrics - Cart]
        M5[/metrics - Staff]
        M6[/metrics - Manager]
        M7[/metrics - Catalog]
        M8[/metrics - Recommender]
        M9[/metrics - Order]
        M10[/metrics - Pay]
        M11[/metrics - Ship]
        M12[/metrics - Comment]
    end
    
    Monitor -->|Poll every 30s| H1
    Monitor -->|Poll every 30s| H2
    Monitor -->|Poll every 30s| H3
    Monitor -->|Poll every 30s| H4
    Monitor -->|Poll every 30s| H5
    Monitor -->|Poll every 30s| H6
    Monitor -->|Poll every 30s| H7
    Monitor -->|Poll every 30s| H8
    Monitor -->|Poll every 30s| H9
    Monitor -->|Poll every 30s| H10
    Monitor -->|Poll every 30s| H11
    Monitor -->|Poll every 30s| H12
    
    Monitor -->|Collect| M1
    Monitor -->|Collect| M2
    Monitor -->|Collect| M3
    Monitor -->|Collect| M4
    Monitor -->|Collect| M5
    Monitor -->|Collect| M6
    Monitor -->|Collect| M7
    Monitor -->|Collect| M8
    Monitor -->|Collect| M9
    Monitor -->|Collect| M10
    Monitor -->|Collect| M11
    Monitor -->|Collect| M12
    
    style Monitor fill:#ffd93d
```

---

## 10. User Journey - Customer Purchasing Book

```mermaid
journey
    title Customer Book Purchase Journey
    section Discovery
      Browse books: 5: Customer
      Search by category: 5: Customer
      View book details: 5: Customer
      Read reviews: 4: Customer
    section Selection
      Add to cart: 5: Customer
      Update quantity: 3: Customer
      View cart: 5: Customer
      Get recommendations: 4: Customer
    section Checkout
      Proceed to checkout: 5: Customer
      Enter shipping address: 3: Customer
      Review order: 4: Customer
    section Payment
      Enter payment details: 3: Customer
      Process payment: 5: Customer
      Receive confirmation: 5: Customer
    section Delivery
      Track shipment: 5: Customer
      Receive package: 5: Customer
      Write review: 4: Customer
```

---

## 11. Component Communication Pattern

```mermaid
graph TB
    subgraph "Synchronous Communication - REST/HTTP"
        Client1[Client] -->|HTTPS| Gateway1[API Gateway]
        Gateway1 -->|HTTP| Service1[Backend Services]
    end
    
    subgraph "Service-to-Service Communication"
        ServiceA[Service A] -->|REST API Call| ServiceB[Service B]
        ServiceB -->|Response| ServiceA
    end
    
    subgraph "Database Isolation"
        Svc1[Service 1] -.->|Own DB| DB1[(Database 1)]
        Svc2[Service 2] -.->|Own DB| DB2[(Database 2)]
        Svc3[Service 3] -.->|Own DB| DB3[(Database 3)]
    end
    
    Note1[Note: Each service owns its database<br/>No direct database sharing]
    Note2[Note: All communication via REST APIs<br/>No direct service database access]
    
    style Gateway1 fill:#ff6b6b
    style Note1 fill:#ffffcc
    style Note2 fill:#ffffcc
```

---

## 12. Scalability Architecture

```mermaid
graph TB
    LB[Load Balancer]
    
    subgraph "API Gateway Cluster"
        GW1[API Gateway 1]
        GW2[API Gateway 2]
        GW3[API Gateway N]
    end
    
    subgraph "Service Instances - Auto Scaling"
        subgraph "Book Service Cluster"
            BS1[Book Service 1]
            BS2[Book Service 2]
            BS3[Book Service N]
        end
        
        subgraph "Order Service Cluster"
            OS1[Order Service 1]
            OS2[Order Service 2]
            OS3[Order Service N]
        end
    end
    
    subgraph "Database Layer"
        DBMaster[(Master DB)]
        DBReplica1[(Replica 1)]
        DBReplica2[(Replica 2)]
    end
    
    Client[Clients] --> LB
    LB --> GW1
    LB --> GW2
    LB --> GW3
    
    GW1 --> BS1
    GW1 --> BS2
    GW2 --> BS3
    
    GW2 --> OS1
    GW3 --> OS2
    
    BS1 -.->|Write| DBMaster
    BS2 -.->|Read| DBReplica1
    BS3 -.->|Read| DBReplica2
    
    DBMaster -.->|Replication| DBReplica1
    DBMaster -.->|Replication| DBReplica2
    
    style LB fill:#ffd93d
    style GW1 fill:#ff6b6b
    style GW2 fill:#ff6b6b
    style GW3 fill:#ff6b6b
```

---

## 13. Technology Stack Visualization

```mermaid
graph TB
    subgraph "Frontend Layer"
        Web[Web Application<br/>React/Vue/Angular]
        Mobile[Mobile App<br/>React Native/Flutter]
    end
    
    subgraph "API Layer"
        Gateway[API Gateway<br/>Django REST Framework<br/>Python 3.11]
    end
    
    subgraph "Service Layer - Languages"
        Python[Python Services<br/>Django REST Framework<br/>8 services]
        Java[Java Services<br/>Spring Boot<br/>3 services]
        NodeJS[Node.js Service<br/>Express.js<br/>1 service]
    end
    
    subgraph "Data Layer"
        Postgres[PostgreSQL 14<br/>7 databases]
        MySQL[MySQL 8<br/>4 databases]
    end
    
    subgraph "Infrastructure"
        Docker[Docker Containers]
        Compose[Docker Compose]
    end
    
    Web --> Gateway
    Mobile --> Gateway
    
    Gateway --> Python
    Gateway --> Java
    Gateway --> NodeJS
    
    Python -.-> Postgres
    Python -.-> MySQL
    Java -.-> Postgres
    NodeJS -.-> MySQL
    
    Docker --> Python
    Docker --> Java
    Docker --> NodeJS
    Docker --> Postgres
    Docker --> MySQL
    
    Compose --> Docker
    
    style Gateway fill:#ff6b6b
    style Python fill:#4ecdc4
    style Java fill:#95e1d3
    style NodeJS fill:#f3a683
    style Docker fill:#2e86de
    style Compose fill:#2e86de
```

---

## 14. Error Handling & Circuit Breaker Pattern

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant ServiceA
    participant ServiceB
    
    Note over Gateway: Circuit Breaker: CLOSED (Normal)
    
    Client->>+Gateway: Request
    Gateway->>+ServiceA: Forward request
    ServiceA->>+ServiceB: Call dependent service
    ServiceB-->>-ServiceA: Success response
    ServiceA-->>-Gateway: Success
    Gateway-->>-Client: Success response
    
    Note over Gateway: Circuit Breaker: Detecting failures
    
    Client->>+Gateway: Request
    Gateway->>+ServiceA: Forward request
    ServiceA->>+ServiceB: Call dependent service
    ServiceB--x-ServiceA: Timeout/Error
    ServiceA-->>-Gateway: Error
    Gateway-->>-Client: Error response
    
    Note over Gateway: Circuit Breaker: OPEN (After threshold)
    
    Client->>+Gateway: Request
    Gateway->>Gateway: Circuit OPEN<br/>Fail fast
    Gateway-->>-Client: Service unavailable<br/>(Return cached/default)
    
    Note over Gateway: Circuit Breaker: HALF-OPEN (After timeout)
    
    Client->>+Gateway: Request
    Gateway->>+ServiceA: Test request
    ServiceA-->>-Gateway: Success
    Gateway-->>-Client: Success
    
    Note over Gateway: Circuit Breaker: CLOSED (Recovered)
```

---

**Version**: 1.0  
**Last Updated**: March 4, 2026  
**Status**: Architecture Diagrams Complete

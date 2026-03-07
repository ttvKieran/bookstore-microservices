# Comment and Rating Service

Node.js/Express microservice for managing book reviews and ratings with social features.

## Features

- **Reviews**: Combined rating (1-5 stars) + comment in a single review
- **Upvote/Downvote**: Social engagement on reviews
- **Review Replies**: Threaded discussions with reply support
- **Average Ratings**: Calculate average ratings and rating distributions
- **Verified Purchase**: Flag reviews from verified purchases
- **MySQL Database**: Persistent storage with automatic table initialization
- **RESTful API**: Clean and intuitive endpoints

## Technologies

- Node.js 18
- Express.js 4
- MySQL 8.0
- mysql2 (Promise-based MySQL client)

## API Endpoints

### Reviews

- `POST /reviews` - Create a review (rating + comment)
- `GET /reviews/book/:bookId` - Get all reviews for a book (with pagination & sorting)
- `GET /reviews/book/:bookId/average` - Get average rating and distribution
- `GET /reviews/:reviewId` - Get a specific review with replies
- `PUT /reviews/:reviewId` - Update a review
- `DELETE /reviews/:reviewId` - Delete a review
- `POST /reviews/:reviewId/upvote` - Upvote a review
- `POST /reviews/:reviewId/downvote` - Downvote a review
- `GET /customers/:customerId/reviews` - Get all reviews by a customer

### Replies

- `POST /reviews/:reviewId/replies` - Add a reply to a review
- `GET /reviews/:reviewId/replies` - Get all replies for a review

### System

- `GET /health` - Health check
- `GET /metrics` - Service metrics

## Query Parameters

### GET /reviews/book/:bookId
- `page` (default: 1) - Page number
- `limit` (default: 10) - Reviews per page
- `sort` - Sort order:
  - `recent` (default) - Most recent first
  - `helpful` - By upvotes - downvotes
  - `rating_high` - Highest rating first
  - `rating_low` - Lowest rating first

## Environment Variables

```
DB_HOST=mysql-comment
DB_PORT=3306
DB_USER=comment_user
DB_PASSWORD=comment_pass
DB_NAME=comment_db
PORT=3000
```

## Database Schema

### Reviews Table
- `id` (BIGINT, AUTO_INCREMENT, PRIMARY KEY)
- `book_id` (BIGINT, indexed)
- `customer_id` (VARCHAR(36), indexed)
- `rating` (INT, 1-5 constraint)
- `comment` (TEXT)
- `is_verified_purchase` (BOOLEAN)
- `upvotes` (INT, default 0)
- `downvotes` (INT, default 0)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Review Replies Table
- `id` (BIGINT, AUTO_INCREMENT, PRIMARY KEY)
- `review_id` (BIGINT, FK to reviews.id, CASCADE DELETE)
- `customer_id` (VARCHAR(36), indexed)
- `comment` (TEXT)
- `created_at` (TIMESTAMP)

## Running Locally

```bash
npm install
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Docker

```bash
docker build -t comment-rate-service .
docker run -p 3001:3000 comment-rate-service
```

## Example Requests

### Create a Review
```bash
POST /reviews
Content-Type: application/json

{
  "book_id": 1,
  "customer_id": "123e4567-e89b-12d3-a456-426614174000",
  "rating": 5,
  "comment": "Excellent book! Highly recommended.",
  "is_verified_purchase": true
}
```

### Get Reviews for a Book
```bash
GET /reviews/book/1?page=1&limit=10&sort=helpful
```

### Upvote a Review
```bash
POST /reviews/123/upvote
```

### Add a Reply
```bash
POST /reviews/123/replies
Content-Type: application/json

{
  "customer_id": "another-uuid",
  "comment": "I totally agree with this review!"
}
```

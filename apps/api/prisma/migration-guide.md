# DB Migration Steps

-> Keep db backup and pause application for a while
-> remove all rows from account and session table
-> push those tables to db with renamed accounts sessions in user table
-> migrate all the passwords to accounts table
-> generate any missing email from the username
-> emailverified datetime to boolean
-> add new fields to user and new tables verification and apikey

## Schema Changes Summary

### `User` Table

- **Added fields**:
  - `displayUsername: String?`
  - `banned: Boolean?`
  - `banReason: String?`
  - `banExpires: DateTime?`
  - `apikeys: Apikey[]`
- **Removed fields**:
  - `password: String?`
- **Modified fields**:
  - `email`: `String?` -> `String`
  - `emailVerified`: `DateTime?` -> `Boolean @default(false)`
  - `account`: renamed to `accounts`
  - `Session`: renamed to `sessions`
- **Table changes**:
  - Added `@@map("user")`

### `Account` Table

- Drop complete Account table

### `Session` Table

- **Added fields**:
  - `token: String`
  - `impersonatedBy: String?`
- **Table changes**:

  - Added `@@unique([token])`
  - Added `@@map("session")`

- No effect on the migration since only new fields were added

---

## New Tables

### `Verification` Table

- No effect on the migration

### `Apikey` Table

- No effect on the migration

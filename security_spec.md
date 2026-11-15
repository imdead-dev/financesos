# FINANCE OS Security Specification

## 1. Data Invariants
1. **Strict User Isolation**: Every collection under `/users/{userId}/...` is readable and writable exclusively by the authenticated user where `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Identity Integrity**: Every document MUST carry `userId == request.auth.uid`, and `userId` is immutable after creation.
3. **Referential Integrity**:
   - A `savingsDeposit` cannot be created unless its referenced `goalId` exists in `/users/{userId}/savingsGoals/{goalId}`.
   - An `investmentContribution` cannot be created unless its referenced `investmentId` exists in `/users/{userId}/investments/{investmentId}`.
4. **Temporal Integrity**: `createdAt == request.time` on creation and remains immutable on updates; `updatedAt == request.time` on creation and updates.
5. **Bounded Inputs**: All string fields have strict `.size()` caps, positive numeric constraints on amounts where required, and regex validation on IDs and dates (`YYYY-MM-DD`).
6. **PII Isolation**: `email` and `displayName` are stored exclusively in `/users/{userId}/private/profile`, accessible only by the owner.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read of `/users/userA/transactions/tx1`.
2. Cross-user read of `/users/userA/transactions/tx1` by `userB`.
3. Cross-user write with spoofed `userId: "userA"` by `userB` in `/users/userB/transactions/tx1`.
4. Unverified email write (`email_verified: false`) to `/users/userA/transactions/tx1`.
5. Shadow field injection (`isAdmin: true`) in transaction creation payload.
6. Client-spoofed `createdAt` timestamp (not equal to `request.time`).
7. Modifying immutable `createdAt` or `userId` during transaction update.
8. Oversized description (> 160 chars) or notes (> 400 chars) resource exhaustion payload.
9. Negative or zero transaction `amount: -500` injection.
10. Orphaned `savingsDeposit` referencing a non-existent `goalId`.
11. Orphaned `investmentContribution` referencing a non-existent `investmentId`.
12. Invalid path variable ID containing special characters or exceeding 128 chars.

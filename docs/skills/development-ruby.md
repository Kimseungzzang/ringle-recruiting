Apply these rules when writing or reviewing Ruby on Rails code.

## Language

* All code comments must be written in Korean.
* The `api.md` file must be written in Korean.
* Class names, method names, and variable names must follow standard Ruby and Rails naming conventions in English.

## General Ruby Style

* Follow the Ruby Style Guide and RuboCop rules.
* Use two spaces for indentation.
* Keep methods small and focused on a single responsibility.
* Avoid unnecessary metaprogramming.
* Prefer explicit and readable code over clever or implicit behavior.
* Do not hardcode meaningful strings, numbers, or status values.
* Manage status values with enums, constants, or Value Objects.
* Do not overuse generic `Hash` objects when a meaningful DTO or Value Object would be clearer.

## Architecture

* Controllers handle HTTP requests and responses only.
* Service Objects handle business logic and use-case execution.
* Models handle domain rules directly related to their own state.
* Query Objects or Repositories handle complex data access.
* Never skip architectural layers.
* Do not write complex ActiveRecord queries directly in Controllers.
* Do not update multiple Models directly from Controllers.
* Request data to Model conversion must happen in the Service Object layer.
* Controllers must not use ActiveRecord Models as request objects.
* Do not render ActiveRecord Models directly in API responses.
* Return API responses through Serializers or Response DTOs.
* Do not hide business logic inside Concerns, Callbacks, or Helpers.
* Except for very simple CRUD operations, use Service Objects for use cases.

## Controller

* Controllers are responsible only for:

  * Validating request parameters
  * Checking authentication and authorization results
  * Calling Service Objects
  * Returning HTTP status codes and responses
* Do not write business-condition branches in Controllers.
* Do not write database queries directly in Controllers.
* Do not add broad `rescue` blocks in Controllers.
* Always use Strong Parameters.
* Never use `params.permit!`.
* Do not expose ActiveRecord Models directly in requests or responses.

## Service Object

* Each Service Object must handle exactly one use case.
* Use clear and descriptive Service Object names.

  * `Orders::Create`
  * `Orders::Cancel`
  * `Payments::Approve`
* Use one consistent execution method across the project.

  * Example: `call`
* Pass required dependencies through the constructor or explicit method arguments.
* Do not depend on global state.
* Wrap changes to multiple Models in a transaction when they belong to one unit of work.
* Service Object results must clearly represent success, failure, and returned data.
* Do not represent failure with only `nil` or `false`.
* Use a Result Object or an explicit exception.

## Model

* Do not treat Models as passive data containers only.
* Change state through meaningful domain methods.
* Avoid directly calling `update(status: ...)` from outside the Model.

```ruby
# Preferred
order.cancel!

# Avoid
order.update!(status: :cancelled)
```

* Avoid exposing unrestricted setters.
* Do not place external API calls or complex business logic in Model Callbacks.
* Use `after_create`, `after_save`, and `after_commit` only when necessary because they can hide side effects.
* When a Callback is required, leave a Korean comment explaining its behavior and reason.
* Avoid unnecessary bidirectional associations.
* Specify the `dependent` option when association cleanup behavior matters.
* Enforce data integrity with database constraints as well as Model validations.

## Dependency Management

* Avoid creating dependencies directly inside business objects.
* Inject external dependencies through constructors or method arguments when they need to be tested.
* Do not use global variables or global Singleton state.
* Rails autoloading may be used, but dependencies between classes must remain explicit.

```ruby
class Payments::Approve
  def initialize(payment_gateway:)
    @payment_gateway = payment_gateway
  end

  def call(order:)
    # 결제 승인 로직
  end
end
```

## Transaction

* Manage transactions in Service Objects.
* Do not use `ActiveRecord::Base.transaction` in Controllers.
* Do not control transaction boundaries from Model Callbacks.
* As a rule, do not call external APIs inside database transactions.
* External API calls increase database lock duration, so separate them from the transaction where possible.
* When database changes and external system updates must remain coordinated, consider a state machine, Outbox Pattern, or compensation logic.
* Do not use `ActiveRecord::Rollback` to silently hide failures.
* Transaction failures must be visible to the caller.
* Always consider possible concurrency issues.
* If race conditions are possible, leave a Korean comment explaining the cause and mitigation.
* Do not rely on process-local `Mutex` or `synchronize` for concurrency control in a distributed environment.
* Use the appropriate concurrency-control mechanism:

  * Database Unique Constraint
  * Optimistic Locking
  * Pessimistic Locking
  * Advisory Lock
  * Distributed Lock
* Always ask the user before introducing asynchronous processing.
* Do not add Sidekiq, Active Job, or asynchronous event processing without user approval.

## ActiveRecord / Persistence

* Always prevent or resolve N+1 queries.
* Use `includes`, `preload`, or `eager_load` appropriately when associated data is required.
* Confirm that `includes` loads only the associations that are actually needed.
* Use tools such as Bullet in development and test environments to detect N+1 problems.
* Move complex query logic into Query Objects.
* Use Scopes only for simple, reusable query conditions.
* Do not place complex business logic inside Scopes.
* When processing large datasets, consider `find_each` or `in_batches` instead of `each`.
* Use `select` or `pluck` when only specific columns are required.
* Be careful not to bypass domain logic by overusing `pluck`.
* Do not rely on application validations alone.
* Add database constraints for uniqueness, non-null values, and foreign keys.
* Inspect query execution plans for complex queries.
* Review indexes for columns used in searches, sorting, and joins.
* Avoid executing queries inside loops that modify large amounts of data.

## Nil Handling

* Avoid returning meaningless `nil` values.
* Return empty arrays or empty Relations instead of `nil` for collections.
* Clearly distinguish between lookup failure and an optional missing value.
* Use `find` or `find_by!` when a record must exist.
* Handle optional values explicitly.
* Do not overuse the Safe Navigation Operator, `&.`, to hide errors.
* Do not use `try` to suppress missing-method errors.
* When a value may be `nil`, make that intention clear through the method name, documentation, or tests.

## Exception Handling

* Centralize exception handling in `ApplicationController` or a shared exception-handling module.
* Do not repeat `rescue` logic in individual Controllers.
* Do not catch every exception with `rescue StandardError`.
* Rescue only specific exceptions that can be meaningfully handled.
* Custom exceptions must inherit from `StandardError`.
* Distinguish business errors from system errors.
* Business exceptions must include a clear error code and message.
* Never catch and ignore exceptions.
* Do not return a successful response after only logging an exception.
* Do not include passwords, tokens, or personal information in exception messages.

```ruby
class OrderNotFoundError < StandardError
end
```

## API Design

### URL

* Use plural nouns.

  * `/v1/users`
  * `/v1/orders/:id`
  * `/v1/orders/:order_id/items`
* Do not use verbs in URLs.

  * Do not use `/get_user`
  * Use `GET /v1/users/:id`
* Use lowercase letters and hyphens.

  * `/user-profiles`
  * Do not use `/userProfiles`
* Keep URL nesting to a maximum of three levels.
* If deeper nesting is required, create a separate resource.
* Include `/v1` from the beginning.

### HTTP Methods

* `GET`: Read, idempotent, no side effects
* `POST`: Create or perform a non-idempotent command
* `PUT`: Full replacement, idempotent
* `PATCH`: Partial update
* `DELETE`: Remove, idempotent

### Response Format

* Use one consistent format for success and error responses.
* Use HTTP status codes meaningfully.
* At minimum, distinguish:

  * `200 OK`
  * `201 Created`
  * `204 No Content`
  * `400 Bad Request`
  * `401 Unauthorized`
  * `403 Forbidden`
  * `404 Not Found`
  * `409 Conflict`
  * `422 Unprocessable Entity`
  * `500 Internal Server Error`
* Error responses must include both `code` and `message`.

```json
{
  "data": {
    "id": 1
  }
}
```

```json
{
  "code": "ORDER_NOT_FOUND",
  "message": "주문을 찾을 수 없습니다."
}
```

### Request / Response Object

* Validate request parameters through a Form Object or Request DTO.
* Do not use ActiveRecord Models as request DTOs.
* Return responses through Serializers or Response DTOs.
* Do not directly return an entire ActiveRecord Model with `render json:`.
* Explicitly define allowed attributes.
* Prevent internal columns, authentication data, and personal information from being exposed.

## Validation

* Use Model validations for simple data-integrity rules.
* Handle business validations spanning multiple Models in Service Objects.
* Validate API request formats with Form Objects or Request DTOs.
* Do not try to solve concurrency problems with Model validations alone.
* Use a database Unique Constraint when duplicate prevention is required.
* Convert validation failures into a consistent API error format.

## Serialization

* Do not assemble JSON response structures directly in Controllers.
* Use a Serializer or Response DTO.
* Do not put database queries or business logic inside Serializers.
* Ensure Serializers do not introduce N+1 queries.
* Use one consistent date and time format across the project.
* Represent monetary values with integer minor units or Decimal, not Float.

## Background Jobs

* Always ask the user before introducing Background Jobs.
* Jobs must not implement business logic directly; they must call Service Objects.
* Pass record IDs rather than entire ActiveRecord objects as Job arguments.
* Jobs may be retried, so they must be idempotent.
* Always consider duplicate execution.
* Jobs that call external APIs must define timeout and retry policies.
* Never allow infinite retries.
* Add logging and monitoring information so failed Jobs can be traced.

## Testing

* Always write tests alongside new code.
* When modifying code, update all affected tests.
* Service Object tests should avoid depending on the full Rails application context where possible.
* Isolate external Service Object dependencies with Test Doubles.
* Model tests must cover validations, associations, and domain methods.
* Query Object tests must verify query results and N+1 behavior.
* Use Request Specs to test API requests and responses.
* Prefer Request Specs over Controller Specs.
* Do not write tests that only verify stubs.
* Test externally observable behavior rather than implementation details.
* Database-dependent tests must use the same database engine as production.
* Do not replace production database behavior with SQLite or another different database engine.
* Use Testcontainers when necessary.
* Do not make FactoryBot factories unnecessarily complex.
* Avoid creating unrelated associated records in test data.
* Tests must cover:

  * Valid input
  * Invalid input
  * Missing records
  * Unauthorized access
  * Duplicate requests
  * Concurrency issues
  * External system failures
  * Transaction rollback

## Configuration

* Separate configuration by environment.
* Never commit secrets to code or Git.
* Store secrets in environment variables or Rails Credentials.
* Use `ENV.fetch` for required environment variables so the application fails fast when they are missing.
* Do not provide arbitrary defaults for security-sensitive settings.
* Do not scatter configuration access across multiple files.
* Group related settings into dedicated Configuration Objects.
* Do not expose debug logs or detailed exception information in production.

```ruby
database_url = ENV.fetch("DATABASE_URL")
```

## Security

* Always use Strong Parameters.
* Do not manually concatenate SQL strings.
* Do not interpolate user input into SQL.
* Distinguish authentication from authorization.
* Always verify access permissions for resources.
* Never log passwords, tokens, or API keys.
* Restrict permitted fields to prevent Mass Assignment vulnerabilities.
* Exclude sensitive fields in Serializers.
* Validate file extensions, MIME types, and file sizes for uploads.
* Review SSRF risks when making requests to user-provided external URLs.

## Logging

* Do not use `puts` in production code.
* Use `Rails.logger`.
* Include traceable identifiers in logs.
* Never log personal information or authentication credentials.
* Include enough context in exception logs to identify the root cause.
* Do not log the same exception repeatedly across multiple layers.

## API Documentation

* Whenever an API is created or modified, update the `api.md` file in the project root.
* The `api.md` file must be written in Korean.
* API documentation must include:

  * HTTP Method
  * URL
  * Request Headers
  * Path Parameters
  * Query Parameters
  * Request Body
  * Success Response
  * Error Response
  * HTTP Status Codes
  * Error Codes
* During testing or code review, verify that the implementation and documentation match.

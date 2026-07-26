import { Effect } from "effect";
import { algorithmPaths } from "./algorithm-paths";

export type {
	AlgorithmPath,
	AlgorithmPatternLesson,
	PracticeProblem,
} from "./algorithm-paths";

export type SystemTermCard = {
	id: string;
	term: string;
	category: "concept";
	definition: string;
	whyItMatters: string;
	example: string;
};

type SystemTerm = Omit<SystemTermCard, "category">;

export type ArchitecturePatternCard = {
	id: string;
	title: string;
	category: "architecture-pattern";
	architectureType: "style" | "pattern";
	description: string;
	solves: string;
	useWhen: string;
	tradeoff: string;
	example: string;
};

export type FlashcardDecks = {
	systemTerms: readonly SystemTermCard[];
	architecturePatterns: readonly ArchitecturePatternCard[];
	algorithmPaths: typeof algorithmPaths;
};

const systemTerms: readonly SystemTerm[] = [
	{
		id: "cache",
		term: "Cache",
		definition:
			"A cache keeps a copy of data that costs time or money to fetch again.",
		whyItMatters:
			"It can make common reads faster and reduce work on the main database or service.",
		example:
			"Store a user's profile for five minutes after the first database read.",
	},
	{
		id: "cdn",
		term: "CDN",
		definition:
			"A content delivery network stores static files near users around the world.",
		whyItMatters:
			"It shortens the trip for images, scripts, and videos while reducing traffic to your origin server.",
		example:
			"Serve a product image from a nearby edge location instead of one server in Virginia.",
	},
	{
		id: "load-balancer",
		term: "Load balancer",
		definition: "A load balancer sends incoming requests to healthy servers.",
		whyItMatters:
			"It spreads work, lets you add servers, and keeps one failed server from taking all traffic.",
		example:
			"Send each web request to the least busy healthy application server.",
	},
	{
		id: "queue",
		term: "Queue",
		definition: "A queue stores work until another service can handle it.",
		whyItMatters:
			"It absorbs bursts and lets slow work happen outside the user's request.",
		example: "Put an image-resize job on a queue after a user uploads a photo.",
	},
	{
		id: "idempotency",
		term: "Idempotency",
		definition:
			"An action is idempotent when repeating the same request has the same final result as doing it once.",
		whyItMatters:
			"Retries are normal. Idempotency stops a retry from creating two payments, orders, or emails.",
		example:
			"Save a payment request under an idempotency key and return the saved result on a retry.",
	},
	{
		id: "rate-limiter",
		term: "Rate limiter",
		definition:
			"A rate limiter restricts how often one client can perform an action.",
		whyItMatters:
			"It protects shared systems from abuse and keeps a traffic spike from using all capacity.",
		example: "Allow one account to make 100 API requests each minute.",
	},
	{
		id: "replication",
		term: "Replication",
		definition:
			"Replication keeps copies of the same data on more than one machine or in more than one place.",
		whyItMatters:
			"It can keep data available after a machine fails and can spread read work.",
		example:
			"Write to a primary database and copy each change to two replicas in other availability zones.",
	},
	{
		id: "sharding",
		term: "Sharding",
		definition:
			"Sharding splits one data set across several databases by a chosen key.",
		whyItMatters:
			"It can increase storage and write capacity, but it makes queries, moves, and recovery harder.",
		example:
			"Store users whose IDs start with 0–3 on one shard and 4–7 on another.",
	},
	{
		id: "partitioning",
		term: "Partitioning",
		definition:
			"Partitioning divides data into smaller groups, often by time, region, or key range.",
		whyItMatters:
			"It can make large tables easier to query, keep, and remove without always requiring separate databases.",
		example:
			"Keep click events in monthly partitions and delete the oldest month after the retention period.",
	},
	{
		id: "consistency",
		term: "Consistency",
		definition:
			"Consistency describes what a read may return after a write, especially when data has copies.",
		whyItMatters:
			"The product decides whether it can show an older value or must wait until every reader sees the new one.",
		example:
			"A bank balance may need a fresh read, while a social-media like count may safely lag.",
	},
	{
		id: "backpressure",
		term: "Backpressure",
		definition:
			"Backpressure slows or rejects new work when a downstream service cannot keep up.",
		whyItMatters:
			"It prevents a slow dependency from filling memory, exhausting workers, and causing a wider failure.",
		example:
			"Stop accepting more image jobs when the queue reaches its safe limit.",
	},
	{
		id: "circuit-breaker",
		term: "Circuit breaker",
		definition:
			"A circuit breaker stops calls to a dependency that is failing, then tests it again later.",
		whyItMatters:
			"It avoids wasting threads and time on a service that cannot answer and helps the rest of the app recover.",
		example:
			"After several payment-provider timeouts, return a clear error for one minute instead of sending more calls.",
	},
];

const additionalSystemTerms: readonly SystemTerm[] = [
	{
		id: "dns",
		term: "DNS",
		definition:
			"The domain name system turns a name such as app.example.com into an address that computers can use.",
		whyItMatters:
			"It sits before most user traffic. Its cache time controls how quickly a domain change reaches users.",
		example: "Point api.example.com at a load balancer's address.",
	},
	{
		id: "reverse-proxy",
		term: "Reverse proxy",
		definition:
			"A reverse proxy receives a request on behalf of an application server and sends it to the right internal service.",
		whyItMatters:
			"It can end TLS, cache responses, compress data, and hide internal servers from the public internet.",
		example:
			"Nginx accepts HTTPS traffic and forwards it to a Node application.",
	},
	{
		id: "horizontal-scaling",
		term: "Horizontal scaling",
		definition:
			"Horizontal scaling adds more machines that perform the same work.",
		whyItMatters:
			"It can raise capacity and survive one machine failure when the service does not keep user state in one process.",
		example:
			"Run ten identical API servers behind a load balancer instead of one.",
	},
	{
		id: "vertical-scaling",
		term: "Vertical scaling",
		definition:
			"Vertical scaling gives one machine more CPU, memory, or storage.",
		whyItMatters:
			"It is often the simplest first step, but one machine has a limit and can become a single point of failure.",
		example: "Move a database from a 4-core machine to a 32-core machine.",
	},
	{
		id: "latency",
		term: "Latency",
		definition: "Latency is how long one operation takes from start to finish.",
		whyItMatters:
			"A user feels latency directly, so a design needs a target for common and slow requests.",
		example: "A search request has a p95 latency target of 200 milliseconds.",
	},
	{
		id: "throughput",
		term: "Throughput",
		definition:
			"Throughput is the amount of work a system completes in a unit of time.",
		whyItMatters:
			"It helps you size workers, databases, and network links for expected load.",
		example: "A service processes 10,000 events each second.",
	},
	{
		id: "availability",
		term: "Availability",
		definition:
			"Availability is the share of time that a system can serve a valid request.",
		whyItMatters:
			"A target such as 99.9% makes failure handling, redundancy, and planned maintenance concrete.",
		example: "A payment API aims for 99.99% availability each month.",
	},
	{
		id: "eventual-consistency",
		term: "Eventual consistency",
		definition:
			"After a write, different copies of data may disagree for a short time but later converge.",
		whyItMatters:
			"It can keep a distributed system responsive, but the product must tolerate an older read.",
		example:
			"A new profile photo may appear on one feed before it appears on another.",
	},
	{
		id: "strong-consistency",
		term: "Strong consistency",
		definition:
			"After a write succeeds, a later read returns that write or a newer value.",
		whyItMatters:
			"It simplifies important decisions such as preventing an account from spending the same balance twice.",
		example:
			"A stock trade checks the latest available shares before it completes.",
	},
	{
		id: "read-replica",
		term: "Read replica",
		definition:
			"A read replica is a copy of a database that handles read requests.",
		whyItMatters:
			"It can take read work from the primary database, but copied data may arrive late.",
		example:
			"Send product-page reads to replicas and order writes to the primary.",
	},
	{
		id: "database-index",
		term: "Database index",
		definition:
			"A database index is an extra data structure that helps the database find matching rows quickly.",
		whyItMatters:
			"It can speed a frequent query, but it uses storage and adds work to every write.",
		example: "Index user_id when most queries look up orders for one user.",
	},
	{
		id: "transaction",
		term: "Transaction",
		definition:
			"A transaction groups database changes so they either all succeed or all fail together.",
		whyItMatters:
			"It protects rules that span more than one write, such as moving money between accounts.",
		example: "Subtract from one balance and add to another in one transaction.",
	},
	{
		id: "object-storage",
		term: "Object storage",
		definition:
			"Object storage keeps files as objects with an ID and metadata instead of as rows in a database table.",
		whyItMatters:
			"It suits large, durable files and keeps file traffic away from an application's main database.",
		example: "Store uploaded videos in S3 and save only their IDs in Postgres.",
	},
	{
		id: "publish-subscribe",
		term: "Publish-subscribe",
		definition:
			"Publish-subscribe lets a producer send one event to a topic that several consumers can receive.",
		whyItMatters:
			"It lets new consumers react to an event without changing the producer.",
		example:
			"An order-created event reaches billing, email, and analytics consumers.",
	},
	{
		id: "dead-letter-queue",
		term: "Dead-letter queue",
		definition:
			"A dead-letter queue holds messages that failed too many times to process normally.",
		whyItMatters:
			"It keeps one bad message from blocking useful work and gives the team a place to inspect failures.",
		example: "Move an invalid payment event aside after five failed attempts.",
	},
	{
		id: "retry",
		term: "Retry with backoff",
		definition:
			"A retry with backoff waits longer between repeated attempts after a temporary failure.",
		whyItMatters:
			"The wait reduces the chance that many clients make an outage worse at the same time.",
		example:
			"Retry a timed-out request after 100 ms, then 200 ms, then 400 ms with some random spread.",
	},
	{
		id: "health-check",
		term: "Health check",
		definition:
			"A health check is a small request that reports whether a service can do the work assigned to it.",
		whyItMatters:
			"Load balancers and deploy tools use it to stop sending traffic to unhealthy instances.",
		example:
			"A readiness check confirms that an API has connected to its database before it receives requests.",
	},
	{
		id: "service-discovery",
		term: "Service discovery",
		definition:
			"Service discovery lets one service find the current address of another service.",
		whyItMatters:
			"It removes hard-coded addresses when containers and instances start, stop, or move.",
		example:
			"An order service asks an internal DNS name for the current payment-service instances.",
	},
	{
		id: "connection-pool",
		term: "Connection pool",
		definition:
			"A connection pool keeps a limited set of open connections ready for reuse.",
		whyItMatters:
			"It avoids the cost of opening a connection for every request and protects a database from too many clients.",
		example: "Each API instance keeps at most 20 open Postgres connections.",
	},
	{
		id: "rpc",
		term: "RPC",
		definition:
			"Remote procedure call lets one service call a named operation on another service over a network.",
		whyItMatters:
			"It gives services a direct request-response contract, but the call can fail or slow down like any network request.",
		example:
			"The checkout service calls inventory.Reserve before it confirms an order.",
	},
];

const architecturePatterns: readonly ArchitecturePatternCard[] = [
	{
		id: "client-server",
		title: "Client-server",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"Clients ask a central service for data or work. The service owns the rules and data access.",
		solves: "It gives many clients one shared place to reach an application.",
		useWhen: "Use it for most web and mobile products with a clear backend.",
		tradeoff: "The server tier must scale and stay available as demand grows.",
		example: "A mobile app calls an API that reads and writes account data.",
	},
	{
		id: "layered",
		title: "Layered architecture",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"The system separates responsibilities into layers, such as UI, application rules, and data access.",
		solves:
			"It makes each area easier to understand and test without knowing every other area.",
		useWhen:
			"Use it when one application has stable responsibilities and a team needs clear boundaries.",
		tradeoff:
			"A request can pass through extra layers, and strict boundaries can feel heavy for small features.",
		example:
			"A controller calls a service, which calls a repository that reads Postgres.",
	},
	{
		id: "microservices",
		title: "Microservices",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"The system splits business areas into small services that deploy and scale separately.",
		solves:
			"It lets teams change and scale a busy area without releasing one large application.",
		useWhen:
			"Use it when team and domain boundaries are clear and the cost of distributed systems is justified.",
		tradeoff:
			"Network calls, shared data, testing, and operations become harder.",
		example:
			"Catalog, checkout, and billing run as separate services with separate deploys.",
	},
	{
		id: "event-driven",
		title: "Event-driven architecture",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"Services publish facts about completed work, and other services react to those facts later.",
		solves:
			"It separates the producer from work that does not need to finish in the same request.",
		useWhen:
			"Use it when several parts of the product react to the same change or when work can run later.",
		tradeoff:
			"The system becomes harder to trace, and data may be temporarily out of date.",
		example: "Order placed triggers inventory, email, and analytics events.",
	},
	{
		id: "queue-based",
		title: "Queue-based load leveling",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A queue holds incoming work while workers process it at a safe rate.",
		solves: "It absorbs bursts and protects a slow downstream system.",
		useWhen:
			"Use it for work that can finish after the user receives a response.",
		tradeoff:
			"Work may wait in the queue, so users do not get an immediate final result.",
		example: "A video upload creates a job that workers transcode later.",
	},
	{
		id: "api-gateway",
		title: "API gateway",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"One edge service receives client requests and routes them to internal services.",
		solves:
			"It gives clients one public entry point for auth, routing, and request shaping.",
		useWhen:
			"Use it when many backend services should not each expose a separate public API.",
		tradeoff:
			"The gateway can become a bottleneck or collect too much business logic.",
		example:
			"A gateway verifies a session, then calls profile and order services for one mobile screen.",
	},
	{
		id: "cqrs",
		title: "CQRS",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"Command-query responsibility separation uses different models for changing data and reading data.",
		solves:
			"It lets a complex write path protect business rules while a read path serves fast, simple views.",
		useWhen:
			"Use it when reads and writes have very different shapes or scaling needs.",
		tradeoff: "You must keep two models in sync and accept more moving parts.",
		example:
			"An order command writes normalized data, while a read model stores a ready-to-display order summary.",
	},
	{
		id: "event-sourcing",
		title: "Event sourcing",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"The system stores each business change as an ordered event instead of only storing the latest state.",
		solves:
			"It provides an audit trail and lets you rebuild a past state by replaying events.",
		useWhen:
			"Use it when the history of a change matters as much as the latest value.",
		tradeoff:
			"Event versions, replay speed, and correcting bad events need careful design.",
		example:
			"A bank account stores deposits and withdrawals, then calculates the current balance from them.",
	},
	{
		id: "pipes-and-filters",
		title: "Pipes and filters",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"A pipeline passes data through a fixed sequence of small processing steps.",
		solves:
			"It breaks a complex transformation into steps that teams can test and replace independently.",
		useWhen:
			"Use it for data processing, compilers, media work, or request processing with clear stages.",
		tradeoff:
			"A slow stage limits the whole flow, and passing large data between stages can cost time.",
		example:
			"An ingestion pipeline validates a log, scrubs secrets, enriches it, then stores it.",
	},
	{
		id: "sidecar",
		title: "Sidecar",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A helper process runs beside an application process and handles a shared operational concern.",
		solves:
			"It keeps concerns such as logging, network policy, or certificate renewal out of application code.",
		useWhen: "Use it when many services need the same local helper behavior.",
		tradeoff:
			"Every application instance uses more resources and gains another thing to operate.",
		example: "A proxy sidecar handles mutual TLS for a service in Kubernetes.",
	},
	{
		id: "serverless",
		title: "Serverless functions",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"Small functions run on demand in a managed platform instead of on servers you operate.",
		solves:
			"It removes server management for event-driven or uneven workloads.",
		useWhen:
			"Use it for short tasks with variable traffic and simple deployment needs.",
		tradeoff:
			"Startup delay, execution limits, and platform-specific behavior can constrain the design.",
		example:
			"A function creates a thumbnail when an image arrives in object storage.",
	},
	{
		id: "peer-to-peer",
		title: "Peer-to-peer",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"Participants communicate directly and each can provide work or data to other participants.",
		solves:
			"It can spread bandwidth and work across many participants instead of one central server.",
		useWhen:
			"Use it when direct sharing helps and the system can handle unreliable peers.",
		tradeoff:
			"Discovery, trust, privacy, and inconsistent peer availability are difficult.",
		example:
			"A file-sharing network downloads different file pieces from several peers.",
	},
	{
		id: "hexagonal",
		title: "Hexagonal architecture",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"The core business rules sit in the center and talk to databases, web servers, and other tools through defined ports and adapters.",
		solves:
			"It keeps business rules independent from delivery and storage choices.",
		useWhen:
			"Use it when the same core logic needs several interfaces or must stay easy to test.",
		tradeoff:
			"The adapter and interface layer adds code that can feel heavy for a small app.",
		example:
			"One order service uses the same core logic from an HTTP API and a queue consumer.",
	},
	{
		id: "microkernel",
		title: "Microkernel architecture",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"A small core provides the essential rules while plug-ins add optional features.",
		solves:
			"It lets a platform grow features without making the core own every variation.",
		useWhen:
			"Use it for products with stable core behavior and many optional extensions.",
		tradeoff:
			"Plug-in contracts, versions, and failure isolation need careful design.",
		example:
			"An editor keeps file handling in the core and adds language support as plug-ins.",
	},
	{
		id: "modular-monolith",
		title: "Modular monolith",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"One deployable application contains separate modules with clear business boundaries.",
		solves:
			"It keeps local calls and simple operations while preventing one codebase from becoming one tangled module.",
		useWhen:
			"Use it when a product needs strong boundaries but does not yet need independent service deploys.",
		tradeoff:
			"One release and one runtime still limit independent scaling and fault isolation.",
		example:
			"Billing, catalog, and accounts are modules inside one application and database.",
	},
	{
		id: "service-oriented",
		title: "Service-oriented architecture",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"Independent services expose reusable business capabilities through shared service contracts.",
		solves:
			"It lets several applications use the same capability instead of rebuilding it.",
		useWhen:
			"Use it across large organizations that need to share stable business services.",
		tradeoff:
			"Shared contracts and central governance can slow change across teams.",
		example:
			"Several internal products call one identity service for employee access.",
	},
	{
		id: "service-based",
		title: "Service-based architecture",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"A few larger services divide the product by business area without splitting every small capability into a service.",
		solves:
			"It gives clearer boundaries than a monolith with less operational cost than many microservices.",
		useWhen:
			"Use it when a team needs some independent deploys but does not need very fine service boundaries.",
		tradeoff:
			"A large service can still grow too broad and become hard to change.",
		example:
			"One commerce service owns carts, orders, and payments while identity stays separate.",
	},
	{
		id: "space-based",
		title: "Space-based architecture",
		category: "architecture-pattern",
		architectureType: "style",
		description:
			"Processing units keep needed state in memory and distribute it across many running instances.",
		solves:
			"It avoids a central database becoming the limit during sudden, high traffic.",
		useWhen:
			"Use it for workloads with large traffic spikes and state that can be partitioned or rebuilt.",
		tradeoff:
			"Keeping in-memory state correct and recovering it after failure is difficult.",
		example:
			"Many checkout workers keep session state in a distributed in-memory grid during a sale.",
	},
	{
		id: "inbox-outbox",
		title: "Inbox and outbox",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"An outbox saves an event with the business change, and an inbox records which incoming events a consumer has handled.",
		solves:
			"It makes database changes and event delivery reliable without requiring one distributed transaction.",
		useWhen:
			"Use it when a service must publish events after a database write and consumers must tolerate repeats.",
		tradeoff: "Workers, cleanup, and duplicate handling add operational work.",
		example:
			"Saving an order also saves an OrderPlaced outbox row that a worker publishes later.",
	},
	{
		id: "backend-for-frontend",
		title: "Backend for frontend",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"Each client type has a small backend that shapes data and calls for that client's needs.",
		solves:
			"It stops one general API from forcing mobile, web, and partner clients into the same request shape.",
		useWhen:
			"Use it when client experiences have meaningfully different data and release needs.",
		tradeoff:
			"Several backends can repeat logic unless they keep shared business rules below the client layer.",
		example:
			"A mobile backend combines a compact profile and recent orders for one app screen.",
	},
	{
		id: "public-published-interfaces",
		title: "Public versus published interfaces",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A service may expose a broad interface internally but promise a smaller, stable interface to outside consumers.",
		solves:
			"It lets a team change private details without breaking clients that rely on a supported contract.",
		useWhen:
			"Use it when an internal service starts serving other teams or external partners.",
		tradeoff:
			"You must version and support the published contract even when the internal service changes.",
		example:
			"A billing service keeps internal admin endpoints private and publishes one stable invoice API.",
	},
	{
		id: "asynchronous-messaging",
		title: "Asynchronous messaging",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A sender leaves a message for a receiver and does not wait for the receiver to finish.",
		solves:
			"It separates systems that run at different speeds and lets work continue through short outages.",
		useWhen:
			"Use it when a task can finish later or a dependency should not block the user request.",
		tradeoff:
			"Failures appear later, and users may need status updates instead of an immediate result.",
		example:
			"A signup request queues a welcome-email message after the account is created.",
	},
	{
		id: "batch-request",
		title: "Batch request",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A client sends several related operations in one request instead of opening one network call for each.",
		solves:
			"It reduces round trips and request overhead for related small operations.",
		useWhen:
			"Use it when a client naturally needs many independent reads or updates together.",
		tradeoff:
			"Large batches can be slow, hard to retry, and harder to report when only one operation fails.",
		example:
			"A mobile app fetches profile, settings, and notifications in one batch call.",
	},
	{
		id: "blackboard",
		title: "Blackboard",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"Several specialist components read and add partial results to one shared working data space.",
		solves:
			"It lets different algorithms cooperate on a problem when no single fixed sequence fits.",
		useWhen:
			"Use it for complex interpretation or decision problems with several independent expert steps.",
		tradeoff:
			"The shared state and the rule for choosing the next step can become hard to reason about.",
		example:
			"Speech-processing components add possible words and confidence scores to one shared result.",
	},
	{
		id: "circuit-breaker-pattern",
		title: "Circuit breaker",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A caller stops sending requests to a failing dependency for a short period, then tests recovery.",
		solves:
			"It stops a slow or failed dependency from consuming all waiting threads and causing wider failure.",
		useWhen:
			"Use it around network calls to dependencies that can fail or time out.",
		tradeoff:
			"It can reject a request while the dependency has recovered, so its timing and fallback need care.",
		example:
			"After repeated payment timeouts, checkout returns a clear retry message for one minute.",
	},
	{
		id: "competing-consumers",
		title: "Competing consumers",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"Several workers pull from one queue, and each message goes to one available worker.",
		solves:
			"It raises throughput by spreading independent jobs across many workers.",
		useWhen:
			"Use it when queued work can run in parallel and one worker is not enough.",
		tradeoff:
			"Message order is harder to preserve, and workers need safe retry and duplicate handling.",
		example: "Twenty image workers compete for resize jobs from one queue.",
	},
	{
		id: "model-view-controller",
		title: "Model-view-controller",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"The model holds state and rules, the view shows it, and the controller handles user input.",
		solves:
			"It separates presentation from application behavior in an interactive interface.",
		useWhen:
			"Use it in server-rendered or desktop interfaces that benefit from clear UI responsibilities.",
		tradeoff:
			"Controllers can grow too large when they collect both presentation and business rules.",
		example:
			"A controller handles a form post, updates the model, then returns a view.",
	},
	{
		id: "claim-check",
		title: "Claim check",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A message carries a reference to large data stored elsewhere instead of carrying the data itself.",
		solves:
			"It keeps a queue fast and within message-size limits while still connecting work to a large file.",
		useWhen:
			"Use it when asynchronous work needs large payloads such as videos, reports, or archives.",
		tradeoff:
			"The worker must fetch another resource and handle missing, expired, or unauthorized data.",
		example:
			"A queue message contains an S3 object key for a large video to transcode.",
	},
	{
		id: "publish-subscribe-pattern",
		title: "Publish-subscribe",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A producer publishes an event to a topic, and each subscribed consumer receives a copy.",
		solves:
			"It lets several consumers react to one change without the producer knowing who they are.",
		useWhen:
			"Use it when new downstream actions should be easy to add after an event.",
		tradeoff:
			"A producer can lose sight of who depends on an event, and delivery rules need clear ownership.",
		example:
			"OrderPlaced reaches billing, inventory, analytics, and email topics subscribers.",
	},
	{
		id: "rate-limiting-pattern",
		title: "Rate limiting",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"The system limits how much work one client, account, or key can start in a time period.",
		solves:
			"It protects shared capacity and gives clients fair access during high demand.",
		useWhen:
			"Use it at public APIs, sign-in endpoints, or expensive operations.",
		tradeoff:
			"A limit can block valid bursty traffic unless the rule matches the product's real usage.",
		example: "An API allows 100 requests per minute for one access token.",
	},
	{
		id: "request-response",
		title: "Request-response",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"One component asks another for work and waits for a direct response.",
		solves:
			"It gives a simple, immediate interaction for work that must finish before the caller continues.",
		useWhen:
			"Use it when the caller needs a result now, such as loading a page or validating a payment.",
		tradeoff:
			"The caller waits on the dependency, so slow calls can raise end-to-end latency.",
		example:
			"A checkout API asks inventory whether a product is available before confirming an order.",
	},
	{
		id: "retry-pattern",
		title: "Retry",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A caller repeats an operation that failed for a temporary reason, usually with a limit and waiting time.",
		solves:
			"It lets a short network or service failure recover without making the user try again.",
		useWhen:
			"Use it for safe operations where a failure is likely temporary and repeats cannot cause harm.",
		tradeoff:
			"Blind retries can duplicate work or increase an outage, so use idempotency and backoff.",
		example:
			"A worker retries a timed-out email-provider call three times with backoff.",
	},
	{
		id: "rule-based",
		title: "Rule-based architecture",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A rules engine applies business decisions stored as data instead of hard-coding every decision in application flow.",
		solves:
			"It lets frequently changing policies change without rewriting unrelated application code.",
		useWhen:
			"Use it when many business rules vary by product, region, customer, or time.",
		tradeoff:
			"Rules can conflict or become hard to explain unless the team gives them clear ownership and tests.",
		example:
			"Pricing rules choose a discount from account tier, location, and order size.",
	},
	{
		id: "saga",
		title: "Saga",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A saga coordinates a business process across services by running local steps and compensating earlier steps if a later one fails.",
		solves:
			"It manages a multi-service workflow without one large database transaction.",
		useWhen:
			"Use it when a business action spans separate services that each own their own data.",
		tradeoff:
			"Compensation is not always a true undo, and partial progress is visible while the saga runs.",
		example:
			"A travel booking reserves a flight, hotel, and car, then cancels earlier reservations if payment fails.",
	},
	{
		id: "strangler-fig",
		title: "Strangler fig",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"A new system slowly takes over pieces of an old system until the old system can be removed.",
		solves:
			"It lets a team replace a risky legacy system in small, releasable steps.",
		useWhen:
			"Use it when a full rewrite would take too long or carry too much risk.",
		tradeoff:
			"For a while, the team must run, route, and debug both old and new paths.",
		example:
			"A proxy sends one account feature to a new service while all other requests still use the legacy app.",
	},
	{
		id: "throttling",
		title: "Throttling",
		category: "architecture-pattern",
		architectureType: "pattern",
		description:
			"The system deliberately slows work to a safe rate instead of accepting every item immediately.",
		solves:
			"It protects a limited resource such as a database, partner API, or worker pool during a burst.",
		useWhen: "Use it when work may wait and a downstream limit is known.",
		tradeoff:
			"Work takes longer, and callers need clear feedback or a queue status.",
		example: "A worker sends no more than 10 partner API calls each second.",
	},
];

export function getFlashcardDecks(): Effect.Effect<FlashcardDecks, never> {
	return Effect.succeed({
		systemTerms: [...systemTerms, ...additionalSystemTerms].map((card) => ({
			...card,
			category: "concept" as const,
		})),
		architecturePatterns,
		algorithmPaths,
	});
}

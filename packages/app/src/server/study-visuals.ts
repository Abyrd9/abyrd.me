export type StudyVisualNode = {
	id: string;
	label: string;
	x: number;
	y: number;
	shape?: "box" | "circle" | "pill";
};

export type StudyVisualEdge = {
	id: string;
	from: string;
	to: string;
	label?: string;
	dashed?: boolean;
	bidirectional?: boolean;
};

export type StudyVisualFrame = {
	label: string;
	note: string;
	activeNodes: readonly string[];
	activeEdges?: readonly string[];
};

export type StudyVisualSpec = {
	title: string;
	nodes: readonly StudyVisualNode[];
	edges: readonly StudyVisualEdge[];
	frames: readonly StudyVisualFrame[];
};

export type StudyVisualCatalog = Readonly<Record<string, StudyVisualSpec>>;

type Step = readonly [label: string, note: string];

function flow(title: string, steps: readonly Step[]): StudyVisualSpec {
	const gap = steps.length === 1 ? 0 : 480 / (steps.length - 1);
	const nodes = steps.map(([label], index) => ({
		id: `n${index}`,
		label,
		x: 80 + gap * index,
		y: 150,
		shape: "box" as const,
	}));
	const edges = steps.slice(1).map((_, index) => ({
		id: `e${index}`,
		from: `n${index}`,
		to: `n${index + 1}`,
	}));

	return {
		title,
		nodes,
		edges,
		frames: steps.map(([, note], index) => ({
			label: `Step ${index + 1}`,
			note,
			activeNodes: [`n${index}`],
			activeEdges: index === 0 ? [] : [`e${index - 1}`],
		})),
	};
}

function fan(
	title: string,
	hub: Step,
	leaves: readonly Step[],
	direction: "out" | "in" = "out",
): StudyVisualSpec {
	const leafGap = leaves.length === 1 ? 0 : 440 / (leaves.length - 1);
	const nodes: StudyVisualNode[] = [
		{ id: "hub", label: hub[0], x: 320, y: direction === "out" ? 78 : 222 },
		...leaves.map(([label], index) => ({
			id: `leaf${index}`,
			label,
			x: 100 + leafGap * index,
			y: direction === "out" ? 222 : 78,
			shape: "box" as const,
		})),
	];
	const edges = leaves.map((_, index) => ({
		id: `e${index}`,
		from: direction === "out" ? "hub" : `leaf${index}`,
		to: direction === "out" ? `leaf${index}` : "hub",
	}));

	return {
		title,
		nodes,
		edges,
		frames: [
			{
				label: "Start",
				note: hub[1],
				activeNodes: ["hub"],
				activeEdges: [],
			},
			...leaves.map(([, note], index) => ({
				label: `Path ${index + 1}`,
				note,
				activeNodes: [`leaf${index}`],
				activeEdges: [`e${index}`],
			})),
		],
	};
}

function relay(
	title: string,
	source: Step,
	hub: Step,
	outputs: readonly Step[],
): StudyVisualSpec {
	const outputGap = outputs.length === 1 ? 0 : 170 / (outputs.length - 1);
	const nodes: StudyVisualNode[] = [
		{ id: "source", label: source[0], x: 90, y: 150 },
		{ id: "hub", label: hub[0], x: 300, y: 150 },
		...outputs.map(([label], index) => ({
			id: `output${index}`,
			label,
			x: 525,
			y: 65 + outputGap * index,
			shape: "box" as const,
		})),
	];
	const edges: StudyVisualEdge[] = [
		{ id: "input", from: "source", to: "hub" },
		...outputs.map((_, index) => ({
			id: `output-edge${index}`,
			from: "hub",
			to: `output${index}`,
		})),
	];

	return {
		title,
		nodes,
		edges,
		frames: [
			{
				label: "Input",
				note: source[1],
				activeNodes: ["source"],
				activeEdges: [],
			},
			{
				label: "Boundary",
				note: hub[1],
				activeNodes: ["hub"],
				activeEdges: ["input"],
			},
			...outputs.map(([, note], index) => ({
				label: `Outcome ${index + 1}`,
				note,
				activeNodes: [`output${index}`],
				activeEdges: [`output-edge${index}`],
			})),
		],
	};
}

function cycle(title: string, steps: readonly Step[]): StudyVisualSpec {
	const points = [
		[320, 58],
		[520, 150],
		[320, 242],
		[120, 150],
	] as const;
	const nodes = steps.map(([label], index) => ({
		id: `n${index}`,
		label,
		x: points[index % points.length][0],
		y: points[index % points.length][1],
		shape: "pill" as const,
	}));
	const edges = steps.map((_, index) => ({
		id: `e${index}`,
		from: `n${index}`,
		to: `n${(index + 1) % steps.length}`,
	}));

	return {
		title,
		nodes,
		edges,
		frames: steps.map(([, note], index) => ({
			label: `Phase ${index + 1}`,
			note,
			activeNodes: [`n${index}`],
			activeEdges: [index === 0 ? `e${steps.length - 1}` : `e${index - 1}`],
		})),
	};
}

function layers(title: string, steps: readonly Step[]): StudyVisualSpec {
	const gap = steps.length === 1 ? 0 : 190 / (steps.length - 1);
	const nodes = steps.map(([label], index) => ({
		id: `n${index}`,
		label,
		x: 320,
		y: 55 + gap * index,
		shape: "pill" as const,
	}));
	const edges = steps.slice(1).map((_, index) => ({
		id: `e${index}`,
		from: `n${index}`,
		to: `n${index + 1}`,
	}));

	return {
		title,
		nodes,
		edges,
		frames: steps.map(([, note], index) => ({
			label: `Layer ${index + 1}`,
			note,
			activeNodes: [`n${index}`],
			activeEdges: index === 0 ? [] : [`e${index - 1}`],
		})),
	};
}

function tree(
	title: string,
	labels: readonly [string, string, string, string, string],
	notes: readonly [string, string, string, string, string],
): StudyVisualSpec {
	const positions = [
		[320, 55],
		[190, 145],
		[450, 145],
		[120, 240],
		[260, 240],
	] as const;
	const nodes = labels.map((label, index) => ({
		id: `n${index}`,
		label,
		x: positions[index][0],
		y: positions[index][1],
		shape: "circle" as const,
	}));
	const pairs = [
		[0, 1],
		[0, 2],
		[1, 3],
		[1, 4],
	] as const;
	const edges = pairs.map(([from, to], index) => ({
		id: `e${index}`,
		from: `n${from}`,
		to: `n${to}`,
	}));

	return {
		title,
		nodes,
		edges,
		frames: notes.map((note, index) => ({
			label: `Visit ${index + 1}`,
			note,
			activeNodes: [`n${index}`],
			activeEdges: edges
				.filter((edge) => edge.to === `n${index}`)
				.map((edge) => edge.id),
		})),
	};
}

function grid(
	title: string,
	labels: readonly string[],
	notes: readonly string[],
	options: {
		blockedLabels?: readonly string[];
		bidirectional?: boolean;
	} = {},
): StudyVisualSpec {
	const blockedLabels = new Set(options.blockedLabels ?? []);
	const nodes = labels.map((label, index) => ({
		id: `n${index}`,
		label,
		x: 160 + (index % 3) * 160,
		y: 55 + Math.floor(index / 3) * 95,
		shape: "box" as const,
	}));
	const pairs: [number, number][] = [];
	for (let index = 0; index < labels.length; index++) {
		if (blockedLabels.has(labels[index])) continue;
		if (
			index % 3 < 2 &&
			index + 1 < labels.length &&
			!blockedLabels.has(labels[index + 1])
		)
			pairs.push([index, index + 1]);
		if (index + 3 < labels.length && !blockedLabels.has(labels[index + 3])) {
			pairs.push([index, index + 3]);
		}
	}
	const edges = pairs.map(([from, to], index) => ({
		id: `e${index}`,
		from: `n${from}`,
		to: `n${to}`,
		bidirectional: options.bidirectional,
	}));

	return {
		title,
		nodes,
		edges,
		frames: notes.map((note, index) => ({
			label: `Cell ${index + 1}`,
			note,
			activeNodes: [`n${index}`],
			activeEdges: edges
				.filter((edge) => edge.to === `n${index}`)
				.map((edge) => edge.id),
		})),
	};
}

export const studyVisuals: StudyVisualCatalog = {
	// System-design terms
	"term:cache": flow("A cache avoids repeated work", [
		["Client", "The client asks for a profile."],
		["Cache", "Check the nearby copy before doing expensive work."],
		["Database", "Only a cache miss reaches the database."],
		["Cached result", "Save the result so the next read returns quickly."],
	]),
	"term:cdn": flow("A CDN shortens the trip", [
		["User", "A user requests an image."],
		["Nearby edge", "The request reaches a cache near the user."],
		["Origin", "The edge asks the origin only when it lacks the file."],
		["Edge copy", "Later users receive the nearby copy."],
	]),
	"term:load-balancer": fan(
		"A load balancer spreads requests",
		["Load balancer", "Every request enters through one routing point."],
		[
			["Server A", "A healthy server receives part of the work."],
			["Server B", "Another healthy server handles the next request."],
			["Server C", "A failed server can be removed from rotation."],
		],
	),
	"term:queue": flow("A queue separates arrival from work", [
		["Producer", "The producer creates a job without waiting for completion."],
		["Queue", "The queue holds the job through a burst."],
		["Worker", "A worker takes jobs at a safe pace."],
		["Done", "The slow work finishes outside the user request."],
	]),
	"term:idempotency": flow("One key, one final effect", [
		["Request + key", "The client gives the operation a stable identity."],
		[
			"First result",
			"The server performs the operation once and saves its result.",
		],
		["Retry + key", "A retry arrives with the same identity."],
		[
			"Saved result",
			"The server returns the first result without repeating the effect.",
		],
	]),
	"term:rate-limiter": fan(
		"A rate limiter protects capacity",
		[
			"Request counter",
			"Each client action consumes part of a fixed allowance.",
		],
		[
			["Allow", "Requests inside the allowance continue."],
			["Wait", "A near-limit client can slow down until capacity returns."],
			["Reject", "Requests over the limit get a clear retry response."],
		],
	),
	"term:replication": fan(
		"Replication copies the same change",
		["Primary", "A successful write begins on the primary copy."],
		[
			["Replica A", "The change is copied to another machine."],
			["Replica B", "A second copy protects against another failure."],
			["Read traffic", "Replicas may also serve read work."],
		],
	),
	"term:sharding": fan(
		"A shard key chooses one database",
		["Shard router", "The router reads a key such as user ID."],
		[
			["IDs 0–3", "One key range lives on shard A."],
			["IDs 4–7", "Another key range lives on shard B."],
			["IDs 8–9", "A third range can add write and storage capacity."],
		],
	),
	"term:partitioning": fan(
		"Partitions divide one large data set",
		["Events table", "The logical table still looks like one collection."],
		[
			["January", "Queries can scan only January's data."],
			["February", "New data lands in the current partition."],
			["March", "Old partitions can be archived or removed together."],
		],
	),
	"term:consistency": flow("Consistency defines what a read may see", [
		["Write v2", "A client saves a new value."],
		["Copies", "Distributed copies may receive the change at different times."],
		["Read", "The consistency rule decides whether this read may return v1."],
		[
			"Product choice",
			"Correctness needs determine whether waiting is required.",
		],
	]),
	"term:backpressure": cycle("Backpressure carries overload upstream", [
		["Fast producer", "New work arrives faster than it can finish."],
		["Full buffer", "The queue reaches its safe capacity."],
		["Slow or reject", "The boundary tells producers to wait or rejects work."],
		["Recovery", "Consumers drain the buffer before intake rises again."],
	]),
	"term:circuit-breaker": cycle("A circuit breaker contains failure", [
		["Closed", "Calls flow normally while the dependency is healthy."],
		["Failures", "Repeated failures cross the configured threshold."],
		["Open", "Calls fail fast instead of piling onto the dependency."],
		[
			"Test call",
			"After a pause, one probe decides whether normal calls resume.",
		],
	]),
	"term:dns": flow("DNS turns a name into a route", [
		["app.example.com", "The browser starts with a human-readable name."],
		["DNS resolver", "A resolver finds or caches the matching address."],
		["203.0.113.8", "The browser receives a network address."],
		["App server", "Traffic can now travel to the application."],
	]),
	"term:reverse-proxy": flow("A reverse proxy fronts internal services", [
		["HTTPS request", "Public traffic reaches one protected address."],
		["Reverse proxy", "The proxy ends TLS and chooses an internal route."],
		["App service", "The internal service handles only forwarded traffic."],
		["Response", "The proxy returns the service response to the client."],
	]),
	"term:horizontal-scaling": fan(
		"Horizontal scaling adds peers",
		["Traffic", "More requests arrive than one machine should handle."],
		[
			["App 1", "One identical process handles a share."],
			["App 2", "A second process raises capacity."],
			["App 3", "More peers also reduce the impact of one failure."],
		],
	),
	"term:vertical-scaling": flow("Vertical scaling strengthens one machine", [
		["4 CPU / 8 GB", "The current server reaches a resource limit."],
		["Resize", "The team assigns more CPU or memory."],
		["32 CPU / 64 GB", "The same server role handles more work."],
		["Machine limit", "Capacity still ends at the largest available machine."],
	]),
	"term:latency": flow("Latency measures one trip", [
		["Send", "The timer starts when one operation begins."],
		["Travel", "Network and queue time add delay."],
		["Work", "Application and database work add more delay."],
		["Response", "The timer stops when the result arrives."],
	]),
	"term:throughput": flow("Throughput counts completed work", [
		["Incoming work", "Many operations enter during one time window."],
		["Workers", "Available capacity processes them in parallel or sequence."],
		["10,000 events", "Count only completed operations."],
		["Per second", "Divide the work by the measurement window."],
	]),
	"term:availability": fan(
		"Redundancy protects availability",
		["User request", "A valid request needs at least one working route."],
		[
			["Primary", "The normal instance serves traffic."],
			["Standby", "A redundant instance can take over after failure."],
			[
				"Valid response",
				"Availability counts the requests the system can serve.",
			],
		],
	),
	"term:eventual-consistency": flow("Copies converge after a delay", [
		["Write photo v2", "One copy accepts the new photo."],
		["Replica A: v2", "A nearby replica receives it quickly."],
		["Replica B: v1", "Another reader may briefly see the old photo."],
		["Both: v2", "Replication eventually makes the copies agree."],
	]),
	"term:strong-consistency": flow("A successful write becomes the next read", [
		["Write balance", "A client sends a correctness-sensitive change."],
		["Coordinate", "The system waits for the consistency guarantee."],
		["Commit v2", "Only then does the write report success."],
		["Read v2", "A later read cannot return the older value."],
	]),
	"term:read-replica": fan(
		"Reads move away from the primary",
		["Database primary", "Writes still go to the authoritative database."],
		[
			["Replica A", "Copied data serves product-page reads."],
			["Replica B", "Another replica spreads more read traffic."],
			[
				"Possible lag",
				"Callers must tolerate a replica arriving slightly late.",
			],
		],
	),
	"term:database-index": flow("An index narrows the search", [
		["WHERE user_id=7", "A query asks for a small part of a table."],
		["Index", "The ordered helper structure locates matching row positions."],
		["Matching rows", "The database reads only likely matches."],
		["Write cost", "Every future write must also maintain the index."],
	]),
	"term:transaction": fan(
		"A transaction chooses one final outcome",
		["Begin + operations", "Related reads and writes form one unit."],
		[
			["Commit", "If every rule holds, all changes become durable."],
			["Rollback", "If one step fails, partial changes are removed."],
		],
	),
	"term:object-storage": flow("Object storage serves named blobs", [
		["Upload", "An application sends a photo or document."],
		["Bucket + key", "The service stores bytes under a durable name."],
		["Object", "Metadata and bytes can scale independently of app disks."],
		["URL / CDN", "Clients retrieve the object directly or through an edge."],
	]),
	"term:publish-subscribe": fan(
		"One event reaches independent subscribers",
		[
			"Order event",
			"A publisher announces what happened without naming receivers.",
		],
		[
			["Email", "One subscriber sends a receipt."],
			["Inventory", "Another subscriber adjusts stock."],
			["Analytics", "A third records the event independently."],
		],
	),
	"term:dead-letter-queue": flow("Failed messages leave the main queue", [
		["Message", "A normal message enters the work queue."],
		["Attempts", "The worker retries only the allowed number of times."],
		["Dead-letter queue", "A persistently failing message moves aside."],
		["Inspect / replay", "Operators can fix the cause and replay it safely."],
	]),
	"term:retry": cycle("Retries give temporary failures another chance", [
		["Call", "A safe operation is attempted."],
		["Temporary failure", "A timeout or unavailable response may recover."],
		["Backoff", "The caller waits longer instead of retrying immediately."],
		["Try again", "A limited retry either succeeds or ends clearly."],
	]),
	"term:health-check": fan(
		"A health check controls routing",
		[
			"Health probe",
			"A monitor asks whether an instance can safely serve work.",
		],
		[
			["Healthy", "Passing instances remain in the routing pool."],
			["Unhealthy", "Failing instances stop receiving traffic."],
		],
	),
	"term:service-discovery": flow("Services find changing endpoints", [
		["Service starts", "A new instance receives a temporary network address."],
		["Registry", "The instance registers its name and location."],
		["Client lookup", "A caller asks for healthy instances by service name."],
		["Current endpoint", "The caller receives an address that exists now."],
	]),
	"term:connection-pool": fan(
		"A pool reuses expensive connections",
		[
			"Connection pool",
			"Requests borrow from a bounded set of open connections.",
		],
		[
			["Request A", "One request temporarily checks out a connection."],
			["Request B", "Another request reuses a different open connection."],
			["Database", "The limit protects the database from connection overload."],
		],
	),
	"term:rpc": flow("RPC makes a remote call look local", [
		["Caller", "Application code calls a typed client function."],
		["Client stub", "The stub turns arguments into a network message."],
		["Remote service", "Another process runs the requested operation."],
		["Return value", "The result crosses the network back to the caller."],
	]),

	// Architecture styles and patterns
	"architecture:client-server": fan(
		"Clients share one server boundary",
		["Server", "The server owns shared data and behavior."],
		[
			[
				"Web client",
				"A browser sends requests instead of owning the database.",
			],
			["Mobile client", "A second interface uses the same server contract."],
			["Desktop client", "Another client can share the central behavior."],
		],
		"in",
	),
	"architecture:layered": layers("Each layer has one direction of dependency", [
		["Interface", "Controllers translate outside input."],
		["Application", "Use cases coordinate the work."],
		["Domain", "Business rules stay independent of delivery details."],
		["Data", "Repositories and adapters reach storage."],
	]),
	"architecture:microservices": fan(
		"Services own separate capabilities",
		["API entry", "A request enters through a stable system boundary."],
		[
			["Orders", "The order service owns order behavior and data."],
			["Payments", "The payment service can deploy and scale separately."],
			["Shipping", "The shipping service fails independently, too."],
		],
	),
	"architecture:event-driven": relay(
		"Events reverse the dependency",
		["Producer", "A producer announces a fact that already happened."],
		["Event broker", "The broker records or routes the event by topic."],
		[
			["Consumer A", "One consumer reacts in its own time."],
			[
				"Consumer B",
				"Another reaction can be added without changing the producer.",
			],
		],
	),
	"architecture:queue-based": flow("A queue smooths uneven work", [
		["Request", "The front end accepts a unit of work."],
		[
			"Durable queue",
			"The queue absorbs the difference between arrival and capacity.",
		],
		["Worker pool", "Workers pull only as fast as they can finish."],
		["Result", "Completion can be reported later."],
	]),
	"architecture:api-gateway": fan(
		"A gateway presents one public API",
		[
			"API gateway",
			"The gateway authenticates, limits, and routes public requests.",
		],
		[
			["Catalog", "Catalog calls reach the catalog service."],
			["Orders", "Order calls reach a separate owner."],
			["Accounts", "Internal service locations stay private."],
		],
	),
	"architecture:cqrs": fan(
		"Commands and queries use different models",
		["Client intent", "The client either wants to change state or read it."],
		[
			[
				"Command model",
				"Writes enforce business rules on the source of truth.",
			],
			["Query model", "Reads use a shape optimized for answering questions."],
		],
	),
	"architecture:event-sourcing": flow("Events are the source of truth", [
		["Command", "A requested change is validated."],
		[
			"Append event",
			"The system stores an immutable fact instead of replacing state.",
		],
		["Event stream", "The ordered history preserves how state changed."],
		["Projection", "Folding the events rebuilds a useful current view."],
	]),
	"architecture:pipes-and-filters": flow("Filters transform one stream", [
		["Raw input", "Data enters in one known form."],
		["Parse", "One filter performs one transformation."],
		["Validate", "The next filter receives the previous output."],
		["Enrich", "Filters can be reordered or replaced behind the same shape."],
		["Output", "The final form leaves the pipeline."],
	]),
	"architecture:sidecar": fan(
		"A sidecar adds local platform behavior",
		["Service instance", "Business code focuses on its own capability."],
		[
			["Sidecar proxy", "A neighboring process handles traffic policy."],
			["Telemetry", "The sidecar can collect common observability data."],
			["Platform", "The platform manages both as one deployment unit."],
		],
	),
	"architecture:serverless": flow("The platform creates capacity per event", [
		["Event", "A request, message, or schedule triggers work."],
		["Managed runtime", "The provider allocates an execution environment."],
		["Function", "Short-lived application code handles the event."],
		["Managed service", "State usually lives in an external managed store."],
	]),
	"architecture:peer-to-peer": cycle("Peers serve and consume together", [
		["Peer A", "A node requests data and can also provide it."],
		["Peer B", "No permanent central server owns every exchange."],
		["Peer C", "More peers can contribute resources as the network grows."],
		["Peer D", "Discovery and trust become distributed concerns."],
	]),
	"architecture:hexagonal": fan(
		"Ports protect the application core",
		["Domain core", "Business behavior exposes ports and knows no framework."],
		[
			["HTTP adapter", "One adapter translates web requests into a port."],
			["Database adapter", "Another implements storage behind a port."],
			["Test adapter", "Tests can drive the same core without infrastructure."],
		],
	),
	"architecture:microkernel": fan(
		"A stable core hosts optional plugins",
		["Microkernel", "The core supplies lifecycle and shared contracts."],
		[
			["Plugin A", "A plugin adds one optional capability."],
			["Plugin B", "Another can evolve outside the core release."],
			["Plugin C", "The contract limits how extensions affect each other."],
		],
	),
	"architecture:modular-monolith": fan(
		"Modules stay separate inside one deployment",
		["One application", "The product builds and deploys as one process."],
		[
			["Orders module", "Orders expose a deliberate internal boundary."],
			["Billing module", "Billing owns its rules without a network call."],
			["Accounts module", "Modules can later split only if needed."],
		],
	),
	"architecture:service-oriented": fan(
		"Shared enterprise services integrate through a bus",
		[
			"Enterprise bus",
			"A shared integration layer routes and transforms messages.",
		],
		[
			["Customer service", "A reusable business service publishes a contract."],
			["Billing service", "Another capability integrates through the bus."],
			[
				"Legacy system",
				"Adapters can bring older systems into the same workflow.",
			],
		],
	),
	"architecture:service-based": fan(
		"Coarse services split a larger application",
		["Application UI", "One product calls a small number of domain services."],
		[
			["Orders service", "A coarse service owns a full business area."],
			[
				"Inventory service",
				"Boundaries reduce coupling without dozens of deployments.",
			],
			["Shared database", "Some data infrastructure may remain shared."],
		],
	),
	"architecture:space-based": fan(
		"Distributed memory removes the database bottleneck",
		[
			"In-memory data grid",
			"Working data is partitioned across a shared memory space.",
		],
		[
			["Processing unit A", "A unit handles data near its memory partition."],
			["Processing unit B", "More units add compute and memory together."],
			[
				"Async persistence",
				"Durable storage updates outside the hot request path.",
			],
		],
	),
	"architecture:inbox-outbox": fan(
		"One transaction protects local state and messages",
		[
			"Database transaction",
			"The service records work and a message atomically.",
		],
		[
			["Outbox", "A relay later publishes committed outgoing messages."],
			[
				"Inbox",
				"A receiver records handled message IDs before applying effects.",
			],
			["Broker", "At-least-once delivery no longer means duplicate effects."],
		],
	),
	"architecture:backend-for-frontend": fan(
		"Each interface gets a tailored backend",
		[
			"Domain services",
			"Shared capabilities remain the source of business data.",
		],
		[
			["Web BFF", "The web backend combines data for a large screen."],
			[
				"Mobile BFF",
				"The mobile backend returns a smaller, network-aware shape.",
			],
			["Partner BFF", "A partner contract can evolve on its own boundary."],
		],
		"in",
	),
	"architecture:public-published-interfaces": fan(
		"A published contract protects consumers",
		[
			"Versioned interface",
			"The provider documents and supports a stable contract.",
		],
		[
			[
				"Consumer A",
				"One outside team can integrate without internal knowledge.",
			],
			["Consumer B", "Another depends on the same promised behavior."],
			[
				"Provider internals",
				"Implementation can change while the contract holds.",
			],
		],
	),
	"architecture:asynchronous-messaging": flow(
		"Messages remove the shared clock",
		[
			["Sender", "The sender creates a durable message."],
			["Broker", "The broker accepts it even if the receiver is busy."],
			["Receiver", "The receiver handles it when capacity is available."],
			["Acknowledge", "Completion removes or advances the message."],
		],
	),
	"architecture:batch-request": flow("One round trip carries many operations", [
		["Small requests", "The client collects independent operations briefly."],
		["Batch", "It packages them under one network request."],
		[
			"Server",
			"The server handles each item and isolates item-level failures.",
		],
		["Batch response", "One response returns all results together."],
	]),
	"architecture:blackboard": cycle(
		"Specialists collaborate through shared state",
		[
			["Blackboard", "A shared problem state holds all current knowledge."],
			[
				"Specialist A",
				"One knowledge source adds a partial result it understands.",
			],
			["Control", "A controller chooses the most useful specialist next."],
			["Specialist B", "Another builds on the shared partial result."],
		],
	),
	"architecture:circuit-breaker-pattern": cycle(
		"The breaker changes state around failure",
		[
			["Closed", "Normal calls pass through."],
			["Threshold", "Enough recent failures trip the breaker."],
			["Open", "New calls fail fast and conserve resources."],
			["Half-open", "A limited probe decides whether to close again."],
		],
	),
	"architecture:competing-consumers": fan(
		"Workers compete for each queued item",
		["Work queue", "Each message should be handled by one available worker."],
		[
			["Worker A", "The first free worker claims one message."],
			["Worker B", "A second worker handles a different message in parallel."],
			[
				"Worker C",
				"Adding workers raises throughput without duplicating each job.",
			],
		],
	),
	"architecture:model-view-controller": cycle(
		"MVC separates input, state, and presentation",
		[
			["User", "The user acts through the rendered interface."],
			[
				"Controller",
				"The controller translates input into an application action.",
			],
			["Model", "The model changes or returns domain state."],
			["View", "The view renders that state for the next interaction."],
		],
	),
	"architecture:claim-check": flow(
		"A small message points to a large payload",
		[
			[
				"Large payload",
				"The sender has data too large or sensitive for the broker.",
			],
			["Object store", "It saves the payload in durable external storage."],
			["Claim check", "The message carries only a reference and metadata."],
			[
				"Consumer",
				"The receiver redeems the reference when it needs the bytes.",
			],
		],
	),
	"architecture:publish-subscribe-pattern": relay(
		"Publishers do not name subscribers",
		["Publisher", "The publisher emits one event without naming receivers."],
		["Topic", "The topic is the stable meeting point for an event type."],
		[
			["Subscriber A", "One subscriber receives its own delivery."],
			["Subscriber B", "Another can join without changing the publisher."],
		],
	),
	"architecture:rate-limiting-pattern": fan(
		"A policy divides safe from excessive traffic",
		["Rate policy", "A key and time window define the caller's allowance."],
		[
			["Within limit", "Allowed requests continue to the protected service."],
			["Over limit", "Excess requests get a clear limit response."],
			["Reset / refill", "Capacity returns predictably over time."],
		],
	),
	"architecture:request-response": flow("One request waits for one response", [
		["Client", "A client sends a request with a clear contract."],
		["Network", "The caller and server share the duration of this exchange."],
		["Server", "The server handles the request before the deadline."],
		["Response", "A success or error returns on the same interaction."],
	]),
	"architecture:retry-pattern": cycle(
		"A bounded retry handles transient failure",
		[
			["Attempt", "The caller tries an idempotent operation."],
			["Transient error", "Only a failure likely to recover is retryable."],
			[
				"Backoff + jitter",
				"Waiting spreads retries instead of creating a surge.",
			],
			["Limit", "A maximum count or deadline prevents endless work."],
		],
	),
	"architecture:rule-based": relay(
		"A rules engine separates policy from flow",
		["Inputs", "Facts such as region and account tier enter the decision."],
		["Rules engine", "The engine evaluates explicit, owned policy data."],
		[
			["Decision", "The engine returns an explainable result."],
			["Audit trail", "The matching rules explain why the decision was made."],
		],
	),
	"architecture:saga": cycle("A saga advances or compensates", [
		["Reserve flight", "The first service commits its local transaction."],
		["Reserve hotel", "A second service commits the next local step."],
		["Payment fails", "A later failure leaves earlier work visible."],
		["Compensate", "Explicit actions cancel what can be undone."],
	]),
	"architecture:strangler-fig": fan(
		"A router moves one slice at a time",
		[
			"Migration router",
			"Every request reaches a boundary that can choose old or new.",
		],
		[
			["Legacy system", "Unmigrated features continue on the proven path."],
			["New service", "One feature moves behind the new implementation."],
			["Final cutover", "The old path shrinks until it can be removed."],
		],
	),
	"architecture:throttling": flow(
		"A throttle converts a burst into a safe rate",
		[
			["Traffic burst", "Work arrives above the downstream limit."],
			["Throttle", "A known policy spaces or delays the work."],
			["10 per second", "Only the safe amount proceeds in each interval."],
			["Protected API", "The limited dependency remains responsive."],
		],
	),

	// Algorithm patterns
	"algorithm:hash-map-lookup": flow("Remember complements while scanning", [
		["Need 9", "For target 9, begin with an empty map."],
		["See 2", "Store 2 so a later 7 can find its complement."],
		["See 7", "Compute 9 - 7 = 2 and look it up."],
		["2 + 7", "The lookup turns the nested search into one pass."],
	]),
	"algorithm:frequency-counting": flow("Turn repeated values into counts", [
		["c a t", "Scan the first collection one value at a time."],
		["c:1 a:1 t:1", "Increment a map entry for each value."],
		["a c t", "Scan the comparison using the same keys."],
		["All zero", "Matching counts prove the multisets are equal."],
	]),
	"algorithm:two-pointers": flow("Move two boundaries toward the answer", [
		["L: 1", "Start left at the smallest value."],
		["2", "A sum that is too small moves only the left pointer."],
		["4", "A sum that is too large would move only the right pointer."],
		["R: 8", "Order lets one comparison reject a whole boundary."],
	]),
	"algorithm:sliding-window": flow("Grow, then shrink one live window", [
		["L | 2", "Left marks the start of the current valid region."],
		["3", "Right grows the region and updates its state."],
		["1 | R", "When the rule breaks, advance left until it is valid again."],
		["Best window", "Record the best valid region seen during the scan."],
	]),
	"algorithm:prefix-sums": flow("A prefix turns ranges into subtraction", [
		["[3, 1, 4]", "Start with the original values."],
		["[0, 3]", "The leading zero represents the sum before index zero."],
		["[0, 3, 4]", "Each prefix adds one more value."],
		["[0, 3, 4, 8]", "Range 1..2 is prefix[3] - prefix[1] = 8 - 3."],
	]),
	"algorithm:merged-intervals": flow("Sort before combining overlaps", [
		["[1,3]", "The first sorted interval starts the result."],
		["[2,6]", "Its start is before the last merged end, so they overlap."],
		["[1,6]", "Keep the earlier start and the larger end."],
		["[8,10]", "A later non-overlap begins a new merged interval."],
	]),
	"algorithm:binary-search": flow("Reject half after every comparison", [
		["L: 1", "The target remains inside the closed search range."],
		["M: 4", "Middle 4 is too small for target 7."],
		["L: 7", "Reject middle and everything left of it."],
		["R: 9", "Repeat until a match or an empty range."],
	]),
	"algorithm:binary-search-bounds": flow("Keep the first true position", [
		["1", "Values below target are known false."],
		["2?", "A value at least target remains a candidate."],
		["2", "Move right onto the candidate instead of past it."],
		["4", "Stop where false changes to true."],
	]),
	"algorithm:binary-search-answer": flow("Search an ordered answer space", [
		["Speed 1", "Slow speeds fail the time limit."],
		["Try 8", "Run the yes-or-no feasibility check at the middle."],
		["8 works", "Every faster speed also works, so keep the slower half."],
		["Smallest yes", "The boundary is the minimum feasible answer."],
	]),
	"algorithm:heap-top-k": tree(
		"A min-heap exposes the weakest live candidate",
		["3", "7", "9", "12", "15"],
		[
			"The root is the smallest of the five values currently worth keeping.",
			"Every child stays at least as large as its parent.",
			"The heap does not need to sort siblings or the whole collection.",
			"When a larger candidate arrives, it replaces the root.",
			"Restore heap order; values below the root cannot enter the top five.",
		],
	),
	"algorithm:monotonic-stack": flow("New values resolve a monotonic stack", [
		["73", "Push the unresolved index for temperature 73."],
		["Stack: 73", "The stack stays decreasing from bottom to top."],
		["75 arrives", "75 is warmer, so pop every smaller unresolved value."],
		["Answer: 2 days", "The index difference settles the popped position."],
	]),
	"algorithm:greedy-choice": flow("Take the choice that leaves most room", [
		["Meetings", "Sort candidate intervals by finishing time."],
		["Earliest end", "Choose the meeting that releases the resource first."],
		["Skip overlap", "Reject choices that conflict with the committed end."],
		["Repeat", "The safe local choice leaves at least as much future room."],
	]),
	"algorithm:linked-list-reversal": flow(
		"Reverse one link without losing the rest",
		[
			["previous", "Previous is the fully reversed prefix."],
			["current: 1", "Current is the first unvisited node."],
			["save next: 2", "Save the forward link before changing it."],
			["1 → previous", "Reverse the link, then advance both pointers."],
		],
	),
	"algorithm:fast-slow-pointers": cycle("Different speeds expose a cycle", [
		["Start", "Slow and fast begin at the same list head."],
		["Slow +1", "Slow advances one link per round."],
		["Fast +2", "Fast advances two links and closes the distance in a cycle."],
		["Meet", "Equal node identity proves the path cycles."],
	]),
	"algorithm:tree-dfs": tree(
		"Depth-first search finishes a branch first",
		["A", "B", "C", "D", "E"],
		[
			"Visit the root A and choose one child.",
			"Go down to B before exploring sibling C.",
			"Return to C only after B's branch finishes.",
			"D is reached before backing out of B's subtree.",
			"E finishes the remaining part of B's subtree.",
		],
	),
	"algorithm:tree-bfs": tree(
		"Breadth-first search finishes a level first",
		["A", "B", "C", "D", "E"],
		[
			"Queue the root A.",
			"Visit B from the first level and enqueue its children.",
			"Visit sibling C before any deeper node.",
			"Only then begin the next level with D.",
			"E follows D in queue order.",
		],
	),
	"algorithm:binary-search-trees": tree(
		"BST order chooses one branch",
		["8", "4", "12", "2", "6"],
		[
			"Compare target 6 with root 8.",
			"Because 6 is smaller, choose only the left subtree at 4.",
			"The right subtree rooted at 12 is rejected.",
			"At 4, a larger target rejects the left child 2.",
			"The remaining branch reaches 6.",
		],
	),
	"algorithm:tries": tree(
		"A trie shares prefixes",
		["root", "c", "d", "a", "o"],
		[
			"Every word begins at the empty root.",
			"Words beginning with c share one edge.",
			"Words beginning with d use a separate branch.",
			"cat and car share the c → a prefix.",
			"dog follows d → o without scanning unrelated words.",
		],
	),
	"algorithm:graph-traversal": cycle("Visit each reachable graph node once", [
		["A", "Mark the starting node before adding neighbors."],
		["B", "Take one neighbor from the stack or queue."],
		["C", "Visited state prevents the cycle from repeating forever."],
		["D", "Continue until no reachable frontier remains."],
	]),
	"algorithm:grid-traversal": grid(
		"A grid is a graph with implicit neighbors",
		["S", ".", "#", ".", ".", ".", "#", ".", "G"],
		[
			"Start at S and mark it visited.",
			"Move to an in-bounds open neighbor.",
			"A wall is not a valid neighbor.",
			"Explore the next row through the open cell.",
			"Each cell is added at most once.",
			"Continue across connected open cells.",
			"Skip another wall.",
			"The frontier reaches the final column.",
			"Stop or record the path when G is reached.",
		],
		{ bidirectional: true, blockedLabels: ["#"] },
	),
	"algorithm:topological-sort": fan(
		"Zero-dependency nodes unlock a DAG",
		["Build", "Build has no remaining prerequisites, so it enters the queue."],
		[
			["Test", "Removing Build's edge can reduce Test to zero prerequisites."],
			["Package", "Package waits until every incoming dependency is removed."],
			["Deploy", "If all nodes leave the graph, the order is valid."],
		],
	),
	"algorithm:union-find": tree(
		"Union-find connects groups by roots",
		["root A", "A", "B", "C", "D"],
		[
			"Each component is represented by a root.",
			"Find follows A's parent to its representative.",
			"Union attaches B's root under the chosen larger root.",
			"Path compression can point C directly at the root.",
			"Two nodes are connected when their roots match.",
		],
	),
	"algorithm:shortest-path": cycle(
		"A shortest-path frontier settles cheapest routes",
		[
			["A: 0", "Start with distance zero at A."],
			["B: 2", "Relax an edge when the new route is cheaper."],
			[
				"C: 5",
				"The priority queue chooses the smallest tentative distance next.",
			],
			["D: 6", "Once the cheapest node is settled, expand its outgoing edges."],
		],
	),
	"algorithm:recursion": flow("A recursive call solves a smaller copy", [
		[
			"solve(4)",
			"Define the answer using the same problem at a smaller input.",
		],
		["solve(3)", "Each call moves strictly toward the base case."],
		["solve(1)", "The base case returns without another call."],
		["unwind", "Saved call frames combine results on the way back."],
	]),
	"algorithm:backtracking": tree(
		"Backtracking explores, undoes, and tries again",
		["[]", "[1]", "[2]", "[1,2]", "[1,3]"],
		[
			"Begin with an empty partial choice.",
			"Choose 1 and record it in mutable path state.",
			"After undoing 1, sibling choice 2 starts a different branch.",
			"Choose 2 after 1 to explore a deeper candidate.",
			"Undo 2 before trying 3 from the same parent state.",
		],
	),
	"algorithm:one-dimensional-dp": flow(
		"DP reuses answers to smaller prefixes",
		[
			["dp[0]", "Write the smallest known base case."],
			["dp[1]", "Define the next state from already solved states."],
			["dp[2]", "Store the result so later work does not repeat it."],
			["dp[n]", "Advance in the dependency order until the target state."],
		],
	),
	"algorithm:grid-dp": grid(
		"Grid DP pulls from solved neighbors",
		["1", "1", "1", "1", "2", "3", "1", "3", "6"],
		[
			"The start cell has one way to reach it.",
			"The top row can only come from the left.",
			"Continue filling the first boundary.",
			"The first column can only come from above.",
			"An inner cell adds the solved top and left states.",
			"Dependencies are ready because the table fills in order.",
			"Finish the lower boundary.",
			"Reuse the values immediately above and left.",
			"The final cell holds the full-grid answer.",
		],
	),
	"algorithm:knapsack-dp": grid(
		"Knapsack DP compares take with skip",
		["0", "1", "2", "item A", "skip", "take", "item B", "best", "answer"],
		[
			"Capacity zero has value zero.",
			"Small capacities define the table columns.",
			"Larger capacity may fit more choices.",
			"Each row introduces one item or choice.",
			"Skip keeps the best value from the previous row.",
			"Take adds this item to the compatible remaining capacity.",
			"The next item repeats the same decision.",
			"Store the better of take and skip.",
			"The final state answers the requested capacity.",
		],
	),
	"algorithm:bit-manipulation": flow(
		"Bit masks store many booleans in one number",
		[
			["0000", "Begin with every flag off."],
			["1 << 2", "Shift a single 1 into the position for flag two."],
			["0100", "OR turns that flag on without changing the others."],
			["mask & bit", "AND tests whether the chosen flag is present."],
		],
	),
};

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CopyButton } from "#/components/CopyButton";

export const Route = createFileRoute("/_authenticated/media")({
	head: () => ({ meta: [{ title: "Media & Press — Rook" }] }),
	component: MediaDossierPage,
});

type CropMode = "square" | "circle" | "thread";
type PlatformFilter =
	| "all"
	| "x"
	| "instagram"
	| "threads"
	| "substack"
	| "newsletter";

const inkSwatches = [
	{
		name: "Persimmon Ground",
		hex: "#DC5E38",
		role: "Primary field & avatar paper ground",
		textClass: "text-white",
	},
	{
		name: "Carbon Relief Ink",
		hex: "#1E1A18",
		role: "Carved rook silhouette & primary block ink",
		textClass: "text-[#DFD3B8]",
	},
	{
		name: "Limestone Bill",
		hex: "#DFD3B8",
		role: "Pointed bill, base patch & half-lidded eye",
		textClass: "text-[#1E1A18]",
	},
] as const;

const identityFacts = [
	{
		label: "Byline",
		value: "Rook",
		note: "Display name and sole author byline",
	},
	{
		label: "Handle",
		value: "@ThoughtlessRook",
		note: "One handle everywhere; Instagram & Threads render it lowercase",
	},
	{
		label: "Press & Inbox",
		value: "rook@abyrd.me",
		note: "Direct correspondence & newsletter replies",
	},
	{
		label: "Email Signature",
		value: "— Rook",
		note: "Default on new messages; omitted on replies",
	},
] as const;

const bioLengths = [
	{
		id: "one-liner",
		title: "One-line bio",
		usage: "X bio, Instagram bio, newsletter header, and guest bylines",
		status: "Ready",
		chars: "54 chars",
		text: "Essays, notes, and small strange things. Signed, Rook.",
	},
	{
		id: "short",
		title: "Short press bio",
		usage:
			"Podcast show notes, anthology contributors page, and directory listings",
		status: "Placeholder draft",
		chars: "42 words",
		text: "Rook writes essays and short pieces on software, books, and the quiet corners of the internet. New work goes out by newsletter and lives under a single byline. Reach the desk directly at rook@abyrd.me or follow @ThoughtlessRook.",
	},
	{
		id: "long",
		title: "Long press & speaker bio",
		usage: "Feature interviews, event introductions, and formal media kits",
		status: "Placeholder slot",
		chars: "To be finalized",
		text: "[Placeholder — Add 120–150 word narrative bio covering current writing projects, recurring themes, and selected publications once the first essays ship.]",
	},
] as const;

const generalPlaceholders = [
	{
		title: "Byline & Colophon Stamp",
		spec: "SVG / Transparent PNG · 1:1 & 3:1",
		aspect: "aspect-[16/10]",
		note: "Monochrome woodcut wordmark or “— Rook” stamp for essay footers and PDFs.",
	},
	{
		title: "Featured Essay / Book Cover",
		spec: "1600 × 2400 px · 2:3 Portrait",
		aspect: "aspect-[16/10]",
		note: "Lead publication cover or chapbook jacket for press features.",
	},
	{
		title: "Author Portrait / Press Photo",
		spec: "2400 × 3000 px · 4:5 Portrait",
		aspect: "aspect-[16/10]",
		note: "Optional high-resolution photograph or alternate relief print for interviews.",
	},
	{
		title: "Press Mentions & Appearances",
		spec: "Citations · Podcasts · Anthologies",
		aspect: "aspect-[16/10]",
		note: "Log of interviews, cited essays, and guest appearances as they publish.",
	},
] as const;

function MediaDossierPage() {
	const [cropMode, setCropMode] = useState<CropMode>("square");
	const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

	return (
		<section className="flex flex-1 flex-col py-8 sm:py-12">
			<header className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<div className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-slate-500 uppercase">
						<span
							aria-hidden="true"
							className="inline-block size-2 rounded-full bg-[#DC5E38]"
						/>
						Identity Specimen & Press Kit
					</div>
					<h1 className="font-book mt-2 text-4xl tracking-tight text-slate-950 sm:text-5xl">
						Rook{" "}
						<span className="font-normal text-slate-500 italic">
							media dossier.
						</span>
					</h1>
					<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
						Official linocut avatar, canonical handles, ink values, and platform
						placeholders for X, Instagram, Threads, Substack, and the
						newsletter.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<a
						className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#DC5E38] px-4 py-2 text-sm font-medium text-white no-underline transition hover:bg-[#c5522f]"
						download="rook-avatar-1024.png"
						href="/rook-avatar.png"
					>
						Download avatar (1024×1024)
					</a>
					<CopyButton label="Copy rook@abyrd.me" text="rook@abyrd.me" />
				</div>
			</header>

			<div className="mt-8 grid items-start gap-8 border-b border-slate-200 pb-10 lg:grid-cols-12">
				<div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6 lg:col-span-5">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div>
							<p className="text-xs font-medium tracking-[0.12em] text-slate-500 uppercase">
								Plate 01 · Primary Mark
							</p>
							<p className="mt-0.5 font-mono text-xs text-slate-600">
								rook-avatar.png · 1024×1024 px · PNG-24
							</p>
						</div>
						<span className="rounded-full bg-[#DC5E38]/15 px-2.5 py-0.5 text-xs font-medium text-[#b54422] dark:text-[#f08b6d]">
							Ready
						</span>
					</div>

					<div className="my-5 flex min-h-72 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-6">
						{cropMode === "square" ? (
							<div className="flex flex-col items-center text-center">
								<img
									alt="Rook linocut avatar, adult Eurasian rook in profile on warm persimmon orange"
									className="size-56 rounded-md border border-slate-200 object-cover shadow-sm sm:size-64"
									height={256}
									src="/rook-avatar.png"
									width={256}
								/>
								<p className="mt-3 font-mono text-xs text-slate-500">
									1:1 Master Square · Uncropped block print
								</p>
							</div>
						) : null}

						{cropMode === "circle" ? (
							<div className="flex flex-col items-center text-center">
								<img
									alt="Rook avatar in a circular social profile crop"
									className="size-52 rounded-full border border-slate-200 object-cover shadow-sm sm:size-60"
									height={240}
									src="/rook-avatar.png"
									width={240}
								/>
								<p className="mt-3 font-mono text-xs text-slate-500">
									Circular mask · X (400×400) & Instagram (320×320)
								</p>
							</div>
						) : null}

						{cropMode === "thread" ? (
							<div className="w-full max-w-sm space-y-4">
								<div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
									<img
										alt="Rook avatar at 40 pixel reply thread size"
										className="size-10 shrink-0 rounded-full object-cover"
										height={40}
										src="/rook-avatar.png"
										width={40}
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5 text-sm">
											<span className="font-semibold text-slate-950">Rook</span>
											<span className="text-slate-500">
												@ThoughtlessRook · 2m
											</span>
										</div>
										<p className="mt-1 text-sm leading-5 text-slate-700">
											Testing the 40 px circular crop in a feed reply. The pale
											bill and eye still read at thumbnail size.
										</p>
									</div>
								</div>
								<div className="flex items-center justify-center gap-4 pt-1 font-mono text-xs text-slate-500">
									<span className="inline-flex items-center gap-2">
										<img
											alt=""
											className="size-10 rounded-full"
											height={40}
											src="/rook-avatar-40.png"
											width={40}
										/>
										40×40 px
									</span>
									<span className="inline-flex items-center gap-2">
										<img
											alt=""
											className="size-7 rounded-full"
											height={28}
											src="/rook-avatar.png"
											width={28}
										/>
										28×28 px
									</span>
									<span className="inline-flex items-center gap-2">
										<img
											alt=""
											className="size-5 rounded-full"
											height={20}
											src="/rook-avatar.png"
											width={20}
										/>
										20×20 px
									</span>
								</div>
							</div>
						) : null}
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3">
						<fieldset
							aria-label="Avatar crop preview mode"
							className="m-0 inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs"
						>
							{(
								[
									["square", "1024 Square"],
									["circle", "Social Circle"],
									["thread", "40px Feed Check"],
								] as const
							).map(([mode, label]) => (
								<button
									aria-pressed={cropMode === mode}
									className={`cursor-pointer rounded-md px-2.5 py-1.5 font-medium transition ${
										cropMode === mode
											? "bg-[#DC5E38] text-white"
											: "text-slate-600 hover:text-slate-950"
									}`}
									key={mode}
									onClick={() => setCropMode(mode)}
									type="button"
								>
									{label}
								</button>
							))}
						</fieldset>

						<a
							className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-950"
							download="rook-avatar-40px-circle.png"
							href="/rook-avatar-40.png"
						>
							40px test PNG
						</a>
					</div>
				</div>

				<div className="flex flex-col justify-between gap-6 lg:col-span-7">
					<div>
						<div className="flex items-center justify-between border-b border-slate-200 pb-2">
							<h2 className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
								Canonical Identity & Handles
							</h2>
							<span className="font-mono text-xs text-slate-500">
								Single-word byline · Loosely linked domain
							</span>
						</div>

						<dl className="divide-y divide-slate-200 border-b border-slate-200">
							{identityFacts.map((fact) => (
								<div
									className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
									key={fact.label}
								>
									<div>
										<dt className="text-xs font-medium text-slate-500 uppercase">
											{fact.label}
										</dt>
										<dd className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
											<span className="font-mono text-base font-medium text-slate-950">
												{fact.value}
											</span>
											<span className="text-xs text-slate-500">
												{fact.note}
											</span>
										</dd>
									</div>
									<div className="shrink-0">
										<CopyButton
											label={`Copy ${fact.label.toLowerCase()}`}
											text={fact.value}
										/>
									</div>
								</div>
							))}
						</dl>
					</div>

					<div>
						<div className="flex items-center justify-between pb-3">
							<h2 className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
								Three-Ink Relief Palette
							</h2>
							<span className="font-mono text-xs text-slate-500">
								No gradients · Flat block-print registration
							</span>
						</div>

						<div className="grid gap-3 sm:grid-cols-3">
							{inkSwatches.map((swatch) => (
								<div
									className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5"
									key={swatch.hex}
								>
									<div>
										<div
											className={`flex h-20 items-end justify-between rounded-lg p-3 font-mono text-xs font-medium ${swatch.textClass}`}
											style={{ backgroundColor: swatch.hex }}
										>
											<span>{swatch.hex}</span>
										</div>
										<p className="mt-3 text-sm font-medium text-slate-950">
											{swatch.name}
										</p>
										<p className="mt-0.5 text-xs leading-5 text-slate-500">
											{swatch.role}
										</p>
									</div>
									<div className="mt-3">
										<CopyButton
											label={`Copy ${swatch.hex}`}
											text={swatch.hex}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="mt-10 border-b border-slate-200 pb-10">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="font-book text-2xl text-slate-950 sm:text-3xl">
							Social profiles & platform rollout
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							Live avatar previews paired with true-aspect-ratio placeholders
							for X, Instagram, Threads, Substack, and email.
						</p>
					</div>

					<fieldset
						aria-label="Filter platforms"
						className="m-0 inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs"
					>
						{(
							[
								["all", "All platforms"],
								["x", "X / Twitter"],
								["instagram", "Instagram"],
								["threads", "Threads"],
								["substack", "Substack"],
								["newsletter", "Direct Email"],
							] as const
						).map(([id, label]) => (
							<button
								aria-pressed={platformFilter === id}
								className={`cursor-pointer rounded-md px-3 py-1.5 font-medium transition ${
									platformFilter === id
										? "bg-[#DC5E38] text-white shadow-xs"
										: "text-slate-600 hover:text-slate-950"
								}`}
								key={id}
								onClick={() => setPlatformFilter(id)}
								type="button"
							>
								{label}
							</button>
						))}
					</fieldset>
				</div>

				<div className="mt-6 grid gap-6 lg:grid-cols-2">
					{platformFilter === "all" || platformFilter === "x" ? (
						<article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
							<div>
								<div className="flex items-center justify-between gap-2">
									<div>
										<span className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
											X / Twitter
										</span>
										<h3 className="mt-0.5 text-lg font-semibold text-slate-950">
											@ThoughtlessRook
										</h3>
									</div>
									<span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">
										1 ready · 2 placeholders
									</span>
								</div>

								<div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
									<div className="relative flex aspect-[3/1] items-center justify-center border-b border-dashed border-slate-300 bg-[#1E1A18]/5 px-4 text-center">
										<div>
											<p className="font-mono text-xs font-medium text-slate-700">
												+ X Header Banner Placeholder
											</p>
											<p className="mt-0.5 font-mono text-[11px] text-slate-500">
												1500 × 500 px · 3:1 aspect · Keep lower-left clear for
												avatar overlap
											</p>
										</div>
									</div>
									<div className="px-4 pb-4">
										<div className="-mt-8 flex items-end justify-between gap-3">
											<img
												alt="Rook X profile avatar preview"
												className="relative z-10 size-16 rounded-full border-4 border-white object-cover shadow-xs"
												height={64}
												src="/rook-avatar.png"
												width={64}
											/>
											<span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
												Follow @ThoughtlessRook
											</span>
										</div>
										<div className="mt-2.5">
											<p className="font-semibold text-slate-950">Rook</p>
											<p className="font-mono text-xs text-slate-500">
												@ThoughtlessRook
											</p>
											<p className="mt-2 text-sm text-slate-700">
												Essays, notes, and small strange things. Signed, Rook.
											</p>
										</div>
									</div>
								</div>

								<ul className="mt-5 divide-y divide-slate-200 text-xs">
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Profile Avatar
											</strong>{" "}
											· 400 × 400 px (served from 1024×1024 PNG)
										</span>
										<span className="font-mono text-[#b54422]">Ready</span>
									</li>
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Header Banner
											</strong>{" "}
											· 1500 × 500 px (3:1)
										</span>
										<span className="font-mono text-slate-500">
											Placeholder
										</span>
									</li>
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												In-Feed Share Card
											</strong>{" "}
											· 1200 × 675 px (16:9)
										</span>
										<span className="font-mono text-slate-500">
											Placeholder
										</span>
									</li>
								</ul>
							</div>

							<div className="mt-4 flex flex-wrap gap-2 pt-2">
								<CopyButton
									label="Copy @ThoughtlessRook"
									text="@ThoughtlessRook"
								/>
								<CopyButton
									label="Copy X bio"
									text="Essays, notes, and small strange things. Signed, Rook."
								/>
							</div>
						</article>
					) : null}

					{platformFilter === "all" || platformFilter === "instagram" ? (
						<article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
							<div>
								<div className="flex items-center justify-between gap-2">
									<div>
										<span className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
											Instagram
										</span>
										<h3 className="mt-0.5 text-lg font-semibold text-slate-950">
											@thoughtlessrook
										</h3>
									</div>
									<span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">
										1 ready · 3 placeholders
									</span>
								</div>

								<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex items-center gap-4">
										<img
											alt="Rook Instagram avatar preview"
											className="size-16 shrink-0 rounded-full border border-slate-200 object-cover"
											height={64}
											src="/rook-avatar.png"
											width={64}
										/>
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-mono text-sm font-semibold text-slate-950">
													thoughtlessrook
												</span>
												<span className="rounded bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600">
													Writer
												</span>
											</div>
											<p className="mt-1 text-sm font-medium text-slate-950">
												Rook
											</p>
											<p className="mt-0.5 text-xs leading-5 text-slate-600">
												Essays & notes. New pieces by email.
											</p>
											<p className="font-mono text-xs text-[#b54422]">
												abyrd.me
											</p>
										</div>
									</div>

									<div className="mt-4 grid grid-cols-3 gap-2.5">
										<div className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-2 text-center">
											<span className="font-mono text-[11px] font-medium text-slate-700">
												+ Square
											</span>
											<span className="mt-0.5 font-mono text-[10px] text-slate-500">
												1080×1080 (1:1)
											</span>
										</div>
										<div className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-2 text-center">
											<span className="font-mono text-[11px] font-medium text-slate-700">
												+ Quote Card
											</span>
											<span className="mt-0.5 font-mono text-[10px] text-slate-500">
												1080×1350 (4:5)
											</span>
										</div>
										<div className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-2 text-center">
											<span className="font-mono text-[11px] font-medium text-slate-700">
												+ Story / Reel
											</span>
											<span className="mt-0.5 font-mono text-[10px] text-slate-500">
												1080×1920 (9:16)
											</span>
										</div>
									</div>
								</div>

								<ul className="mt-5 divide-y divide-slate-200 text-xs">
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Profile Picture
											</strong>{" "}
											· 320 × 320 px circular crop
										</span>
										<span className="font-mono text-[#b54422]">Ready</span>
									</li>
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Excerpt Carousel Template
											</strong>{" "}
											· 1080 × 1350 px (4:5)
										</span>
										<span className="font-mono text-slate-500">
											Placeholder
										</span>
									</li>
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Story / Highlight Covers
											</strong>{" "}
											· 1080 × 1920 px (9:16)
										</span>
										<span className="font-mono text-slate-500">
											Placeholder
										</span>
									</li>
								</ul>
							</div>

							<div className="mt-4 flex flex-wrap gap-2 pt-2">
								<CopyButton
									label="Copy Instagram bio"
									text="Essays & notes. New pieces by email."
								/>
							</div>
						</article>
					) : null}

					{platformFilter === "all" || platformFilter === "threads" ? (
						<article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
							<div>
								<div className="flex items-center justify-between gap-2">
									<div>
										<span className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
											Threads
										</span>
										<h3 className="mt-0.5 text-lg font-semibold text-slate-950">
											@thoughtlessrook
										</h3>
									</div>
									<span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">
										1 ready · 2 placeholders
									</span>
								</div>

								<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="text-base font-semibold text-slate-950">
												Rook
											</p>
											<div className="mt-0.5 flex items-center gap-1.5">
												<span className="font-mono text-xs text-slate-600">
													thoughtlessrook
												</span>
												<span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] text-slate-500">
													threads.net
												</span>
											</div>
										</div>
										<img
											alt="Rook Threads profile avatar preview"
											className="size-14 shrink-0 rounded-full border border-slate-200 object-cover"
											height={56}
											src="/rook-avatar.png"
											width={56}
										/>
									</div>

									<p className="mt-2.5 text-xs leading-5 text-slate-700">
										Essays, notes, and small strange things. Signed, Rook.
									</p>
									<p className="mt-1 font-mono text-xs text-[#b54422]">
										abyrd.me
									</p>

									<div className="mt-4 grid grid-cols-2 gap-2.5">
										<div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-2.5 text-center">
											<span className="font-mono text-[11px] font-medium text-slate-700">
												+ Passage Screenshot Card
											</span>
											<span className="mt-0.5 font-mono text-[10px] text-slate-500">
												1080×1350 (4:5) or 1080×1080
											</span>
										</div>
										<div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-2.5 text-center">
											<span className="font-mono text-[11px] font-medium text-slate-700">
												+ Link Preview Card
											</span>
											<span className="mt-0.5 font-mono text-[10px] text-slate-500">
												1200×630 (1.91:1 OG)
											</span>
										</div>
									</div>
								</div>

								<ul className="mt-5 divide-y divide-slate-200 text-xs">
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Profile Picture
											</strong>{" "}
											· 320 × 320 px circular crop (synced or standalone)
										</span>
										<span className="font-mono text-[#b54422]">Ready</span>
									</li>
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Excerpt Image Attachment
											</strong>{" "}
											· 1080 × 1350 px (4:5)
										</span>
										<span className="font-mono text-slate-500">
											Placeholder
										</span>
									</li>
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Cross-Post Link Card
											</strong>{" "}
											· 1200 × 630 px (1.91:1)
										</span>
										<span className="font-mono text-slate-500">
											Placeholder
										</span>
									</li>
								</ul>
							</div>

							<div className="mt-4 flex flex-wrap gap-2 pt-2">
								<CopyButton
									label="Copy @thoughtlessrook"
									text="@thoughtlessrook"
								/>
								<CopyButton
									label="Copy Threads bio"
									text="Essays, notes, and small strange things. Signed, Rook."
								/>
							</div>
						</article>
					) : null}

					{platformFilter === "all" || platformFilter === "substack" ? (
						<article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
							<div>
								<div className="flex items-center justify-between gap-2">
									<div>
										<span className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
											Substack & Notes
										</span>
										<h3 className="mt-0.5 text-lg font-semibold text-slate-950">
											By Rook · @thoughtlessrook
										</h3>
									</div>
									<span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">
										1 ready · 3 placeholders
									</span>
								</div>

								<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex items-center gap-3.5 border-b border-slate-200 pb-3.5">
										<img
											alt="Rook Substack publication icon preview"
											className="size-14 shrink-0 rounded-xl border border-slate-200 object-cover shadow-xs"
											height={56}
											src="/rook-avatar.png"
											width={56}
										/>
										<div className="min-w-0">
											<p className="font-book text-lg font-semibold text-slate-950">
												Rook
											</p>
											<p className="text-xs text-slate-600">
												Essays, notes, and small strange things. By Rook.
											</p>
										</div>
									</div>

									<div className="mt-3.5 grid grid-cols-2 gap-2.5">
										<div className="flex aspect-[5/2] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-2 text-center">
											<span className="font-mono text-[11px] font-medium text-slate-700">
												+ Publication Wordmark
											</span>
											<span className="mt-0.5 font-mono text-[10px] text-slate-500">
												1344×256 px transparent PNG
											</span>
										</div>
										<div className="flex aspect-[5/2] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-2 text-center">
											<span className="font-mono text-[11px] font-medium text-slate-700">
												+ Email Banner Header
											</span>
											<span className="mt-0.5 font-mono text-[10px] text-slate-500">
												1100×220 px (5:1)
											</span>
										</div>
									</div>
								</div>

								<ul className="mt-5 divide-y divide-slate-200 text-xs">
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Publication Logo & Author Avatar
											</strong>{" "}
											· 1024 × 1024 px (1:1, ≥256×256)
										</span>
										<span className="font-mono text-[#b54422]">Ready</span>
									</li>
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Publication Wordmark
											</strong>{" "}
											· 1344 × 256 px (max 21:4)
										</span>
										<span className="font-mono text-slate-500">
											Placeholder
										</span>
									</li>
									<li className="flex items-center justify-between py-2.5">
										<span>
											<strong className="font-medium text-slate-950">
												Welcome Page Cover / Social Preview
											</strong>{" "}
											· 1200 × 630 px
										</span>
										<span className="font-mono text-slate-500">
											Placeholder
										</span>
									</li>
								</ul>
							</div>

							<div className="mt-4 flex flex-wrap gap-2 pt-2">
								<CopyButton
									label="Copy Substack one-liner"
									text="Essays, notes, and small strange things. By Rook."
								/>
							</div>
						</article>
					) : null}

					{platformFilter === "all" || platformFilter === "newsletter" ? (
						<article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-2">
							<div className="grid gap-6 lg:grid-cols-12">
								<div className="lg:col-span-6">
									<div className="flex items-center justify-between gap-2">
										<div>
											<span className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
												Newsletter & Web
											</span>
											<h3 className="mt-0.5 text-lg font-semibold text-slate-950">
												Rook &lt;rook@abyrd.me&gt;
											</h3>
										</div>
										<span className="rounded-full bg-[#DC5E38]/15 px-2.5 py-1 font-mono text-xs font-medium text-[#b54422]">
											Zoho Mail Live
										</span>
									</div>

									<div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs">
										<div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
											<img
												alt=""
												className="size-8 rounded-full object-cover"
												height={32}
												src="/rook-avatar.png"
												width={32}
											/>
											<div>
												<p className="font-sans text-sm font-medium text-slate-950">
													Rook &lt;rook@abyrd.me&gt;
												</p>
												<p className="text-[11px] text-slate-500">
													SPF · DKIM · Zoho Mail & Campaigns verified
												</p>
											</div>
										</div>
										<div className="pt-3 font-sans text-sm leading-6 text-slate-700">
											<p>
												Thanks for reading the piece. I’m glad it found you.
											</p>
											<p className="mt-3 text-slate-950">— Rook</p>
										</div>
									</div>
								</div>

								<div className="flex flex-col justify-between lg:col-span-6">
									<div className="flex aspect-[1.91/1] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
										<p className="font-mono text-xs font-medium text-slate-700">
											+ Open Graph & Newsletter Masthead Placeholder
										</p>
										<p className="mt-1 font-mono text-[11px] text-slate-500">
											1200 × 630 px (1.91:1 OG card) & 1200 × 240 px email
											header
										</p>
									</div>

									<div className="mt-4 flex flex-wrap items-center justify-between gap-2">
										<span className="text-xs text-slate-500">
											Default signature enabled for new messages; off for
											replies.
										</span>
										<CopyButton label="Copy signature" text="— Rook" />
									</div>
								</div>
							</div>
						</article>
					) : null}
				</div>
			</div>

			<div className="mt-10 border-b border-slate-200 pb-10">
				<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="font-book text-2xl text-slate-950 sm:text-3xl">
							Approved bios & boilerplate
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							Copy-ready descriptions for social profiles, guest essays, and
							press intros.
						</p>
					</div>
				</div>

				<div className="mt-6 grid gap-4 lg:grid-cols-3">
					{bioLengths.map((bio) => (
						<article
							className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
							key={bio.id}
						>
							<div>
								<div className="flex items-center justify-between gap-2">
									<h3 className="text-base font-semibold text-slate-950">
										{bio.title}
									</h3>
									<span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[11px] text-slate-600">
										{bio.chars}
									</span>
								</div>
								<p className="mt-1 text-xs text-slate-500">{bio.usage}</p>
								<p className="font-book mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm leading-6 text-slate-800">
									{bio.text}
								</p>
							</div>
							<div className="mt-4 flex items-center justify-between gap-2 pt-2">
								<span className="font-mono text-xs text-slate-500">
									{bio.status}
								</span>
								<CopyButton
									label={`Copy ${bio.title.toLowerCase()}`}
									text={bio.text}
								/>
							</div>
						</article>
					))}
				</div>
			</div>

			<div className="mt-10">
				<div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="font-book text-2xl text-slate-950 sm:text-3xl">
							Future media & press placeholders
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							Reserved slots for upcoming colophon marks, publication covers,
							and press clips.
						</p>
					</div>
					<span className="font-mono text-xs text-slate-500">4 open slots</span>
				</div>

				<div className="mt-6 grid gap-4 sm:grid-cols-2">
					{generalPlaceholders.map((item) => (
						<article
							className="flex flex-col justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5"
							key={item.title}
						>
							<div
								className={`flex ${item.aspect} flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center`}
							>
								<span
									aria-hidden="true"
									className="inline-flex size-8 items-center justify-center rounded-full border border-slate-200 font-mono text-sm text-slate-500"
								>
									+
								</span>
								<p className="mt-2 text-sm font-medium text-slate-950">
									{item.title}
								</p>
								<p className="mt-0.5 font-mono text-xs text-slate-500">
									{item.spec}
								</p>
							</div>
							<p className="mt-3 text-xs leading-5 text-slate-600">
								{item.note}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

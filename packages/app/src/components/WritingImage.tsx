import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import { DRAG_DROP_PASTE } from "@lexical/rich-text";
import { mergeRegister } from "@lexical/utils";
import {
	$create,
	$getNodeByKey,
	$getSelection,
	$insertNodes,
	$isNodeSelection,
	$setSelection,
	type BaseSelection,
	COMMAND_PRIORITY_LOW,
	createCommand,
	DecoratorNode,
	KEY_BACKSPACE_COMMAND,
	KEY_DELETE_COMMAND,
	type LexicalEditor,
	type NodeKey,
	nodeSchema,
	stringValue,
	withField,
} from "lexical";
import { type ReactNode, useEffect, useRef } from "react";

const imageSchema = nodeSchema<ImageNode>()({
	src: withField(stringValue(), { field: "__src" }),
	alt: withField(stringValue(), { field: "__alt" }),
});

/**
 * An uploaded image. It sits inline on its own line, so the page layout moves
 * it to the next page whole when it doesn't fit.
 */
export class ImageNode extends DecoratorNode<ReactNode> {
	__src = "";
	__alt = "";

	$config() {
		return this.config("writing-image", {
			extends: DecoratorNode,
			json: imageSchema,
		});
	}

	createDOM() {
		const element = document.createElement("span");
		element.className = "writing-image";
		return element;
	}

	updateDOM() {
		return false;
	}

	isInline() {
		return true;
	}

	getTextContent() {
		return "";
	}

	decorate() {
		return (
			<WritingImage alt={this.__alt} nodeKey={this.getKey()} src={this.__src} />
		);
	}
}

export const $createImageNode = (src: string, alt: string) => {
	const node = $create(ImageNode).getWritable();
	node.__src = src;
	node.__alt = alt;
	return node;
};

/** Opens the file picker and inserts the chosen image where the cursor was. */
export const OPEN_IMAGE_PICKER_COMMAND =
	createCommand<void>("OPEN_IMAGE_PICKER");

const WritingImage = ({
	src,
	alt,
	nodeKey,
}: {
	src: string;
	alt: string;
	nodeKey: NodeKey;
}) => {
	const [editor] = useLexicalComposerContext();
	const [isSelected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);

	useEffect(() => {
		const remove = () => {
			if (!isSelected || !$isNodeSelection($getSelection())) return false;
			$getNodeByKey(nodeKey)?.remove();
			return true;
		};
		return mergeRegister(
			editor.registerCommand(
				KEY_BACKSPACE_COMMAND,
				remove,
				COMMAND_PRIORITY_LOW,
			),
			editor.registerCommand(KEY_DELETE_COMMAND, remove, COMMAND_PRIORITY_LOW),
		);
	}, [editor, isSelected, nodeKey]);

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: selecting an image is a mouse convenience; the keyboard moves past it as text.
		<img
			alt={alt}
			className={
				isSelected ? "outline-2 outline-offset-2 outline-stone-500" : ""
			}
			draggable={false}
			onClick={() => {
				clearSelection();
				setSelected(true);
			}}
			src={src}
		/>
	);
};

const uploadImage = async (file: File) => {
	const form = new FormData();
	form.set("image", file);
	const response = await fetch("/api/writing-images", {
		method: "POST",
		body: form,
	});
	const body: { url?: string; error?: string } = await response.json();
	if (!response.ok || !body.url)
		throw new Error(body.error ?? "Upload failed.");
	return body.url;
};

const insertImages = async (
	editor: LexicalEditor,
	files: File[],
	selection: BaseSelection | null,
) => {
	for (const file of files) {
		try {
			const url = await uploadImage(file);
			editor.update(() => {
				if (selection) $setSelection(selection.clone());
				$insertNodes([
					$createImageNode(url, file.name.replace(/\.[^.]+$/, "")),
				]);
			});
		} catch (error) {
			alert(
				error instanceof Error ? error.message : "Could not upload that image.",
			);
		}
	}
};

/** Handles the image picker plus pasted and dropped image files. */
export const WritingImagePlugin = () => {
	const [editor] = useLexicalComposerContext();
	const input = useRef<HTMLInputElement>(null);
	const pickerSelection = useRef<BaseSelection | null>(null);

	useEffect(
		() =>
			mergeRegister(
				editor.registerCommand(
					OPEN_IMAGE_PICKER_COMMAND,
					() => {
						pickerSelection.current = $getSelection()?.clone() ?? null;
						input.current?.click();
						return true;
					},
					COMMAND_PRIORITY_LOW,
				),
				editor.registerCommand(
					DRAG_DROP_PASTE,
					(files) => {
						const images = files.filter((file) =>
							file.type.startsWith("image/"),
						);
						if (!images.length) return false;
						void insertImages(editor, images, null);
						return true;
					},
					COMMAND_PRIORITY_LOW,
				),
			),
		[editor],
	);

	return (
		<input
			accept="image/png,image/jpeg,image/webp,image/gif"
			className="hidden"
			onChange={(event) => {
				const files = [...(event.target.files ?? [])];
				event.target.value = "";
				void insertImages(editor, files, pickerSelection.current);
			}}
			ref={input}
			type="file"
		/>
	);
};

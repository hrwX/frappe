<template>
	<div class="asd">
	<!-- <editor-content :editor="editor" /> -->
		asd
	</div>
</template>

<script>
import { Editor, EditorContent } from "tiptap";

export default {
	components: {
		// EditorContent
	},
	data() {
		return {
			// editor: null,
		}
	},
	beforeMount() {
		// this.editor = new Editor({
		// 	content: '<p>This is just a boring paragraph</p>',
		// });
	},
	beforeDestroy() {
		// this.editor.destroy()
	},
}
</script>
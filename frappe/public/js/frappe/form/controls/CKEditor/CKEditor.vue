<template>
	<div id="app">
		<ckeditor v-model="editorData" :config="editorConfig"></ckeditor>
	</div>
</template>

<script>
import CKEditor from 'ckeditor4-vue';

export default {
	components: {
		ckeditor: CKEditor.component
	},
	data() {
		return {
			editorData: "",
			editorConfig: {
				autoGrow_maxHeight: 400,
				toolbar: [
					['Styles', 'Format', 'Font'],
					['Bold', 'Italic', 'Underline'],
					['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'],
					['Link'],
					['Image', 'Table', 'HorizontalRule']
				]
			}
		};
	}
};
</script>
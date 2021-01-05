import { Editor, EditorContent } from "tiptap"
import TipTap from './tiptap/TipTap.vue';

frappe.tiptap.editor = Editor;
frappe.tiptap.editorcontent = EditorContent;

frappe.ui.form.ControlTipTapEditor = frappe.ui.form.ControlCode.extend({
	make_input() {
		this.editor = new Vue({
			render: h => h(TipTap)
		});
		this.$wrapper.find('.control-input-wrapper .control-input').append(this.editor.$el);
	},

	refresh() {

	},

	get_value() {
		return ""
	},
});


import TipTap from './tiptap/TipTap.vue';
// const tiptap = require('tiptap')

frappe.ui.form.ControlTipTapEditor = frappe.ui.form.ControlCode.extend({
	make_input() {
		this.$wrapper.find('.control-input').addClass("tiptap-editor");
		// console.log(tiptap)
		// this.initialise_tiptap();
		console.log(Editor)
	},

	initialise_tiptap() {
		// this.editor = new Vue({
		// 	el: this.$wrapper.find('.tiptap-editor'),
		// });
	}
});

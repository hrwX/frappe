import TipTap from './tiptap/TipTap.vue';

frappe.ui.form.ControlTipTapEditor = frappe.ui.form.ControlText.extend({
	make_input() {
		this.editor = new Vue({
			el: this.$wrapper.find('.control-input')[0],
			render: h => h(TipTap)
		});
	},

	get_input_value() {

	}
});

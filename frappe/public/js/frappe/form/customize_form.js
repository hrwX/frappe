// Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide("frappe.ui.form");

frappe.ui.form.CustomizeField = function(df) {
	return new Promise(resolve => {
		let customize_form_field = null;
		let df = df || {};

		frappe.model.with_doctype("Customize Form Field", () => {
			customize_form_field = frappe.get_meta("Customize Form Field");
		}).then(() => {
			let dialog = new frappe.ui.Dialog({
				title: __(df.label) || __("New Field"),
				fields: customize_form_field.fields,
				primary_action_label: __('Save'),
				size: "large",
				primary_action: function() {
					dialog.hide();
					resolve(dialog.get_values());
				}
			});
			dialog.set_values(df);
			dialog.show();
		})
	})
}
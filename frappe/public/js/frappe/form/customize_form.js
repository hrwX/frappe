// Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide("frappe.ui.form");

frappe.ui.form.CustomizeField = class CustomizeField {
	constructor(df, meta) {
		this.df = df;
		this.meta = meta;
		console.log(this.df);
		this.init();
	}
	init() {
		frappe.model.with_doctype("Customize Form Field", () => {
			this.customize_form_field = frappe.get_meta("Customize Form Field");
			this.create_dialog();
		})
	}
	create_dialog() {
		let d = new frappe.ui.Dialog({
			title: __(this.df.label),
			fields: this.customize_form_field.fields,
			primary_action_label: __('Save'),
			primary_action: function() {
				let values = d.get_values();

				for (let i in this.meta.fields) {
					if (this.meta.fields[i].fieldname === this.df.fieldname) {
						$.extend(this.meta.fields[i], values);
					}
				}
			}
		})
		d.set_values(this.df);
		d.show();
	}
}